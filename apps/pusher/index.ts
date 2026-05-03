import "dotenv/config";
import { prismaClient } from "store/client";
import { xAddBulk } from "redisstream/client";

async function pushWebsitesToQueue() {
  try {
    // Pull all websites from database
    const websites = await prismaClient.website.findMany({
      select: {
        id: true,
        url: true,
      },
    });

    if (websites.length === 0) {
      console.log("No websites to push");
      return;
    }

    // Push all to Redis stream
    await xAddBulk(websites);
    console.log(`✅ Pushed ${websites.length} websites to queue`);
  } catch (error) {
    console.error("Error pushing websites:", error);
  }
}

// Run every 30 seconds
setInterval(pushWebsitesToQueue, 30000);

// Run once on startup
pushWebsitesToQueue();

console.log("🔔 Pusher running (pushes websites every 30s)");