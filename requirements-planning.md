# Record Store System



## 1) “Record Store System” — Full-Stack + Quality Platform



### Concept



A realistic system for managing:



- Inventory: **vinyl only** — single `items` table (no misc or other product types in v1)

- Pricing workflows

- Integration to list items on Discogs

- Integration to list items on Shopify



### Stack



- **Frontend:** React + TypeScript  

- **Backend:** Node.js  

- **DB:** PostgreSQL  



### Testing layers



- UI + API tests using Playwright  

- Integration tests against real PostgreSQL  

- Contract tests (simulate Discogs or Shopify integration)  



### Key features to include



- Test data factory system (seed realistic inventory)  

- Idempotent test setup (critical for CI)  

- Tag-based test execution (smoke vs full suite)  



### Killer differentiator



**“Inventory integrity under change” tests**



Examples:



- Bulk price updates  

- Sync with external API  

- Concurrent edits  



---



## 2) Architecture assumptions



These assumptions keep implementation aligned across phases. Revisit when **Still open** decisions in section 5 are settled.



### Source of truth and channels



- The **app database is canonical** for quantity, pricing used for operations, and vinyl catalog fields stored locally.  

- **Discogs** and **Shopify** are **outbound listing channels** for v1: the app pushes or updates listings; **inbound** webhooks and bi‑directional reconciliation are out of scope until explicitly added.  

- If a channel rejects or partially applies an update, **persisted rows and sync status on the item** reflect that; operators fix forward in the app.



### Data model



- **One `items` table**, **vinyl only** (see **Locked for v1** in section 5).  

- Internal **primary key** is the API’s stable id; Discogs/Shopify external ids are stored on the item (or a small sidecar later)—**avoid** a second parallel catalog.  

- Add a **concurrency field early** (e.g. integer `version`, or comparable `updated_at` semantics) so Phase 9 optimistic locking does not force a breaking API change.



### API and errors



- **REST**, JSON bodies; HTTPS in any deployed environment.  

- Validation: **4xx** with a **stable JSON error shape** (machine-readable code, human message, optional field paths); server faults: **5xx** without leaking secrets or tokens.  

- **Pagination** (cursor vs offset) is an implementation choice—**document it** before the UI grows complex filters.



### Integrations



- **Secrets** only via environment variables or a host secrets store; **never** log auth headers, tokens, or bodies that contain them.  

- **Retries** are allowed only where behavior is **idempotent** or the channel operation is safe to repeat; document what “sync this item again” does when a listing already exists (Phases 7–8).  

- **Rate limits:** backoff with jitter; distinguish **transient** (retry) vs **terminal** (stop, set `error` + message) in sync status.



### Testing and CI



- **Integration tests** use a **real PostgreSQL** in CI (service container, Compose, or equivalent)—not an in-memory stand-in for Postgres-specific behavior you care about.  

- **Isolation:** migrations apply clean; reset via truncate (ordered for FKs) or disposable DB per worker; document the approach next to Phase 10 setup.  

- **Contract tests** hit **stubs** (WireMock, MSW, recordings) so CI does not call live Discogs/Shopify.  

- **Playwright:** pick **one** primary style for API-level checks (e.g. `request` context vs a shared HTTP client in test helpers) to limit overlapping patterns.



### Security and deployment bar



- **Auth** may be stubbed locally; **any environment with real marketplace credentials** uses **auth + TLS** and locked-down network access.  

- Default mental model: **single shop / single tenant** until multi-tenant rules (e.g. `shop_id`, RLS) are an explicit requirement.



### Explicit non-goals (v1)



- Inbound multi-channel conflict resolution (Shopify/Discogs driving truth back into stock without a designed flow).  

- Load or performance testing as a release gate (called out as out of scope for Phase 11).



---



## 3) Phased build plan



Phases are ordered so each unlocks the next. Deliverables are intentionally **small**: one bullet ≈ one PR-sized outcome.



### Phase 0 — Project skeleton



**Goal:** Repo runs locally; nothing depends on business logic yet.



**Deliverables**



- pnpm workspace monorepo with `packages/frontend` (React + TypeScript + Tailwind + shadcn/ui) and `packages/backend` (Node v22 + Express + TypeScript + Prisma) with README run steps
- PostgreSQL available via Docker Compose
- Backend route: `GET /health` (200, no DB required)
- Frontend page loads in dev (static or “hello” is fine)
- Env example file: `DATABASE_URL` placeholder, no secrets committed



**Exit criteria**



- New dev can start DB + API + UI from README without guessing  



**Not in this phase**



- Full suite, tagged projects, parallel shards  



**CI smoke (next small PR, still “Phase 0” until green)**



- GitHub Actions job: install (pnpm) + lint + typecheck (backend and/or frontend as applicable)

- CI job: **one** Playwright test (e.g. “app root responds”)  

- **Exit:** push to default branch runs CI and passes  



---



### Phase 1 — Database: items table



**Goal:** One migrated table; no API surface required yet.



**Deliverables**



- Migration tool: **Prisma** (`prisma migrate dev`)

- `items` table columns: `id` (UUID PK), `title` (text), `quantity` (integer), `price` (numeric), `media_condition` (text), `sleeve_condition` (text), `comments` (text), `discogs_id` (text), `created_at` (timestamptz)

- Second migration only if you discover a must-have column—prefer additive small steps  



**Exit criteria**



- `migrate up` on empty DB succeeds; table visible in psql  



**Not in this phase**



- Non-vinyl product types, repository layer, HTTP  



---



### Phase 2 — Data access + dev seed



**Goal:** All DB reads/writes go through one layer; dev data is repeatable.



**Deliverables**



- Repository (or query module) with `list`, `getById`, `insert`, `update` for `items`  

- CLI or script: `seed` inserts a handful of rows for local dev  

- Extend schema in a **separate** migration if you add columns (condition, catalog number, etc.)  



**Exit criteria**



- Run seed → restart app/DB container → data still explainable (or re-seed documented)  



**Not in this phase**



- REST routes, auth, UI  



---



### Phase 3 — HTTP API: reads



**Goal:** Stable read contract before writes.



**Deliverables**



- `GET /items` (pagination or simple limit)  

- `GET /items/:id` with 404 for missing id  

- Stub auth or open routes **if** documented as temporary  



**Exit criteria**



- curl/HTTP file can list and fetch one item  



**Not in this phase**



- Create/update, bulk price, OpenAPI (add when writes land)  



---



### Phase 4 — HTTP API: writes



**Goal:** Mutations with predictable errors.



**Deliverables**



- `POST /items` creates a row; body validation returns 400 with JSON errors  

- `PATCH /items/:id` updates allowed fields  

- Optional: `PATCH /items/prices/bulk` **or** defer bulk to when UI needs it  

- Consistent error envelope (shape documented in README or OpenAPI snippet)  



**Exit criteria**



- Full create → read → update cycle via HTTP only  



**Not in this phase**



- Optimistic locking (Phase 9), external sync  



---



### Phase 5 — React: browse



**Goal:** Read-only UI wired to real API.



**Deliverables**



- Page: table or list of items from `GET /items`  

- Page or drawer: item detail from `GET /items/:id`  

- One simple filter or search **or** defer filters to a later micro-PR  



**Exit criteria**



- No mutations yet; list and detail match DB  



**Not in this phase**



- Forms, bulk actions  



---



### Phase 6 — React: edit and price



**Goal:** Operator can change inventory without Postman.



**Deliverables**



- Form: create item (`POST`)  

- Form: edit item (`PATCH`)  

- Single-field or simple bulk: update list price for **selected** ids or CSV v0  



**Exit criteria**



- Create and edit flows work against dev API + DB  



**Not in this phase**



- Discogs/Shopify, conflict UI  



---



### Phase 7 — Discogs integration (slice 1)



**Goal:** One honest path to Discogs; no Shopify yet.



**Deliverables**



- Config: token stored in env; app fails fast if missing in “sync enabled” mode  

- Map internal item fields → Discogs listing payload (document mapping in README)  

- Column or table: sync status per item (`never` / `listed` / `error` + message)  

- Manual or button-triggered “sync this item” (in-process HTTP call is OK)  



**Exit criteria**



- One item can be pushed or updated on Discogs in dev; error state visible in UI or API  



**Not in this phase**



- Queue, backoff, Shopify  



---



### Phase 8 — Discogs hardening + Shopify slice 1



**Goal:** Resilience for Discogs; start Shopify as a separate thin slice.



**Deliverables**



- Discogs: basic retry/backoff on 429 or transient failures (log outcome)  

- Shopify: env config + create/update **one** product or variant from an internal item  

- Shopify: stored external id or status on item (mirror Discogs pattern)  



**Exit criteria**



- Failed Discogs call leaves item in `error` state with message  

- One item appears in Shopify test store after sync  



**Not in this phase**



- Webhooks, bi-directional conflict resolution  



---



### Phase 9 — Concurrency and integrity (product)



**Goal:** Server behavior matches the story you will test in Phase 11.



**Deliverables**



- Optimistic locking **or** documented row-lock strategy on `PATCH /items/:id`  

- Rule: bulk price update vs sync (document order: e.g. sync reads version after write)  

- Structured log line when conflict or version mismatch occurs  



**Exit criteria**



- README lists 2–3 scenarios (concurrent PATCH, bulk + sync) and how the API behaves  



**Not in this phase**



- Automated integrity suite (Phase 11)  



---



### Phase 10 — Quality platform (incremental)



**Goal:** Add testing machinery in thin layers; each bullet can be its own PR.



**Deliverables**



- Factory or builder: `makeItem(overrides?)` for tests  

- Test DB: migrate + reset script used by integration tests (truncate or template)  

- One integration test: repository or API hits real Postgres in CI  

- Playwright: `@smoke` vs `@full` (or two projects) in config  

- One contract test: stub Discogs **or** Shopify HTTP (assert path + body shape on happy path)  



**Exit criteria**



- CI: smoke runs on every push; full suite on main or nightly (your choice, documented)  



**Not in this phase**



- Full parallel isolation, full contract matrix  



---



### Phase 11 — “Inventory integrity under change” tests



**Goal:** Three sharp scenarios, not a giant matrix.



**Deliverables**



- Test A: bulk price update while sync is in flight — assert DB + status fields (no silent overwrite)  

- Test B: two concurrent updates — assert 409/conflict **or** single winner per spec  

- Test C: external API error mid-sync — assert retry or terminal `error` state + recover on next success  

- Runbook snippet: commands for smoke vs full, where traces/screenshots go  



**Exit criteria**



- All three run in **full** CI tier; linked from README or portfolio  



**Not in this phase**



- Performance/load testing  



---



## 4) Suggested sequencing notes



| If you need… | Do this earlier |

|--------------|-----------------|

| Demo fast | Phases 0–6; fake `listed_on_discogs` flag before Phase 7 |

| Interview narrative on testing | Start Phase 10 after Phase 4; add Phase 11 when Phase 9 exists |

| Less integration pain | Contract stub (Phase 10) before deep Phase 8 |



---



## 5) Open decisions (fill in as you go)



**Locked for v1**

- **Inventory model:** One `items` table; stock and sales are **vinyl only** (no misc SKUs or multi-type catalog).



**Locked**

- ORM: **Prisma**
- Auth model: **Single tenant**
- Job runner: **In-process async function** (no queue/Redis)
- Hosting: **Railway** (free tier, PostgreSQL addon)
- Node version: **v22 (latest LTS)**
- Package manager: **pnpm**
- Monorepo: **pnpm workspaces**
- API framework: **Express**
- CI: **GitHub Actions**
- Pagination: **Offset** (`?page=1&limit=20`)
- UI: **Tailwind + shadcn/ui**
- Discogs dev token: defer to Phase 7


