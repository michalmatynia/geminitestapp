# Data Fetching and Caching Guide

This document is the current high-level guide for data fetching and caching
behavior across the application. Treat it as policy and architecture guidance,
not as an exhaustive per-route inventory.

## Scope

The app uses both:

- server-side caching controls in Next.js route handlers and page loaders
- client-side caching and invalidation through TanStack Query

Key implementation surfaces:

- server routes: `src/app/api/`
- query factories: `src/shared/lib/query-factories-v2.ts`
- invalidation helpers: `src/shared/lib/query-invalidation.ts`
- query provider bootstrapping: `src/shared/providers/QueryProvider.tsx`
- settings store bootstrapping: `src/shared/providers/SettingsStoreProvider.tsx`
- background sync hooks: `src/shared/providers/BackgroundSyncProvider.tsx`

## Server-Side Caching Rules

Use one of these deliberately:

1. `no-store` / `force-dynamic`
   - for authenticated data
   - for operational and observability data
   - for real-time run/job status
   - for mutable configuration and security-sensitive payloads
2. `revalidate`
   - for semi-static metadata or catalog-like content
   - for content that can tolerate bounded staleness
3. `force-cache`
   - only for effectively static metadata with very low churn

Do not assume route defaults are safe. Route handlers under `src/app/api/`
should state caching intent explicitly when the route is important to UX,
security, or operations.

## Server Categories

### Usually `no-store`

- auth/session/user data
- settings and provider configuration
- system logs, system activity, diagnostics
- AI Paths runs, job state, chat sessions, live observability
- database browsing/restore/backup operations

### Usually short `revalidate`

- product list/detail data
- CMS/public content
- file/media listings
- catalogs and taxonomies
- image-studio project listings

### Usually long `revalidate` or static

- countries
- currencies
- languages
- structural metadata that rarely changes

## Client-Side Query Rules

The preferred client data layer is the shared query-factory system, not ad hoc
query usage everywhere.

Factory responsibilities:

- required telemetry metadata
- standardized stale time handling
- invalidation hooks
- optimistic update patterns
- safer wrappers around TanStack Query primitives

Common factory entrypoints:

- `createListQueryV2`
- `createSingleQueryV2`
- `createInfiniteQueryV2`
- `createMutationV2`
- `createOptimisticMutationV2`
- suspense and prefetch helpers

## Default Query Expectations

- standard UI data: moderate stale time, usually minutes not seconds
- real-time/operational data: `staleTime: 0` or explicit polling
- static metadata: longer stale windows

Pick the smallest freshness guarantee that satisfies the user flow. Do not turn
everything into real-time fetching.

## Invalidation Rules

After `POST`, `PUT`, `PATCH`, or `DELETE`:

1. invalidate client query keys deliberately
2. use centralized helpers when available
3. revalidate server paths/tags when route or page cache semantics require it

Prefer shared invalidation helpers over scattered bespoke key handling.

## Root Runtime Considerations

Caching behavior is influenced by the root provider stack:

- `QueryProvider` enables shared query lifecycle behavior
- query persistence is enabled for selected query keys
- offline support is initialized at the root query layer
- `BackgroundSyncProvider` can refresh system state on a timed cadence
- `SettingsStoreProvider` separates admin and lite settings fetch behavior

When debugging stale data, inspect both route-level caching and query-provider
behavior before assuming a single source of truth.

## Verification Commands

```bash
npm run check:factory-meta
npm run check:factory-meta:strict
npm run metrics:hotspots
```

If you need route-by-route confirmation, inspect the actual handler/page files
under `src/app/api/` and `src/app/(frontend)/` rather than relying on old
manual audit tables.
