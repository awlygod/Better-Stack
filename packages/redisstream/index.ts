import { createClient } from "redis";

const client = await createClient({ url: process.env.REDIS_URL })
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();

export type WebsiteEvent = {
  url: string;
  id: string;
  jobId: string;
  retryCount: number;
  maxRetries: number;
  nextRunAt: number;
};

export type MessageType = {
  id: string;
  message: WebsiteEvent;
};

const STREAM_NAME = "betteruptime:website";
const DLQ_STREAM = "betteruptime:dlq";
const CONSUMER_GROUP = "betteruptime:workers";

async function xAdd(event: WebsiteEvent) {
  await client.xAdd(STREAM_NAME, "*", {
    url: event.url,
    id: event.id,
    jobId: event.jobId,
    retryCount: String(event.retryCount),
    maxRetries: String(event.maxRetries),
    nextRunAt: String(event.nextRunAt),
  });
}

export async function xAddBulk(websites: WebsiteEvent[]) {
  for (const website of websites) {
    await xAdd(website);
  }
}

export async function xAddDLQ(payload: {
  job: WebsiteEvent;
  finalError: string;
  failedAt: number;
  totalAttempts: number;
}) {
  await client.xAdd(DLQ_STREAM, "*", {
    url: payload.job.url,
    id: payload.job.id,
    jobId: payload.job.jobId,
    totalAttempts: String(payload.totalAttempts),
    finalError: payload.finalError,
    failedAt: String(payload.failedAt),
  });
}

export async function xReadGroup(
  regionId: string,
  workerId: string
): Promise<MessageType[]> {
  try {
    try {
      await client.xGroupCreate(STREAM_NAME, CONSUMER_GROUP, "0", {
        MKSTREAM: true,
      });
    } catch (e) {
      // group already exists
    }

    const messages = (await client.xReadGroup(
      CONSUMER_GROUP,
      workerId,
      { key: STREAM_NAME, id: ">" },
      { COUNT: 10, BLOCK: 1000 }
    )) as any;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return [];
    }

    const streamData = messages[0] as any;
    if (!streamData || !Array.isArray(streamData.messages)) {
      return [];
    }

    return streamData.messages.map((msg: any) => ({
      id: msg.id,
      message: {
        url: msg.message.url as string,
        id: msg.message.id as string,
        jobId: msg.message.jobId as string,
        retryCount: parseInt(msg.message.retryCount, 10),
        maxRetries: parseInt(msg.message.maxRetries, 10),
        nextRunAt: parseInt(msg.message.nextRunAt, 10),
      },
    }));
  } catch (error) {
    console.error("xReadGroup error:", error);
    return [];
  }
}

export async function xAck(streamMessageId: string) {
  try {
    await client.xAck(STREAM_NAME, CONSUMER_GROUP, streamMessageId);
  } catch (error) {
    console.error("xAck error:", error);
  }
}

export async function xAckBulk(regionId: string, ids: string[]) {
  try {
    if (ids.length === 0) return;
    await client.xAck(STREAM_NAME, CONSUMER_GROUP, ids);
  } catch (error) {
    console.error("xAckBulk error:", error);
  }
}