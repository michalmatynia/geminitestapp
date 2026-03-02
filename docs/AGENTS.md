# AGENTS.md - AI Agent Operating Guide

This is the authoritative agent guide for this repository. Keep it accurate,
code-backed, and shorter than `GEMINI.md`. Other overlay docs should defer to it.

## Read Order

1. `docs/AGENTS.md` for agent rules and repo working conventions
2. `GEMINI.md` for the deeper scanned architecture reference
3. feature docs such as `docs/AI_PATHS.md`, `docs/case-resolver/index.md`,
   or `docs/validator/README.md` when working in those areas

## Repo Snapshot

- Product: AI-forward multi-app platform with admin, CMS/public frontend, and a
  large shared API surface
- Framework: Next.js 16 App Router + React 19 + TypeScript strict mode
- Runtime: custom Node server via `server.cjs`
- Data: Prisma/Postgres, MongoDB, and optional Redis-backed queue/cache/routing
- UI/data stack: Tailwind 4, local shared UI, TanStack Query, TanStack Table
- AI stack: AI Paths, chatbot, agent runtime, AI Brain routing, image studio,
  AI insights, product AI flows

## Current Source Layout

Use current `src/` paths, not older root-level conventions.

### App routes

- Admin UI: `src/app/(admin)/admin/`
- Public/CMS frontend: `src/app/(frontend)/`
- Auth UI: `src/app/auth/`
- API routes: `src/app/api/`

### Feature modules

Top-level features live under `src/features/`, including:

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
- `integrations`
- `notesapp`
- `observability`
- `product-sync`
- `products`
- `prompt-engine`
- `prompt-exploder`
- `viewer3d`

AI subsystems are primarily under `src/features/ai/`.

### Shared platform code

Shared platform/runtime code lives under `src/shared/`, especially:

- `src/shared/contracts/`
- `src/shared/lib/ai-brain/`
- `src/shared/lib/ai-paths/`
- `src/shared/lib/db/`
- `src/shared/lib/files/`
- `src/shared/lib/observability/`
- `src/shared/lib/queue/`
- `src/shared/lib/security/`
- `src/shared/providers/`
- `src/shared/ui/`

## Runtime Reality

- Dev and prod start through `server.cjs`.
- `src/instrumentation.ts` and `src/instrumentation-node.ts` register startup
  logging, database validation, process error hooks, and queue initialization.
- `src/proxy.ts` handles `/admin/*` and `/api/*`, ensuring CSRF cookie setup and
  auth wrapping for admin flows.
- `src/app/layout.tsx` bootstraps query, settings, session, background sync,
  CSRF, URL guard, analytics, and client error reporting providers.

## Data Layer Rules

- Do not assume Prisma-only persistence.
- Do not assume Mongo-only persistence.
- App, auth, CMS, products, integrations, and other services can resolve
  providers through Database Engine routing and settings.

Key files:

- `src/shared/lib/db/app-db-provider.ts`
- `src/shared/lib/db/database-engine-policy.ts`
- `src/shared/lib/auth/services/auth-provider.ts`

Important current behavior:

- app provider can resolve from env, settings, or Database Engine routes
- if both `DATABASE_URL` and `MONGODB_URI` exist and no explicit app route is
  set, app data currently defaults to MongoDB
- auth can be routed independently from app data
- Redis is a supported Database Engine target for selected routing/caching cases,
  but not for every service

## Queue and Async Work Rules

- Queue infrastructure lives in `src/shared/lib/queue/`.
- Worker startup lives in `src/features/jobs/queue-init.ts`.
- BullMQ is used when Redis is available.
- Several workflows fall back to inline processing when Redis is absent.

Do not assume durable queue behavior in local/dev unless the relevant env is set.

High-signal worker areas:

- `src/features/ai/ai-paths/workers/`
- `src/features/ai/chatbot/workers/`
- `src/features/ai/agent-runtime/workers/`
- `src/features/ai/image-studio/workers/`
- `src/features/integrations/workers/`
- `src/features/product-sync/workers/`
- `src/features/case-resolver/workers/`
- `src/shared/lib/observability/workers/`

## Feature Boundary Rules

- Prefer feature `public.ts` / `server.ts` entrypoints from app-layer code.
- Avoid deep cross-feature imports when a public/server entrypoint already exists.
- Treat `docs/ARCHITECTURE_GUARDRAILS.md` as an active constraint, not optional reading.

Related checks:

- `npm run metrics:guardrails`
- `npm run metrics:all`
- `npm run check:factory-meta`
- `npm run check:factory-meta:strict`

## Query and State Conventions

- The preferred data-fetching layer is the shared TanStack Query factory system,
  not ad hoc direct query usage everywhere.
- See `src/shared/lib/query-factories-v2.ts`.
- Query persistence, offline support, and advanced runtime hooks are wired into
  the root query provider.

When editing feature hooks, verify they still align with shared query keys,
telemetry metadata, and invalidation conventions.

## Files, Media, and Storage

- Local uploads live under `public/uploads/`.
- Storage can switch between local and FastComet-backed remote storage.
- File storage behavior is resolved from settings and env, not only from code defaults.

Key files:

- `src/shared/lib/files/file-uploader.ts`
- `src/shared/lib/files/services/storage/file-storage-service.ts`
- `src/features/files/pages/AdminFileStorageSettingsPage.tsx`

## Testing Layout

Tests are split across:

- top-level `__tests__/`
- colocated `src/**/__tests__/`
- Playwright specs in `e2e/features/`

Do not assume a feature’s tests live in only one place.

Core commands:

```bash
npm run test
npm run test:coverage
npm run test:e2e
```

## Sensitive and Non-Authoritative Areas

- Avoid scanning `AIPrompts/` unless the task explicitly requires it.
- Avoid other agents' reasoning/result folders unless the user explicitly asks.
- Do not treat `tmp/`, ad hoc debug scripts, or one-off output files as
  authoritative architecture documentation.

## Common Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:e2e
npm run seed
npm run seed:admin
npm run auth:indexes
npm run cleanup:db-providers
npm run cleanup:cms-blocks
npm run cleanup:category-mapping-duplicates
npm run metrics:guardrails
npm run check:factory-meta
```

## Documentation Maintenance Rule

- Update `docs/AGENTS.md` when repo-wide working conventions, architecture
  boundaries, or agent rules change.
- Update `GEMINI.md` when the deeper architecture reference has drifted from the
  codebase.
- Keep `docs/CLAUDE.md` and other overlays shorter than this file.

## Last Updated

Aligned to the scanned repo structure on `2026-03-02`.
