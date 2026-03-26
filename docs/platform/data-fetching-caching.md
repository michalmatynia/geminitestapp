---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'platform'
canonical: true
---

# Data Fetching & Caching Strategy

> **Status**: Active shared-query policy
> **Architecture**: Query Factories v2 on top of TanStack Query v5

This document outlines the current shared approach for data fetching, caching,
and query telemetry across the application. The preferred lane is the custom
`Query Factories v2` layer on top of TanStack Query:

1.  **Unified Telemetry**: Automatic tracking of query lifecycle events (start, success, error, retry) with domain-specific metadata.
2.  **Type Safety**: Strict TypeScript enforcement for query keys, response types, and error handling.
3.  **Declarative Invalidation**: Centralized and predictable cache invalidation logic attached directly to mutations.
4.  **Reduced Boilerplate**: Standardized patterns for common operations (lists, details, infinite scrolling, optimistic updates).

New feature hooks and reusable shared hooks should prefer the v2 factory layer.
Direct TanStack hooks still exist inside the shared helper implementation and
some lower-level abstractions, so do not read this document as a literal claim
that raw `useQuery`/`useMutation` calls never appear anywhere in the repo.

---

## Core Concepts

### 1. Query Factories v2

The preferred shared abstraction lives in
`@/shared/lib/query-factories-v2`. Use it for feature-facing queries,
mutations, and manual cache interactions so telemetry and metadata stay
consistent.

#### Available Factories

| Factory | Purpose |
| :--- | :--- |
| `createListQueryV2` | Fetching arrays or collections of items. |
| `createSingleQueryV2` | Fetching a single item by ID. |
| `createPaginatedListQueryV2` | Fetching paginated lists with count metadata. |
| `createInfiniteQueryV2` | Infinite scrolling lists (e.g., logs, chats). |
| `createMultiQueryV2` | Fetching multiple independent queries in parallel. |
| `createSuspenseQueryV2` | Suspense-enabled single query. |
| `createMutationV2` | Standard mutations (CREATE, UPDATE, DELETE). |
| `createOptimisticMutationV2` | Mutations with automatic optimistic UI updates and rollback. |
| `createSaveMutationV2` | Helper for "upsert" logic (POST if new, PUT if exists). |
| `ensureQueryDataV2` | Telemetrized manual ensure/fetch-if-missing helper. |
| `fetchQueryV2` | Telemetrized manual fetching (async/await). |
| `prefetchQueryV2` | Telemetrized manual prefetching. |
| `useEnsureQueryDataV2` / `useFetchQueryV2` / `usePrefetchQueryV2` | Hook aliases for manual helpers when a local `QueryClient` should be resolved automatically. |

### 2. Mandatory Metadata (`meta`)

Every factory call MUST include a `meta` object. This data is used by our observability layer to track performance and errors.

```typescript
meta: {
  source: 'feature.hooks.useMyData', // Traceable source location
  operation: 'list',                 // 'list' | 'detail' | 'create' | 'update' | 'delete' | 'action'
  resource: 'feature.resource',      // Logical resource name
  domain: 'my_domain',               // High-level domain (e.g., 'products', 'auth', 'integrations')
  tags: ['feature', 'list'],         // Searchable tags
}
```

`meta.description` should also be present and specific. The factory metadata
checker warns on missing or generic descriptions because they reduce debugging
and observability value.

For the current domain union, use
[`src/shared/lib/tanstack-factory-v2.types.ts`](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/src/shared/lib/tanstack-factory-v2.types.ts)
as the source of truth rather than copying a hand-maintained list into docs.

### 3. Declarative Invalidation

Mutations should declare their side effects using `invalidateKeys` or the `invalidate` callback. Avoid manual `useQueryClient` calls in components.

```typescript
// Simple invalidation
invalidateKeys: [QUERY_KEYS.products.all],

// Dynamic invalidation based on mutation result
invalidateKeys: (data, variables) => [
  QUERY_KEYS.products.detail(data.id),
  QUERY_KEYS.products.lists()
],

// Complex logic (if absolutely necessary)
invalidate: async (queryClient, data, variables) => {
  // perform complex cache updates
}
```

---

## Usage Examples

### Fetching a List

```typescript
export function useProducts(filters: ProductFilters) {
  const queryKey = QUERY_KEYS.products.list(filters);
  
  return createListQueryV2<Product[]>({
    queryKey,
    queryFn: () => api.getProducts(filters),
    staleTime: 60_000,
    meta: {
      source: 'products.hooks.useProducts',
      operation: 'list',
      resource: 'products',
      domain: 'products',
      queryKey,
      tags: ['products', 'list'],
    },
  });
}
```

### Optimistic Update Mutation

```typescript
export function useUpdateProductMutation() {
  return createOptimisticMutationV2<Product, UpdateProductInput>({
    mutationFn: (data) => api.updateProduct(data),
    queryKey: QUERY_KEYS.products.detail(data.id),
    updateFn: (old, newData) => ({ ...old, ...newData }), // Optimistic apply
    meta: {
      source: 'products.hooks.useUpdateProduct',
      operation: 'update',
      resource: 'products',
      domain: 'products',
      tags: ['products', 'update'],
    },
    invalidateKeys: (data) => [QUERY_KEYS.products.detail(data.id)],
  });
}
```

### Manual Fetching

Raw `queryClient.fetchQuery(...)`, `queryClient.prefetchQuery(...)`, and
`queryClient.ensureQueryData(...)` are forbidden outside the shared helper
implementation files:

- [`src/shared/lib/query-factories-v2.ts`](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/src/shared/lib/query-factories-v2.ts)
- [`src/shared/lib/tanstack-factory-v2/executors.ts`](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/src/shared/lib/tanstack-factory-v2/executors.ts)

Use `fetchQueryV2`, `prefetchQueryV2`, `ensureQueryDataV2`, or their hook
aliases instead.

```typescript
const refreshData = async () => {
  await fetchQueryV2(queryClient, {
    queryKey: QUERY_KEYS.myResource.all,
    queryFn: api.getMyResource,
    meta: { /* ... */ }
  })();
}
```

---

## Testing & Validation

We enforce the factory metadata and manual-query helper rules via a custom
script. Run this command to verify compliance:

```bash
npm run check:factory-meta
```

This script checks:
1.  All v2 factory calls have a `meta` object.
2.  Factory and multi-query descriptors include a `domain`.
3.  `meta.description` is present and not just a low-signal placeholder.
4.  Synthetic `['factory-meta', ...]` query keys are not used.
5.  Raw manual query execution calls (`.fetchQuery`, `.prefetchQuery`,
    `.ensureQueryData`) are not used outside the telemetrized helper
    implementation files.

---

## Migration Guide

When refactoring legacy `useQuery` or `useMutation` hooks:

1.  **Identify the Pattern**: Is it a list, detail view, paginated list, or
    infinite list?
2.  **Select Factory**: Choose the corresponding `create...V2` factory.
3.  **Define Keys**: Ensure query keys are centralized in
    `src/shared/lib/query-keys.ts`.
4.  **Add Metadata**: Populate `meta` with accurate source, resource, domain,
    and a useful description.
5.  **Remove Manual Cache Logic**: Replace ad hoc success handlers with
    `invalidateKeys`, `invalidate`, or `createOptimisticMutationV2`.
6.  **Replace Raw Manual Query Calls**: Migrate direct
    `queryClient.fetchQuery`, `queryClient.prefetchQuery`, and
    `queryClient.ensureQueryData` usage to the corresponding v2 helpers.
7.  **Verify**: Run `npm run check:factory-meta`.
