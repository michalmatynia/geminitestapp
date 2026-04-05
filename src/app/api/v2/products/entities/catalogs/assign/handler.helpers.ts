import { badRequestError } from '@/shared/errors/app-error';

export type ProductsCatalogAssignMode = 'add' | 'replace' | 'remove';

type CatalogRecord = {
  id: string;
};

type ProductsCatalogAssignRepository = {
  bulkReplaceProductCatalogs: (productIds: string[], catalogIds: string[]) => Promise<unknown>;
  bulkRemoveProductCatalogs: (productIds: string[], catalogIds: string[]) => Promise<unknown>;
  bulkAddProductCatalogs: (productIds: string[], catalogIds: string[]) => Promise<unknown>;
};

export const dedupeProductsCatalogAssignIds = (ids: string[]): string[] => Array.from(new Set(ids));

export const resolveProductsCatalogAssignMode = (
  mode?: ProductsCatalogAssignMode
): ProductsCatalogAssignMode => mode ?? 'add';

export const resolveValidProductsCatalogAssignCatalogIds = (
  catalogIds: string[],
  existingCatalogs: CatalogRecord[]
): string[] => {
  const uniqueCatalogIds = dedupeProductsCatalogAssignIds(catalogIds);
  const existingIds = new Set(existingCatalogs.map((entry) => entry.id));
  return uniqueCatalogIds.filter((id) => existingIds.has(id));
};

export const requireValidProductsCatalogAssignCatalogIds = (
  requestedCatalogIds: string[],
  validCatalogIds: string[]
): string[] => {
  if (validCatalogIds.length === 0) {
    throw badRequestError('No valid catalogs found.', {
      catalogIds: requestedCatalogIds,
    });
  }

  return validCatalogIds;
};

export const applyProductsCatalogAssignMutation = async ({
  mode,
  productIds,
  catalogIds,
  productRepository,
}: {
  mode: ProductsCatalogAssignMode;
  productIds: string[];
  catalogIds: string[];
  productRepository: ProductsCatalogAssignRepository;
}): Promise<void> => {
  if (mode === 'replace') {
    await productRepository.bulkReplaceProductCatalogs(productIds, catalogIds);
    return;
  }

  if (mode === 'remove') {
    await productRepository.bulkRemoveProductCatalogs(productIds, catalogIds);
    return;
  }

  await productRepository.bulkAddProductCatalogs(productIds, catalogIds);
};

export const buildProductsCatalogAssignResponse = (
  updated: number,
  catalogs: number,
  mode: ProductsCatalogAssignMode
): {
  updated: number;
  catalogs: number;
  mode: ProductsCatalogAssignMode;
} => ({
  updated,
  catalogs,
  mode,
});
