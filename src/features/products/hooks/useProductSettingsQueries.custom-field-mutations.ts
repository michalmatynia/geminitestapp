import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { SaveMutation, UpdateMutation } from '@/shared/contracts/ui/queries';
import { createDeleteMutationV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateProductCustomFields } from '@/shared/lib/query-invalidation';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';

import * as api from '../api/settings';
import { hasPersistedId } from './useProductSettingsQueries.shared';

type SaveCustomFieldPayload = {
  id: string | undefined;
  data: Partial<ProductCustomFieldDefinition>;
};

export function useSaveCustomFieldMutation(): SaveMutation<
  ProductCustomFieldDefinition,
  SaveCustomFieldPayload
> {
  const mutationKey = productSettingsKeys.customFields();
  return createMutationV2({
    mutationFn: ({ id, data }: SaveCustomFieldPayload) => {
      if (hasPersistedId(id)) return api.updateCustomField(id, data);
      return api.createCustomField(data);
    },
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveCustomFieldMutation',
      operation: 'action',
      resource: 'products.settings.custom-fields',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'custom-fields', 'save'],
      description: 'Runs products settings custom fields.',
    },
    invalidate: async (queryClient) => {
      await invalidateProductCustomFields(queryClient);
    },
  });
}

export function useDeleteCustomFieldMutation(): UpdateMutation<void, { id: string }> {
  const mutationKey = productSettingsKeys.customFields();
  return createDeleteMutationV2({
    mutationFn: ({ id }: { id: string }) => api.deleteCustomField(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteCustomFieldMutation',
      operation: 'delete',
      resource: 'products.settings.custom-fields',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'custom-fields', 'delete'],
      description: 'Deletes products settings custom fields.',
    },
    invalidate: async (queryClient) => {
      await invalidateProductCustomFields(queryClient);
    },
  });
}
