---
title: Copilot Instructions for geminitestapp
last_updated: 2026-03-26
scope: next.js, monorepo, full-stack
---

# Copilot Instructions for geminitestapp

This repository is a large Next.js App Router platform with an admin system, CMS frontend, REST API surface, Expo mobile app, and shared packages. These instructions help Copilot sessions understand the architecture and conventions.

## Running the Application

### Development

```bash
npm run dev                 # Start root Next.js app (http://localhost:3000)
npm run dev:mobile         # Start Expo development server
npm run typecheck          # TypeScript check (incremental, faster than baseline)
npm run typecheck:baseline # Full TypeScript check (clears cache first)
npm run lint               # ESLint on src/ (8GB heap)
npm run lint:baseline      # ESLint with 12GB heap for larger changes
```

### Building

```bash
npm run build              # Build Next.js app (runs prebuild cleanup first)
npm run build:webpack      # Build with webpack fallback
npm run start              # Run production server
```

### Testing

```bash
npm run test               # Run all unit tests (vitest, jsdom)
npm run test:unit          # Explicit unit test alias
npm run test:unit:domains  # Unit tests grouped by domain with timing
npm run test:critical-flows # Core workflow tests
npm run test:e2e           # Playwright e2e tests (starts npm run dev unless PLAYWRIGHT_USE_EXISTING_SERVER=true)
```

**Running a single test:**

```bash
# Unit test
npx vitest run --project unit src/features/products/__tests__/example.test.ts

# E2E test
node scripts/testing/run-playwright-suite.mjs e2e/features/products/example.spec.ts

# Specific e2e test by grep pattern
node scripts/testing/run-playwright-suite.mjs e2e/features/products/example.spec.ts --grep "pattern"
```

### Architecture Validation

```bash
npm run metrics:collect    # Collect baseline metrics (modules, routes, etc.)
npm run metrics:hotspots   # Identify coupling hotspots
npm run check:factory-meta # Verify query factory metadata
npm run bun:check:architecture-guardrails  # Check architecture constraints
npm run bun:check:docs-structure # Validate docs organization
```

## High-Level Architecture

### Workspace Structure

- **Root app** (`src/`, `src/app/`, `src/features/`, `src/shared/`): Next.js web + admin + API
- **Mobile app** (`apps/mobile/`): Expo Router app for iOS, Android, and web preview
- **Packages**:
  - `packages/kangur-contracts`: Shared DTOs and cross-platform schemas
  - `packages/kangur-core`: Domain logic (learner, game, profile)
  - `packages/kangur-api-client`: Transport layer for Kangur HTTP APIs
  - `packages/kangur-platform`: Platform integration and runtime boundaries

### Route Topology

- **Admin** (`src/app/(admin)/admin`): Authenticated user-gated platform (ChatBot, AI Paths, Image Studio, CMS, etc.)
- **Frontend** (`src/app/(frontend)`): Public CMS pages and learner experience
- **Auth** (`src/app/auth`): Sign-in and registration pages
- **API** (`src/app/api`): 285+ REST routes across 30+ feature domains

### Key Runtime Components

- **Server**: Uses custom `server.cjs` instead of Next CLI (enforces Node >=20.9, <24)
- **Instrumentation** (`src/instrumentation.ts`): Loads Node-specific setup, database validation, queue init, error handlers
- **Proxy** (`src/proxy.ts`): Routes `/admin/:path*` and `/api/:path*` with auth/CSRF handling
- **Root layout** (`src/app/layout.tsx`): Wires 10+ global providers (Query, Session, Theme, CSRF, Background Sync, etc.)

### Feature Architecture (27 domains)

Major feature areas:

- **AI**: `agentcreator`, `ai-paths`, `chatbot`, `image-studio`, `insights`, `ai-context-registry`, `agent-runtime`
- **Platform**: `cms`, `products`, `files`, `integrations`, `database`, `kangur`, `notesapp`
- **Tools**: `drafter`, `filemaker`, `case-resolver`, `prompt-engine`, `prompt-exploder`, `viewer3d`

Verify structure with `docs/README.md` and `docs/platform/` hierarchy.

### Data Layer

- **Primary DB**: MongoDB (required at startup via `src/instrumentation.ts`)
- **Optional Cache**: Redis (queue fallback to inline if unavailable)
- **Database Engine Policy** (`src/shared/lib/db`): Per-service provider routing, policy flags, backup scheduling
- **Auth Provider**: NextAuth v5 beta with Mongo adapter, configurable via `src/shared/lib/auth/services/auth-provider.ts`

### Async Work and Queues

- **BullMQ + ioredis**: Queue infrastructure in `src/shared/lib/queue`
- **Job families**: Product AI, AI Paths runs, chatbot, agent runtime, image studio, DB backup, Tradera sync, CMS imports
- **Fallback**: Without Redis, jobs execute inline (controlled by `AI_JOBS_INLINE`)
- **AI Paths specifics**: Default concurrency 3, timeout 10 minutes, recovery for stale runs, Brain-gated startup

## Key Conventions

### Feature Boundaries

Enforce via ESLint (`docs/platform/architecture-guardrails.md`):

- App routes must import feature logic via **`public.ts`** or **`server.ts`** entrypoints
- Examples: `src/features/products/public.ts`, `src/features/cms/server.ts`
- Deep cross-feature imports are blocked; use entrypoints

### Query and Data Fetching (TanStack Query Factory Pattern)

This codebase enforces a **mandatory factory abstraction** on all data fetching:

#### Required API: Factory Creators

Instead of raw `useQuery`/`useMutation`, use:

- **`createListQueryV2`**: Fetch and cache list data
- **`createSingleQueryV2`**: Fetch and cache single-item detail data
- **`createInfiniteQueryV2`**: Fetch paginated/infinite scroll data
- **`createMutationV2`**: Generic mutations (create, update, action, delete)
- **`createCreateMutationV2`**: Wrapper for create-only mutations
- **`createUpdateMutationV2`**: Wrapper for update-only mutations
- **`createDeleteMutationV2`**: Wrapper for delete-only mutations
- **`createSuspenseQueryV2`** / **`createSuspenseInfiniteQueryV2`**: Suspense variants

Server-side helpers (not hooks):

- **`fetchQueryV2`**: Server-side eager fetch
- **`prefetchQueryV2`**: Prefetch into client queryClient
- **`ensureQueryDataV2`**: Ensure data exists (fetch if missing)

#### Forbidden Pattern

❌ **Never use raw TanStack Query outside the factory layer**:
```typescript
// FORBIDDEN:
const data = useQuery({ queryKey, queryFn })
const data = queryClient.fetchQuery({ ... })
const data = queryClient.prefetchQuery({ ... })
const data = queryClient.ensureQueryData({ ... })
```

These are intercepted by linters and architecture checks.

#### Factory Metadata (Required)

Every factory creator **must** include a `meta` object:

```typescript
export function useProducts() {
  return createListQueryV2({
    queryKey: QUERY_KEYS.products(),
    queryFn: fetchProducts,
    meta: {
      source: 'features.products.hooks.useProducts',  // File path + function
      operation: 'list',                              // 'list' | 'detail' | 'infinite' | 'create' | 'update' | 'delete' | 'action'
      resource: 'products',                           // Singular resource name
      domain: 'products',                             // Domain name
      description: 'Fetches all products with pagination',  // Optional
      tags: ['products', 'admin'],                     // Optional
      criticality: 'high',                            // Optional: 'low' | 'normal' | 'high' | 'critical'
    },
  });
}
```

**Meta fields:**
- `source`: `feature.subdir.hooks.functionName` (used for telemetry and debugging)
- `operation`: Must match `TanstackRequestOperation` type (list, detail, infinite, polling, create, update, delete, action, upload)
- `resource`: Singular noun of what's being fetched (e.g., "product", not "products")
- `domain`: One of: products, ai_paths, cms, database, auth, files, kangur, etc. (full list in types)
- `description`, `tags`, `criticality`, `samplingRate`, `logError`: Optional telemetry hints

#### Query Key Pattern

Use centralized `QUERY_KEYS` object:

```typescript
// src/shared/lib/query-keys.ts
const QUERY_KEYS = {
  products: {
    all: () => ['products'],
    list: (filters: Record<string, unknown>) => ['products', 'list', filters],
    detail: (id: string) => ['products', id],
  },
};

// In your hook:
const { data } = createListQueryV2({
  queryKey: QUERY_KEYS.products.list({ page: 1, sort: 'name' }),
  queryFn: ({ queryKey }) => fetchProducts(queryKey[2]), // Destructure filters from key
  // ...
});
```

Query key formats follow TanStack conventions: first element is resource, then discriminators.

#### Query Key Exports

Common keys are pre-exported in `src/shared/lib/query-key-exports.ts`:

```typescript
export const productKeys = QUERY_KEYS.products;
export const cmsKeys = QUERY_KEYS.cms;
export const dbKeys = QUERY_KEYS.system.databases;
// ... etc
```

Import these instead of defining your own:

```typescript
import { productKeys } from '@/shared/lib/query-key-exports';

export function useProducts() {
  return createListQueryV2({
    queryKey: productKeys.list({ page: 1 }),
    // ...
  });
}
```

#### Invalidation Patterns

Mutations should invalidate queries via `invalidateKeys`:

```typescript
export function useCreateProduct() {
  return createCreateMutationV2({
    mutationFn: createProductApi,
    meta: { /* ... */ },
    invalidateKeys: [
      QUERY_KEYS.products.all(),  // Invalidate all product queries
      QUERY_KEYS.products.list({ page: 1 }),
    ],
    // Optionally use invalidate() for complex patterns:
    // invalidate: (queryClient) => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all() }),
  });
}
```

#### Telemetry and Observability

Metadata powers automatic telemetry:

- Query/mutation lifecycle events (start, success, error, retry, cancel)
- Performance metrics: duration, attempt count
- Sampled logging based on `criticality` and `samplingRate`
- Structured error categorization
- Request tracing via context

**View telemetry**: Check `/admin/analytics` and `/admin/system` dashboards for query performance and error rates.

#### Validation

```bash
npm run check:factory-meta          # Find factories missing metadata
npm run check:factory-meta:strict   # Fail on any missing metadata (CI)
```

Both scan `src/` for all `create*QueryV2`, `create*MutationV2` calls and verify `meta` is present.

If a check fails, add the missing `meta` object to your factory creator.

### File and Media Handling

- **Local uploads**: `public/uploads`
- **Storage routing**: `src/shared/lib/files/services/storage/file-storage-service.ts`
- **Configurable sources**: Local or FastComet (env-driven)
- **Remote CDNs**: ImageKit, Baselinker patterns in Next config
- **Settings resolution**: DB settings + env fallbacks

### TypeScript

- Strict mode enabled across the app
- Config: `tsconfig.json`, `tsconfig.eslint-src.json`, `tsconfig.eslint-tests.json`
- Heap flag: `NODE_OPTIONS='--max-old-space-size=8192'` in build script (locked, do not modify)

### Testing Conventions

- **Unit/Integration**: Vitest with jsdom, colocated in `__tests__/` directories
- **E2E**: Playwright specs under `e2e/features/`
- **File parallelism disabled** in `vitest.config.ts` (colocated DB/queue concerns)
- **Playwright startup**: Runs `npm run dev` unless `PLAYWRIGHT_USE_EXISTING_SERVER=true`

### API Routes

- **RESTful**: GET, POST, PUT, DELETE with NextResponse
- **Error handling**: Structured error responses with meaningful HTTP codes
- **Validation**: Zod schemas for all inputs
- **Grouping**: Feature-scoped directories (e.g., `/api/products/`, `/api/ai-paths/`)

### Component and UI Patterns

- **Shared design system**: `src/shared/ui` (used across admin pages)
- **Admin layout**: `src/app/(admin)/layout.tsx` requires session, redirects to `/auth/signin`
- **Client directives**: Intentional use of `"use client"` for interactive components
- **Radix + Tailwind CSS v4**: Design system foundation

### Observability

- **Structured logging** in `src/shared/lib/observability`
- **System activity and logs**: Admin UI (`/admin/system`) and API endpoints
- **Runtime context**: Hydrated in logs for request tracing
- **AI Paths analytics**: Redis-backed with run telemetry
- **Alert system**: System log alerts via queue

### Security

- **CSRF protection**: Cookie + fetch header patching in `CsrfProvider`
- **URL normalization**: Client-side guard in `UrlGuardProvider`
- **Scraper defense**: `server.cjs` guard (env-controlled: `SCRAPER_GUARD_*`)
- **Credential encryption**: `INTEGRATION_ENCRYPTION_KEY` for integration secrets
- **Security headers**: CSP and headers in `next.config.mjs` (locked, do not modify)

### Environment Variables

Critical variables are documented in `GEMINI.md` and `.env.example`:

- **Core**: `NODE_ENV`, `MONGODB_URI`, `MONGODB_DB`, `REDIS_URL`, `NEXT_PUBLIC_APP_URL`
- **Auth**: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_DEBUG`
- **AI**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- **Queue**: `AI_JOBS_INLINE`, `AI_PATHS_RUN_CONCURRENCY`, `AI_PATHS_JOB_TIMEOUT_MS`
- **Files**: `FASTCOMET_STORAGE_*`, `IMAGEKIT_ID`

Do not commit secrets; use `.env` locally (in `.gitignore`).

### Locked Files (Do Not Modify Without User Approval)

- `next.config.mjs` — Next.js build config
- `package.json` `"build"` script — heap size and runtime policy
- `tsconfig.json` — TypeScript compiler config
- `vercel.json` — Vercel deployment (if present)

These are enforced constraints; ask the user before changing them.

## Documentation References

- **Platform overview**: `docs/README.md`, `README.md`
- **Deep architecture**: `GEMINI.md` (this session auto-includes it as custom instruction)
- **Developer handbook**: `docs/platform/developer-handbook.md`
- **Component patterns**: `docs/platform/component-patterns.md`
- **Architecture guardrails**: `docs/platform/architecture-guardrails.md`
- **Best practices**: `docs/platform/best-practices.md`
- **AI Paths**: `docs/ai-paths/overview.md`, `docs/ai-paths/reference.md`
- **Kangur (mobile/learner)**: `docs/kangur/README.md`
- **Mobile setup**: `apps/mobile/README.md`

Generated docs (run scripts to refresh):

- AI Paths semantic grammar: `npm run docs:ai-paths:semantic:generate`
- AI Paths tooltips: `npm run docs:ai-paths:tooltip:generate`
- Validator reference: `npm run docs:validator:generate`

## Artifact Storage

For transient diagnostics, logs, and build artifacts (not for committing):

- Use `tmp/gemini/` directory
- Examples: `tsc_errors.txt`, `test-results.json`, one-off diagnostics
- Clean up before finishing your task

## Working Effectively

1. **Use GEMINI.md**: This repo auto-includes it as custom instruction—leverage it for architecture details
2. **Check entrypoints**: When working across features, use `public.ts`/`server.ts` over deep imports
3. **Verify locks**: Before modifying `next.config.mjs`, `package.json` build script, `tsconfig.json`, or `vercel.json`, ask the user first
4. **Run checks**: After refactoring architecture, run `npm run metrics:collect` and `npm run bun:check:architecture-guardrails`
5. **Database ready**: Ensure MongoDB is running; `src/instrumentation.ts` validates it at startup
6. **Test locally**: E2E tests start `npm run dev` unless you set `PLAYWRIGHT_USE_EXISTING_SERVER=true`
7. **Factory metadata**: Query/mutation factories require metadata; run `npm run check:factory-meta:strict` to verify
8. **Workspace commands**: Mobile and packages use `npm run <cmd> --workspace @kangur/<name>`

## Common Issues

### Build Fails with Heap Error

Increase heap size in the build command or use `npm run build:hi-mem`.

### TypeScript Errors on Incremental Check

Run `npm run typecheck:baseline` to clear incremental cache.

### E2E Tests Timeout

Ensure `npm run dev` is running, or set `PLAYWRIGHT_USE_EXISTING_SERVER=true` and start the server separately.

### Query Factory Metadata Errors

Run `npm run check:factory-meta:strict` to find missing metadata, then add it via factory helpers.

### ESLint Cross-Feature Import Errors

Use feature `public.ts` or `server.ts` entrypoints, not deep imports from feature internals.

---

**For questions or additions, refer to the docs and platform architecture guardrails.**
