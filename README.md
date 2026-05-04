# BetterStack

A distributed website uptime monitoring system. Add any URL and BetterStack continuously checks if it's up, measures response time, and keeps a history of health checks, all powered by a Redis-backed worker queue that scales horizontally across regions.

---

## How it works


<img width="1163" height="594" alt="image" src="https://github.com/user-attachments/assets/6052e56f-1e85-4e0f-958f-99f237778f8e" />




1.  Pusher queries PostgreSQL every 90 seconds and writes all website jobs into a Redis Stream.
2.  Workers read jobs from the stream using consumer groups, ensuring no duplicate processing.
3.  Each worker checks nextRunAt before executing, skipping jobs scheduled for the future.
4.  Worker makes an HTTP request to the target URL and records the result in PostgreSQL.
5.  On success, writes an Up tick and acknowledges the message.
6.  On failure, increments retryCount and re-enqueues the job with exponential backoff, writing an Unknown tick.
7.  If retryCount exceeds maxRetries, writes a Down tick and sends the job to the dead letter queue, persisted in both Redis and PostgreSQL.

  Multiple workers can run in parallel across different regions, they share the same consumer group so there's no duplicate processing.


## Why this design ?

1. Redis Streams over Kafka
   
   Chosen for simplicity and low ops overhead. Gives persistence and consumer groups without running a Kafka cluster.
3. Consumer groups for workers
   
   Ensures each job is processed once while allowing horizontal scaling across workers.
5. Pusher and worker separation
   
   Decouples scheduling from execution so workers can scale independently.
7. Polling instead of event driven
   
   Uptime monitoring is inherently pull based. Polling keeps behavior predictable.
9. PostgreSQL for storage
    
   Relational model fits time series checks and querying patterns well.
11. Multi region workers
    
    Reduces latency variance and reflects real world monitoring setups.
12. Exponential backoff over fixed interval retries because it gives a failing service time to recover without hammering it repeatedly in quick succession.
13. 90 second pusher interval over the original 30 seconds because it prevents the pusher from creating duplicate job chains for websites that are mid-retry, eliminating the need for a more complex inflight tracking system.
14. Unknown tick status over Down on retries because it preserves the integrity of the health history and distinguishes transient failures from confirmed outages.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript |
| API | Express.js, JWT, Zod |
| Queue | Redis Streams (consumer groups) |
| Database | PostgreSQL + Prisma ORM |
| Monorepo | Turborepo + Bun |
| Infra | Docker (Postgres + Redis) |

---

## Project Structure

```
betterstack/
├── apps/
│   ├── api/        # Express REST API (port 3001)
│   ├── web/        # Next.js frontend (port 3000)
│   ├── worker/     # Health check worker (scalable)
│   ├── pusher/     # Feeds websites into Redis queue
│   └── tests/      # Vitest test suite
└── packages/
    ├── store/      # Prisma schema + DB models
    └── redisstream/ # Redis stream helpers
```

---

## Getting Started

**Prerequisites:** Docker, Bun

**1. Start infrastructure**
```bash
docker-compose up -d
```

**2. Set up the database**
```bash
cd packages/store && bunx prisma db push
```

**3. Configure environment variables**

Each app has its own `.env`. The key ones:

```bash
# apps/api/.env
DATABASE_URL= your_database_url
JWT_SECRET=your_secret_key
PORT= port_name

# apps/worker/.env
DATABASE_URL=...
REDIS_URL= your_redis_url
REGION_ID= redis_id
WORKER_ID= worker_id

# apps/pusher/.env
DATABASE_URL=...
REDIS_URL= ...

# apps/web/.env.local
NEXT_PUBLIC_API_URL= ...
```

**4. Run all services** (separate terminals)

```bash
cd apps/api     && bun run index.ts
cd apps/web     && bun run dev
cd apps/pusher  && bun run index.ts
cd apps/worker  && bun run index.ts
```

---

## Scaling Workers

Run multiple workers by changing `WORKER_ID` and optionally `REGION_ID`:

```bash
REGION_ID=us-east  WORKER_ID=worker-1 bun run index.ts
REGION_ID=eu-west  WORKER_ID=worker-2 bun run index.ts
REGION_ID=ap-south WORKER_ID=worker-3 bun run index.ts
```

Each instance pulls from the same Redis consumer group, no coordination needed, no duplicate checks.

---

## API Reference

```
POST /user/signup       { username, password }
POST /user/signin       { username, password }
POST /website           
GET  /website/all                             
GET  /status/:id                              
GET  /health
```

---

## Features

- JWT authentication
- Add unlimited websites to monitor
- Health checks every ~30 seconds
- Response time tracking (ms)
- Last 10 checks per website with timestamps
- Regional worker tagging
- Horizontally scalable worker pool
- Fully typed with TypeScript throughout

## Screenshots
<img width="1846" height="808" alt="Screenshot 2026-05-03 194838" src="https://github.com/user-attachments/assets/89bc65b2-53d4-40f4-9f24-02e1a0c8f611" />
<img width="1844" height="899" alt="Screenshot 2026-05-03 194946" src="https://github.com/user-attachments/assets/85eada89-b8fa-4e87-b784-d8f37b61f5c3" />
<img width="603" height="742" alt="Screenshot 2026-05-03 194958" src="https://github.com/user-attachments/assets/80fe48f1-c440-4d55-a281-8d6f60e6d656" />


