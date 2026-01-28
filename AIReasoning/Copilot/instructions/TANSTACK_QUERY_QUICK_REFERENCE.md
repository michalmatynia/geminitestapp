# TanStack Query v5 - Quick Reference Card

## 📦 What Was Added

### Core Setup (2 files)
- `lib/query-client.ts` - QueryClient configuration
- `components/providers/QueryProvider.tsx` - Provider wrapper in root layout

### Product Hooks (2 files)
- `lib/hooks/useProductsQuery.ts` - Query hooks (fetch, count, both)
- `lib/hooks/useProductsMutations.ts` - Mutation hooks (create, update, delete)

### Enhanced Hook (1 file)
- `app/(admin)/admin/products/hooks/useProductDataWithQuery.ts` - Drop-in replacement

### Documentation (1 file)
- `app/(admin)/admin/products/TANSTACK_QUERY_INTEGRATION.md` - Full guide

## 🚀 Quick Start

### Install DevTools (Optional)
```bash
npm install @tanstack/react-query-devtools
```

### Add to Layout
Already done! Just import hooks.

## 💡 Usage Examples

### Fetch Products
```tsx
import { useProducts } from "@/lib/hooks/useProductsQuery";

const { data, isPending } = useProducts({
  search: "laptop",
  page: 1,
  pageSize: 24
});
```

### Create Product
```tsx
import { useCreateProduct } from "@/lib/hooks/useProductsMutations";

const mutation = useCreateProduct();

await mutation.mutateAsync({
  name_en: "Product",
  sku: "SKU123",
  price: 100
});
```

### Use Enhanced Hook
```tsx
import { useProductDataWithQuery } from "./hooks/useProductDataWithQuery";

const {
  data,
  total,
  isLoading,
  isFetching,
  page,
  setPage,
  refetch
} = useProductDataWithQuery();
```

## 🎯 Key Concepts

| Concept | Meaning |
|---------|---------|
| **staleTime** | How long data is fresh (5 min) |
| **gcTime** | How long to keep cached data (10 min) |
| **isLoading** | Initial fetch in progress |
| **isFetching** | Any fetch in progress |
| **refetch()** | Manually trigger update |
| **invalidate** | Mark cache as stale, triggers refetch |

## 📝 Query States

```
┌─────────────────────────────────────┐
│  Initial State                      │
│  isLoading: true                    │
│  isFetching: true                   │
│  data: undefined                    │
└─────────────────────────────────────┘
           ↓ API call completes
┌─────────────────────────────────────┐
│  Success State                      │
│  isLoading: false                   │
│  isFetching: false                  │
│  data: ProductWithImages[]          │
│  staleTime: 5 min                   │
└─────────────────────────────────────┘
           ↓ After 5 min OR invalidate()
┌─────────────────────────────────────┐
│  Stale State                        │
│  isLoading: false                   │
│  isFetching: true (background)      │
│  data: ProductWithImages[] (cached) │
└─────────────────────────────────────┘
           ↓ API call completes
┌─────────────────────────────────────┐
│  Updated State                      │
│  data: fresh ProductWithImages[]    │
└─────────────────────────────────────┘
```

## 🔄 Mutation States

```
Idle → Loading → Success/Error → Idle (can retry)
```

### Mutation Result
```tsx
{
  isPending: boolean,        // mutation in progress
  isError: boolean,          // mutation failed
  isSuccess: boolean,        // mutation succeeded
  data: unknown,             // response data
  error: Error | null,       // error object
  mutateAsync: (data) => Promise,
  mutate: (data, callbacks),
}
```

## 📊 Cache Behavior

### Same Query, Multiple Calls
```tsx
// All use same cache, only 1 API call
useProducts(filters);
useProducts(filters);
useProducts(filters);
```

### Different Filters
```tsx
// Each gets own cache entry
useProducts({ search: "a" });
useProducts({ search: "b" });
```

### Mutation Auto-Invalidation
```tsx
// Create product → invalidates products cache → auto-refetch
const createMutation = useCreateProduct();
await createMutation.mutateAsync(data);
// All useProducts hooks now refetch automatically
```

## ⚠️ Common Mistakes

❌ **Don't:** Call hooks conditionally
```tsx
if (condition) {
  const { data } = useProducts(filters); // ❌ WRONG
}
```

✅ **Do:** Use enabled option
```tsx
const { data } = useProducts(filters, {
  enabled: condition // ✅ RIGHT
});
```

---

❌ **Don't:** Duplicate mutation calls
```tsx
const result = mutation.mutateAsync(data);
const result2 = mutation.mutateAsync(data); // ❌ Fires twice
```

✅ **Do:** Await mutation
```tsx
await mutation.mutateAsync(data); // ✅ Wait for completion
```

---

❌ **Don't:** Ignore loading states
```tsx
return <ProductTable products={data} />; // ❌ data may be undefined
```

✅ **Do:** Handle loading
```tsx
if (isLoading) return <Skeleton />;
return <ProductTable products={data} />;
```

## 🛠️ Advanced

### Manual Invalidation
```tsx
const queryClient = useQueryClient();

queryClient.invalidateQueries({
  queryKey: ["products"]
});
```

### Prefetch
```tsx
const queryClient = useQueryClient();

queryClient.prefetchQuery({
  queryKey: ["products", { ...filters, page: 2 }],
  queryFn: () => getProducts({ ...filters, page: 2 }),
});
```

### Manual Cache Update
```tsx
const queryClient = useQueryClient();

queryClient.setQueryData(
  ["products", filters],
  (old) => ({...old, products: [newProduct, ...old.products]})
);
```

## 📱 DevTools

Browser DevTools → React → Query tab → See:
- All active queries
- Query state (fresh/stale/error)
- Cache content
- Fetch times
- Manual controls

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Data not updating after create | Check mutation has correct invalidateQueries |
| Stale data showing | Reduce staleTime in query-client.ts |
| Too many API calls | Check for duplicate queries |
| Cache never clears | Check gcTime setting (default 10min) |
| TypeScript errors | Ensure filters match UseProductsFilters type |

## 📚 More Info

- Full guide: `app/(admin)/admin/products/TANSTACK_QUERY_INTEGRATION.md`
- Official: https://tanstack.com/query/latest
- API: https://tanstack.com/query/latest/docs/react/overview

---

**Version:** TanStack Query v5+  
**Updated:** 2026-01-23  
**Status:** Ready for production
