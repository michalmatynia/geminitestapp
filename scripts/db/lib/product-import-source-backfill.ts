import type { ProductListing } from '@/shared/contracts/integrations';
import { collectBaseImportedProductIds } from '@/features/integrations/services/imports/base-import-provenance';

type ProductImportSourceRecord = {
  id?: unknown;
  importSource?: unknown;
};

type ProductImportSourceRunItemRecord = {
  importedProductId?: unknown;
  status?: unknown;
  action?: unknown;
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

const collectBaseImportedProductIdsFromRunItems = (
  runItems: ProductImportSourceRunItemRecord[]
): string[] => {
  const importedProductIds = new Set<string>();

  runItems.forEach((runItem) => {
    const importedProductId = normalizeTrimmedString(runItem.importedProductId);
    if (!importedProductId) return;

    const normalizedAction = normalizeTrimmedString(runItem.action).toLowerCase();
    const normalizedStatus = normalizeTrimmedString(runItem.status).toLowerCase();
    const wasPersistedImport =
      normalizedAction === 'imported' ||
      (normalizedAction !== 'dry_run' && normalizedStatus === 'imported');

    if (!wasPersistedImport) return;
    importedProductIds.add(importedProductId);
  });

  return Array.from(importedProductIds);
};

export const buildProductImportSourceBackfillPlan = (args: {
  products: ProductImportSourceRecord[];
  listings: Array<Pick<ProductListing, 'productId' | 'marketplaceData'>>;
  runItems?: ProductImportSourceRunItemRecord[];
}): ProductImportSourceBackfillPlan => {
  const candidateImportedProductIds = Array.from(
    new Set([
      ...collectBaseImportedProductIds(args.listings),
      ...collectBaseImportedProductIdsFromRunItems(args.runItems ?? []),
    ])
  );
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
