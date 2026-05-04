import "dotenv/config";
import axios from "axios";
import { xReadGroup, xAck, xAddBulk, xAddDLQ } from "redisstream/client";
import type { WebsiteEvent } from "redisstream/client";
import { prismaClient } from "store/client";

const REGION_ID = process.env.REGION_ID!;
const WORKER_ID = process.env.WORKER_ID!;
const BASE_DELAY_MS = 5000;

if (!REGION_ID) throw new Error("REGION_ID not provided");
if (!WORKER_ID) throw new Error("WORKER_ID not provided");

async function ensureRegionExists() {
  await prismaClient.region.upsert({
    where: { id: REGION_ID },
    update: {},
    create: { id: REGION_ID, name: REGION_ID },
  });
}

async function fetchWebsite(url: string): Promise<number> {
  const startTime = Date.now();
  await axios.get(url, { timeout: 10000 });
  return Date.now() - startTime;
}

function computeNextRunAt(retryCount: number): number {
  const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
  return Date.now() + delay;
}

async function handleSuccess(job: WebsiteEvent, responseTime: number) {
  await prismaClient.website_tick.create({
    data: {
      response_time_ms: responseTime,
      status: "Up",
      region_id: REGION_ID,
      website_id: job.id,
    },
  });
  console.log(`${job.url} is UP (${responseTime}ms)`);
}

async function handleFailure(
  streamMessageId: string,
  job: WebsiteEvent,
  error: unknown
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const newRetryCount = job.retryCount + 1;

  if (newRetryCount <= job.maxRetries) {
    const nextRunAt = computeNextRunAt(newRetryCount);
    console.log(
      `${job.url} failed. Retry ${newRetryCount}/${job.maxRetries} scheduled in ${(nextRunAt - Date.now()) / 1000}s`
    );

    await prismaClient.website_tick.create({
      data: {
        response_time_ms: 0,
        status: "Unknown",
        region_id: REGION_ID,
        website_id: job.id,
      },
    });

    await xAddBulk([{ ...job, retryCount: newRetryCount, nextRunAt }]);
  } else {
    console.log(`${job.url} exhausted all retries. Sending to DLQ.`);

    await prismaClient.website_tick.create({
      data: {
        response_time_ms: 0,
        status: "Down",
        region_id: REGION_ID,
        website_id: job.id,
      },
    });

    await xAddDLQ({
      job,
      finalError: errorMessage,
      failedAt: Date.now(),
      totalAttempts: newRetryCount,
    });

    await prismaClient.job_failure.create({
      data: {
        jobId: job.jobId,
        websiteId: job.id,
        url: job.url,
        totalAttempts: newRetryCount,
        finalError: errorMessage,
        failedAt: new Date(),
      },
    });

    console.log(`${job.url} written to DLQ and persisted to Postgres.`);
  }

  await xAck(streamMessageId);
}

async function processJob(streamMessageId: string, job: WebsiteEvent) {
  if (Date.now() < job.nextRunAt) {
    console.log(`${job.url} not ready yet, skipping.`);
    return;
  }

  try {
    const responseTime = await fetchWebsite(job.url);
    await handleSuccess(job, responseTime);
    await xAck(streamMessageId);
  } catch (error) {
    await handleFailure(streamMessageId, job, error);
  }
}

async function main() {
  console.log(`Worker ${WORKER_ID} started in region ${REGION_ID}`);
  await ensureRegionExists();

  while (true) {
    try {
      const response = await xReadGroup(REGION_ID, WORKER_ID);

      if (!response || response.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      for (const { id: streamMessageId, message: job } of response) {
        await processJob(streamMessageId, job);
      }

      console.log(`Processed batch of ${response.length} messages`);
    } catch (error) {
      console.error("Worker error:", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main().catch(console.error);