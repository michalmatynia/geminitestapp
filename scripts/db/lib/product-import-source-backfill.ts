import type { ProductListing } from '@/shared/contracts/integrations';
import { collectBaseImportedProductIds } from '@/features/integrations/services/imports/base-import-provenance';

type ProductImportSourceRecord = {
  id?: unknown;
  importSource?: unknown;
};

export type ProductImportSourceBackfillPlan = {
  candidateImportedProductIds: string[];
  targetProductIds: string[];
  alreadyTaggedProductIds: string[];
};

const normalizeTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const buildProductImportSourceBackfillPlan = (args: {
  products: ProductImportSourceRecord[];
  listings: Array<Pick<ProductListing, 'productId' | 'marketplaceData'>>;
}): ProductImportSourceBackfillPlan => {
  const candidateImportedProductIds = collectBaseImportedProductIds(args.listings);
  const importedIdSet = new Set(candidateImportedProductIds);

  const targetProductIds: string[] = [];
  const alreadyTaggedProductIds: string[] = [];

  args.products.forEach((product) => {
    const productId = normalizeTrimmedString(product.id);
    if (!productId || !importedIdSet.has(productId)) return;

    if (normalizeTrimmedString(product.importSource).toLowerCase() === 'base') {
      alreadyTaggedProductIds.push(productId);
      return;
    }

    targetProductIds.push(productId);
  });

  return {
    candidateImportedProductIds,
    targetProductIds,
    alreadyTaggedProductIds,
  };
};
