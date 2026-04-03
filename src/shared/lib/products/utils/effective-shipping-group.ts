import type { ProductCategory, ProductShippingGroup } from '@/shared/contracts/products';

type ProductCatalogRef = {
  catalogId?: string | null | undefined;
};

export type ShippingGroupResolvableProduct = {
  shippingGroupId?: string | null | undefined;
  categoryId?: string | null | undefined;
  catalogId?: string | null | undefined;
  catalogs?: ProductCatalogRef[] | null | undefined;
};

export type EffectiveShippingGroupSource = 'manual' | 'category_rule' | null;

export type EffectiveShippingGroupReason =
  | 'manual'
  | 'manual_missing'
  | 'category_rule'
  | 'multiple_category_rules'
  | 'none';

export type EffectiveShippingGroupResolution = {
  shippingGroup: ProductShippingGroup | null;
  shippingGroupId: string | null;
  source: EffectiveShippingGroupSource;
  reason: EffectiveShippingGroupReason;
  matchedCategoryRuleIds: string[];
  matchingShippingGroupIds: string[];
};

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const toUniqueTrimmedStringArray = (values: ReadonlyArray<unknown>): string[] => {
  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = toTrimmedString(value);
    if (!trimmed) continue;
    unique.add(trimmed);
  }
  return Array.from(unique);
};

export const resolveProductPrimaryCatalogId = (
  product: Pick<ShippingGroupResolvableProduct, 'catalogId' | 'catalogs'>
): string | null => {
  const directCatalogId = toTrimmedString(product.catalogId);
  if (directCatalogId) return directCatalogId;

  const fallbackCatalogId = Array.isArray(product.catalogs)
    ? product.catalogs
        .map((catalog) => toTrimmedString(catalog?.catalogId))
        .find((catalogId) => catalogId.length > 0) ?? ''
    : '';

  return fallbackCatalogId || null;
};

const buildCategoryParentMap = (
  categories: ReadonlyArray<Pick<ProductCategory, 'id' | 'parentId'>>
): Map<string, string | null> => {
  const parentMap = new Map<string, string | null>();
  for (const category of categories) {
    const categoryId = toTrimmedString(category.id);
    if (!categoryId) continue;
    parentMap.set(categoryId, toTrimmedString(category.parentId) || null);
  }
  return parentMap;
};

const categoryRuleMatchesProductCategory = ({
  productCategoryId,
  ruleCategoryId,
  categoryParentMap,
}: {
  productCategoryId: string;
  ruleCategoryId: string;
  categoryParentMap: Map<string, string | null>;
}): boolean => {
  let currentCategoryId: string | null = productCategoryId;
  const visited = new Set<string>();

  while (currentCategoryId) {
    if (currentCategoryId === ruleCategoryId) {
      return true;
    }
    if (visited.has(currentCategoryId)) {
      return false;
    }
    visited.add(currentCategoryId);
    currentCategoryId = categoryParentMap.get(currentCategoryId) ?? null;
  }

  return false;
};

export const resolveEffectiveShippingGroup = ({
  product,
  shippingGroups,
  categories,
  manualShippingGroup,
}: {
  product: ShippingGroupResolvableProduct;
  shippingGroups: ReadonlyArray<ProductShippingGroup>;
  categories?: ReadonlyArray<Pick<ProductCategory, 'id' | 'parentId'>>;
  manualShippingGroup?: ProductShippingGroup | null;
}): EffectiveShippingGroupResolution => {
  const manualShippingGroupId = toTrimmedString(product.shippingGroupId);
  if (manualShippingGroupId) {
    const resolvedManualShippingGroup =
      (manualShippingGroup && toTrimmedString(manualShippingGroup.id) === manualShippingGroupId
        ? manualShippingGroup
        : shippingGroups.find(
            (shippingGroup) => toTrimmedString(shippingGroup.id) === manualShippingGroupId
          )) ?? null;

    if (!resolvedManualShippingGroup) {
      return {
        shippingGroup: null,
        shippingGroupId: manualShippingGroupId,
        source: 'manual',
        reason: 'manual_missing',
        matchedCategoryRuleIds: [],
        matchingShippingGroupIds: [manualShippingGroupId],
      };
    }

    return {
      shippingGroup: resolvedManualShippingGroup,
      shippingGroupId: manualShippingGroupId,
      source: 'manual',
      reason: 'manual',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: [manualShippingGroupId],
    };
  }

  const productCategoryId = toTrimmedString(product.categoryId);
  if (!productCategoryId || shippingGroups.length === 0) {
    return {
      shippingGroup: null,
      shippingGroupId: null,
      source: null,
      reason: 'none',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: [],
    };
  }

  const productCatalogId = resolveProductPrimaryCatalogId(product);
  const categoryParentMap = buildCategoryParentMap(categories ?? []);
  const candidates = shippingGroups
    .map((shippingGroup) => {
      const shippingGroupCatalogId = toTrimmedString(shippingGroup.catalogId);
      if (productCatalogId && shippingGroupCatalogId && shippingGroupCatalogId !== productCatalogId) {
        return null;
      }

      const matchedCategoryRuleIds = toUniqueTrimmedStringArray(
        Array.isArray(shippingGroup.autoAssignCategoryIds)
          ? shippingGroup.autoAssignCategoryIds.filter((categoryId) =>
              categoryRuleMatchesProductCategory({
                productCategoryId,
                ruleCategoryId: toTrimmedString(categoryId),
                categoryParentMap,
              })
            )
          : []
      );

      if (matchedCategoryRuleIds.length === 0) {
        return null;
      }

      return {
        shippingGroup,
        matchedCategoryRuleIds,
      };
    })
    .filter(
      (
        candidate
      ): candidate is {
        shippingGroup: ProductShippingGroup;
        matchedCategoryRuleIds: string[];
      } => candidate !== null
    );

  if (candidates.length === 0) {
    return {
      shippingGroup: null,
      shippingGroupId: null,
      source: null,
      reason: 'none',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: [],
    };
  }

  if (candidates.length > 1) {
    const matchedRuleIds: string[] = [];
    const matchingShippingGroupIds: string[] = [];
    for (const candidate of candidates) {
      matchedRuleIds.push(...candidate.matchedCategoryRuleIds);
      matchingShippingGroupIds.push(toTrimmedString(candidate.shippingGroup.id));
    }

    return {
      shippingGroup: null,
      shippingGroupId: null,
      source: null,
      reason: 'multiple_category_rules',
      matchedCategoryRuleIds: toUniqueTrimmedStringArray(matchedRuleIds),
      matchingShippingGroupIds: toUniqueTrimmedStringArray(matchingShippingGroupIds),
    };
  }

  const matchedCandidate = candidates[0];
  if (!matchedCandidate) {
    return {
      shippingGroup: null,
      shippingGroupId: null,
      source: null,
      reason: 'none',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: [],
    };
  }

  const shippingGroup = matchedCandidate.shippingGroup;
  const matchedCategoryRuleIds = [...matchedCandidate.matchedCategoryRuleIds];
  const matchedShippingGroupId = toTrimmedString(shippingGroup.id);
  return {
    shippingGroup,
    shippingGroupId: matchedShippingGroupId || null,
    source: 'category_rule',
    reason: 'category_rule',
    matchedCategoryRuleIds,
    matchingShippingGroupIds: matchedShippingGroupId ? [matchedShippingGroupId] : [],
  };
};
