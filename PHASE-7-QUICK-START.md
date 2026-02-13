# Phase 7 Data Layer Consolidation - Quick Reference

## 🎯 OPPORTUNITY SNAPSHOT

**Total Potential:** 2,510 LOC reduction (26% of data layer)

```
BEFORE:    9,660 LOC (scattered types, patterns, hooks)
AFTER:     7,150 LOC (unified, generic, standardized)
SAVINGS:   2,510 LOC (26% reduction)
```

---

## 📊 CONSOLIDATION BREAKDOWN

### 1. Modal Props (37% reduction)
**Current Problem:** 34 modals with nearly identical prop structures
```typescript
// Currently repeated 34 times with variations:
interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  catalog?: Catalog | null;
  priceGroups: PriceGroup[];
  loadingGroups: boolean;
  defaultGroupId: string;
}
```

**Solution:** Generic `EntityModalProps<T, TList>`
```typescript
type CatalogModalProps = EntityModalProps<Catalog, PriceGroup>;
```

**Savings:** 510 LOC | **37% reduction**

---

### 2. Query Mutations (33% reduction)
**Current Problem:** 30+ identical mutation patterns
```typescript
// Repeated 30+ times:
export function useSavePriceGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.savePriceGroup(id, data),
    onSuccess: () => invalidatePriceGroups(queryClient),
  });
}
```

**Solution:** Generic factory
```typescript
export function useSavePriceGroupMutation() {
  return createSaveMutation(api.savePriceGroup, invalidatePriceGroups);
}
```

**Savings:** 600 LOC | **33% reduction**

---

### 3. Query Hooks (29% reduction)
**Current Problem:** 22 hook files with 35% boilerplate
- useProductSettingsQueries.ts: 250 LOC
- useCmsQueries.ts: 341 LOC
- useIntegrationQueries.ts: 107 LOC
- (+ 19 more)

**Solution:** Apply mutation/query factories to all hooks

**Savings:** 1,000 LOC | **29% reduction**

---

### 4. Query Response Types (9% reduction)
**Current Problem:** Inconsistent response type patterns
```typescript
// Inconsistent naming:
UseQueryResult<PriceGroup[], Error>      // Form 1
ListQuery<PriceGroup>                    // Form 2
useQuery...                              // No pattern
```

**Solution:** Standardized types
```typescript
type ListQuery<T> = UseQueryResult<T[], Error>;
type SingleQuery<T> = UseQueryResult<T, Error>;
```

**Savings:** 200 LOC | **9% reduction**

---

### 5. DTO Definitions (25% reduction)
**Current Problem:** DTOs scattered, inconsistent naming
- `CreateDto<T>` in some files
- `XxxCreateInput` in others
- `ProductCreate` in others

**Solution:** Unified DTO layer with standard names
```typescript
type CreateDto<T extends DtoBase> = Omit<T, keyof DtoBase>;
type UpdateDto<T extends DtoBase> = Partial<CreateDto<T>>;
```

**Savings:** 200 LOC | **25% reduction**

---

## 🗺️ IMPLEMENTATION PHASES

### Phase 7.1: Foundation (DTO Unification)
- Duration: 3-4 hours
- Files: 25-30 modified
- Benefit: Establishes base for all other phases
- Status: Ready to start

### Phase 7.2: Query Factories (Proof of Concept)
- Duration: 4-5 hours
- Files: 3 modified (proof of concept)
- Benefit: Validates 35% boilerplate reduction
- Savings: 100-150 LOC

### Phase 7.3: Hook Migration (Main Work)
- Duration: 6-8 hours
- Files: 22 modified
- Benefit: Largest savings opportunity
- Savings: 1,000 LOC

### Phase 7.4: Modal Props (Final Step)
- Duration: 2-3 hours
- Files: 45 modified (34 modals + parents)
- Benefit: Consistency across all modals
- Savings: 510 LOC

**Total:** 15-20 hours | **2,510 LOC savings**

---

## ✅ KEY DELIVERABLES

### New Files
- `src/shared/types/dto-base.ts` - Unified DTO base types (50 LOC)
- `src/shared/lib/query-factories.ts` - Generic query factories (80 LOC)
- `src/shared/lib/mutation-factories.ts` - Generic mutation factories (120 LOC)
- `src/shared/types/modal-props.ts` - Unified modal prop types (40 LOC)

### Modified Files
- 25-30 type definition files (standardization)
- 22 query hook files (factory migration)
- 34 modal components (prop updates)
- 45 parent components (prop passing updates)

### Documentation
- Phase 7 implementation guide (in PHASE-7-DATA-CONSOLIDATION-PLAN.md)
- Developer migration guide
- Factory usage examples

---

## 📈 RISK ASSESSMENT

### Low Risk
- ✅ DTO unification (additive, backward compatible)
- ✅ Factory implementation (test in POC first)

### Medium Risk
- ⚠️ Hook migration (22 files, lots of imports)
- ⚠️ Modal props consolidation (45 files)

### Mitigation
- Use re-exports for backward compatibility
- Start with 3-file POC for factories
- Comprehensive test coverage
- Feature flag for gradual rollout

---

## 🎓 LEARNING PATTERNS

This consolidation teaches:
1. **Generic Type Patterns** - TypeScript generics for DRY code
2. **Factory Functions** - React Query best practices
3. **Type Standardization** - Naming conventions for maintainability
4. **Incremental Refactoring** - Moving large codebases safely

---

## 📋 QUICK START CHECKLIST

To implement Phase 7, follow this order:

1. [ ] Create DTO base types (Phase 7.1)
2. [ ] Standardize domain type names (Phase 7.1)
3. [ ] Create query factories (Phase 7.2)
4. [ ] Test factories with 3 proof-of-concept hooks (Phase 7.2)
5. [ ] Migrate all 22 query hooks (Phase 7.3)
6. [ ] Create unified modal props DTO (Phase 7.4)
7. [ ] Update all 34 modal components (Phase 7.4)
8. [ ] Update all parent components (Phase 7.4)
9. [ ] Run full test suite
10. [ ] Deploy and monitor

---

## 💾 SESSION CONTEXT

**Previous Work:**
- Phase 6: 13 modal components refactored (4 new patterns established)
- Total: 2,058 LOC infrastructure created
- Build: Verified and passing

**Current Session:**
- Phase 7: Complete data layer analysis
- Findings: 2,510 LOC consolidation opportunity identified
- Planning: Full 4-phase roadmap created

**Next Session:**
- Phase 7.1: Implement DTO unification
- Phase 7.2: Implement query factories

---

**Status:** Ready for implementation  
**Confidence:** High (analysis-driven, proven patterns)  
**Expected Outcome:** 26% reduction in data layer complexity  
**Quality Impact:** Improved consistency, easier to maintain, better for testing
