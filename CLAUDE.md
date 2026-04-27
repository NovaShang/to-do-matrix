# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

Bun workspaces — run `bun install` from the repo root to link all packages.

```
packages/core/        → shared types (Task, TaskStatus) + pure scoring engine
apps/cli/             → CLI client (calls Worker API, no local DB)
apps/worker/          → Cloudflare Worker: Hono + D1 + Better Auth
```

## Development Commands

**From repo root:**
```bash
bun install            # install all workspace deps
bun run dev:cli        # run CLI in dev mode
bun run dev:worker     # run Worker locally via wrangler dev
```

**CLI (`apps/cli/`):**
```bash
bun run dev -- <args>  # e.g. bun run dev -- ls
bun run bundle         # bundle for AI Agent skill → skill/scripts/tdmx.js
```

**Worker (`apps/worker/`):**
```bash
bun run dev            # wrangler dev → http://localhost:8787
bun run db:generate    # generate D1 migration from schema changes
bun run deploy         # deploy to Cloudflare
```

**D1 migrations (run from `apps/worker/`):**
```bash
npx @better-auth/cli generate                             # generate Better Auth tables SQL
wrangler d1 execute tdmx-db --local --file drizzle/<file>.sql   # apply locally
wrangler d1 execute tdmx-db --remote --file drizzle/<file>.sql  # apply to production
```

There is no test suite yet.

## Architecture

### Data flow

```
CLI → HTTP (x-api-key) → Cloudflare Worker → D1 SQLite
                              ↓
                        Better Auth (user/session/apiKey tables)
                        Drizzle ORM (tasks table)
                        @tdmx/core/engine (urgency scoring)
```

**`packages/core`** contains two things only: plain TypeScript `Task`/`NewTask` interfaces (no Drizzle dependency) and the pure scoring engine (`getUrgencyScore`, `getQuadrant`, `getExecutionScore`, `enrichTasks`). Both the CLI and Worker import from here.

**Quadrant, urgencyScore, executionScore are never stored** — always computed at runtime by `enrichTasks()` in `packages/core/src/engine.ts`. The Worker calls this before returning any response; the CLI simply renders the enriched values it receives.

### Worker auth (Better Auth)

Better Auth is initialized **per-request** (not at module level) because the D1 binding is only available in request context. `apps/worker/src/auth.ts` exports `createAuth(d1, env)` — call it inside each handler or middleware.

API key plugin is active for CLI auth (`x-api-key` header). Google OAuth can be enabled by uncommenting `socialProviders` in `src/auth.ts` when the web frontend is added (Phase 4).

Better Auth manages its own DB tables (`user`, `session`, `account`, `verification`, `apiKey`). The only custom table is `tasks` (defined in `apps/worker/src/db/schema.ts`), which references Better Auth's `user.id` as a text UUID via `userId: text("user_id")`.

### CLI config

`~/.tdmx/config.json` holds `{ url, apiKey }`. Use `tdmx config set-url` / `tdmx config set-key` to populate it. All commands call `loadConfig()` at startup and exit with a clear error if unconfigured.

### Auth architecture

Better Auth manages `user`, `session`, `account`, `verification` tables (sign-up, sign-in, OAuth).
The `bearer` plugin lets the CLI use a session token via `Authorization: Bearer <token>` to create API keys.
Custom `api_keys` table stores hashed keys; the auth middleware checks `x-api-key` first, then falls back to Better Auth session.

**CLI first-time setup:**
```bash
# 1. Sign up
curl -X POST http://localhost:8787/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"...","name":"Your Name"}'
# → returns { token: "...", user: { ... } }

# 2. Create an API key using the session token
curl -X POST http://localhost:8787/api/keys \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"label":"my laptop"}'
# → returns { key: "tdmx_...", keyId: 1 }  (plaintext shown once)

# 3. Configure CLI
tdmx config set-url http://localhost:8787
tdmx config set-key tdmx_...
```

### Worker setup (first time)

```bash
wrangler d1 create tdmx-db          # copy database_id into wrangler.toml
# create apps/worker/.dev.vars with: BETTER_AUTH_SECRET=<random> BETTER_AUTH_URL=http://localhost:8787
npx @better-auth/cli generate       # Better Auth tables SQL
bun run db:generate                 # tasks + api_keys tables SQL
wrangler d1 execute tdmx-db --local --file drizzle/0000_better_auth.sql
wrangler d1 execute tdmx-db --local --file drizzle/0001_tasks.sql
```

### Negative number arg fix

`apps/cli/src/index.ts` pre-processes `process.argv` to rewrite `--importance -1` → `--importance=-1` before `cac` parses it. Keep this intact when modifying argument handling.

## Roadmap Phases

| Phase | Status |
|---|---|
| Phase 1 — Local CLI + SQLite | Done (migrated to API client) |
| Phase 2 — AI Agent Skill (`apps/cli/skill/`) | Planned |
| **Phase 3 — Cloudflare Worker + D1** | **Current** |
| Phase 4 — React PWA + Google OAuth | Planned |
| Phase 5 — iOS / Siri | Planned |
