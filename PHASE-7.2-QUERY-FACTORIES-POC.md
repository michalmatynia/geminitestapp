# Phase 7.2: Query Factories - POC Implementation Guide

**Date:** February 13, 2026  
**Phase Status:** Ready to start  
**Expected Savings:** 100-150 LOC from POC proof-of-concept  
**Total Phase 7 Progress:** ✅ Phase 7.1 Complete (DTO Unification) → Ready for Phase 7.2

---

## Overview

Phase 7.2 validates query factory patterns with 3 proof-of-concept hook files before rolling out to all 22 query hook files in Phase 7.3.

**Key Goals:**
1. Demonstrate 70-80% boilerplate reduction in real code
2. Validate error handling and query invalidation patterns
3. Establish best practices for team adoption
4. Measure performance impact (expected: zero)

---

## Query Factories Summary

Factory functions created in `src/shared/lib/query-factories.ts` provide:

| Factory | Purpose | LOC Reduction |
|---------|---------|---------------|
| `createListQuery<T>` | Generic list queries | 5→2 LOC |
| `createPagedQuery<T>` | Paginated list queries | 8→2 LOC |
| `createSingleQuery<T>` | Single item queries | 5→2 LOC |
| `createCreateMutation<T, I>` | Create mutations | 12→3 LOC |
| `createUpdateMutation<T, I>` | Update mutations | 12→3 LOC |
| `createDeleteMutation` | Delete mutations | 10→2 LOC |
| `createSaveMutation<T, I>` | Save mutations (create or update) | 15→3 LOC |

**Average Reduction:** ~75% boilerplate elimination

---

## Before & After Examples

### Query Hook: Simple List Query

**Before (5-7 LOC per query):**
```typescript
export const useProductsQueries = () => {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.list(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProductPayload) => api.products.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return { listQuery, createMutation };
};
```

**After (Using Factory - 2-3 LOC per query):**
```typescript
import { createListQuery, createCreateMutation } from '@/shared/lib/query-factories';

export const useProductsQueries = () => {
  const listQuery = createListQuery({
    queryKey: ['products'],
    queryFn: () => api.products.list(),
    options: { staleTime: 5 * 60 * 1000 },
  });

  const createMutation = createCreateMutation({
    mutationFn: (data: CreateProductPayload) => api.products.create(data),
    invalidateKeys: [['products']],
  });

  return { listQuery, createMutation };
};
```

**Savings:** ~60% boilerplate reduction (12→5 LOC)

### Complex Hook: Full CRUD Operations

**Before (40-50 LOC typical):**
```typescript
export const useProductSettingsQueries = () => {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['product-settings'],
    queryFn: () => api.productSettings.list(),
  });

  const singleQuery = useQuery({
    queryKey: ['product-settings', settingId],
    queryFn: () => api.productSettings.get(settingId),
    enabled: !!settingId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSettingPayload) => api.productSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-settings'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateSettingPayload) => api.productSettings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-settings'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.productSettings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-settings'] });
    },
  });

  return {
    listQuery,
    singleQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
```

**After (Using Factories - 12-15 LOC):**
```typescript
import {
  createListQuery,
  createSingleQuery,
  createCreateMutation,
  createUpdateMutation,
  createDeleteMutation,
} from '@/shared/lib/query-factories';

export const useProductSettingsQueries = (settingId?: string) => {
  const invalidateKeys = [['product-settings']];

  const listQuery = createListQuery({
    queryKey: ['product-settings'],
    queryFn: () => api.productSettings.list(),
  });

  const singleQuery = createSingleQuery({
    queryKey: ['product-settings', settingId || ''],
    queryFn: () => api.productSettings.get(settingId!),
    options: { enabled: !!settingId },
  });

  const createMutation = createCreateMutation({
    mutationFn: (data: CreateSettingPayload) => api.productSettings.create(data),
    invalidateKeys,
  });

  const updateMutation = createUpdateMutation({
    mutationFn: (data: UpdateSettingPayload) => api.productSettings.update(data),
    invalidateKeys,
  });

  const deleteMutation = createDeleteMutation({
    mutationFn: (id: string) => api.productSettings.delete(id),
    invalidateKeys,
  });

  return { listQuery, singleQuery, createMutation, updateMutation, deleteMutation };
};
```

**Savings:** ~70% boilerplate reduction (46→14 LOC)

---

## POC Target Selection

Select 3 high-value query hook files that represent different patterns:

### Candidate 1: High Frequency + Simple Pattern
**File:** `src/features/products/hooks/useProductsQueries.ts`
- Current LOC: ~25
- Usage: Core product list/CRUD
- Pattern: Standard list + create/update mutations
- Estimated Savings: 12-15 LOC

### Candidate 2: Complex Pattern
**File:** `src/features/cms/hooks/useCmsQueries.ts`
- Current LOC: ~45
- Usage: Pages, blocks, themes, domains
- Pattern: Multiple queries + mutations + special invalidation
- Estimated Savings: 20-25 LOC

### Candidate 3: Paginated Query
**File:** `src/features/integrations/hooks/useIntegrationQueries.ts`
- Current LOC: ~35
- Usage: Integration list with pagination
- Pattern: Paged queries + job mutations
- Estimated Savings: 15-20 LOC

**POC Total Expected Savings:** 47-60 LOC (exceeds 100-150 LOC conservative estimate for full phase)

---

## Implementation Steps

### Step 1: Select & Backup POC Files

```bash
# Backup original files for safety
cp src/features/products/hooks/useProductsQueries.ts src/features/products/hooks/useProductsQueries.original.ts
cp src/features/cms/hooks/useCmsQueries.ts src/features/cms/hooks/useCmsQueries.original.ts
cp src/features/integrations/hooks/useIntegrationQueries.ts src/features/integrations/hooks/useIntegrationQueries.original.ts
```

### Step 2: Analyze Current Implementation

For each candidate file:
1. Count lines of code (LOC)
2. Identify query patterns (list, single, paginated)
3. Identify mutation patterns (create, update, delete, save)
4. Note any special error handling or invalidation

### Step 3: Refactor Using Factories

For each candidate file:
1. Import factory functions from `@/shared/lib/query-factories`
2. Replace `useQuery` calls with `createListQuery`/`createSingleQuery`/`createPagedQuery`
3. Replace `useMutation` calls with factory equivalents
4. Consolidate invalidation keys
5. Remove `useQueryClient` if no longer needed

### Step 4: Validate & Measure

1. Build project: `npm run build`
2. Run tests: `npm run test`
3. Count new LOC
4. Calculate savings percentage
5. Verify error handling works the same
6. Check query invalidation behavior

### Step 5: Document Results

Create `PHASE-7.2-POC-RESULTS.md` with:
- Before/after LOC comparison
- Performance metrics (build time impact)
- Test results
- Lessons learned
- Recommendations for Phase 7.3

---

## Factory Usage Patterns

### Pattern 1: Simple List Query

```typescript
const listQuery = createListQuery({
  queryKey: ['items'],
  queryFn: () => api.items.list(),
});
```

**When to use:** Basic list fetch without pagination

### Pattern 2: Paginated Query

```typescript
const pagedQuery = createPagedQuery({
  queryKey: ['items'],
  queryFn: (page, limit) => api.items.list({ page, limit }),
});
```

**When to use:** Large lists that need pagination

### Pattern 3: Single Item Query

```typescript
const itemQuery = createSingleQuery({
  queryKey: ['items', itemId],
  queryFn: () => api.items.get(itemId),
  options: { enabled: !!itemId },
});
```

**When to use:** Fetching a single item by ID

### Pattern 4: Create Mutation

```typescript
const createMutation = createCreateMutation({
  mutationFn: (data: CreateItemPayload) => api.items.create(data),
  invalidateKeys: [['items']],
});
```

**When to use:** Creating new items (automatic query invalidation)

### Pattern 5: Update Mutation

```typescript
const updateMutation = createUpdateMutation({
  mutationFn: (data: UpdateItemPayload) => api.items.update(data),
  invalidateKeys: [['items'], ['items', data.id]],
});
```

**When to use:** Updating existing items (multiple query invalidations)

### Pattern 6: Delete Mutation

```typescript
const deleteMutation = createDeleteMutation({
  mutationFn: (id: string) => api.items.delete(id),
  invalidateKeys: [['items']],
});
```

**When to use:** Deleting items

### Pattern 7: Save Mutation (Create or Update)

```typescript
const saveMutation = createSaveMutation({
  mutationFn: (data: SaveItemPayload) => api.items.save(data),
  invalidateKeys: [['items']],
});
```

**When to use:** Single mutation that handles both create and update

---

## Key Points for Teams

1. **Type Safety:** All factories are fully typed with TypeScript generics
2. **Error Handling:** Errors propagate naturally through mutation results
3. **Invalidation:** Automatic query invalidation on mutation success
4. **Configuration:** Full `UseQueryOptions` and `UseMutationOptions` support via `options` parameter
5. **Backward Compatibility:** Refactoring doesn't affect component APIs

---

## Quick Reference: Factory Return Types

All factories return proper TanStack Query hook types:

```typescript
// Query factories
type ListQuery<T> = UseQueryResult<T[], Error>;
type SingleQuery<T> = UseQueryResult<T, Error>;
type PagedQuery<T> = UseQueryResult<{ items: T[]; total: number; page: number }, Error>;

// Mutation factories
type CreateMutation<T, I> = UseMutationResult<T, Error, I>;
type UpdateMutation<T, I> = UseMutationResult<T, Error, I>;
type DeleteMutation = UseMutationResult<void, Error, string>;
type SaveMutation<T, I> = UseMutationResult<T, Error, I>;
```

All standard TanStack Query properties available:
- `data`, `error`, `isPending`, `isLoading`, `isSuccess`, `isError`
- `mutate()`, `mutateAsync()`, `reset()`

---

## Expected Outcomes

**After POC completion:**
- [ ] 3 proof-of-concept hooks refactored with 60+ LOC savings
- [ ] Factory pattern validated in production-like conditions
- [ ] Best practices documented for Phase 7.3
- [ ] Team confidence in factory approach established
- [ ] Ready to migrate remaining 19 hooks in Phase 7.3

**Next Phase:** Phase 7.3 - Full Query Hook Migration (15-20 hours estimated)

---

## Testing Strategy

### Unit Tests
- Test that factory-generated queries work correctly
- Verify invalidation keys are passed properly
- Check error handling behavior

### Integration Tests
- Test mutations with real-like async operations
- Verify component integration works correctly
- Check query refetch on mutation

### Regression Tests
- Verify no breaking changes to component APIs
- Check all existing usages still work
- Monitor for performance regressions

---

## Rollback Plan

If POC identifies issues:
1. Revert to `.original.ts` backup files
2. Investigate root cause
3. Update factory if needed
4. Re-test before proceeding

**Risk Level:** LOW (all changes are encapsulated in hook implementations)

---

**Status:** Ready for implementation  
**Next Action:** Proceed with Step 1 (Select & Backup POC Files)
