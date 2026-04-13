import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError } from '@/shared/errors/app-error';

import {
  resolveTraderaCategoryMappingResolutionForProduct,
  type TraderaCategoryMappingResolution,
} from './category-mapping';
import {
  resolveTraderaShippingGroupResolutionForProduct,
  type TraderaShippingGroupResolution,
} from './shipping-group';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const buildMissingTraderaCategoryMappingMessage = ({
  categoryMapping,
}: {
  categoryMapping: TraderaCategoryMappingResolution;
}): string => {
  switch (categoryMapping.reason) {
    case 'missing_internal_category':
      return 'Tradera export requires a product category before listing. Assign an internal product category, then map it in Tradera Category Mapper and retry.';
    case 'ambiguous_external_category':
      return 'Multiple active Tradera category mappings matched this product category. Keep only one active Tradera category mapping and retry.';
    case 'stale_external_category':
      return 'The mapped Tradera category is stale or missing from fetched Tradera categories. Fetch Tradera categories again, update the mapping, and retry.';
    case 'invalid_external_category':
      return 'The mapped Tradera category is invalid. Fetch Tradera categories again, update the Tradera category mapping, and retry.';
    case 'no_active_mapping':
    default:
      return 'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.';
  }
};

export const canUseFallbackTraderaCategory = ({
  categoryMapping,
}: {
  categoryMapping: TraderaCategoryMappingResolution;
}): boolean =>
  categoryMapping.reason === 'no_active_mapping' ||
  categoryMapping.reason === 'stale_external_category' ||
  categoryMapping.reason === 'invalid_external_category';

export const assertTraderaCategoryMappingReady = ({
  categoryMapping,
  product,
  connection,
}: {
  categoryMapping: TraderaCategoryMappingResolution;
  product: ProductWithImages;
  connection: IntegrationConnectionRecord;
}): void => {
  if (categoryMapping.mapping) {
    return;
  }

  // When the connection uses the 'mapper' strategy and a mapping exists for
  // this category but the external category is stale or invalid, treat it as
  // an error instead of silently falling back.  The user explicitly configured
  // a category mapping that should work — falling back without notice is
  // confusing and looks like categories "are not being mapped".
  const isMapperStrategy = connection.traderaCategoryStrategy !== 'top_suggested';
  const hasBrokenMapping =
    categoryMapping.matchingMappingCount > 0 &&
    (categoryMapping.reason === 'stale_external_category' ||
      categoryMapping.reason === 'invalid_external_category');

  if (isMapperStrategy && hasBrokenMapping) {
    throw badRequestError(buildMissingTraderaCategoryMappingMessage({ categoryMapping }), {
      productId: product.id,
      productCategoryId: toTrimmedString(product.categoryId) || null,
      connectionId: connection.id,
      categoryMappingReason: categoryMapping.reason,
      categoryMatchScope: categoryMapping.matchScope,
      productCatalogIds: categoryMapping.productCatalogIds,
      matchingMappingCount: categoryMapping.matchingMappingCount,
      validMappingCount: categoryMapping.validMappingCount,
      catalogMatchedMappingCount: categoryMapping.catalogMatchedMappingCount,
    });
  }

  if (canUseFallbackTraderaCategory({ categoryMapping })) {
    return;
  }

  throw badRequestError(buildMissingTraderaCategoryMappingMessage({ categoryMapping }), {
    productId: product.id,
    productCategoryId: toTrimmedString(product.categoryId) || null,
    connectionId: connection.id,
    categoryMappingReason: categoryMapping.reason,
    categoryMatchScope: categoryMapping.matchScope,
    productCatalogIds: categoryMapping.productCatalogIds,
    matchingMappingCount: categoryMapping.matchingMappingCount,
    validMappingCount: categoryMapping.validMappingCount,
    catalogMatchedMappingCount: categoryMapping.catalogMatchedMappingCount,
  });
};

export const buildMissingTraderaShippingPriceMessage = ({
  shippingGroupResolution,
}: {
  shippingGroupResolution: TraderaShippingGroupResolution;
}): string => {
  const shippingGroupName = toTrimmedString(shippingGroupResolution.shippingGroup?.name);

  switch (shippingGroupResolution.reason) {
    case 'shipping_group_not_found':
      return 'Tradera export requires a valid shipping group with a Tradera shipping price in EUR. The assigned shipping group could not be found. Reassign the shipping group and retry.';
    case 'multiple_matching_shipping_groups':
      return 'Tradera export requires exactly one matching shipping group with a Tradera shipping price in EUR. Narrow the auto-assignment rules and retry.';
    case 'mapped':
      return shippingGroupName
        ? `Tradera export requires a Tradera shipping price in EUR for shipping group "${shippingGroupName}". Add the EUR price and retry.`
        : 'Tradera export requires a shipping group with a Tradera shipping price in EUR. Add the EUR price and retry.';
    case 'shipping_group_without_condition':
    case 'missing_shipping_group':
    default:
      return 'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.';
  }
};

export const assertTraderaShippingPriceReady = ({
  shippingGroupResolution,
  product,
  connection,
}: {
  shippingGroupResolution: TraderaShippingGroupResolution;
  product: ProductWithImages;
  connection: IntegrationConnectionRecord;
}): void => {
  if (shippingGroupResolution.shippingPriceEur !== null) {
    return;
  }

  throw badRequestError(buildMissingTraderaShippingPriceMessage({ shippingGroupResolution }), {
    productId: product.id,
    productShippingGroupId: toTrimmedString(product.shippingGroupId) || null,
    connectionId: connection.id,
    shippingGroupResolutionReason: shippingGroupResolution.reason,
    shippingGroupId: shippingGroupResolution.shippingGroupId,
    shippingGroupSource: shippingGroupResolution.shippingGroupSource,
    matchedCategoryRuleIds: shippingGroupResolution.matchedCategoryRuleIds,
    matchingShippingGroupIds: shippingGroupResolution.matchingShippingGroupIds,
  });
};

export const validateTraderaQuickListProductConfig = async ({
  product,
  connection,
}: {
  product: ProductWithImages;
  connection: IntegrationConnectionRecord;
}): Promise<{
  categoryMapping: TraderaCategoryMappingResolution;
  shippingGroupResolution: TraderaShippingGroupResolution;
}> => {
  const categoryMapping = await resolveTraderaCategoryMappingResolutionForProduct({
    connectionId: connection.id,
    product,
  });
  assertTraderaCategoryMappingReady({
    categoryMapping,
    product,
    connection,
  });

  const shippingGroupResolution = await resolveTraderaShippingGroupResolutionForProduct({
    product,
  });
  assertTraderaShippingPriceReady({
    shippingGroupResolution,
    product,
    connection,
  });

  return {
    categoryMapping,
    shippingGroupResolution,
  };
};
