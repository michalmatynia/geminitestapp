import { normalizePriceGroupSelectionForStorage } from '@/shared/lib/products/services/price-group-storage-normalization';

export const normalizeCatalogPriceGroupSelection = async (
  provider: string,
  selection: {
    priceGroupIds?: string[];
    defaultPriceGroupId?: string | null;
  }
): Promise<{ priceGroupIds: string[]; defaultPriceGroupId: string | null }> => {
  return normalizePriceGroupSelectionForStorage(provider, selection);
};
