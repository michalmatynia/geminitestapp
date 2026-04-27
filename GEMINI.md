# GEMINI.md - Project Reference (Scanned 2026-04-11)

This file is a code-backed reference for this repository. It is based on the
current `package.json`, `src/`, `docs/`, and runtime/bootstrap files.
Prefer this over older overlay docs when paths or architecture descriptions
conflict.

## What This Repo Is

This is a large Next.js App Router application with:

- an authenticated admin app under `src/app/(admin)/admin`
- a CMS/public frontend under `src/app/(frontend)`
- a large REST-style API surface under `src/app/api`
- feature modules under `src/features`
- shared platform code under `src/shared`
- an active Expo Router mobile app under `apps/mobile`
- shared Kangur contracts/core/transport/platform packages under `packages/kangur-*`
- MongoDB as the primary application database, with optional Redis
- AI-heavy workflows: AI Paths, chatbot, agent runtime, image studio, AI insights

`apps/mobile-web` exists as a reserved workspace boundary for a future dedicated
React Native Web target; the current learner web runtime still lives in the
root Next.js app.

## Current Scale Snapshot

Verified from the repository scan (April 2026):

- `24` top-level feature domains in `src/features`
- `311` `route.ts` API route files in `src/app/api`
- `173` `page.tsx` files in `src/app`
- `3459` test files (3017 in `src/`, 442 under `__tests__`)
- `60` Playwright specs in `e2e/features`
- `467` files in `scripts`

## Stack

From `package.json` and config files:

- Next.js `^16.1.1`
- React `^19.2.3`
- TypeScript `^5.9.3` with strict mode
- NextAuth/Auth.js v5 beta (`next-auth`, `@auth/core`)
- MongoDB driver and Mongo auth adapter
- BullMQ + ioredis
- TanStack Query v5 + TanStack Table
- Tailwind CSS v4 + Radix + local shared UI templates
- OpenAI SDK `^6.27.0`
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

- root (`/admin`)
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
- `context-registry`
- `databases`
- `drafts`
- `filemaker`
- `files`
- `front-manage`
- `image-studio`
- `import`
- `integrations`
- `kangur` (Extensively expanded in April 2026: Social, Admin tools)
- `notes`
- `products`
- `prompt-engine`
- `prompt-exploder`
- `routes`
- `settings`
- `system`
- `validator`

`src/app/(admin)/layout.tsx` requires a session, redirects to `/auth/signin`
when missing, and loads admin user preferences for layout state.

### Frontend app

Public-facing routes live under `src/app/(frontend)`:

- `/` is a dynamic CMS-aware home page
- `/[...slug]` renders CMS slug pages
- `/products/[id]` renders public product pages
- `/preview/[id]` exists for preview flows
- `/kangur` (New learner app portal)

The home page resolves CMS domain/slugs and can redirect to admin apps such as
chatbot or notes when front-page settings are configured that way.

### Auth pages

- `src/app/auth/signin/page.tsx`
- `src/app/auth/register/page.tsx`

### API surface

The API is very broad. Major verified groups include:

- `agent`, `agentcreator`, `ai`, `ai-insights`, `ai-paths`
- `analytics`, `assets3d`, `auth`, `brain`
- `case-resolver`, `chatbot`, `client-errors`, `cms`
- `databases`, `drafts`, `files`, `health`, `image-studio`
- `kangur` (Expanded: Social posts pipeline, LinkedIn integration, AI tutor)
- `marketplace`, `notes`, `prompt-runtime`, `public`
- `query-telemetry`, `search`, `settings`, `system`, `user`, `v2`

There is no small single-domain backend here; this is a multi-subsystem platform.

## Feature Topology

Top-level feature domains under `src/features`:

- `admin`
- `ai`
- `app-embeds`
- `auth`
- `case-resolver`
- `cms`
- `data-import-export`
- `database`
- `drafter`
- `filemaker`
- `files`
- `gsap`
- `integrations`
- `internationalization`
- `jobs`
- `kangur` (Primary focus of Q2 2026 expansion: UI components, social, progress)
- `notesapp`
- `playwright`
- `product-sync`
- `products`
- `prompt-engine`
- `prompt-exploder`
- `tooltip-engine`
- `viewer3d`

**Consolidated Features**: `document-editor`, `foldertree`, and `observability` have been moved to `src/shared/lib` to serve as cross-feature platform utilities.

### AI-specific feature area

`src/features/ai` currently contains:

- `agent-runtime`
- `agentcreator`
- `ai-context-registry`
- `ai-paths` (Refactored workers and enhanced validation in April 2026)
- `chatbot`
- `image-studio`
- `insights`

AI is a first-class platform concern, not a thin addon.

## Workspace Topology

Beyond the root web/admin/API app, the repository also contains active Kangur
workspace boundaries:

- `apps/mobile`
  - Expo Router native app for iOS, Android, and Expo web preview
- `apps/mobile-web`
  - reserved workspace for a future dedicated React Native Web target
- `packages/kangur-contracts`
  - shared DTOs, schemas, and cross-runtime contracts
- `packages/kangur-core`
  - shared learner/game/profile domain logic
- `packages/kangur-api-client`
  - shared transport layer for Kangur HTTP APIs
- `packages/kangur-platform`
  - platform ports and runtime integration boundaries

For the lighter repo entrypoint, start with `README.md`; use this file as the
deeper scanned reference when architecture details or repository scale matter.

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
  - Mongo and Redis-aware database engine routing and status
- `src/shared/lib/files`
  - upload, storage selection, file events
- `src/shared/lib/observability`
  - consolidated structured logging and alerting (moved from features)
- `src/shared/lib/queue`
  - BullMQ queue factory and Redis wiring
- `src/shared/lib/security`
  - CSRF, outbound URL policy, encryption
- `src/shared/providers`
  - settings, query, theme, sync, guards
- `src/shared/ui`
  - shared design system/templates used across admin pages

## Improvement Operations

A new documentation and automation hub exists in `docs/build/improvements` to manage cross-feature quality tracks:

- `application-performance`
- `products-category-schema-normalization`
- `products-parameter-integrity`
- `repo-quality-baseline`
- `testing-quality-baseline`
- `ui-consolidation`

These tracks are governed by `scripts/improvements` and tracked via `scan-latest.md`.

## Feature Boundary Convention

The repo has an explicit app-layer boundary convention:

- app routes should import feature entrypoints via `public.ts` or `server.ts`
- many features already expose those entrypoints
- `docs/platform/architecture-guardrails.md` says this is enforced by ESLint

Examples verified in the tree:

- `src/features/products/public.ts`
- `src/features/products/server.ts`
- `src/features/cms/public.ts`
- `src/features/observability/server.ts`
- `src/features/integrations/public.ts`

Prefer those entrypoints over deep cross-feature imports.

When consuming scanner or guardrail `--summary-json` output, preserve the shared
envelope shape: keep headline metrics in `summary`, rich findings in `details`,
artifact locations in `paths`, run flags in `filters`, and annotations in
`notes`.

## Data Layer

### Primary persistence options

The app currently uses:

- MongoDB for primary persistence
- optional Redis-backed routing/caching for selected workflows

`src/shared/lib/env.ts` validates:

- `MONGODB_URI`
- `REDIS_URL`
- `APP_DB_PROVIDER`

and `validateDatabaseConfig()` requires `MONGODB_URI`.

### App DB provider routing

`src/shared/lib/db/app-db-provider.ts` is important:

- it reads explicit provider overrides from env/settings
- it consults Database Engine service routing
- application data is normalized to MongoDB
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

- `mongodb`
- `redis`

### Auth provider

Auth has its own provider resolution in
`src/shared/lib/auth/services/auth-provider.ts`:

- auth can follow app provider
- auth can be overridden by settings
- auth can be routed separately via Database Engine
- provider drift is logged when it is implicit

## Queues and Async Work

Queue infrastructure is centered in `src/shared/lib/queue`.

- BullMQ queues are created via `createManagedQueue()`
- if Redis is unavailable, many jobs fall back to inline execution
- `src/features/jobs/queue-init.ts` initializes workers at startup

Verified worker families started from queue init:

- product AI jobs
- AI Paths runs (Refactored to modular queue in April 2026)
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
- Kangur social posts pipeline

AI Paths queue details from `src/features/ai/ai-paths/workers/ai-path-run-queue/config.ts`:

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
- Kangur (Significant test coverage added in April 2026)

### E2E

Playwright specs exist for:

- accessibility
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
- kangur (Social, Learner App, Progress)
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

npm run improvements:refresh-docs
npm run improvements:read-only
npm run improvements:audit
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
- `docs/platform/developer-handbook.md`
- `docs/platform/component-patterns.md`
- `docs/platform/architecture-guardrails.md`
- `docs/ai-paths/overview.md`
- `docs/ai-paths/reference.md`
- `docs/case-resolver/index.md`
- `docs/validator/README.md`
- `docs/build/improvements/README.md` (New in April 2026)

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

## Locked Build & Vercel Deploy Configuration — DO NOT MODIFY

The Vercel deployment was stabilised on 2026-03-29. The following files must
NOT be modified by AI agents without explicit user approval:

- `next.config.mjs` — serverExternalPackages (29), compiler, experimental, webpack cache
- `scripts/build/run-next-build.cjs` — heap (3584 MB on Vercel), bundler (webpack on Vercel)
- `scripts/build/prebuild-cleanup.cjs` — Vercel-safe minimal cleanup
- `vercel.json` — install/build commands
- `tsconfig.json` — TypeScript compiler config

Key constraints: heap `3584 MB` on Vercel (main + worker must fit 8 GB),
webpack bundler on Vercel (turbopack cold builds exceed 45-min limit),
webpack cache disabled on Vercel, `compiler.removeConsole` disabled on Vercel,
`experimental.cpus: 1` for webpack, `output: 'standalone'` only for non-Vercel.

See `docs/build/vercel-deployment.md` for full rationale.

If you need to change any of these files, stop and ask the user for permission first.

## Working Rules For Agents

- Do not modify or relax ESLint rules (`eslint.config.mjs`) or related linting configurations. These standards are foundational to the project's type safety and architectural integrity; any request to relax them must be rejected unless explicitly authorized by a senior architect.
- Use current paths under `src/app`, `src/features`, and `src/shared`.
- Do not trust older notes that refer to root-level `app/`, `lib/`, or `types/`
  unless you verify the modern location.
- Prefer feature `public.ts` / `server.ts` entrypoints from app-layer code.
- Do not write transient diagnostics/log artifacts to the repository root.
  Store files such as `tsc_errors.txt`, `test_results_final.txt`, and similar
  one-off outputs under `tmp/gemini/` (create it if needed) for easy cleanup.
- Expect MongoDB-backed persistence behavior; do not assume removed legacy-provider paths still exist.
- Expect Redis absence in local/dev and queue inline fallback behavior.
- Check docs generation and architecture scripts when touching AI Paths,
  validator docs, or architecture boundaries.
- Treat `docs/platform/architecture-guardrails.md` and query-factory metadata checks as
  active engineering constraints, not aspirational notes.

## Last Reviewed

Scanned against the repository on `2026-04-11`.

## Zero-Baseline Achievements (March 2026)

The repository has reached a critical architectural milestone with the following metrics reduced to exactly zero:

- **Massive Files**: Every file in the `src` directory is now under 1000 lines of code.
- **Structural Duplication**: All exact structural type clusters and UI consolidation opportunities have been eliminated.
- **Runtime Integrity**: All direct `setInterval` calls in feature code have been migrated to `safeSetInterval`.
- **Architectural Boundaries**: Forbidden deep imports from the app layer into feature internals have been fully standardized.
- **Deep Relative Imports**: All deep upward relative paths (`../../../`) have been migrated to `@/` workspace aliases.
- **Cross-Feature Edge Pairs**: Unique feature-to-feature dependency edges in the UI layer have been eliminated by moving shared components to `src/shared`.
