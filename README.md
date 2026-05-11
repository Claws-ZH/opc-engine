# opc-marketing-engine

AI-native automation engine for the One-Person Company (OPC). Publish, schedule,
and engage on social platforms via a single MCP-exposed NestJS service.

Inspired by AiToEarn, but deliberately minimal: one service, one repo, one
platform first (X/Twitter). YouTube and LinkedIn directories exist as
placeholders and will be filled in once the X loop is proven end-to-end.

## Why

- LLM agents (Claude, Cursor, etc.) become the operator UI via MCP.
- Humans only intervene for OAuth consent and high-stakes review.
- Avoid the over-engineering trap: no monorepo, no relay layer, no 4-tier base
  classes, no credit/billing system in MVP.

## Architecture

```
                    +-----------------------------+
   MCP client  ---> |  /mcp  (Streamable HTTP)    |
  (Claude/Cursor)   |  @modelcontextprotocol/sdk  |
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+
                    |  MCP tools (publishTweet…)  |
                    |  wrapTool + closure userId  |
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+        +----------+
                    |  PublishService             | -----> | BullMQ   |
                    |  (validate, persist, queue) |        | (Redis)  |
                    +--------------+--------------+        +----+-----+
                                   |                            |
                                   v                            v
                    +-----------------------------+   +----------------------+
                    |  MongoDB (tasks, accounts)  |   | ImmediatePublish     |
                    +-----------------------------+   | Consumer -> Twitter  |
                                                      +----------------------+

   EnqueueScheduler (@Cron + Redlock) sweeps mongo for due tasks -> BullMQ.
```

## Layout

See `src/` — a single Nest application:

- `common/auth` — x-api-key SHA1 guard + AsyncLocalStorage user context
- `common/mcp`  — `wrapTool` higher-order helper + success/error result shapes
- `platforms/twitter` — OAuth2 PKCE + tweet publish (stubbed, see file notes)
- `platforms/{youtube,linkedin}` — reserved, not implemented
- `publish` — task model, scheduler (cron + Redlock), BullMQ consumer
- `mcp`     — Streamable HTTP MCP endpoint and tool registrations
- `account` — connected social accounts (tokens) per user

## Local run

```bash
cp .env.example .env
docker compose up -d            # mongo + redis
npm install
npm run start:dev
```

Service listens on `http://localhost:3000`. MCP endpoint at `/mcp`.

## Connecting an MCP client

Cursor / Claude Desktop config snippet:

```json
{
  "mcpServers": {
    "opc-marketing-engine": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "x-api-key": "<your-opc-api-key>"
      }
    }
  }
}
```

The server hashes the inbound key as `sha1(OPC_API_KEY_SALT + key)` and matches
against `OPC_API_KEY_HASHES`. In dev, leaving `OPC_API_KEY_HASHES` empty
bypasses the guard and binds requests to a synthetic `dev-user`.

## Tools exposed (MVP)

- `publishTweet({ text, scheduledAt? })` — publish now or schedule.

## Design rules (do not break)

1. Single NestJS service. No ai/server split.
2. Single repo. No monorepo / Nx.
3. One platform at a time. X first; only widen once it survives prod.
4. MCP: `createSdkMcpServer` (in-process) + Streamable HTTP (external).
5. Borrow from AiToEarn: `wrapTool`, `successResult/errorResult`, closure
   `userId`, SHA1-hashed API keys, BullMQ `jobId` idempotency,
   `PublishingTaskResult` sum type.
6. Don't borrow: libs/platforms split, 4 base-class abstraction tiers, relay
   mechanism, credit accounting.

## Status

MVP skeleton. Twitter publish is a documented stub; OAuth callback,
refresh-token rotation, and webhook-driven `publishing -> published`
transitions are next.
