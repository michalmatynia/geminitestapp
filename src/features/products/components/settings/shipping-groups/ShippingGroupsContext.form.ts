import type {
  ProductShippingGroup,
  ShippingGroupFormData,
} from '@/shared/contracts/products/shipping-groups';

export const createEmptyShippingGroupFormData = (
  catalogId = ''
): ShippingGroupFormData => ({
  name: '',
  description: '',
  catalogId,
  traderaShippingCondition: '',
  traderaShippingPriceEur: '',
  autoAssignCategoryIds: [],
  autoAssignCurrencyCodes: [],
});

const formatShippingPrice = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

export const createEditShippingGroupFormData = (
  shippingGroup: ProductShippingGroup
): ShippingGroupFormData => ({
  name: shippingGroup.name,
  description: shippingGroup.description ?? '',
  catalogId: shippingGroup.catalogId,
  traderaShippingCondition: shippingGroup.traderaShippingCondition ?? '',
  traderaShippingPriceEur: formatShippingPrice(shippingGroup.traderaShippingPriceEur),
  autoAssignCategoryIds: shippingGroup.autoAssignCategoryIds,
  autoAssignCurrencyCodes: shippingGroup.autoAssignCurrencyCodes,
});
