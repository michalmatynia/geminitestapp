import type { CategoryMappingWithDetails } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';

import { getCategoryMappingRepository } from '../category-mapping-repository';

export type ResolvedTraderaCategoryMapping = {
  externalCategoryId: string;
  externalCategoryName: string;
  externalCategoryPath: string | null;
  internalCategoryId: string;
  catalogId: string;
  pathSegments: string[];
};

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const isMissingExternalCategory = (name: string): boolean =>
  name.startsWith('[Missing external category:');

export const resolveProductCatalogIds = (product: ProductWithImages): string[] => {
  const catalogIds = new Set<string>();

  const directCatalogId = toTrimmedString(product.catalogId);
  if (directCatalogId) {
    catalogIds.add(directCatalogId);
  }

  for (const catalog of product.catalogs ?? []) {
    const catalogId = toTrimmedString(catalog.catalogId);
    if (catalogId) {
      catalogIds.add(catalogId);
    }
  }

  return Array.from(catalogIds);
};

export const selectPreferredTraderaCategoryMapping = ({
  mappings,
  product,
}: {
  mappings: CategoryMappingWithDetails[];
  product: ProductWithImages;
}): ResolvedTraderaCategoryMapping | null => {
  const internalCategoryId = toTrimmedString(product.categoryId);
  if (!internalCategoryId) {
    return null;
  }

  const productCatalogIds = new Set(resolveProductCatalogIds(product));
  const matchingMappings = mappings.filter(
    (mapping) => mapping.isActive && toTrimmedString(mapping.internalCategoryId) === internalCategoryId
  );

  const validMappings = matchingMappings.filter((mapping) => {
    const externalCategoryId = toTrimmedString(mapping.externalCategory?.externalId);
    const externalCategoryName = toTrimmedString(mapping.externalCategory?.name);
    if (!externalCategoryId || !externalCategoryName) {
      return false;
    }
    return !isMissingExternalCategory(externalCategoryName);
  });

  const catalogMatchedMappings = validMappings.filter((mapping) =>
    productCatalogIds.has(toTrimmedString(mapping.catalogId))
  );
  const prioritizedMappings =
    catalogMatchedMappings.length > 0 ? catalogMatchedMappings : validMappings;

  const distinctExternalCategoryIds = Array.from(
    new Set(
      prioritizedMappings
        .map((mapping) => toTrimmedString(mapping.externalCategory?.externalId))
        .filter(Boolean)
    )
  );

  if (distinctExternalCategoryIds.length !== 1) {
    return null;
  }

  const selectedMapping =
    [...prioritizedMappings].sort(
      (a, b) =>
        new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
    )[0] ?? null;

  if (!selectedMapping) {
    return null;
  }

  const externalCategoryId = toTrimmedString(selectedMapping.externalCategory?.externalId);
  const externalCategoryName = toTrimmedString(selectedMapping.externalCategory?.name);
  const externalCategoryPath =
    toTrimmedString(selectedMapping.externalCategory?.path) || externalCategoryName || null;
  const pathSegments = (externalCategoryPath ?? externalCategoryName)
    .split(' > ')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!externalCategoryId || !externalCategoryName || pathSegments.length === 0) {
    return null;
  }

  return {
    externalCategoryId,
    externalCategoryName,
    externalCategoryPath,
    internalCategoryId,
    catalogId: selectedMapping.catalogId,
    pathSegments,
  };
};

export const resolveTraderaCategoryMappingForProduct = async ({
  connectionId,
  product,
}: {
  connectionId: string;
  product: ProductWithImages;
}): Promise<ResolvedTraderaCategoryMapping | null> => {
  const categoryMappingRepository = getCategoryMappingRepository();
  const mappings = await categoryMappingRepository.listByConnection(connectionId);
  return selectPreferredTraderaCategoryMapping({ mappings, product });
};
