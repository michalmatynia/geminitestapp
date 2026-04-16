import type { ProductShippingGroup, ProductShippingGroupUpdateInput } from '@/shared/contracts/products/shipping-groups';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import type { CatalogNameLookupDto } from '@/shared/contracts/base';

export const parseShippingGroupId = (params: { id: string }): string => {
  const direct = params.id.trim();
  if (!direct) {
    throw badRequestError('Invalid route parameters: id is required');
  }
  return direct;
};

type ProductShippingGroupSnapshot = Pick<
  ProductShippingGroup,
  | 'id'
  | 'name'
  | 'description'
  | 'catalogId'
  | 'traderaShippingCondition'
  | 'traderaShippingPriceEur'
  | 'autoAssignCategoryIds'
  | 'autoAssignCurrencyCodes'
>;

export const buildShippingGroupNameLookupInput = (
  current: ProductShippingGroupSnapshot,
  data: ProductShippingGroupUpdateInput
): CatalogNameLookupDto | null => {
  if (data.name === undefined) return null;

  return {
    catalogId: data.catalogId ?? current.catalogId,
    name: data.name,
  };
};

export const assertAvailableShippingGroupName = (
  existing: Pick<ProductShippingGroup, 'id'> | null,
  shippingGroupId: string,
  lookup: CatalogNameLookupDto
): void => {
  if (!existing || existing.id === shippingGroupId) return;

  throw conflictError('A shipping group with this name already exists in this catalog', {
    name: lookup.name,
    catalogId: lookup.catalogId,
  });
};

export const shouldValidateShippingGroupRuleConflicts = (
  data: ProductShippingGroupUpdateInput
): boolean =>
  data.catalogId !== undefined ||
  data.autoAssignCategoryIds !== undefined ||
  data.autoAssignCurrencyCodes !== undefined;

export const buildShippingGroupValidationDraft = (
  current: ProductShippingGroupSnapshot,
  data: ProductShippingGroupUpdateInput,
  normalizedAutoAssignCategoryIds: string[] | undefined,
  normalizedAutoAssignCurrencyCodes: string[] | undefined
): ProductShippingGroup => ({
  id: current.id,
  name: data.name ?? current.name,
  description: data.description !== undefined ? data.description : (current.description ?? null),
  catalogId: data.catalogId ?? current.catalogId,
  traderaShippingCondition:
    data.traderaShippingCondition !== undefined
      ? data.traderaShippingCondition
      : (current.traderaShippingCondition ?? null),
  traderaShippingPriceEur:
    data.traderaShippingPriceEur !== undefined
      ? data.traderaShippingPriceEur
      : (current.traderaShippingPriceEur ?? null),
  autoAssignCategoryIds:
    normalizedAutoAssignCategoryIds !== undefined
      ? normalizedAutoAssignCategoryIds
      : (current.autoAssignCategoryIds ?? []),
  autoAssignCurrencyCodes:
    normalizedAutoAssignCurrencyCodes !== undefined
      ? normalizedAutoAssignCurrencyCodes
      : (current.autoAssignCurrencyCodes ?? []),
});

export const buildShippingGroupUpdateInput = (
  data: ProductShippingGroupUpdateInput,
  normalizedAutoAssignCategoryIds: string[] | undefined,
  normalizedAutoAssignCurrencyCodes: string[] | undefined
): ProductShippingGroupUpdateInput => ({
  ...(data.name !== undefined ? { name: data.name } : {}),
  ...(data.description !== undefined ? { description: data.description } : {}),
  ...(data.catalogId !== undefined ? { catalogId: data.catalogId } : {}),
  ...(data.traderaShippingCondition !== undefined
    ? {
        traderaShippingCondition: data.traderaShippingCondition,
      }
    : {}),
  ...(data.traderaShippingPriceEur !== undefined
    ? {
        traderaShippingPriceEur: data.traderaShippingPriceEur,
      }
    : {}),
  ...(normalizedAutoAssignCategoryIds !== undefined
    ? {
        autoAssignCategoryIds: normalizedAutoAssignCategoryIds,
      }
    : {}),
  ...(normalizedAutoAssignCurrencyCodes !== undefined
    ? {
        autoAssignCurrencyCodes: normalizedAutoAssignCurrencyCodes,
      }
    : {}),
});
