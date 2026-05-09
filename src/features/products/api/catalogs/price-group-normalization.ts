/**
 * Catalog Price Group Normalization
 * 
 * Price group selection normalization for catalog management.
 * Provides:
 * - Price group ID validation and normalization
 * - Default price group selection handling
 * - Provider-specific price group configuration
 * - Storage-ready price group data formatting
 * - Catalog-specific price group processing
 */

import { normalizePriceGroupSelectionForStorage } from '@/shared/lib/products/services/price-group-storage-normalization';

/** Normalizes catalog price group selection for storage */
export const normalizeCatalogPriceGroupSelection = async (
  provider: string,
  selection: {
    priceGroupIds?: string[];
    defaultPriceGroupId?: string | null;
  }
): Promise<{ priceGroupIds: string[]; defaultPriceGroupId: string | null }> => {
  return normalizePriceGroupSelectionForStorage(provider, selection);
};
