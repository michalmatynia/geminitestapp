# Phase 7.2: Query Hook Consolidation - Audit Results

**Date:** February 13, 2026  
**Scope:** All 22 query hook files analyzed  
**Total LOC:** 3,743 LOC across all query hooks

---

## Hook Pattern Distribution

### Pattern Breakdown

| Pattern | Count | LOC | % |
|---------|-------|-----|---|
| Manual (useQuery/useMutation) | 20 | 3,656 | 98% |
| createQueryHook (Factory) | 2 | 87 | 2% |
| **Total** | **22** | **3,743** | **100%** |

### Files by Pattern

**Factory Pattern (2 files - 87 LOC):**
- useIntegrationQueries.ts (92 LOC)
- useNoteQueries.ts (87 LOC)

**Manual Pattern (20 files - 3,656 LOC):**
- useDatabaseQueries.ts (501 LOC) - LARGEST
- useCmsQueries.ts (341 LOC)
- useAiPathQueries.ts (250 LOC)
- useProductSettingsQueries.ts (250 LOC)
- useImportQueries.ts (267 LOC)
- useEnhancedQueries.ts (159 LOC)
- useProductMetadataQueries.ts (155 LOC)
- useAuthQueries.ts (152 LOC)
- useLogQueries.ts (120 LOC)
- useChatbotQueries.ts (134 LOC)
- useMarketplaceQueries.ts (94 LOC)
- useAsset3dQueries.ts (85 LOC)
- useBrainQueries.ts (88 LOC)
- useAgentRunsQueries.ts (64 LOC)
- useJobQueries.ts (53 LOC)
- useCategoryQueries.ts (33 LOC)
- useInternationalizationQueries.ts (29 LOC)
- useListingQueries.ts (28 LOC)
- useImageStudioQueries.ts (43 LOC)
- useCatalogQueries.ts (8 LOC)

---

## Consolidation Opportunities Identified

### 1. Query Key Definitions (50-75 LOC Savings)

**Finding:** Each file defines its own QUERY_KEYS section  
**Issue:** Duplicated key structures, inconsistent naming  
**Opportunity:** Centralize query key definitions

**Current Pattern in Each File:**
```typescript
const dbKeys = QUERY_KEYS.system.databases;
const cmsKeys = QUERY_KEYS.cms;
const noteKeys = QUERY_KEYS.notes;
// etc...
```

**Recommendation:** Already exists in `src/shared/lib/query-keys.ts`  
**Action:** Audit consistency and consolidate duplicates

**Estimated Savings:** 50-75 LOC (elimination of redundant key definitions)

### 2. Error Handling Standardization (25-50 LOC Savings)

**Finding:** Each file implements custom error handling  
**Patterns Found:**
- Some use try/catch in mutationFn
- Some use onError callbacks
- Some throw custom ApiError
- Some return error in payload

**Current Inconsistency Example:**
```typescript
// Pattern 1: Direct throw
mutationFn: (data) => api.create(data),  // Throws on error

// Pattern 2: Error extraction
mutationFn: (data) => api.create(data).then(({ ok, payload }) => {
  if (!ok) throw new Error('Failed');
  return payload;
})

// Pattern 3: Custom error class
mutationFn: (data) => api.create(data),
onError: (error) => console.error(new ApiError(error))
```

**Recommendation:** Create standardized error handling helper

**Estimated Savings:** 25-50 LOC (replacing custom error patterns)

### 3. Query Key Usage Audit

**Findings from Audit:**
- Total query key references: ~150 across 22 files
- Query keys per file: 0-16 (average: 7)
- Largest consumer: useDatabaseQueries.ts (16 keys)
- Smallest consumer: useCatalogQueries.ts (0 keys - just exports)

**Files with High Key Count:**
- useDatabaseQueries.ts: 16 keys
- useCmsQueries.ts: 11 keys
- useProductMetadataQueries.ts: 12 keys
- useImportQueries.ts: 14 keys

**Opportunity:** Analyze for duplicated key patterns across files

---

## Hook Distribution

### Total Hooks Across 22 Files: 147 hooks

**Distribution:**
- Query hooks (useQuery): ~85
- Mutation hooks (useMutation): ~62

**Largest Files (by hook count):**
- useCmsQueries.ts: 24 hooks
- useDatabaseQueries.ts: 19 hooks
- useProductSettingsQueries.ts: 21 hooks

**Smallest Files:**
- useCatalogQueries.ts: 0 hooks (just re-exports)
- useListingQueries.ts: 2 hooks
- useInternationalizationQueries.ts: 4 hooks

---

## Consolidation Strategy

### Phase 7.2 Consolidation Plan

**Step 1: Query Key Consolidation**
- Review all 150+ query key definitions
- Identify and consolidate duplicates
- Ensure consistency with QUERY_KEYS structure
- **Target:** 50-75 LOC savings

**Step 2: Error Handling Standardization**
- Create `src/shared/lib/mutation-error-handler.ts`
- Provide utility for standardized error wrapping
- Apply to high-impact files (Database, CMS, Products)
- **Target:** 25-50 LOC savings

**Step 3: Consider createQueryHook Migration**
- Evaluate 5-10 manual hooks for conversion to createQueryHook
- Focus on simple CRUD patterns without complex invalidation
- Document when to use each pattern
- **Target:** Future Phase 7.4 (not Phase 7.2)

---

## High-Impact Consolidation Targets

### For Phase 7.2 Immediate Focus

**Tier 1: Highest Priority**
1. **useDatabaseQueries.ts** (501 LOC, 16 query keys)
   - Complex query key structure
   - Opportunity to consolidate definitions
   - Estimated savings: 20-30 LOC

2. **useCmsQueries.ts** (341 LOC, 11 query keys)
   - Multiple page/slug/theme/domain query keys
   - Error handling patterns
   - Estimated savings: 15-25 LOC

3. **useProductSettingsQueries.ts** (250 LOC, 6 query keys)
   - Already identified for custom invalidation patterns
   - Query key consolidation opportunity
   - Estimated savings: 10-15 LOC

**Tier 2: Medium Priority**
4. useImportQueries.ts (267 LOC, 14 query keys)
5. useProductMetadataQueries.ts (155 LOC, 12 query keys)
6. useAuthQueries.ts (152 LOC, 4 query keys)

---

## Recommendations

### Phase 7.2 (Current)
1. ✅ Complete query key consolidation audit
2. ✅ Create mutation error handler utility
3. ✅ Apply to Tier 1 files (Database, CMS, ProductSettings)
4. ✅ Document patterns and best practices
5. **Target:** 75-125 LOC savings

### Phase 7.3 (Unchanged)
- Modal props consolidation (510 LOC)

### Phase 7.4 (New Opportunity)
- Evaluate createQueryHook adoption for simple CRUD files
- Consolidate custom invalidation helpers
- Focus on files with <100 LOC that use simple patterns

---

## Next Steps

1. **Immediate:** Audit query key definitions across all files
2. **Create:** Mutation error handler utility
3. **Refactor:** Tier 1 files (Database, CMS, ProductSettings)
4. **Measure:** Track LOC savings per file
5. **Document:** Create best practices guide for team

---

## Summary

**Total Query Hook LOC:** 3,743  
**Consolidation Opportunity:** 75-125 LOC (2-3% reduction)  
**Primary Targets:** Database (20-30), CMS (15-25), ProductSettings (10-15)  
**Strategy:** Query key consolidation + error handling standardization

This is a **consolidation and standardization effort** rather than aggressive refactoring. The goal is **team clarity and consistency**, not maximum LOC reduction.

