import "dotenv/config";
import axios from "axios";
import { xAckBulk, xReadGroup } from "redisstream/client";
import { prismaClient } from "store/client";

const REGION_ID = process.env.REGION_ID!;
const WORKER_ID = process.env.WORKER_ID!;

if (!REGION_ID) {
  throw new Error("REGION_ID not provided");
}

if (!WORKER_ID) {
  throw new Error("WORKER_ID not provided");
}

async function ensureRegionExists() {
  await prismaClient.region.upsert({
    where: { id: REGION_ID },
    update: {},
    create: { id: REGION_ID, name: REGION_ID },
  });
}

async function fetchWebsite(
  url: string,
  websiteId: string
): Promise<void> {
  return new Promise<void>((resolve) => {
    const startTime = Date.now();

    axios
      .get(url, { timeout: 10000 })
      .then(async () => {
        const endTime = Date.now();
        await prismaClient.website_tick.create({
          data: {
            response_time_ms: endTime - startTime,
            status: "Up",
            region_id: REGION_ID,
            website_id: websiteId,
          },
        });
        console.log(` ${url} is UP (${endTime - startTime}ms)`);
        resolve();
      })
      .catch(async (error) => {
        const endTime = Date.now();
        await prismaClient.website_tick.create({
          data: {
            response_time_ms: endTime - startTime,
            status: "Down",
            region_id: REGION_ID,
            website_id: websiteId,
          },
        });
        console.log(` ${url} is DOWN`);
        resolve();
      });
  });
}

async function main() {
  console.log(` Worker ${WORKER_ID} started in region ${REGION_ID}`);
  await ensureRegionExists();

  while (true) {
    try {
      const response = await xReadGroup(REGION_ID, WORKER_ID);

      if (!response || response.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      const promises = response.map(({ message }) =>
        fetchWebsite(message.url, message.id)
      );
      await Promise.all(promises);

      await xAckBulk(REGION_ID, response.map(({ id }) => id));
      console.log(`Processed ${response.length} websites`);
    } catch (error) {
      console.error("Worker error:", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main().catch(console.error);