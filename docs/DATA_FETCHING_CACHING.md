# Data Fetching & Caching Strategy

> **Status**: Verified & Standardized (March 2026)
> **Architecture**: Query Factories v2 (TanStack Query v5 Wrapper)

This document outlines the standardized approach for data fetching, caching, and state management across the application. We utilize a custom `Query Factories v2` layer on top of TanStack Query to ensure:

1.  **Unified Telemetry**: Automatic tracking of query lifecycle events (start, success, error, retry) with domain-specific metadata.
2.  **Type Safety**: Strict TypeScript enforcement for query keys, response types, and error handling.
3.  **Declarative Invalidation**: Centralized and predictable cache invalidation logic attached directly to mutations.
4.  **Reduced Boilerplate**: Standardized patterns for common operations (lists, details, infinite scrolling, optimistic updates).

---

## Core Concepts

### 1. Query Factories v2

All data fetching MUST use the factory functions exported from `@/shared/lib/query-factories-v2`. Direct usage of `useQuery`, `useMutation`, or `useInfiniteQuery` is **forbidden** in feature code to ensure telemetry compliance.

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
| `fetchQueryV2` | Telemetrized manual fetching (async/await). |
| `prefetchQueryV2` | Telemetrized manual prefetching. |

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

**Supported Domains:**
`global`, `products`, `image_studio`, `integrations`, `cms`, `ai_paths`, `auth`, `database`, `notes`, `playwright`, `jobs`, `observability`, `chatbot`, `agent_creator`, `drafter`, `files`, `internationalization`, `viewer3d`, `analytics`

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

We enforce these standards via a custom script. Run this command to verify compliance:

```bash
npm run check:factory-meta
```

This script checks:
1.  All v2 factory calls have a `meta` object.
2.  The `meta` object contains a valid `domain`.
3.  The `operation` matches the factory type (e.g., `createListQueryV2` expects `list` or `search`).

---

## Migration Guide

When refactoring legacy `useQuery` or `useMutation` hooks:

1.  **Identify the Pattern**: Is it a list? A detail view? An infinite list?
2.  **Select Factory**: Choose the corresponding `create...V2` factory.
3.  **Define Keys**: Ensure query keys are centralized in `src/shared/lib/query-keys.ts`.
4.  **Add Metadata**: Populate the `meta` object with accurate source, resource, and domain info.
5.  **Remove Manual Cache Logic**: Replace `onSuccess` cache manipulation with `invalidateKeys` or `createOptimisticMutationV2`.
6.  **Verify**: Run `npm run check:factory-meta`.
