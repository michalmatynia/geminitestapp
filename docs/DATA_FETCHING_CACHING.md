---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'superseded'
doc_type: 'reference'
scope: 'platform'
superseded_by: 'docs/platform/data-fetching-caching.md'
---

# Deprecated Location

The canonical data fetching and caching guide moved to:

- `docs/platform/data-fetching-caching.md`

Please update references to the new path.

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

Raw `queryClient.fetchQuery(...)`, `queryClient.prefetchQuery(...)`, and `queryClient.ensureQueryData(...)` are forbidden outside `src/shared/lib/query-factories-v2.ts`. Use `fetchQueryV2`, `prefetchQueryV2`, `ensureQueryDataV2`, or their hook aliases instead.

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
4.  Raw manual query execution calls (`.fetchQuery`, `.prefetchQuery`, `.ensureQueryData`) are not used outside the telemetrized helper implementation file.

---

## Migration Guide

When refactoring legacy `useQuery` or `useMutation` hooks:

1.  **Identify the Pattern**: Is it a list? A detail view? An infinite list?
2.  **Select Factory**: Choose the corresponding `create...V2` factory.
3.  **Define Keys**: Ensure query keys are centralized in `src/shared/lib/query-keys.ts`.
4.  **Add Metadata**: Populate the `meta` object with accurate source, resource, and domain info.
5.  **Remove Manual Cache Logic**: Replace `onSuccess` cache manipulation with `invalidateKeys` or `createOptimisticMutationV2`.
6.  **Replace Raw Manual Query Calls**: Migrate direct `queryClient.fetchQuery`, `queryClient.prefetchQuery`, and `queryClient.ensureQueryData` usage to the corresponding v2 helpers.
7.  **Verify**: Run `npm run check:factory-meta`.
