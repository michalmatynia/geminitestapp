# Products Section Modularization Plan

## Overview
The Products section has significant code bloat concentrated in a few large files. This document outlines the refactoring strategy and provides extracted hooks/components as starting templates.

## Current State (Bloated Files)

| File | Lines | Issue |
|------|-------|-------|
| `components/products/modals/ListProductModal.tsx` | 689 | Multiple concerns (integration, Base.com, templating, export) |
| `app/(admin)/admin/products/page.tsx` | 467 | Selection, modals, drafts, listing badges |
| `components/products/form/ProductFormGeneral.tsx` | 440 | Multilingual tabs, AI generation, identifiers, dimensions |
| `lib/services/productService.ts` | 423 | CRUD, image management, relationships, file ops |
| `components/products/ProductImageManager.tsx` | 401 | Drag-drop, file upload, preview, debug UI |
| `components/products/list/ProductFilters.tsx` | 319 | Filters, selection UI, bulk actions |

**Total bloat:** ~2,740 lines in 6 files

## Refactoring Strategy (Phased)

### Phase 1: Extract Hooks from ListProductModal ✅ STARTED
**Goal:** Reduce 689 → 300 lines
**Extract:**
- ✅ `useIntegrationSelection.ts` - Integration/connection logic
- ✅ `useBaseComSettings.ts` - Base.com templates/inventories
- [ ] `useExportSubmission.ts` - Form submission & API calls

**Why:** These are self-contained concerns with testable logic that can be reused in other modals (MassListProductModal, SelectProductForListingModal).

---

### Phase 2: Extract Hooks from Products Page
**Goal:** Reduce 467 → 250 lines
**Extract:**
- [ ] `hooks/useProductSelection.ts` - Multi-select, bulk operations
- [ ] `hooks/useProductDrafts.ts` - Draft loading & synchronization
- [ ] `hooks/useListingBadges.ts` - Badge refresh coordination
- [ ] `hooks/useProductPreferences.ts` - User filter/sort preferences

**Why:** Page becomes orchestration-only; hooks become reusable utilities across the app.

---

### Phase 3: Break ProductFormGeneral into Sections
**Goal:** Reduce 440 → 120 lines
**Extract:**
- [ ] `AIGenerationSection.tsx` - Description generation UI
- [ ] `ProductIdentifiers.tsx` - SKU, EAN, GTIN, ASIN
- [ ] `PhysicalDimensions.tsx` - Weight, length, width
- [ ] `LanguageTabs.tsx` - Reusable multilingual tabs (share across forms)
- [ ] `hooks/useAIGeneration.ts` - Polling, job status, errors

**Why:** Each section has distinct validation & styling; makes form more maintainable and testable.

---

### Phase 4: Segment productService
**Goal:** Reduce 423 → 100 lines (becomes a facade)
**Extract:**
- [ ] `product-crud.ts` - Create, read, update, delete
- [ ] `product-image-service.ts` - Link, unlink, manage images
- [ ] `product-relationship-service.ts` - Catalog, category, tag operations
- [ ] `image-file-migration.ts` - Temp → SKU path migration

**Dependencies Graph:**
```
productService (facade/exports)
  ├─ product-crud.ts
  ├─ product-image-service.ts
  ├─ product-relationship-service.ts
  └─ image-file-migration.ts
```

**Why:** Each module handles one domain; easier to test, parallelize team work, and prevent circular dependencies.

---

### Phase 5: Modularize ProductImageManager
**Goal:** Reduce 401 → 180 lines
**Extract:**
- [ ] `ImageSlot.tsx` - Single image slot UI
- [ ] `ImageDragDropManager.tsx` - Drag-drop state & handlers
- [ ] `ImageDebugPanel.tsx` - Debug/preview tools
- [ ] `hooks/useDragAndDrop.ts` - Drag state logic

**Why:** Drag-drop is its own complexity; slot component can be reused in galleries.

---

### Phase 6: Split ProductFilters
**Goal:** Reduce 319 → 150 lines
**Extract:**
- [ ] `FilterInputs.tsx` - Search, SKU, price, date fields
- [ ] `SelectionToolbar.tsx` - Bulk action dropdown & buttons
- [ ] `hooks/useFilterState.ts` - Combine all filter setters

**Why:** Two distinct UX concerns (filtering vs. bulk actions); easier to reason about separately.

---

## Folder Structure (Target State)

```
components/products/
├── ProductImageManager.tsx (orchestration)
├── ProductImageManager/
│   ├── ImageSlot.tsx
│   ├── ImageDragDropManager.tsx
│   ├── ImageDebugPanel.tsx
│   └── hooks/
│       └── useDragAndDrop.ts
│
├── form/
│   ├── ProductFormGeneral.tsx (orchestration)
│   ├── AIGenerationSection.tsx
│   ├── ProductIdentifiers.tsx
│   ├── PhysicalDimensions.tsx
│   ├── LanguageTabs.tsx
│   └── hooks/
│       └── useAIGeneration.ts
│
├── list/
│   ├── ProductFilters.tsx (wrapper)
│   ├── FilterInputs.tsx
│   ├── SelectionToolbar.tsx
│   └── hooks/
│       └── useFilterState.ts
│
├── modals/
│   ├── ListProductModal.tsx (refactored)
│   ├── ExportLogViewer.tsx
│   ├── hooks/
│   │   ├── useIntegrationSelection.ts ✅
│   │   ├── useBaseComSettings.ts ✅
│   │   └── useExportSubmission.ts
│   └── ...other modals
│
└── ui/
    ├── FormField.tsx
    ├── ImageInput.tsx
    └── ...shared form elements

lib/services/
├── productService.ts (facade, 100 lines)
├── product-crud.ts
├── product-image-service.ts
├── product-relationship-service.ts
└── image-file-migration.ts
```

---

## Implementation Guidelines

### When Extracting a Hook
1. **Identify state cohesion** - Group related useState calls
2. **Extract useEffect blocks** - Move dependent effects together
3. **Return tuple or object** - If 2-3 items, use tuple; if more, use object
4. **Document why it exists** - Add comment explaining the extraction

### When Creating Sub-Component
1. **Single responsibility** - One main concern (e.g., "ImageSlot")
2. **Accept props for data** - No direct parent state access
3. **Callback for actions** - Let parent handle side effects
4. **Compose them back** - Parent orchestrates the pieces

### Testing Strategy
- **Hooks:** Unit test with `renderHook` + act()
- **Components:** Test with data/callback props
- **Integration:** Test orchestration component with all pieces

---

## Expected Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Max file size | 689 lines | <250 lines | -64% |
| Number of components | 6 large | 20+ small | +233% |
| Code reusability | Low | High | - |
| Test coverage potential | 40% | 85%+ | +112% |
| Parallel work capability | Limited | High | - |

---

## Rollout Schedule

**Week 1 (Phase 1-2):** Hooks extraction (highest impact)
**Week 2 (Phase 3-4):** Service & form refactoring
**Week 3 (Phase 5-6):** Components & polishing

---

## Backward Compatibility

All changes are **internal refactoring**:
- No API changes
- No component prop changes (for consumers)
- No behavior changes
- **Safe to merge without coord-inating with other teams**

---

## Already Completed ✅

- `useIntegrationSelection.ts` - Ready to use
- `useBaseComSettings.ts` - Ready to use
- Plan document created

---

## Next Steps

1. **Integrate hooks into ListProductModal** - Replace inline state with new hooks
2. **Test modal still works** - Verify all integration flows
3. **Repeat for other modals** - MassListProductModal, SelectProductForListingModal
4. **Extract remaining hooks** - useExportSubmission, useProductSelection, etc.
5. **Segment services** - productService → multiple focused modules
6. **Component extraction** - Form sections, image slots, filter inputs
