import type { ProductShippingGroup, ProductWithImages } from '@/shared/contracts/products';

import { getCategoryRepository } from '@/shared/lib/products/services/category-repository';
import { getShippingGroupRepository } from '@/shared/lib/products/services/shipping-group-repository';
import {
  resolveEffectiveShippingGroup,
  type EffectiveShippingGroupSource,
} from '@/shared/lib/products/utils/effective-shipping-group';

export type TraderaShippingGroupResolutionReason =
  | 'mapped'
  | 'missing_shipping_group'
  | 'shipping_group_not_found'
  | 'shipping_group_without_condition'
  | 'multiple_matching_shipping_groups';

export type TraderaShippingGroupResolution = {
  shippingGroup: ProductShippingGroup | null;
  shippingGroupId: string | null;
  shippingCondition: string | null;
  shippingPriceEur: number | null;
  shippingGroupSource: EffectiveShippingGroupSource;
  reason: TraderaShippingGroupResolutionReason;
  matchedCategoryRuleIds: string[];
  matchingShippingGroupIds: string[];
};

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const selectPreferredTraderaShippingGroupResolution = ({
  effectiveResolution,
}: {
  effectiveResolution: ReturnType<typeof resolveEffectiveShippingGroup>;
}): TraderaShippingGroupResolution => {
  if (effectiveResolution.reason === 'none') {
    return {
      shippingGroup: null,
      shippingGroupId: null,
      shippingCondition: null,
      shippingPriceEur: null,
      shippingGroupSource: null,
      reason: 'missing_shipping_group',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: [],
    };
  }

  if (effectiveResolution.reason === 'manual_missing') {
    return {
      shippingGroup: null,
      shippingGroupId: effectiveResolution.shippingGroupId,
      shippingCondition: null,
      shippingPriceEur: null,
      shippingGroupSource: effectiveResolution.source,
      reason: 'shipping_group_not_found',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: effectiveResolution.matchingShippingGroupIds,
    };
  }

  if (effectiveResolution.reason === 'multiple_category_rules') {
    return {
      shippingGroup: null,
      shippingGroupId: null,
      shippingCondition: null,
      shippingPriceEur: null,
      shippingGroupSource: null,
      reason: 'multiple_matching_shipping_groups',
      matchedCategoryRuleIds: effectiveResolution.matchedCategoryRuleIds,
      matchingShippingGroupIds: effectiveResolution.matchingShippingGroupIds,
    };
  }

  const shippingGroup = effectiveResolution.shippingGroup;
  const shippingGroupId = effectiveResolution.shippingGroupId;
  if (!shippingGroup || !shippingGroupId) {
    return {
      shippingGroup: null,
      shippingGroupId: null,
      shippingCondition: null,
      shippingPriceEur: null,
      shippingGroupSource: null,
      reason: 'missing_shipping_group',
      matchedCategoryRuleIds: effectiveResolution.matchedCategoryRuleIds,
      matchingShippingGroupIds: effectiveResolution.matchingShippingGroupIds,
    };
  }

  const shippingCondition = toTrimmedString(shippingGroup.traderaShippingCondition) || null;
  const shippingPriceEur = toFiniteNumber(shippingGroup.traderaShippingPriceEur);
  if (!shippingCondition) {
    return {
      shippingGroup,
      shippingGroupId,
      shippingCondition: null,
      shippingPriceEur,
      shippingGroupSource: effectiveResolution.source,
      reason: 'shipping_group_without_condition',
      matchedCategoryRuleIds: effectiveResolution.matchedCategoryRuleIds,
      matchingShippingGroupIds: effectiveResolution.matchingShippingGroupIds,
    };
  }

  return {
    shippingGroup,
    shippingGroupId,
    shippingCondition,
    shippingPriceEur,
    shippingGroupSource: effectiveResolution.source,
    reason: 'mapped',
    matchedCategoryRuleIds: effectiveResolution.matchedCategoryRuleIds,
    matchingShippingGroupIds: effectiveResolution.matchingShippingGroupIds,
  };
};

export const resolveTraderaShippingGroupResolutionForProduct = async ({
  product,
}: {
  product: ProductWithImages;
}): Promise<TraderaShippingGroupResolution> => {
  const shippingGroupRepository = await getShippingGroupRepository();
  const manualShippingGroupId = toTrimmedString(product.shippingGroupId);

  if (manualShippingGroupId) {
    const shippingGroup = await shippingGroupRepository.getShippingGroupById(manualShippingGroupId);
    return selectPreferredTraderaShippingGroupResolution({
      effectiveResolution: resolveEffectiveShippingGroup({
        product,
        shippingGroups: [],
        manualShippingGroup: shippingGroup,
      }),
    });
  }

  const categoryRepository = await getCategoryRepository();
  const productCatalogId =
    toTrimmedString(product.catalogId) ||
    (Array.isArray(product.catalogs)
      ? product.catalogs
          .map((catalog) => toTrimmedString(catalog.catalogId))
          .find((catalogId) => catalogId.length > 0) ?? ''
      : '');
  if (!productCatalogId) {
    return selectPreferredTraderaShippingGroupResolution({
      effectiveResolution: resolveEffectiveShippingGroup({
        product,
        shippingGroups: [],
      }),
    });
  }

  const [shippingGroups, categories] = await Promise.all([
    shippingGroupRepository.listShippingGroups({ catalogId: productCatalogId }),
    categoryRepository.listCategories({ catalogId: productCatalogId }),
  ]);

  return selectPreferredTraderaShippingGroupResolution({
    effectiveResolution: resolveEffectiveShippingGroup({
      product,
      shippingGroups,
      categories,
    }),
  });
};
