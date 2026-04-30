import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { SaveMutation, UpdateMutation } from '@/shared/contracts/ui/queries';
import { createDeleteMutationV2, createMutationV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateCatalogScopedData, invalidateProductsAndCounts } from '@/shared/lib/query-invalidation';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';

import * as api from '../api/settings';
import { hasPersistedId } from './useProductSettingsQueries.shared';

type DeleteParametersPayload = {
  parameterIds: string[];
  catalogId: string | null;
};

type SaveParameterPayload = {
  id: string | undefined;
  data: Partial<ProductParameter>;
};

export function useSaveParameterMutation(): SaveMutation<ProductParameter, SaveParameterPayload> {
  const mutationKey = productSettingsKeys.all;
  return createMutationV2({
    mutationFn: ({ id, data }: SaveParameterPayload) => {
      if (hasPersistedId(id)) return api.updateParameter(id, data);
      return api.createParameter(data);
    },
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveParameterMutation',
      operation: 'action',
      resource: 'products.settings.parameters',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'parameters', 'save'],
      description: 'Runs products settings parameters.',
    },
    invalidate: async (queryClient, _data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      await invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteParameterMutation(): UpdateMutation<
  void,
  { id: string; catalogId: string | null }
> {
  const queryKey = productSettingsKeys.all;
  return createDeleteMutationV2({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteParameter(id),
    mutationKey: queryKey,
    meta: {
      source: 'products.hooks.useDeleteParameterMutation',
      operation: 'delete',
      resource: 'products.settings.parameters',
      domain: 'products',
      mutationKey: queryKey,
      tags: ['products', 'settings', 'parameters', 'delete'],
      description: 'Deletes products settings parameters.',
    },
    invalidate: async (queryClient, _data, variables) => {
      await Promise.all([
        invalidateCatalogScopedData(queryClient, variables.catalogId),
        invalidateProductsAndCounts(queryClient),
      ]);
    },
  });
}

export function useDeleteParametersMutation(): UpdateMutation<
  Awaited<ReturnType<typeof api.deleteParameters>>,
  DeleteParametersPayload
> {
  const mutationKey = productSettingsKeys.all;
  return createUpdateMutationV2({
    mutationFn: ({ parameterIds }: DeleteParametersPayload) => api.deleteParameters(parameterIds),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteParametersMutation',
      operation: 'delete',
      resource: 'products.settings.parameters',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'parameters', 'delete', 'batch'],
      description: 'Deletes multiple products settings parameters.',
    },
    invalidate: async (queryClient, _data, variables) => {
      await Promise.all([
        invalidateCatalogScopedData(queryClient, variables.catalogId),
        invalidateProductsAndCounts(queryClient),
      ]);
    },
  });
}
