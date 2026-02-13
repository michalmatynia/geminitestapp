# Phase 7.2: Query Factories POC - Implementation Notes

**Date:** February 13, 2026  
**Status:** POC target analysis complete, ready for refactoring  
**Key Discovery:** Factories work best with both simple and custom invalidation patterns

---

## POC Targets Analysis

### Target 1: useProductSettingsQueries.ts
- **Current LOC:** 250
- **Mutations:** 16 detected
- **Invalidation Pattern:** Custom functions (invalidatePriceGroups, invalidateProductSettingsCatalogs, etc.)
- **Estimated Savings:** 40 LOC (16% reduction)
- **Priority:** HIGH - Core product settings

### Target 2: useCmsQueries.ts  
- **Current LOC:** 341
- **Mutations:** 14 detected
- **Invalidation Pattern:** Custom functions (invalidateCmsPages, invalidateCmsPageDetail, etc.)
- **Estimated Savings:** 35 LOC (10% reduction)
- **Priority:** HIGH - Core CMS functionality

### Target 3: useIntegrationQueries.ts
- **Current LOC:** 107
- **Mutations:** 8 detected
- **Invalidation Pattern:** Mixed (simpler patterns)
- **Estimated Savings:** 24 LOC (22% reduction)
- **Priority:** MEDIUM - Smaller surface area

**POC Total Expected Savings:** ~99 LOC (14% average)

---

## Factory Pattern with Custom Invalidation

### Before (Traditional - 11 LOC per mutation)

```typescript
export function useUpdatePriceGroup(): UseMutationResult<PriceGroup, Error, PriceGroup> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (group: PriceGroup) => api.updatePriceGroup(group),
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}
```

### After (Factory Pattern - 8 LOC per mutation)

```typescript
export function useUpdatePriceGroup(): UseMutationResult<PriceGroup, Error, PriceGroup> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: (group: PriceGroup) => api.updatePriceGroup(group),
    options: {
      onSuccess: () => {
        void invalidatePriceGroups(queryClient);
      },
    },
  });
}
```

**Savings:** 3 LOC per mutation = **48 LOC** for 16 mutations in one file

---

## Phase 7.2 Ready for Execution

✅ Backup files created for all 3 POC targets  
✅ Factory infrastructure complete and working  
✅ Type definitions standardized  
✅ Build system verified  

**Next:** Begin selective refactoring of first POC target
