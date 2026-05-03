import type { RowSelectionState } from '@tanstack/react-table';

import type { ProductAdvancedFilterGroup } from '@/shared/contracts/products/filters';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export const getProductRowId = (product: ProductWithImages): string => product.id;

export const getSelectedProductIds = (rowSelection: RowSelectionState): string[] =>
  Object.keys(rowSelection).filter((id: string) => rowSelection[id] === true);

export const getSelectedProductsSnapshot = (
  data: ProductWithImages[],
  productIds: string[]
): ProductWithImages[] => {
  const selectedSet = new Set(productIds);
  return data.filter((product) => selectedSet.has(product.id));
};

export const cloneAdvancedFilterGroup = (
  filter: ProductAdvancedFilterGroup
): ProductAdvancedFilterGroup =>
  JSON.parse(JSON.stringify(filter)) as ProductAdvancedFilterGroup;

export const getArchiveSuccessMessage = (archived: boolean, updated: number): string => {
  const suffix = updated === 1 ? '' : 's';
  if (archived) return `Archived ${updated} product${suffix}.`;
  return `Removed ${updated} product${suffix} from archive.`;
};

export const getArchiveFailureMessage = (archived: boolean): string => {
  if (archived) return 'Failed to archive selected products.';
  return 'Failed to remove selected products from archive.';
};

export const getParsedMatchToastMessage = (
  productCount: number,
  matchedRowCount: number
): string => {
  if (matchedRowCount > productCount) {
    return `Filtered product list to ${productCount} unique parsed products from ${matchedRowCount} matched rows.`;
  }
  const suffix = productCount === 1 ? '' : 's';
  return `Filtered product list to ${productCount} parsed product${suffix}.`;
};

export const getPresetSubmitLabel = (
  savingPreset: boolean,
  mode: 'create' | 'edit'
): string => {
  if (savingPreset) return 'Saving...';
  if (mode === 'edit') return 'Update Preset';
  return 'Save Preset';
};
