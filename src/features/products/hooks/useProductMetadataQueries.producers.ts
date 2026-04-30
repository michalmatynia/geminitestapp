import type { Producer } from '@/shared/contracts/products/producers';
import type { DeleteMutation, ListQuery, SaveMutation } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createDeleteMutationV2, createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateProductMetadata } from '@/shared/lib/query-invalidation';

import {
  hasMutationId,
  productMetadataKeys,
  resolveMetadataQueryEnabled,
  STABLE_METADATA_QUERY_OPTIONS,
  type ProductMetadataQueryOptions,
} from './useProductMetadataQueries.shared';

export function useProducers(options?: ProductMetadataQueryOptions): ListQuery<Producer> {
  const queryKey = productMetadataKeys.producers();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<Producer[]> =>
      await api.get<Producer[]>('/api/v2/products/producers'),
    enabled: resolveMetadataQueryEnabled(options),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useProducers',
      operation: 'list',
      resource: 'products.metadata.producers',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'producers'],
      description: 'Loads products metadata producers.',
    },
  });
}

export function useSaveProducerMutation(): SaveMutation<
  Producer,
  { id: string | undefined; data: { name: string; website: string | null } }
> {
  const mutationKey = productMetadataKeys.producers();
  return createMutationV2({
    mutationFn: ({ id, data }) =>
      hasMutationId(id)
        ? api.put<Producer>(`/api/v2/products/producers/${id}`, data)
        : api.post<Producer>('/api/v2/products/producers', data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveProducerMutation',
      operation: 'action',
      resource: 'products.metadata.producers',
      domain: 'products',
      mutationKey,
      tags: ['products', 'metadata', 'producers', 'save'],
      description: 'Runs products metadata producers.',
    },
    invalidate: async (queryClient): Promise<void> => {
      await invalidateProductMetadata(queryClient);
    },
  });
}

export function useDeleteProducerMutation(): DeleteMutation {
  const mutationKey = productMetadataKeys.producers();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<void>(`/api/v2/products/producers/${id}`),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteProducerMutation',
      operation: 'delete',
      resource: 'products.metadata.producers',
      domain: 'products',
      mutationKey,
      tags: ['products', 'metadata', 'producers', 'delete'],
      description: 'Deletes products metadata producers.',
    },
    invalidate: async (queryClient): Promise<void> => {
      await invalidateProductMetadata(queryClient);
    },
  });
}
