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

2. Copy env file and configure:
   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```

4. Start backend (port 3001):
   ```bash
   pnpm dev:backend
   ```

5. Start frontend (port 3000):
   ```bash
   pnpm dev:frontend
   ```

## Testing

```bash
# Smoke tests (fast, run on every push)
pnpm test:smoke

# Full suite
pnpm test
```

## CI

GitHub Actions runs on every push:
- Install + lint + typecheck
- Playwright smoke tests

Full suite runs on main.
