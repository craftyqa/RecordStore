# Record Store

A full-stack inventory management system for vinyl records with Discogs and Shopify integration.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Node.js v22 + Express + TypeScript + Prisma
- **Database:** PostgreSQL 16
- **Testing:** Playwright (UI + API), integration tests (real Postgres), contract tests
- **CI:** GitHub Actions
- **Hosting:** Railway

## Prerequisites

- Node.js v22+
- pnpm
- Docker + Docker Compose

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Install Playwright browsers:
   ```bash
   pnpm --filter e2e exec playwright install chromium
   ```

3. Copy env file and configure:
   ```bash
   cp .env.example .env
   ```

4. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```

5. Start backend (port 3001):
   ```bash
   pnpm dev:backend
   ```

6. Start frontend (port 3000):
   ```bash
   pnpm dev:frontend
   ```

## Testing

```bash
# Smoke tests (fast, run on every push — no DB required)
pnpm test:smoke

# Contract tests — stub Discogs HTTP, assert request shape
pnpm test:contract

# Integration tests — repository + integrity scenarios against real Postgres
pnpm test:integration

# Full Playwright suite (UI + API)
pnpm test
```

### Integrity test scenarios

Located in `packages/backend/src/items/integrity.integration.test.ts`:

| Test | Scenario | Assertion |
|------|----------|-----------|
| A | Bulk price update concurrent with Discogs sync | Price lands AND sync status recorded — no silent overwrite of either field |
| B | Two concurrent `PATCH` requests with the same `version` | Exactly one wins; the other gets `count=0` (maps to `409 VERSION_CONFLICT` in the API) |
| C | Discogs API error mid-sync, then re-sync succeeds | Error state set with message; subsequent sync clears error and sets `listed` |

### Traces and screenshots

Playwright failure artifacts are written to `packages/e2e/test-results/`. Screenshots and traces are available there after a failed run.

## Concurrency

All item updates use **optimistic locking** via a `version` integer field.

| Scenario | Behaviour |
|----------|-----------|
| Two users edit the same item simultaneously | Second `PATCH` returns `409 VERSION_CONFLICT`. Client must reload and re-apply their changes. |
| Bulk price update while a sync is in flight | Bulk update increments `version`. Sync writes only to sync-status fields (`discogs_sync_status`, `discogs_sync_error`, `discogs_synced_at`) via the internal `update()` call which bypasses version — sync outcome is always recorded regardless of concurrent edits. |
| Sync fails mid-way | Item is set to `discogs_sync_status = 'error'` with the error message. Re-syncing will retry the full listing push. |

## CI

GitHub Actions runs on every push:
- Install + lint + typecheck
- Playwright smoke tests

Full suite runs on main.
