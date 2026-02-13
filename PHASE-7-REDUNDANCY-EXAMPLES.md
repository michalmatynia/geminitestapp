# Phase 7 - Data Layer Redundancy Examples

## 1. MUTATION PATTERN REPETITION

### Current (repeated 30+ times):
```
✗ useCreatePriceGroupMutation()
✗ useUpdatePriceGroupMutation()
✗ useDeletePriceGroupMutation()
✗ useSavePriceGroupMutation()

✗ useCreateCatalogMutation()
✗ useUpdateCatalogMutation()
✗ useDeleteCatalogMutation()
✗ useSaveCatalogMutation()

... (15+ more entity types)
```

All follow identical pattern:
```typescript
// BOILERPLATE:
const queryClient = useQueryClient();
return useMutation({
  mutationFn: (data) => api.call(data),
  onSuccess: () => invalidate(queryClient),
});
```

### Proposed (single factory):
```typescript
export function useSaveMutation<T extends DtoBase>(
  apiCall: (id?: string, data?: Partial<T>) => Promise<T>,
  invalidate: (qc: QueryClient) => void,
) {
  return createSaveMutation(apiCall, invalidate);
}

// Usage: 1 line instead of 10
export const useSavePriceGroup = () => 
  useSaveMutation(api.savePriceGroup, invalidatePriceGroup);
```

---

## 2. MODAL PROPS DUPLICATION

### Current (repeated 34 times):
```typescript
// CatalogModal
interface CatalogModalProps {
  isOpen: boolean;              // ← Same
  onClose: () => void;          // ← Same
  onSuccess: () => void;        // ← Same
  catalog?: Catalog | null;     // ← Different (catalog vs country vs priceGroup)
  priceGroups: PriceGroup[];    // ← Different (supporting data)
  loadingGroups: boolean;       // ← Different (loading flag)
  defaultGroupId: string;       // ← Different
}

// CountryModal
interface CountryModalProps {
  isOpen: boolean;              // ← Same
  onClose: () => void;          // ← Same
  onSuccess: () => void;        // ← Same
  country?: Country | null;     // ← Different (country vs catalog)
  currencies: Currency[];       // ← Different (supporting data)
  loadingCurrencies: boolean;   // ← Different (loading flag)
}

// PriceGroupModal (similar pattern)
// ... (31 more modals)
```

### Proposed (single base type):
```typescript
// Base modal state
type ModalStateProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

// Generic entity modal
type EntityModalProps<T, TList = T> = ModalStateProps & {
  item?: T | null;
  items?: TList[];
  loading?: boolean;
};

// Typed aliases for clarity:
type CatalogModalProps = EntityModalProps<Catalog, PriceGroup>;
type CountryModalProps = EntityModalProps<Country, Currency>;
type PriceGroupModalProps = EntityModalProps<PriceGroup>;
```

---

## 3. QUERY RESPONSE TYPE INCONSISTENCY

### Current (22 hook files, no standard):
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

// ... (19 more files with same pattern, no reusable type)
```

### Proposed (standard types):
```typescript
// Standard types in dtos.ts
type ListQuery<T> = UseQueryResult<T[], Error>;
type SingleQuery<T> = UseQueryResult<T, Error>;
type PagedQuery<T> = UseQueryResult<Paginated<T>, Error>;

// Usage across all hooks:
export function usePriceGroups(): ListQuery<PriceGroup> { ... }
export function useCatalog(id: string): SingleQuery<Catalog> { ... }
export function useProducts(page: number): PagedQuery<Product> { ... }
```

---

## 4. QUERY KEY MANAGEMENT

### Current (scattered):
```
// File 1: useProductSettingsQueries.ts
const productSettingsKeys = QUERY_KEYS.products.settings;

// File 2: useIntegrationQueries.ts
// (uses integration-specific keys)

// File 3: useCmsQueries.ts
// (uses cms-specific keys)

// Pattern: Each file manages its own keys
// Problem: Hard to track, no hierarchy
```

### Proposed (centralized with hierarchy):
```typescript
// src/shared/lib/query-keys.ts
export const QUERY_KEYS = {
  products: {
    all: ['products'],
    settings: {
      priceGroups: ['products', 'settings', 'priceGroups'],
      catalogs: ['products', 'settings', 'catalogs'],
      categories: (catalogId: string) => ['products', 'settings', 'categories', catalogId],
    },
  },
  integrations: { ... },
  cms: { ... },
};

// Usage: Clear hierarchy, easy to find and maintain
```

---

## 5. MUTATION PAYLOAD TYPES

### Current (inconsistent):
```typescript
// Pattern 1: Wrapped object
useMutation<T, Error, { id?: string; data: Partial<T> }>

// Pattern 2: Direct T
useMutation<T, Error, T>

// Pattern 3: Custom payload
useMutation<T, Error, ReorderCategoryPayload>

// Pattern 4: Tuple-like (id, data)
useMutation<T, Error, [string | undefined, Partial<T>]>
```

### Proposed (unified):
```typescript
// Standard for saves
type SavePayload<T> = { id?: string; data: Partial<T> };
type CreatePayload<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
type UpdatePayload<T> = { id: string; data: Partial<T> };
type DeletePayload = { id: string };

// Usage consistent across all mutations
useSaveMutation<PriceGroup, Error, SavePayload<PriceGroup>>()
```

---

## IMPACT SUMMARY

### Lines of Code Impact
- Modal Props: 510 LOC savings (37% reduction)
- Mutations: 600 LOC savings (33% reduction)  
- Query Hooks: 1,000 LOC savings (29% reduction)
- Query Types: 200 LOC savings (9% reduction)
- DTO Defs: 200 LOC savings (25% reduction)

**TOTAL: 2,510 LOC** (26% of data layer)

### Code Quality Impact
- ✅ Single source of truth for patterns
- ✅ Easier to add new entities/modals
- ✅ Better IDE autocomplete
- ✅ Consistent error handling
- ✅ Easier to test
- ✅ Easier to maintain

### Developer Experience
- ✅ Learn patterns once, apply everywhere
- ✅ Less boilerplate to write
- ✅ Clear conventions
- ✅ Reduced cognitive load

---

**Ready to implement Phase 7? Start with Phase 7.1: DTO Unification**
