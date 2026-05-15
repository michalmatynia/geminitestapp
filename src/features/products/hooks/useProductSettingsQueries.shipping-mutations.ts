import type {
  ProductShippingGroup,
  ProductShippingGroupCreateInput,
  ProductShippingGroupUpdateInput,
} from '@/shared/contracts/products/shipping-groups';
import type { SaveMutation, UpdateMutation } from '@/shared/contracts/ui/queries';
import { useDeleteMutationV2, useMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateCatalogScopedData } from '@/shared/lib/query-invalidation';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';

import * as api from '../api/settings';
import { hasPersistedId, requireTrimmedString } from './useProductSettingsQueries.shared';

type SaveShippingGroupPayload = {
  id: string | undefined;
  data: Partial<ProductShippingGroup>;
};

const toShippingGroupUpdatePayload = (
  data: Partial<ProductShippingGroup>
): ProductShippingGroupUpdateInput => {
  const payload: ProductShippingGroupUpdateInput = {};
  const assignDefined = <TKey extends keyof ProductShippingGroupUpdateInput>(
    key: TKey,
    value: ProductShippingGroupUpdateInput[TKey] | undefined
  ): void => {
    if (value !== undefined) payload[key] = value;
  };

  assignDefined('name', data.name);
  assignDefined('description', data.description);
  assignDefined('catalogId', data.catalogId);
  assignDefined('traderaShippingCondition', data.traderaShippingCondition);
  assignDefined('traderaShippingPriceEur', data.traderaShippingPriceEur);
  assignDefined('autoAssignCategoryIds', data.autoAssignCategoryIds);

  return payload;
};

const toShippingGroupCreatePayload = (
  data: Partial<ProductShippingGroup>
): ProductShippingGroupCreateInput => ({
  ...toShippingGroupUpdatePayload(data),
  name: requireTrimmedString(data.name, 'Shipping group name is required'),
  catalogId: requireTrimmedString(data.catalogId, 'Shipping group catalogId is required'),
});

export function useSaveShippingGroupMutation(): SaveMutation<
  ProductShippingGroup,
  SaveShippingGroupPayload
> {
  const mutationKey = productSettingsKeys.all;
  return useMutationV2({
    mutationFn: ({ id, data }: SaveShippingGroupPayload) => {
      if (hasPersistedId(id)) {
        return api.updateShippingGroup(id, toShippingGroupUpdatePayload(data));
      }
      return api.createShippingGroup(toShippingGroupCreatePayload(data));
    },
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveShippingGroupMutation',
      operation: 'action',
      resource: 'products.settings.shipping-groups',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'shipping-groups', 'save'],
      description: 'Runs products settings shipping groups.',
    },
    invalidate: async (queryClient, _data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      await invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteShippingGroupMutation(): UpdateMutation<
  void,
  { id: string; catalogId: string | null }
> {
  const mutationKey = productSettingsKeys.all;
  return useDeleteMutationV2({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteShippingGroup(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteShippingGroupMutation',
      operation: 'delete',
      resource: 'products.settings.shipping-groups',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'shipping-groups', 'delete'],
      description: 'Deletes products settings shipping groups.',
    },
    invalidate: async (queryClient, _data, variables) => {
      await invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}
