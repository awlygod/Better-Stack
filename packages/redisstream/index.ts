import { createClient } from "redis";

const client = await createClient({ url: process.env.REDIS_URL })
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();

type WebsiteEvent = { url: string; id: string };
type MessageType = {
  id: string;
  message: {
    url: string;
    id: string;
  };
};

const STREAM_NAME = "betteruptime:website";
const CONSUMER_GROUP = "betteruptime:workers";

async function xAdd({ url, id }: WebsiteEvent) {
  await client.xAdd(STREAM_NAME, "*", {
    url,
    id,
  });
}

export async function xAddBulk(websites: WebsiteEvent[]) {
  for (let i = 0; i < websites.length; i++) {
    await xAdd(websites[i]);
  }
}

export async function xReadGroup(
  regionId: string,
  workerId: string
): Promise<MessageType[]> {
  try {
    // Ensure consumer group exists
    try {
      await client.xGroupCreate(STREAM_NAME, CONSUMER_GROUP, "0", {
        MKSTREAM: true,
      });
    } catch (e) {
      // Group already exists
    }

    const messages = (await client.xReadGroup(
      CONSUMER_GROUP,
      workerId,
      {
        key: STREAM_NAME,
        id: ">",
      },
      {
        COUNT: 10,
        BLOCK: 1000,
      }
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
      },
    }));
  } catch (error) {
    console.error("xReadGroup error:", error);
    return [];
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