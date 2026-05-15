import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/shared/lib/api-client';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { invalidateProducts } from './productCache';

export type DisconnectProductImage = (productId: string, imageFileId: string) => Promise<void>;

export const useDisconnectProductImage = (): DisconnectProductImage => {
  const queryClient = useQueryClient();
  const disconnectImageMutation = createMutationV2<
    void,
    { productId: string; imageFileId: string }
  >({
    mutationFn: ({ productId, imageFileId }): Promise<void> =>
      api.delete<void>(`/api/v2/products/${productId}/images/${imageFileId}`),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useProductImages.disconnectImage',
      operation: 'delete',
      resource: 'products.images',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'images', 'disconnect'],
      description: 'Deletes products images.',
    },
    onSuccess: async (): Promise<void> => {
      await invalidateProducts(queryClient);
    },
  });

  return useCallback(
    async (productId: string, imageFileId: string): Promise<void> => {
      await disconnectImageMutation.mutateAsync({ productId, imageFileId });
    },
    [disconnectImageMutation]
  );
};
