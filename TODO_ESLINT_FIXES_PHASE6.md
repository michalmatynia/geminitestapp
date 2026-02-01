# ESLint Fixes - Phase 6

## Summary
Fix remaining 7 files with 37 ESLint errors (all missing return type annotations).

## Files to Fix

### 1. `src/features/products/hooks/useProductsQuery.ts` (8 errors)
- Add return type `Promise<void>` to `refetch` callback on line ~67
- Status: ⏳ Pending

### 2. `src/features/viewer3d/components/Asset3DCard.tsx` (7 errors)
- Add return type `string` to `formatFileSize` arrow function
- Add return type `string` to `formatDate` arrow function
- Status: ⏳ Pending

### 3. `src/features/products/services/productService.ts` (6 errors)
- Update eslint-disable comment to include `@typescript-eslint/typedef`
- Status: ⏳ Pending

### 4. `src/features/products/hooks/useProductsMutations.ts` (6 errors)
- Add return type `Promise<void>` to onSuccess callbacks in all three hooks
- Status: ⏳ Pending

### 5. `src/shared/hooks/use-undo.ts` (5 errors)
- Add return type `void` to `setState`, `undo`, `redo` callbacks
- Add return type `void` to `resetHistory` callback
- Status: ⏳ Pending

### 6. `src/features/products/hooks/useProductDataWithQuery.ts` (4 errors)
- Add return type `number` to `totalPages` useMemo
- Add return type `void` to `resetFilters` useCallback
- Status: ⏳ Pending

### 7. `src/features/products/services/aiDescriptionService.ts` (1 error)
- Update eslint-disable comment to include `@typescript-eslint/typedef`
- Status: ⏳ Pending

## Progress
- Total files: 7
- Total errors: 37
- Fixed: 0
- Remaining: 7 files, 37 errors

