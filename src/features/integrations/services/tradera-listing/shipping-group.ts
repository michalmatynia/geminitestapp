import type { ProductShippingGroup, ProductWithImages } from '@/shared/contracts/products';

import { getShippingGroupRepository } from '@/features/products/server';

export type TraderaShippingGroupResolutionReason =
  | 'mapped'
  | 'missing_shipping_group'
  | 'shipping_group_not_found'
  | 'shipping_group_without_condition';

export type TraderaShippingGroupResolution = {
  shippingGroup: ProductShippingGroup | null;
  shippingGroupId: string | null;
  shippingCondition: string | null;
  reason: TraderaShippingGroupResolutionReason;
};

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const selectPreferredTraderaShippingGroupResolution = ({
  product,
  shippingGroup,
}: {
  product: Pick<ProductWithImages, 'shippingGroupId'>;
  shippingGroup: ProductShippingGroup | null;
}): TraderaShippingGroupResolution => {
  const shippingGroupId = toTrimmedString(product.shippingGroupId);
  if (!shippingGroupId) {
    return {
      shippingGroup: null,
      shippingGroupId: null,
      shippingCondition: null,
      reason: 'missing_shipping_group',
    };
  }

  if (!shippingGroup) {
    return {
      shippingGroup: null,
      shippingGroupId,
      shippingCondition: null,
      reason: 'shipping_group_not_found',
    };
  }

  const shippingCondition = toTrimmedString(shippingGroup.traderaShippingCondition) || null;
  if (!shippingCondition) {
    return {
      shippingGroup,
      shippingGroupId,
      shippingCondition: null,
      reason: 'shipping_group_without_condition',
    };
  }

  return {
    shippingGroup,
    shippingGroupId,
    shippingCondition,
    reason: 'mapped',
  };
};

export const resolveTraderaShippingGroupResolutionForProduct = async ({
  product,
}: {
  product: ProductWithImages;
}): Promise<TraderaShippingGroupResolution> => {
  const shippingGroupId = toTrimmedString(product.shippingGroupId);
  if (!shippingGroupId) {
    return {
      shippingGroup: null,
      shippingGroupId: null,
      shippingCondition: null,
      reason: 'missing_shipping_group',
    };
  }

  const shippingGroupRepository = await getShippingGroupRepository();
  const shippingGroup = await shippingGroupRepository.getShippingGroupById(shippingGroupId);

  return selectPreferredTraderaShippingGroupResolution({
    product,
    shippingGroup,
  });
};
