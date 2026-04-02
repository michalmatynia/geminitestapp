import type { ProductListing } from '@/shared/contracts/integrations';

export const BASE_IMPORTED_MARKETPLACE_SOURCE = 'base-import';

const normalizeTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const hasBaseImportMarketplaceSource = (marketplaceData: unknown): boolean => {
  const record = toRecord(marketplaceData);
  if (!record) return false;
  return (
    normalizeTrimmedString(record['source']).toLowerCase() === BASE_IMPORTED_MARKETPLACE_SOURCE
  );
};

export const listingHasBaseImportProvenance = (
  listing: Pick<ProductListing, 'marketplaceData'> | null | undefined
): boolean => hasBaseImportMarketplaceSource(listing?.marketplaceData);

export const collectBaseImportedProductIds = (
  listings: Array<Pick<ProductListing, 'productId' | 'marketplaceData'>>
): string[] => {
  const uniqueProductIds = new Set<string>();

  listings.forEach((listing) => {
    if (!listingHasBaseImportProvenance(listing)) return;
    const productId = normalizeTrimmedString(listing.productId);
    if (!productId) return;
    uniqueProductIds.add(productId);
  });

  return Array.from(uniqueProductIds);
};
