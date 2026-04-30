# BetterUptime

A distributed website uptime monitoring system built as a monorepo. It checks whether your websites are up or down by polling them from multiple regions and recording response times.

## Architecture

The system is composed of four applications and several shared packages managed with Turborepo and Bun workspaces.

**Apps**

| Name | Purpose |
|------|---------|
| api | REST API built with Express. Handles user auth, website registration, and status queries. |
| worker | Background worker that reads URLs from a Redis stream, pings them with HTTP requests, and writes tick results to the database. |
| pusher | Real-time event pusher for broadcasting status updates. |
| web | Next.js frontend for the dashboard. |
| tests | Integration test suite using Vitest. |

**Packages**

| Name | Purpose |
|------|---------|
| store | Prisma client and database models (PostgreSQL). |
| redisstream | Shared Redis stream helpers (xReadGroup, xAckBulk). |
| ui | Shared React component library. |
| eslint-config | Shared ESLint configurations. |
| typescript-config | Shared TypeScript configurations. |

## How It Works

1. A user registers a website URL via the API.
2. URLs are pushed into a Redis stream partitioned by region.
3. One or more workers consume the stream, perform HTTP GET requests, and record the response time and status (Up or Down) as a `website_tick` in the database.
4. The API exposes the latest tick data so the frontend can display current status.

## Tech Stack

TypeScript, Node.js, Express, Next.js, Prisma, PostgreSQL, Redis, Turborepo, Bun

## Getting Started

**Prerequisites**

Node.js 18 or higher, Bun 1.2+, a running PostgreSQL instance, a running Redis instance.


