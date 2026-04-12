# Record Store

Full-stack vinyl record inventory management system with Discogs and Shopify integration.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui (port 3000)
- **Backend:** Node.js v22 + Express + TypeScript + Prisma (port 3001)
- **Database:** PostgreSQL 16 (via Docker)
- **Testing:** Playwright (UI + API), integration tests, contract tests
- **CI:** GitHub Actions | **Hosting:** Railway

## Commands

```bash
pnpm install                             # install all dependencies
pnpm dev:frontend                        # start frontend (port 3000)
pnpm dev:backend                         # start backend (port 3001)
docker compose up -d                     # start PostgreSQL

pnpm test:smoke                          # fast, no DB required — runs on every push
pnpm test:contract                       # stub Discogs HTTP, assert request shape
pnpm test:integration                    # repository + integrity tests vs real Postgres
pnpm test                                # full Playwright suite (UI + API)
```

## Architecture

```
packages/
  frontend/        # React + TypeScript UI
  backend/
    src/
      items/       # core domain — CRUD, Discogs sync, integrity tests
  e2e/             # Playwright tests
    test-results/  # failure screenshots and traces (gitignored)
```

## Concurrency — optimistic locking

All item mutations use a `version` integer field. This is central to the system — understand it before touching item update logic.

- A `PATCH` that loses a version race returns `409 VERSION_CONFLICT` (count=0 from DB maps to this)
- Bulk price updates increment `version` normally
- Discogs sync writes **only** to sync-status fields (`discogs_sync_status`, `discogs_sync_error`, `discogs_synced_at`) via an internal `update()` that bypasses version — sync outcome is always recorded regardless of concurrent edits
- Sync failures set `discogs_sync_status = 'error'`; re-syncing retries the full listing push

Integrity test scenarios are in `packages/backend/src/items/integrity.integration.test.ts` and cover the three main race conditions (A: bulk + sync, B: concurrent PATCH, C: sync error + recovery). Keep these passing when changing item update logic.

## Environment

```bash
cp .env.example .env   # then fill in Discogs + Shopify credentials
```

Docker must be running before starting the backend — Prisma connects to Postgres on startup.

## CI behaviour

- **Every push:** lint + typecheck + smoke tests
- **main branch:** full test suite including integration + Playwright
