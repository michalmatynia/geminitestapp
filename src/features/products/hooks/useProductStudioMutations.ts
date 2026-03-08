'use client';

import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateProductsAndCounts, invalidateImageStudioSlots } from './productCache';
import type { ProductWithImages } from '@/shared/contracts/products';

export function useSendToStudioMutation() {
  return createCreateMutationV2<
    {
      runId: string;
      runKind: 'generation' | 'sequence';
      runStatus: string;
      expectedOutputs: number;
    },
    { productId: string; imageSlotIndex: number; projectId: string }
  >({
    mutationFn: ({ productId, imageSlotIndex, projectId }) =>
      api.post(`/api/v2/products/${encodeURIComponent(productId)}/studio/send`, {
        imageSlotIndex,
        projectId,
      }),
    meta: {
      source: 'products.hooks.useSendToStudioMutation',
      operation: 'create',
      resource: 'products.studio.send',
      domain: 'products',
      tags: ['products', 'studio', 'send'],
      description: 'Creates products studio send.'},
    invalidate: async (queryClient, _data, { projectId }) => {
      void invalidateImageStudioSlots(queryClient, projectId);
    },
  });
}

export function useAcceptVariantMutation() {
  return createUpdateMutationV2<
    { product: ProductWithImages },
    { productId: string; imageSlotIndex: number; generationSlotId: string; projectId: string }
  >({
    mutationFn: ({ productId, imageSlotIndex, generationSlotId, projectId }) =>
      api.post(`/api/v2/products/${encodeURIComponent(productId)}/studio/accept`, {
        imageSlotIndex,
        generationSlotId,
        projectId,
      }),
    meta: {
      source: 'products.hooks.useAcceptVariantMutation',
      operation: 'update',
      resource: 'products.studio.accept',
      domain: 'products',
      tags: ['products', 'studio', 'accept'],
      description: 'Updates products studio accept.'},
    invalidate: async (queryClient) => {
      void invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useRotateImageSlotMutation() {
  return createUpdateMutationV2<
    { product: ProductWithImages },
    { productId: string; imageSlotIndex: number; direction: 'left' | 'right' }
  >({
    mutationFn: ({ productId, imageSlotIndex, direction }) =>
      api.post(`/api/v2/products/${encodeURIComponent(productId)}/studio/rotate`, {
        imageSlotIndex,
        direction,
      }),
    meta: {
      source: 'products.hooks.useRotateImageSlotMutation',
      operation: 'update',
      resource: 'products.studio.rotate',
      domain: 'products',
      tags: ['products', 'studio', 'rotate'],
      description: 'Updates products studio rotate.'},
    invalidate: async (queryClient) => {
      void invalidateProductsAndCounts(queryClient);
    },
  });
}
