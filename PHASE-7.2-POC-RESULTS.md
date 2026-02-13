# Phase 7.2: Query Factories POC - Results

**Date:** February 13, 2026  
**Status:** Analysis Complete - Strategic Pivot Required

---

## Key Discovery

The codebase **already uses factory patterns** through `src/shared/lib/api-hooks.ts` with `createQueryHook`. Our POC targets use **custom invalidation functions** that don't benefit from the factories we created.

---

## POC Target Analysis

| File | LOC | Mutations | Pattern | Factory Suitable? |
|------|-----|-----------|---------|-------------------|
| useProductSettingsQueries.ts | 250 | 16 | Custom invalidation | ❌ No (+2 LOC per mutation) |
| useCmsQueries.ts | 341 | 14 | Custom invalidation | ❌ No (breakeven or loss) |
| useIntegrationQueries.ts | 107 | 8 | Mixed | ❌ No (minimal impact) |

**POC Result:** 0 LOC savings (prevents ~32 LOC regression)

---

## What We Found

✅ **Phase 7.1 infrastructure is solid**
- query-result-types.ts: Useful for type consistency
- modal-props.ts: 510 LOC consolidation opportunity remains valid
- query-factories.ts: Well-designed but doesn't fit current codebase patterns

✅ **Existing patterns are optimal**
- `createQueryHook` already provides factory abstraction (40% of hooks)
- Custom invalidation patterns are necessary for 60% of hooks
- Codebase is already well-optimized

❌ **POC targets not suitable for refactoring**
- Custom invalidation functions prevent LOC savings
- Options wrapper adds complexity
- Would regress code quality

---

## Revised Phase 7 Strategy

### Phase 7.1: DTO Unification ✅
- Keep all infrastructure (635 LOC)
- Useful for future development
- Type standardization valuable

### Phase 7.2 (Revised): Query Hook Consolidation
- Audit existing `createQueryHook` patterns (40% of hooks)
- Document best practices
- Consolidate query key definitions
- **Estimated savings:** 75-125 LOC

### Phase 7.3: Modal Props Consolidation ✅
- Update 34 modals to use EntityModalProps
- Simplify 45 parent components  
- **Estimated savings:** 510 LOC (unchanged)

### Phase 7.4: Query Hook Audit
- Review all 22 hooks for optimization opportunities
- Consolidate custom invalidation helpers
- **Estimated savings:** 200-300 LOC

---

## Total Phase 7 (Revised)

**Previous Estimate:** 2,510 LOC  
**Revised Estimate:** 785-935 LOC (31-37% of data layer)

- Phase 7.1: Infrastructure (0 LOC savings, foundation value)
- Phase 7.2 (Revised): 75-125 LOC
- Phase 7.3: 510 LOC
- Phase 7.4: 200-300 LOC

---

## Key Lesson

Not all refactoring should focus on LOC reduction. Sometimes **preserving optimal existing patterns** is the right choice. We prevented code regression through due diligence testing.

---

**Status:** Phase 7.2 Analysis Complete → Proceed with Phase 7.2 (Revised) consolidation approach
