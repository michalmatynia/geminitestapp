import { z } from 'zod';

import type { CatalogNamedDto } from '@/shared/contracts/base';
import type {
  ProductShippingGroup,
  ProductShippingGroupUpdateInput,
} from '@/shared/contracts/products';
import { conflictError, validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Shipping group id is required'),
});

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

export type ShippingGroupNameLookupInput = CatalogNamedDto;

export const parseShippingGroupId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }

  return parsed.data.id;
};

export const buildShippingGroupNameLookupInput = (
  current: ProductShippingGroupSnapshot,
  data: ProductShippingGroupUpdateInput
): ShippingGroupNameLookupInput | null => {
  if (data.name === undefined) return null;

  return {
    catalogId: data.catalogId ?? current.catalogId,
    name: data.name,
  };
};

export const assertAvailableShippingGroupName = (
  existing: Pick<ProductShippingGroup, 'id'> | null,
  shippingGroupId: string,
  lookup: ShippingGroupNameLookupInput
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
