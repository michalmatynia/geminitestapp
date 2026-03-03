# GEMINI.md - Project Reference (Scanned 2026-03-02)

This file is a code-backed reference for this repository. It is based on the
current `package.json`, `src/`, `prisma/`, `docs/`, and runtime/bootstrap files.
Prefer this over older overlay docs when paths or architecture descriptions
conflict.

## What This Repo Is

This is a large Next.js App Router application with:

- an authenticated admin app under `src/app/(admin)/admin`
- a CMS/public frontend under `src/app/(frontend)`
- a large REST-style API surface under `src/app/api`
- feature modules under `src/features`
- shared platform code under `src/shared`
- mixed data backends: Prisma/Postgres, MongoDB, and optional Redis
- AI-heavy workflows: AI Paths, chatbot, agent runtime, image studio, AI insights

## Current Scale Snapshot

Verified from the repository scan:

- `27` top-level feature domains in `src/features`
- `319` `route.ts` API route files in `src/app/api`
- `136` `page.tsx` files in `src/app`
- `362` test files under top-level `__tests__`
- `21` Playwright specs in `e2e/features`
- `62` files in `scripts`

## Stack

From `package.json` and config files:

- Next.js `^16.1.1`
- React `^19.2.3`
- TypeScript `^5.9.3` with strict mode
- Prisma `^7.3.0`
- NextAuth/Auth.js v5 beta (`next-auth`, `@auth/core`)
- MongoDB driver and Mongo auth adapter
- BullMQ + ioredis
- TanStack Query v5 + TanStack Table
- Tailwind CSS v4 + Radix + local shared UI templates
- OpenAI SDK `^6.15.0`
- GSAP, Three.js, TipTap, Zod

## Runtime Boot Path

### Server

- Dev and production both run through `server.cjs`, not the default Next CLI.
- `server.cjs` enforces Node `>=20.9` and explicitly rejects Node 24+ for dev.
- The custom server also normalizes malformed host-prefixed URLs, applies a
  scraper guard, and wraps redirect headers defensively.

### Next instrumentation

- `src/instrumentation.ts` loads `src/instrumentation-node.ts` for Node runtime.
- Node instrumentation validates database configuration at startup.
- It registers shared logging hooks, global process error handlers, and queue
  initialization.

### Proxy / auth edge behavior

- `src/proxy.ts` matches `/admin/:path*` and `/api/:path*`.
- API requests bypass auth enforcement there, but still get a CSRF cookie.
- Admin page requests go through the auth wrapper when available.

### Root provider stack

`src/app/layout.tsx` wires:

- `ToastProvider`
- `QueryProvider`
- `SettingsStoreProvider`
- `MasterFolderTreeRuntimeProvider`
- `BackgroundSyncProvider`
- `SessionProvider`
- `ThemeProvider`
- `CsrfProvider`
- `UrlGuardProvider`
- client error reporting and page analytics tracking

This app is not a thin React shell; global settings, background sync, query
behavior, analytics, auth session, URL normalization, and CSRF protection are
all bootstrapped at the root.

## Route Topology

### Admin app

Authenticated admin routes live under `src/app/(admin)/admin`. Verified pages:

- dashboard
- `3d-assets`
- `agentcreator`
- `ai-insights`
- `ai-paths`
- `analytics`
- `app-embeds`
- `auth`
- `brain`
- `case-resolver`
- `chatbot`
- `cms`
- `databases`
- `drafts`
- `filemaker`
- `files`
- `front-manage`
- `image-studio`
- `import`
- `integrations`
- `notes`
- `products`
- `prompt-engine`
- `prompt-exploder`
- `routes`
- `settings`
- `validator`

`src/app/(admin)/layout.tsx` requires a session, redirects to `/auth/signin`
when missing, and loads admin user preferences for layout state.

### Frontend app

Public-facing routes live under `src/app/(frontend)`:

- `/` is a dynamic CMS-aware home page
- `/[...slug]` renders CMS slug pages
- `/products/[id]` renders public product pages
- `/preview/[id]` exists for preview flows

The home page resolves CMS domain/slugs and can redirect to admin apps such as
chatbot or notes when front-page settings are configured that way.

### Auth pages

- `src/app/auth/signin/page.tsx`
- `src/app/auth/register/page.tsx`

### API surface

The API is very broad. Major verified groups include:

- `ai`, `ai-insights`, `ai-paths`, `agentcreator`, `brain`
- `analytics`, `auth`, `case-resolver`, `chatbot`
- `cms`, `databases`, `drafts`, `files`, `health`
- `image-studio`, `import`, `integrations`
- `languages`, `marketplace`, `notes`, `products`
- `prompt-runtime`, `public`, `settings`, `system`, `user`, `v2`

There is no small single-domain backend here; this is a multi-subsystem platform.

## Feature Topology

Top-level feature domains under `src/features`:

- `admin`
- `ai`
- `app-embeds`
- `auth`
- `case-resolver`
- `case-resolver-capture`
- `cms`
- `data-import-export`
- `database`
- `document-editor`
- `drafter`
- `filemaker`
- `files`
- `foldertree`
- `gsap`
- `integrations`
- `internationalization`
- `jobs`
- `notesapp`
- `observability`
- `playwright`
- `product-sync`
- `products`
- `prompt-engine`
- `prompt-exploder`
- `tooltip-engine`
- `viewer3d`

### AI-specific feature area

`src/features/ai` currently contains:

- `agent-runtime`
- `agentcreator`
- `ai-context-registry`
- `ai-paths`
- `chatbot`
- `image-studio`
- `insights`

AI is a first-class platform concern, not a thin addon.

## Shared Architecture

`src/shared` is substantial and contains platform code, not just helpers.

Key areas:

- `src/shared/contracts`
  - typed cross-feature DTOs and schemas
- `src/shared/lib/ai-brain`
  - Brain admin UI, model routing, assignments, providers, server helpers
- `src/shared/lib/ai-paths`
  - shared AI Paths runtime, API helpers, semantic grammar, validation engine
- `src/shared/lib/db`
  - Prisma, Mongo, Redis-aware database engine routing and status
- `src/shared/lib/files`
  - upload, storage selection, file events
- `src/shared/lib/observability`
  - structured logging, alerts, runtime context, workers
- `src/shared/lib/queue`
  - BullMQ queue factory and Redis wiring
- `src/shared/lib/security`
  - CSRF, outbound URL policy, encryption
- `src/shared/providers`
  - settings, query, theme, sync, guards
- `src/shared/ui`
  - shared design system/templates used across admin pages

## Feature Boundary Convention

The repo has an explicit app-layer boundary convention:

- app routes should import feature entrypoints via `public.ts` or `server.ts`
- many features already expose those entrypoints
- `docs/ARCHITECTURE_GUARDRAILS.md` says this is enforced by ESLint

Examples verified in the tree:

- `src/features/products/public.ts`
- `src/features/products/server.ts`
- `src/features/cms/public.ts`
- `src/features/observability/server.ts`
- `src/features/integrations/public.ts`

Prefer those entrypoints over deep cross-feature imports.

## Data Layer

### Primary persistence options

The app supports all of the following:

- Prisma with a PostgreSQL datasource (`prisma/schema.prisma`)
- MongoDB
- optional Redis-backed routing/caching for selected workflows

`src/shared/lib/env.ts` validates:

- `DATABASE_URL`
- `MONGODB_URI`
- `REDIS_URL`
- `APP_DB_PROVIDER`

and `validateDatabaseConfig()` requires at least one primary database
configuration (`DATABASE_URL` or `MONGODB_URI`).

### App DB provider routing

`src/shared/lib/db/app-db-provider.ts` is important:

- it reads explicit provider overrides from env/settings
- it consults Database Engine service routing
- if both SQL and Mongo are present and no explicit app route is set, it
  currently defaults app data to MongoDB
- it throws when a required configured provider is missing

### Database Engine policy

`src/shared/lib/db/database-engine-policy.ts` supports:

- policy flags
- per-service provider routing
- per-collection routing
- backup schedule settings
- operation control settings

Verified service routes include:

- `app`
- `auth`
- `product`
- `integrations`
- `cms`

Verified providers include:

- `prisma`
- `mongodb`
- `redis`

### Auth provider

Auth has its own provider resolution in
`src/shared/lib/auth/services/auth-provider.ts`:

- auth can follow app provider
- auth can be overridden by settings
- auth can be routed separately via Database Engine
- provider drift is logged when it is implicit

### Prisma schema

The checked-in Prisma schema is not minimal. Verified models include platform
data for:

- products and product metadata
- settings
- system logs
- file upload events
- chatbot settings
- image files
- currencies, countries, languages
- integrations, connections, listings

Assume Prisma only covers part of the total persisted surface; Mongo-backed
collections are also used heavily across the app.

## Queues and Async Work

Queue infrastructure is centered in `src/shared/lib/queue`.

- BullMQ queues are created via `createManagedQueue()`
- if Redis is unavailable, many jobs fall back to inline execution
- `src/features/jobs/queue-init.ts` initializes workers at startup

Verified worker families started from queue init:

- product AI jobs
- AI Paths runs
- chatbot jobs
- agent runtime jobs
- database backup scheduler
- image studio run + sequence queues
- Tradera listing + relist scheduler
- Base import queue
- product sync queues
- case resolver OCR queue
- system log alerts
- AI insights queue

AI Paths queue details from `src/features/ai/ai-paths/workers/aiPathRunQueue.ts`:

- default concurrency is `3`
- default per-job timeout is `10 minutes`
- recovery scheduling exists for stale runs
- queue startup is Brain-gated
- durable queue behavior is configurable via env

## Files and Media

File handling is more advanced than a plain local upload folder.

- local uploads live under `public/uploads`
- storage source can switch between local and FastComet
- file storage settings are resolved from DB settings plus env fallbacks
- CMS media uploads go through the same file subsystem
- remote image patterns in Next config include ImageKit and Baselinker CDN

Important files:

- `src/shared/lib/files/file-uploader.ts`
- `src/shared/lib/files/services/storage/file-storage-service.ts`
- `src/features/files/pages/AdminFileStorageSettingsPage.tsx`

## Security and Runtime Hardening

Verified security/runtime controls:

- CSP and security headers in `next.config.mjs`
- CSRF cookie + fetch header patching
- client-side URL normalization guard
- scraper guard in `server.cjs`
- integration credential encryption support
- outbound URL policy helpers in `src/shared/lib/security`

Relevant env/config:

- `INTEGRATION_ENCRYPTION_KEY`
- `REDIS_TLS`
- `SCRAPER_GUARD_*`

## Observability and Analytics

Observability is a platform concern, not a side utility.

- structured system logging exists in `src/shared/lib/observability`
- system activity and system logs have admin UI and API endpoints
- process-level unhandled errors are captured during Node instrumentation
- runtime context hydration exists for logs
- AI Paths runtime analytics use Redis when available
- analytics repositories use cache versioning and Redis caching

Admin-facing observability areas include:

- dashboard health/activity
- `/admin/analytics`
- `/admin/ai-insights`
- `/admin/system`

## Query/Data-Fetching Conventions

The codebase has a strong TanStack Query abstraction layer.

- `src/shared/lib/query-factories-v2.ts` is the shared factory layer
- explicit factory metadata is part of the design
- telemetry hooks are attached to query/mutation factories
- query persistence/offline support exists in the root `QueryProvider`
- raw `queryClient.fetchQuery(...)`, `queryClient.prefetchQuery(...)`, and
  `queryClient.ensureQueryData(...)` are forbidden outside the helper layer;
  use `fetchQueryV2`, `prefetchQueryV2`, or `ensureQueryDataV2`

Related scripts:

- `npm run check:factory-meta`
- `npm run check:factory-meta:strict`

Do not assume raw `useQuery` usage is the preferred pattern in feature code.

## Testing Layout

Testing is distributed across multiple locations.

### Unit/integration

- top-level `__tests__/`
- colocated `src/**/__tests__/`
- app API tests inside `src/app/api/**/__tests__`

Notable verified concentrated areas:

- AI Paths
- image studio
- case resolver
- shared contracts/libs/security
- folder tree
- prompt exploder
- observability

### E2E

Playwright specs exist for:

- admin
- agentcreator
- ai-paths
- case-resolver
- chatbot
- cms
- data-import-export
- database
- drafter
- files
- foldertree
- integrations
- notesapp
- observability
- products
- settings
- viewer3d

### Test config

- Vitest uses `jsdom`
- file parallelism is disabled in `vitest.config.ts`
- Playwright starts `npm run dev` unless `PLAYWRIGHT_USE_EXISTING_SERVER=true`

## Commands That Matter

### Core

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:coverage
npm run test:e2e
```

### Docs / architecture / validation

```bash
npm run metrics:collect
npm run metrics:hotspots
npm run metrics:guardrails
npm run metrics:all

npm run docs:validator:generate
npm run docs:validator:check
npm run docs:ai-paths:semantic:generate
npm run docs:ai-paths:semantic:check
npm run docs:ai-paths:tooltip:generate
npm run docs:ai-paths:tooltip:check

npm run check:factory-meta
npm run check:factory-meta:strict
```

### Data / maintenance

```bash
npm run seed
npm run seed:admin
npm run auth:indexes
npm run cleanup:db-providers
npm run cleanup:cms-blocks
npm run cleanup:category-mapping-duplicates
npm run cleanup:image-studio-orphan-variants
npm run restore:base-listing-statuses
```

## Important Docs

Verified high-value docs:

- `docs/README.md`
- `docs/DEVELOPER_HANDBOOK.md`
- `docs/COMPONENT_PATTERNS.md`
- `docs/ARCHITECTURE_GUARDRAILS.md`
- `docs/AI_PATHS.md`
- `docs/AI_PATHS_EXTENDED_REFERENCE.md`
- `docs/case-resolver/index.md`
- `docs/validator/README.md`

Generated/maintained docs also exist for:

- AI Paths semantic grammar
- AI Paths tooltip catalog
- validator inventories/reference
- architecture metrics baselines

## Environment Variables To Know

### Core

```bash
NODE_ENV=
DATABASE_URL=
MONGODB_URI=
MONGODB_DB=
REDIS_URL=
APP_DB_PROVIDER=
NEXT_PUBLIC_APP_URL=
```

### Auth

```bash
NEXTAUTH_SECRET=
NEXTAUTH_URL=
AUTH_LOGGING=
AUTH_DEBUG=
AUTH_TOKEN_REFRESH_TTL_MS=
```

### AI

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OLLAMA_BASE_URL=
AI_JOBS_INLINE=
```

### Integrations / media

```bash
BASE_API_URL=
INTEGRATION_ENCRYPTION_KEY=
ALLEGRO_AUTH_URL=
ALLEGRO_TOKEN_URL=
IMAGEKIT_ID=
FASTCOMET_STORAGE_BASE_URL=
FASTCOMET_STORAGE_UPLOAD_URL=
FASTCOMET_STORAGE_DELETE_URL=
FASTCOMET_STORAGE_AUTH_TOKEN=
FASTCOMET_STORAGE_KEEP_LOCAL_COPY=
FASTCOMET_STORAGE_TIMEOUT_MS=
```

### Queue / runtime / guardrails

```bash
DISABLE_QUEUE_WORKERS=
REDIS_TLS=
AI_PATHS_RUN_CONCURRENCY=
AI_PATHS_JOB_TIMEOUT_MS=
AI_PATHS_REQUIRE_DURABLE_QUEUE=
AI_PATHS_ALLOW_LOCAL_QUEUE_FALLBACK=
SCRAPER_GUARD_ENABLED=
SCRAPER_GUARD_WINDOW_MS=
SCRAPER_GUARD_PAGE_MAX=
SCRAPER_GUARD_API_MAX=
```

## Working Rules For Agents

- Use current paths under `src/app`, `src/features`, and `src/shared`.
- Do not trust older notes that refer to root-level `app/`, `lib/`, or `types/`
  unless you verify the modern location.
- Prefer feature `public.ts` / `server.ts` entrypoints from app-layer code.
- Expect mixed persistence behavior; do not assume Prisma-only or Mongo-only.
- Expect Redis absence in local/dev and queue inline fallback behavior.
- Check docs generation and architecture scripts when touching AI Paths,
  validator docs, or architecture boundaries.
- Treat `docs/ARCHITECTURE_GUARDRAILS.md` and query-factory metadata checks as
  active engineering constraints, not aspirational notes.

## Last Reviewed

Scanned against the repository on `2026-03-02`.
