import type { CategoryMappingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ExternalCategoryRepository } from '@/shared/contracts/integrations/repositories';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { getTraderaSubCategories, type TraderaPublicApiCredentials } from '../tradera-api-client';
import { getCategoryMappingRepository } from '../category-mapping-repository';

// Re-export so callers don't need to import from two places
export type { TraderaPublicApiCredentials };

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
  | 'mapped_via_parent'
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

const MAX_PARENT_WALK_DEPTH = 10;

const tryResolveMappingForCategoryId = (
  candidateId: string,
  mappings: CategoryMappingWithDetails[],
  productCatalogIdSet: ReadonlySet<string>
): {
  mapping: ResolvedTraderaCategoryMapping;
  matchScope: TraderaCategoryMappingMatchScope;
  matchingMappingCount: number;
  validMappingCount: number;
  catalogMatchedMappingCount: number;
} | null => {
  const matchingMappings = mappings.filter(
    (mapping) => mapping.isActive && toTrimmedString(mapping.internalCategoryId) === candidateId
  );
  if (matchingMappings.length === 0) return null;

  const validMappings = matchingMappings.filter((mapping) => {
    const exId = toTrimmedString(mapping.externalCategory?.externalId);
    const exName = toTrimmedString(mapping.externalCategory?.name);
    return exId && exName && !isMissingExternalCategory(exName);
  });
  if (validMappings.length === 0) return null;

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
  if (distinctExternalCategoryIds.length !== 1) return null;

  const selectedMapping =
    [...prioritizedMappings].sort(
      (a, b) =>
        new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
    )[0] ?? null;
  if (!selectedMapping) return null;

  const externalCategoryId = toTrimmedString(selectedMapping.externalCategory?.externalId);
  const externalCategoryName = toTrimmedString(selectedMapping.externalCategory?.name);
  const externalCategoryPath =
    toTrimmedString(selectedMapping.externalCategory?.path) || externalCategoryName || null;
  const pathSegments = (externalCategoryPath ?? externalCategoryName)
    .split(' > ')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!externalCategoryId || !externalCategoryName || pathSegments.length === 0) return null;

  return {
    mapping: {
      externalCategoryId,
      externalCategoryName,
      externalCategoryPath,
      internalCategoryId: candidateId,
      catalogId: selectedMapping.catalogId,
      pathSegments,
    },
    matchScope,
    matchingMappingCount: matchingMappings.length,
    validMappingCount: validMappings.length,
    catalogMatchedMappingCount: catalogMatchedMappings.length,
  };
};

export const selectPreferredTraderaCategoryMappingResolution = ({
  mappings,
  product,
  internalCategories,
}: {
  mappings: CategoryMappingWithDetails[];
  product: ProductWithImages;
  internalCategories?: ProductCategory[] | undefined;
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

  // --- Direct match on product's own category ---
  const directMatch = tryResolveMappingForCategoryId(
    internalCategoryId,
    mappings,
    productCatalogIdSet
  );

  if (directMatch) {
    return {
      mapping: directMatch.mapping,
      reason: 'mapped',
      matchScope: directMatch.matchScope,
      internalCategoryId,
      productCatalogIds,
      matchingMappingCount: directMatch.matchingMappingCount,
      validMappingCount: directMatch.validMappingCount,
      catalogMatchedMappingCount: directMatch.catalogMatchedMappingCount,
    };
  }

  // --- Check for stale/invalid mappings on direct category before parent walk ---
  const directMatchingMappings = mappings.filter(
    (mapping) => mapping.isActive && toTrimmedString(mapping.internalCategoryId) === internalCategoryId
  );
  if (directMatchingMappings.length > 0) {
    const staleMappings = directMatchingMappings.filter((mapping) =>
      isMissingExternalCategory(toTrimmedString(mapping.externalCategory?.name))
    );
    if (staleMappings.length === directMatchingMappings.length) {
      return emptyResolution('stale_external_category', {
        matchingMappingCount: directMatchingMappings.length,
        validMappingCount: 0,
      });
    }
    const validMappings = directMatchingMappings.filter((mapping) => {
      const exId = toTrimmedString(mapping.externalCategory?.externalId);
      const exName = toTrimmedString(mapping.externalCategory?.name);
      return exId && exName && !isMissingExternalCategory(exName);
    });
    if (validMappings.length === 0) {
      return emptyResolution('invalid_external_category', {
        matchingMappingCount: directMatchingMappings.length,
        validMappingCount: 0,
      });
    }
    // Ambiguous direct mapping — don't fall through to parent
    const catalogMatchedCount = validMappings.filter((mapping) =>
      productCatalogIdSet.has(toTrimmedString(mapping.catalogId))
    ).length;
    return emptyResolution('ambiguous_external_category', {
      matchScope: catalogMatchedCount > 0 ? 'catalog_match' : 'cross_catalog',
      matchingMappingCount: directMatchingMappings.length,
      validMappingCount: validMappings.length,
      catalogMatchedMappingCount: catalogMatchedCount,
    });
  }

  // --- Parent category walk: inherit mapping from nearest ancestor ---
  if (internalCategories && internalCategories.length > 0) {
    const categoriesById = new Map(
      internalCategories.map((cat) => [toTrimmedString(cat.id), cat])
    );
    const visited = new Set<string>();
    let currentCategory = categoriesById.get(internalCategoryId);
    let depth = 0;

    while (currentCategory && depth < MAX_PARENT_WALK_DEPTH) {
      const parentId = toTrimmedString(currentCategory.parentId);
      if (!parentId || visited.has(parentId)) break;
      visited.add(parentId);
      depth += 1;

      const parentMatch = tryResolveMappingForCategoryId(
        parentId,
        mappings,
        productCatalogIdSet
      );

      if (parentMatch) {
        return {
          mapping: parentMatch.mapping,
          reason: 'mapped_via_parent',
          matchScope: parentMatch.matchScope,
          internalCategoryId,
          productCatalogIds,
          matchingMappingCount: parentMatch.matchingMappingCount,
          validMappingCount: parentMatch.validMappingCount,
          catalogMatchedMappingCount: parentMatch.catalogMatchedMappingCount,
        };
      }

      currentCategory = categoriesById.get(parentId);
    }
  }

  return emptyResolution('no_active_mapping', {
    matchingMappingCount: 0,
  });
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

  // First try without parent walk for the fast path
  const directResult = selectPreferredTraderaCategoryMappingResolution({ mappings, product });
  if (directResult.reason !== 'no_active_mapping') {
    return directResult;
  }

  // No direct mapping — load product categories for parent-chain inheritance
  const catalogId = toTrimmedString(product.catalogId);
  let resolvedCategoryCatalogId: string | null = null;

  try {
    const { getCategoryRepository } = await import(
      '@/shared/lib/products/services/category-repository'
    );
    const categoryRepository = await getCategoryRepository();
    const internalCategoryId = toTrimmedString(product.categoryId);
    const internalCategory =
      internalCategoryId && typeof categoryRepository.getCategoryById === 'function'
        ? await categoryRepository.getCategoryById(internalCategoryId)
        : null;
    const categoryCatalogId =
      toTrimmedString(internalCategory?.catalogId) ||
      catalogId ||
      resolveProductCatalogIds(product)[0] ||
      '';
    resolvedCategoryCatalogId = categoryCatalogId || null;

    if (!categoryCatalogId) {
      return directResult;
    }

    const internalCategories = await categoryRepository.listCategories({
      catalogId: categoryCatalogId,
    });
    return selectPreferredTraderaCategoryMappingResolution({
      mappings,
      product,
      internalCategories,
    });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'tradera-category-mapping',
      action: 'resolveTraderaCategoryMappingResolutionForProduct',
      connectionId,
      productId: toTrimmedString(product.id) || null,
      productCategoryId: toTrimmedString(product.categoryId) || null,
      productCatalogIds: resolveProductCatalogIds(product),
      requestedCatalogId: catalogId || null,
      resolvedCategoryCatalogId,
    });
    return directResult;
  }
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

export type LeafCategoryResolution = {
  /** The resolved external category ID (may be the original if already a leaf or no leaf found) */
  resolvedExternalCategoryId: string;
  /** True when a deeper leaf was found and the original category was a non-leaf parent */
  autoResolved: boolean;
  /** The name of the resolved category */
  resolvedName: string | null;
  /** The full path of the resolved category */
  resolvedPath: string | null;
  /** The original non-leaf category ID, if auto-resolution occurred */
  originalExternalCategoryId: string | null;
};

/**
 * When a resolved category is a non-leaf (it has child categories), automatically
 * selects the first available leaf descendant.
 *
 * Resolution order:
 * 1. Local DB leaf descendants (sorted alphabetically by path)
 * 2. On-demand SOAP GetSubCategories call (if credentials provided)
 * 3. Original category unchanged (best-effort fallback)
 */
export const resolveToLeafCategory = async ({
  connectionId,
  externalCategoryId,
  externalCategoryRepo,
  credentials,
}: {
  connectionId: string;
  externalCategoryId: string;
  externalCategoryRepo: ExternalCategoryRepository;
  credentials?: TraderaPublicApiCredentials;
}): Promise<LeafCategoryResolution> => {
  const noChange: LeafCategoryResolution = {
    resolvedExternalCategoryId: externalCategoryId,
    autoResolved: false,
    resolvedName: null,
    resolvedPath: null,
    originalExternalCategoryId: null,
  };

  // Check if this category is stored and whether it's a leaf
  const category = await externalCategoryRepo.getByExternalId(connectionId, externalCategoryId);
  if (!category) return noChange;
  if (category.isLeaf !== false) {
    // Already a leaf (or isLeaf is true/undefined) — no resolution needed
    return {
      ...noChange,
      resolvedName: category.name,
      resolvedPath: category.path,
    };
  }

  // Non-leaf: try local leaf descendants first
  const leafDescendants = await externalCategoryRepo.getLeafDescendants(connectionId, externalCategoryId);
  if (leafDescendants.length > 0) {
    const first = leafDescendants[0]!;
    return {
      resolvedExternalCategoryId: first.externalId,
      autoResolved: true,
      resolvedName: first.name,
      resolvedPath: first.path,
      originalExternalCategoryId: externalCategoryId,
    };
  }

  // No local leaves — try on-demand SOAP fetch
  if (credentials) {
    try {
      const subcategories = await getTraderaSubCategories(externalCategoryId, credentials);
      if (subcategories.length > 0) {
        subcategories.sort((a, b) => a.name.localeCompare(b.name));
        const first = subcategories[0]!;
        return {
          resolvedExternalCategoryId: first.id,
          autoResolved: true,
          resolvedName: first.name,
          resolvedPath: null,
          originalExternalCategoryId: externalCategoryId,
        };
      }
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'tradera-category-mapping',
        action: 'resolveToLeafCategory.onDemandSoap',
        connectionId,
        externalCategoryId,
      });
    }
  }

  // Best-effort fallback — use original non-leaf
  return {
    ...noChange,
    resolvedName: category.name,
    resolvedPath: category.path,
  };
};
