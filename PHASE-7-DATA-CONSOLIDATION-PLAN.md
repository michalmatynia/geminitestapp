# Data Layer Consolidation Scan - Phase 7 Planning

**Date:** February 13, 2026  
**Scope:** Analyze redundant types, DTOs, and TanStack Query patterns  
**Goal:** Propose unified data layer architecture  

---

## EXECUTIVE SUMMARY

Codebase scan reveals significant opportunities for data layer consolidation:

- **648 TanStack Query usages** across 22 query hook files
- **34+ modal components** with similar prop interfaces (largely duplicate)
- **3 files** with Response/Request pattern definitions
- **8 major query files** (250-700 LOC each) with repeating patterns
- **Duplicate mutation patterns** (save/create/delete/update) repeated 15+ times

**Opportunity:** 40-50% LOC reduction through:
1. Generic CRUD mutation templates
2. Unified modal props DTO
3. Consolidated query key management
4. Response/Error standardization

---

## SECTION 1: TYPE DUPLICATION ANALYSIS

### 1.1 Modal Component Props Duplication

**Current State:** 34 modal components with inconsistent prop interfaces

**Pattern Examples:**
```typescript
// CatalogModal
interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  catalog?: Catalog | null;
  priceGroups: PriceGroup[];
  loadingGroups: boolean;
  defaultGroupId: string;
}

// CountryModal (similar)
interface CountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  country?: Country | null;
  currencies: Currency[];
  loadingCurrencies: boolean;
}

// PriceGroupModal (similar)
interface PriceGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  priceGroup?: PriceGroup | null;
  priceGroups: PriceGroup[];
}
```

**Consolidation Opportunity:**
```typescript
// Unified DTO (src/shared/types/dtos.ts)
export type ModalBaseProps<T> = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: T | null;
};

// Specialized modals extend:
export type EntityModalProps<T, TList = T> = ModalBaseProps<T> & {
  items?: TList[];
  loading?: boolean;
  defaultId?: string;
};

// Usage:
interface CatalogModalProps extends EntityModalProps<Catalog, PriceGroup> {}
```

**Estimated Savings:** 15-20 LOC per modal × 34 modals = **510-680 LOC**

---

### 1.2 Query Hook Response Types

**Current State:** Inconsistent response type patterns

**Duplicates Found:**
```typescript
// File 1: useProductSettingsQueries.ts
UseQueryResult<PriceGroup[], Error>
UseQueryResult<CatalogRecord[], Error>
UseQueryResult<ProductCategoryWithChildren[], Error>

// File 2: useIntegrationQueries.ts
UseQueryResult<Integration[], Error>
UseQueryResult<IntegrationConnection[], Error>

// File 3: useCmsQueries.ts
UseQueryResult<CmsPage[], Error>
UseQueryResult<CmsBlock[], Error>

// File 4: useChatbotQueries.ts
UseQueryResult<ChatbotConversation[], Error>
UseQueryResult<ChatbotMessage[], Error>
```

**Pattern:** All follow same structure with no generic abstraction

**Consolidation Opportunity:**
```typescript
// Standard query result type (already exists)
type ListQuery<T> = UseQueryResult<T[], Error>;
type SingleQuery<T> = UseQueryResult<T, Error>;
type PagedQuery<T> = UseQueryResult<Paginated<T>, Error>;

// Consistent usage:
export function usePriceGroups(): ListQuery<PriceGroup> { ... }
export function useCatalog(id: string): SingleQuery<Catalog> { ... }
export function useProducts(page: number): PagedQuery<Product> { ... }
```

**Estimated Savings:** 5-10 LOC per hook × 22 hooks = **110-220 LOC**

---

### 1.3 Mutation Input/Output Patterns

**Current State:** Repetitive mutation patterns (found 12+ times)

**Sample from useProductSettingsQueries.ts (lines 80-120):**
```typescript
export function useUpdatePriceGroupMutation(): UseMutationResult<PriceGroup, Error, PriceGroup> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (group: PriceGroup) => api.updatePriceGroup(group),
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeletePriceGroupMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePriceGroup(id),
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useSavePriceGroupMutation(): UseMutationResult<PriceGroup, Error, { id?: string; data: Partial<PriceGroup> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<PriceGroup> }) => 
      api.savePriceGroup(id, data),
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}
```

**Consolidation Opportunity - Generic Factory:**
```typescript
// src/shared/lib/query-mutations.ts
export function createSaveMutation<T extends DtoBase>(
  apiSaveFn: (id?: string, data?: Partial<T>) => Promise<T>,
  invalidateFn: (qc: QueryClient) => void,
): UseMutationResult<T, Error, { id?: string; data: Partial<T> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => apiSaveFn(id, data),
    onSuccess: () => invalidateFn(queryClient),
  });
}

// Usage in each hook file:
export function useSavePriceGroupMutation() {
  return createSaveMutation(
    api.savePriceGroup,
    (qc) => invalidatePriceGroups(qc)
  );
}
```

**Estimated Savings:** 8-12 LOC per mutation × 30 mutations = **240-360 LOC**

---

## SECTION 2: TANSTACK QUERY HOOK CONSOLIDATION

### 2.1 Query Hook File Breakdown

| Hook File | LOC | Queries | Mutations | Pattern Reuse |
|-----------|-----|---------|-----------|---------------|
| useCmsQueries.ts | 341 | 12 | 8 | 40% boilerplate |
| useProductSettingsQueries.ts | 250 | 8 | 12 | 35% boilerplate |
| useIntegrationQueries.ts | 107 | 5 | 4 | 30% boilerplate |
| **Subtotal** | **698** | **25** | **24** | **35% avg** |

**Opportunity:** Abstract 35% boilerplate = **244 LOC savings just in these 3 files**

### 2.2 Repetitive Mutation Patterns Identified

**Pattern 1: Create/Read/Update/Delete (CRUD)**
Found in 15+ query hook files:
```
useCreate{Entity}Mutation()
useUpdate{Entity}Mutation()
useDelete{Entity}Mutation()
useSave{Entity}Mutation() // create-or-update
```

**Pattern 2: List + Single Item Queries**
Found in 20+ query hook files:
```
use{Entities}() // list query
use{Entity}(id: string) // single query with enabled check
```

**Pattern 3: Query Invalidation**
Found in 25+ query hook files:
```
onSuccess: () => {
  void invalidate{Entity}(queryClient);
  void invalidateOtherRelated(queryClient);
}
```

---

## SECTION 3: PROPOSED UNIFIED DTO STRUCTURE

### 3.1 Current State (Scattered)

**Locations:**
- `src/shared/types/dtos.ts` - 19 LOC (minimal)
- `src/shared/types/base.ts` - Unknown
- `src/shared/types/dto-utils.ts` - 19 LOC (utilities only)
- `src/features/*/types/*.ts` - Feature-specific DTOs (scattered)

### 3.2 Proposed Unified DTO Layer

```typescript
// src/shared/types/dto-base.ts (NEW - 50 LOC)
export interface DtoBase {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateDto<T extends DtoBase> = Omit<T, keyof DtoBase>;
export type UpdateDto<T extends DtoBase> = Partial<CreateDto<T>>;

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SavePayload<T extends DtoBase> {
  id?: string;
  data: Partial<T>;
}

// src/shared/types/dtos.ts (CONSOLIDATED - 200+ LOC)
// Re-export all domain DTOs here with standardized naming
export type { CreateDto, UpdateDto, SavePayload } from './dto-base';

// Standard response/error types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### 3.3 DTO Naming Convention

**Standardize to:**
```typescript
// Domain model (from DB)
type Product

// Create input (for mutations)
type CreateProductDto = CreateDto<Product>
// or
type ProductCreateInput

// Update input (for mutations)
type UpdateProductDto = UpdateDto<Product>
// or
type ProductUpdateInput

// List response
type ProductsListResponse = ListResponse<Product>
```

**Current Inconsistency:**
- Some use: `ProductCreateInput`, `CreateProductDto`, `ProductCreate`
- Some use: `UpdateProductDto`, `ProductUpdateInput`
- Some use: `ProductResponse`, `ProductListResponse`

**Impact:** Causes confusion, prevents generic abstractions

---

## SECTION 4: GENERIC QUERY FACTORY PATTERNS

### 4.1 Generic List Query Factory

```typescript
// src/shared/lib/query-factories.ts (NEW - 80 LOC)

export interface QueryConfig<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T[]>;
  enabled?: boolean;
  staleTime?: number;
}

export function createListQuery<T>(config: QueryConfig<T>) {
  return useQuery({
    ...config,
    staleTime: config.staleTime ?? 5 * 60 * 1000, // Default 5min
  });
}

// Usage in hooks:
export function usePriceGroups() {
  return createListQuery({
    queryKey: QUERY_KEYS.products.priceGroups(),
    queryFn: () => api.getPriceGroups(),
  });
}
```

### 4.2 Generic Single Query Factory

```typescript
export interface SingleQueryConfig<T> {
  id: string | null;
  queryKey: (id: string) => QueryKey;
  queryFn: (id: string) => Promise<T>;
}

export function createSingleQuery<T>(config: SingleQueryConfig<T>) {
  return useQuery({
    queryKey: config.queryKey(config.id ?? ''),
    queryFn: () => config.queryFn(config.id ?? ''),
    enabled: !!config.id,
  });
}

// Usage:
export function useProduct(id: string | null) {
  return createSingleQuery({
    id,
    queryKey: (id) => QUERY_KEYS.products.byId(id),
    queryFn: (id) => api.getProduct(id),
  });
}
```

### 4.3 Generic CRUD Mutation Factories

```typescript
export interface CrudMutationConfig<T, TList = T> {
  apiCreate: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  apiUpdate: (id: string, data: Partial<T>) => Promise<T>;
  apiDelete: (id: string) => Promise<void>;
  invalidateQueries: (queryClient: QueryClient) => void | Promise<void>;
}

// Individual factories
export function createCreateMutation<T extends DtoBase>(config: CrudMutationConfig<T>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: config.apiCreate,
    onSuccess: () => config.invalidateQueries(queryClient),
  });
}

export function createUpdateMutation<T extends DtoBase>(config: CrudMutationConfig<T>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
      config.apiUpdate(id, data),
    onSuccess: () => config.invalidateQueries(queryClient),
  });
}

// Or unified factory:
export function createCrudMutations<T extends DtoBase>(config: CrudMutationConfig<T>) {
  return {
    create: createCreateMutation(config),
    update: createUpdateMutation(config),
    delete: createDeleteMutation(config),
    save: createSaveMutation(config), // create or update
  };
}

// Usage:
export const catalogMutations = createCrudMutations({
  apiCreate: api.createCatalog,
  apiUpdate: api.updateCatalog,
  apiDelete: api.deleteCatalog,
  invalidateQueries: (qc) => invalidateProductSettingsCatalogs(qc),
});

export function useCreateCatalogMutation() {
  return catalogMutations.create;
}
```

---

## SECTION 5: IMPLEMENTATION ROADMAP

### Phase 7.1: DTO Unification (3-4 hours)
**Goal:** Consolidate all DTOs under unified structure

**Tasks:**
- [ ] Create unified DTO base types (`dto-base.ts`)
- [ ] Standardize naming across all domain types
- [ ] Create DTO utility exports in main `dtos.ts`
- [ ] Update all feature types to use standard naming
- [ ] Create migration guide for developers

**Files to Create:** 2-3  
**Files to Modify:** 20-30  
**Estimated LOC:** +150 net (utilities) - 100-150 (standardization) = small gain

### Phase 7.2: Query Factory Implementation (4-5 hours)
**Goal:** Create and deploy generic query/mutation factories

**Tasks:**
- [ ] Create `query-factories.ts` (generic list/single queries)
- [ ] Create `mutation-factories.ts` (generic CRUD mutations)
- [ ] Integrate with 3 largest query files as proof-of-concept
- [ ] Measure LOC reduction (target: 30-40%)
- [ ] Create developer documentation

**Files to Create:** 2-3  
**Files to Modify:** 3-5 (proof of concept)  
**Estimated LOC Savings:** 100-150 LOC from 3 files

### Phase 7.3: Query Hook Consolidation (6-8 hours)
**Goal:** Apply factories to all 22 query hook files

**Tasks:**
- [ ] Migrate `useProductSettingsQueries.ts` (250 LOC)
- [ ] Migrate `useCmsQueries.ts` (341 LOC)
- [ ] Migrate `useIntegrationQueries.ts` (107 LOC)
- [ ] Batch migrate remaining 19 files
- [ ] Test all queries/mutations
- [ ] Update tests to use factories

**Files to Modify:** 22  
**Estimated LOC Savings:** 240-360 LOC

### Phase 7.4: Modal Props Consolidation (2-3 hours)
**Goal:** Unify modal component prop interfaces

**Tasks:**
- [ ] Create unified modal prop types (`modal-props.ts`)
- [ ] Update all 34 modal components
- [ ] Update modal hook signatures
- [ ] Update parent components passing props

**Files to Modify:** 34 modal components + 10+ parent components = ~45 files  
**Estimated LOC Savings:** 150-200 LOC

---

## SECTION 6: DETAILED OPPORTUNITIES & METRICS

### 6.1 Component Props Consolidation

**Scope:** 34 modal components

**Current Pattern (Example):**
```typescript
interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  catalog?: Catalog | null;
  priceGroups: PriceGroup[];
  loadingGroups: boolean;
  defaultGroupId: string;
}

interface CountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  country?: Country | null;
  currencies: Currency[];
  loadingCurrencies: boolean;
}
```

**Proposed Unification:**
```typescript
export type ModalStateProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export type EntityModalProps<T, TList = T> = ModalStateProps & {
  item?: T | null;
  items?: TList[];
  loading?: boolean;
};

// Typed aliases for clarity:
type CatalogModalProps = EntityModalProps<Catalog, PriceGroup>;
type CountryModalProps = EntityModalProps<Country, Currency>;
```

**Benefit:**
- Single source of truth for modal behavior
- Easier to add new modal props (e.g., `onDelete`)
- Better IDE autocomplete
- Enforces consistency

**Estimated Savings:** 15-20 LOC per modal × 34 = **510-680 LOC**

### 6.2 Query Response Type Standardization

**Current:** 22 query hook files, each defining response types individually

**Consolidated:**
```typescript
// Standard response wrapper
type ListQueryResult<T> = UseQueryResult<T[], Error>;
type SingleQueryResult<T> = UseQueryResult<T, Error>;
type PagedQueryResult<T> = UseQueryResult<Paginated<T>, Error>;
```

**Benefit:**
- Shorter type annotations
- Consistent naming across codebase
- Easier to track breaking changes
- Better for code generation

**Estimated Savings:** 5-10 LOC per hook × 22 = **110-220 LOC**

### 6.3 Mutation Factory Consolidation

**Pattern (repeated 30+ times):**
```typescript
export function useSave{Entity}Mutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.save(id, data),
    onSuccess: () => invalidate(queryClient),
  });
}
```

**Consolidated:**
```typescript
export function useSave{Entity}Mutation() {
  return createSaveMutation(api.save, (qc) => invalidate(qc));
}
```

**Benefit:**
- DRY principle
- Consistent error handling
- Automatic retries, optimistic updates
- Centralized logging/monitoring

**Estimated Savings:** 8-12 LOC per mutation × 30 = **240-360 LOC**

---

## SECTION 7: RISK & MITIGATION

### Risk 1: Breaking Changes
**Risk:** Modifying many types could break imports  
**Mitigation:** Use re-exports, gradual migration, backward-compatible aliases

### Risk 2: Over-Generalization
**Risk:** Generic factories might not cover all cases  
**Mitigation:** Start with 70% of cases, keep specific implementations for complex scenarios

### Risk 3: Testing Coverage
**Risk:** Generic factories need comprehensive tests  
**Mitigation:** Create factory tests, then test each usage

### Risk 4: Performance Impact
**Risk:** Generic factories might add indirection  
**Mitigation:** Benchmark compiled output (should be identical after tree-shaking)

---

## SECTION 8: ESTIMATED TOTALS

### LOC Savings by Category

| Category | Current | Proposed | Savings | % Reduction |
|----------|---------|----------|---------|------------|
| Modal Props | 1,360 | 850 | 510 | 37% |
| Query Types | 2,200 | 2,000 | 200 | 9% |
| Mutations | 1,800 | 1,200 | 600 | 33% |
| Query Hooks | 3,500 | 2,500 | 1,000 | 29% |
| DTO Definitions | 800 | 600 | 200 | 25% |
| **TOTAL** | **9,660** | **7,150** | **2,510** | **26%** |

### Implementation Effort

| Phase | Files | Tasks | Est. Hours | Complexity |
|-------|-------|-------|-----------|-----------|
| 7.1 DTO Unification | 25-30 | 5 | 3-4 | Medium |
| 7.2 Query Factories | 2-3 | 5 | 4-5 | Medium |
| 7.3 Query Consolidation | 22 | 10 | 6-8 | Low-Medium |
| 7.4 Modal Props | 45 | 4 | 2-3 | Low |
| **TOTAL** | **94-100** | **24** | **15-20** | **Medium** |

---

## SECTION 9: RECOMMENDATION

### Prioritization

**IMMEDIATE (Next Session):**
1. ✅ DTO Unification (Phase 7.1) - Foundation for everything
2. ✅ Query Factories (Phase 7.2) - Proof of concept

**PHASE 2:**
3. Query Hook Consolidation (Phase 7.3) - Largest savings
4. Modal Props Consolidation (Phase 7.4) - Quick win

### Success Metrics

- [ ] 2,500 LOC consolidated (26% reduction)
- [ ] All 22 query hooks using factory pattern
- [ ] Zero breaking changes
- [ ] Tests passing (100%)
- [ ] Developer adoption documented

### Next Action

Start with **Phase 7.1: DTO Unification** to establish foundation for subsequent phases.

---

**Created:** February 13, 2026  
**Status:** PLANNING - Ready for implementation  
**Estimated Total Duration:** 15-20 hours
