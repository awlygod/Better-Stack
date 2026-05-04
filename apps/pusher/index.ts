import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { prismaClient } from "store/client";
import { xAddBulk } from "redisstream/client";

async function pushWebsitesToQueue() {
  try {
    const websites = await prismaClient.website.findMany({
      select: { id: true, url: true },
    });

    if (websites.length === 0) {
      console.log("No websites to push");
      return;
    }

    const jobs = websites.map((site) => ({
      url: site.url,
      id: site.id,
      jobId: uuidv4(),
      retryCount: 0,
      maxRetries: 3,
      nextRunAt: Date.now(),
    }));

    await xAddBulk(jobs);
    console.log(`Pushed ${websites.length} websites to queue`);
  } catch (error) {
    console.error("Error pushing websites:", error);
  }
}

setInterval(pushWebsitesToQueue, 90000);  // making this as 90s because the error retries a job after 40s also that creates a conflict
pushWebsitesToQueue();

console.log("Pusher running, pushing websites every 30s");
