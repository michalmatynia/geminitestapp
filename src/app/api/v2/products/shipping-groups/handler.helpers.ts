import type { ProductShippingGroup, ProductShippingGroupCreateInput, ProductShippingGroupFilters } from '@/shared/contracts/products/shipping-groups';
import { badRequestError, conflictError } from '@/shared/errors/app-error';

export const requireShippingGroupCatalogId = (
  query: ProductShippingGroupFilters
): string => {
  const catalogId = query.catalogId;
  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  return catalogId;
};

export const assertAvailableShippingGroupCreateName = (
  existing: Pick<ProductShippingGroup, 'id'> | null,
  name: string,
  catalogId: string
): void => {
  if (!existing) return;

  throw conflictError('A shipping group with this name already exists in this catalog', {
    name,
    catalogId,
  });
};

export const buildShippingGroupCreateDraft = (
  data: ProductShippingGroupCreateInput,
  normalizedAutoAssignCategoryIds: string[],
  normalizedAutoAssignCurrencyCodes: string[]
): ProductShippingGroup => ({
  id: '__draft-shipping-group__',
  name: data.name,
  description: data.description ?? null,
  catalogId: data.catalogId,
  traderaShippingCondition: data.traderaShippingCondition ?? null,
  traderaShippingPriceEur: data.traderaShippingPriceEur ?? null,
  autoAssignCategoryIds: normalizedAutoAssignCategoryIds,
  autoAssignCurrencyCodes: normalizedAutoAssignCurrencyCodes,
});

export const buildShippingGroupCreateInput = (
  data: ProductShippingGroupCreateInput,
  normalizedAutoAssignCategoryIds: string[],
  normalizedAutoAssignCurrencyCodes: string[]
): ProductShippingGroupCreateInput => ({
  name: data.name,
  description: data.description ?? null,
  catalogId: data.catalogId,
  traderaShippingCondition: data.traderaShippingCondition ?? null,
  traderaShippingPriceEur: data.traderaShippingPriceEur ?? null,
  autoAssignCategoryIds: normalizedAutoAssignCategoryIds,
  autoAssignCurrencyCodes: normalizedAutoAssignCurrencyCodes,
});
