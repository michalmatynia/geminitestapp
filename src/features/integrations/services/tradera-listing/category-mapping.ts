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

export type TraderaCategoryMappingResolutionReason =
  | 'mapped'
  | 'missing_internal_category'
  | 'no_active_mapping'
  | 'stale_external_category'
  | 'invalid_external_category'
  | 'ambiguous_external_category';

export type TraderaCategoryMappingMatchScope = 'catalog_match' | 'cross_catalog' | 'none';

export type TraderaCategoryMappingResolution = {
  mapping: ResolvedTraderaCategoryMapping | null;
  reason: TraderaCategoryMappingResolutionReason;
  matchScope: TraderaCategoryMappingMatchScope;
  internalCategoryId: string | null;
  productCatalogIds: string[];
  matchingMappingCount: number;
  validMappingCount: number;
  catalogMatchedMappingCount: number;
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

export const selectPreferredTraderaCategoryMappingResolution = ({
  mappings,
  product,
}: {
  mappings: CategoryMappingWithDetails[];
  product: ProductWithImages;
}): TraderaCategoryMappingResolution => {
  const internalCategoryId = toTrimmedString(product.categoryId);
  const productCatalogIds = resolveProductCatalogIds(product);
  const emptyResolution = (
    reason: TraderaCategoryMappingResolutionReason,
    overrides: Partial<TraderaCategoryMappingResolution> = {}
  ): TraderaCategoryMappingResolution => ({
    mapping: null,
    reason,
    matchScope: 'none',
    internalCategoryId: internalCategoryId || null,
    productCatalogIds,
    matchingMappingCount: 0,
    validMappingCount: 0,
    catalogMatchedMappingCount: 0,
    ...overrides,
  });

  if (!internalCategoryId) {
    return emptyResolution('missing_internal_category', {
      internalCategoryId: null,
    });
  }

  const productCatalogIdSet = new Set(productCatalogIds);
  const matchingMappings = mappings.filter(
    (mapping) => mapping.isActive && toTrimmedString(mapping.internalCategoryId) === internalCategoryId
  );
  if (matchingMappings.length === 0) {
    return emptyResolution('no_active_mapping', {
      matchingMappingCount: 0,
    });
  }

  const validMappings = matchingMappings.filter((mapping) => {
    const externalCategoryId = toTrimmedString(mapping.externalCategory?.externalId);
    const externalCategoryName = toTrimmedString(mapping.externalCategory?.name);
    if (!externalCategoryId || !externalCategoryName) {
      return false;
    }
    return !isMissingExternalCategory(externalCategoryName);
  });
  if (validMappings.length === 0) {
    const staleMappings = matchingMappings.filter((mapping) =>
      isMissingExternalCategory(toTrimmedString(mapping.externalCategory?.name))
    );
    return emptyResolution(
      staleMappings.length > 0 ? 'stale_external_category' : 'invalid_external_category',
      {
        matchingMappingCount: matchingMappings.length,
        validMappingCount: 0,
      }
    );
  }

  const catalogMatchedMappings = validMappings.filter((mapping) =>
    productCatalogIdSet.has(toTrimmedString(mapping.catalogId))
  );
  const prioritizedMappings =
    catalogMatchedMappings.length > 0 ? catalogMatchedMappings : validMappings;
  const matchScope: TraderaCategoryMappingMatchScope =
    catalogMatchedMappings.length > 0 ? 'catalog_match' : 'cross_catalog';

  const distinctExternalCategoryIds = Array.from(
    new Set(
      prioritizedMappings
        .map((mapping) => toTrimmedString(mapping.externalCategory?.externalId))
        .filter(Boolean)
    )
  );

  if (distinctExternalCategoryIds.length !== 1) {
    return emptyResolution('ambiguous_external_category', {
      matchScope,
      matchingMappingCount: matchingMappings.length,
      validMappingCount: validMappings.length,
      catalogMatchedMappingCount: catalogMatchedMappings.length,
    });
  }

  const selectedMapping =
    [...prioritizedMappings].sort(
      (a, b) =>
        new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
    )[0] ?? null;

  if (!selectedMapping) {
    return emptyResolution('invalid_external_category', {
      matchScope,
      matchingMappingCount: matchingMappings.length,
      validMappingCount: validMappings.length,
      catalogMatchedMappingCount: catalogMatchedMappings.length,
    });
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
    return emptyResolution('invalid_external_category', {
      matchScope,
      matchingMappingCount: matchingMappings.length,
      validMappingCount: validMappings.length,
      catalogMatchedMappingCount: catalogMatchedMappings.length,
    });
  }

  return {
    mapping: {
      externalCategoryId,
      externalCategoryName,
      externalCategoryPath,
      internalCategoryId,
      catalogId: selectedMapping.catalogId,
      pathSegments,
    },
    reason: 'mapped',
    matchScope,
    internalCategoryId,
    productCatalogIds,
    matchingMappingCount: matchingMappings.length,
    validMappingCount: validMappings.length,
    catalogMatchedMappingCount: catalogMatchedMappings.length,
  };
};

export const selectPreferredTraderaCategoryMapping = ({
  mappings,
  product,
}: {
  mappings: CategoryMappingWithDetails[];
  product: ProductWithImages;
}): ResolvedTraderaCategoryMapping | null =>
  selectPreferredTraderaCategoryMappingResolution({ mappings, product }).mapping;

export const resolveTraderaCategoryMappingResolutionForProduct = async ({
  connectionId,
  product,
}: {
  connectionId: string;
  product: ProductWithImages;
}): Promise<TraderaCategoryMappingResolution> => {
  const categoryMappingRepository = getCategoryMappingRepository();
  const mappings = await categoryMappingRepository.listByConnection(connectionId);
  return selectPreferredTraderaCategoryMappingResolution({ mappings, product });
};

export const resolveTraderaCategoryMappingForProduct = async ({
  connectionId,
  product,
}: {
  connectionId: string;
  product: ProductWithImages;
}): Promise<ResolvedTraderaCategoryMapping | null> => {
  return (await resolveTraderaCategoryMappingResolutionForProduct({ connectionId, product })).mapping;
};
