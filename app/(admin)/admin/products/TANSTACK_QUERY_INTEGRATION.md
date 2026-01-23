# TanStack Query Integration Guide for Products

## Quick Start

### Option 1: Use the Enhanced Hook (Recommended)

Replace your current `useProductData` with the new TanStack Query-powered version:

```tsx
import { useProductDataWithQuery } from "./hooks/useProductDataWithQuery";

function AdminProductsPage() {
  const {
    data,           // ProductWithImages[]
    total,          // number
    totalPages,     // number
    page,           // number
    setPage,        // (page: number) => void
    pageSize,       // number
    setPageSize,    // (size: number) => void
    search,         // string
    setSearch,      // (search: string) => void
    isLoading,      // boolean
    isFetching,     // boolean
    error,          // string | null
    refetch,        // async () => Promise<void>
    resetFilters,   // () => void
  } = useProductDataWithQuery({
    initialCatalogFilter: "all",
    initialPageSize: 24,
    preferencesLoaded: true,
  });

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {isFetching && <div className="opacity-50">Updating...</div>}
      
      <ProductTable products={data} />
      <Pagination page={page} total={totalPages} onChange={setPage} />
    </div>
  );
}
```

### Option 2: Use Individual Hooks

For more granular control, use the hooks separately:

```tsx
import { useProducts, useProductsCount } from "@/lib/hooks/useProductsQuery";
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/lib/hooks/useProductsMutations";

function AdminProductsPage() {
  const filters = { search: "laptop", pageSize: 24, page: 1 };

  // Fetch products and count
  const { data: products, isPending: isLoading } = useProducts(filters);
  const { data: total } = useProductsCount(filters);

  // Create product
  const createMutation = useCreateProduct();
  const handleCreate = async (data) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Product created!");
    } catch (error) {
      toast.error("Failed to create product");
    }
  };

  // Update product
  const updateMutation = useUpdateProduct();
  const handleUpdate = async (id, data) => {
    await updateMutation.mutateAsync({ id, data });
  };

  // Delete product
  const deleteMutation = useDeleteProduct();
  const handleDelete = async (id) => {
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div>
      {isLoading ? <Skeleton /> : <ProductTable products={products} />}
      <button onClick={() => handleCreate({ name_en: "New", sku: "123", price: 100 })}>
        Create
      </button>
    </div>
  );
}
```

## Features Explained

### Automatic Caching
- Products are cached for 5 minutes (staleTime)
- Navigating away and back doesn't re-fetch immediately
- Manual refetch triggers background update

```tsx
const { refetch } = useProductsWithCount(filters);

// Manually trigger a refetch
await refetch();
```

### Request Deduplication
- Multiple components requesting same filters = 1 API call
- TanStack Query automatically deduplicates

```tsx
// Both hooks use same cache:
const { data: products1 } = useProducts(filters);
const { data: products2 } = useProducts(filters); // ← No extra API call!
```

### Mutation Auto-Invalidation
- Creating/updating/deleting products automatically refetches list
- UI stays in sync without manual refetch

```tsx
const createMutation = useCreateProduct();

// After this completes, all product queries refetch automatically
await createMutation.mutateAsync({ name_en: "New Product", ... });

// This will return fresh data!
const { data: products } = useProducts(filters);
```

### Loading States
- `isLoading` - Initial load
- `isFetching` - Background update (cache still visible)

```tsx
{isLoading && <Skeleton />}              {/* Hide entire table */}
{isFetching && <div>Updating...</div>}   {/* Show small indicator */}
```

## Migration Checklist

- [ ] Replace `useProductData` import with `useProductDataWithQuery`
- [ ] Update component to use new hook return values
- [ ] Test filtering, pagination, search
- [ ] Test create/update/delete mutations
- [ ] Verify cache invalidation works
- [ ] Remove old `useProductData` hook when done

## Performance Tips

### 1. Batch Requests
```tsx
// Before: 2 API calls
const productsQuery = useProducts(filters);
const countQuery = useProductsCount(filters);

// After: 1 API call (behind the scenes)
const { products, total } = useProductsWithCount(filters);
```

### 2. Lazy Enable Queries
```tsx
const { data } = useProducts(filters, {
  enabled: ready && !loading, // Only fetch when ready
});
```

### 3. Prefetch Next Page
```tsx
const queryClient = useQueryClient();

const prefetchNext = () => {
  queryClient.prefetchQuery({
    queryKey: ["products", { ...filters, page: page + 1 }],
    queryFn: () => getProducts({ ...filters, page: page + 1 }),
  });
};

// Call on "next" button hover
```

## Error Handling

### Query Errors
```tsx
const { data, error, isPending } = useProducts(filters);

if (isPending) return <Skeleton />;
if (error) return <Error message={error.message} onRetry={refetch} />;
return <ProductTable products={data} />;
```

### Mutation Errors
```tsx
const createMutation = useCreateProduct();

<button
  onClick={() => createMutation.mutateAsync(data)}
  disabled={createMutation.isPending}
>
  {createMutation.isPending ? "Creating..." : "Create"}
</button>

{createMutation.isError && (
  <Alert>{createMutation.error?.message}</Alert>
)}
```

## DevTools (Optional)

Install for visual debugging:
```bash
npm install @tanstack/react-query-devtools
```

Add to layout:
```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryProvider>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryProvider>
```

Then use **⚛️ Query** tab in browser dev tools to see:
- All active queries
- Cache status
- Query times
- Stale state
- Manual refetching

## Common Patterns

### Search with Debounce
```tsx
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);

const { data } = useProducts({
  ...filters,
  search: debouncedSearch,
});

return <input onChange={(e) => setSearch(e.target.value)} />;
```

### Infinite Scroll / Load More
```tsx
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ["products", filters],
  queryFn: ({ pageParam = 1 }) => 
    getProducts({ ...filters, page: pageParam }),
  getNextPageParam: (lastPage, allPages) => allPages.length + 1,
});

const allProducts = data?.pages.flatMap(p => p.products);

return (
  <button onClick={() => fetchNextPage()} disabled={!hasNextPage}>
    Load More
  </button>
);
```

### Optimistic Update
```tsx
const updateMutation = useMutation({
  mutationFn: (data) => api.updateProduct(data),
  onMutate: async (newData) => {
    // Cancel pending queries
    await queryClient.cancelQueries({ queryKey: ["products"] });
    
    // Snapshot old data
    const oldData = queryClient.getQueryData(["products", filters]);
    
    // Optimistically update
    queryClient.setQueryData(["products", filters], (old) => ({
      ...old,
      data: old.data.map(p => p.id === newData.id ? newData : p),
    }));
    
    return { oldData };
  },
  onError: (err, newData, context) => {
    // Revert on error
    queryClient.setQueryData(["products", filters], context.oldData);
  },
  onSuccess: () => {
    // Validate and refetch if needed
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
});
```

## FAQ

**Q: When should I use `useProductDataWithQuery` vs individual hooks?**
A: Use the combined hook for simplicity (most cases). Use individual hooks when you need fine-grained control or separate refetch calls.

**Q: How do I reset filters?**
A:
```tsx
const { resetFilters } = useProductDataWithQuery();
resetFilters(); // Clears all filters and resets to page 1
```

**Q: Can I disable caching?**
A: Yes:
```tsx
const queryClient = useQueryClient();
queryClient.setQueryDefaults(["products"], {
  staleTime: 0,  // Always stale
  gcTime: 0,     // Never cached
});
```

**Q: How do I force refetch after export?**
A:
```tsx
const { refetch } = useProductsWithCount(filters);
await exportProducts();
await refetch(); // Get fresh data
```

---

**Version:** TanStack Query v5+
**Status:** Ready for production
**Last Updated:** 2026-01-23
