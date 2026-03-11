'use client';

import {
  productStudioProductResponseSchema,
  productStudioSendResponseSchema,
  type ProductStudioSendRequest,
  type ProductStudioSendResponse,
  type ProductStudioProductResponse,
} from '@/shared/contracts/products';
import { useOptionalContextRegistryPageEnvelope } from '@/shared/lib/ai-context-registry/page-context';
import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';

import { invalidateProductsAndCounts, invalidateImageStudioSlots } from './productCache';

export function useSendToStudioMutation() {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();

  return createCreateMutationV2<
    ProductStudioSendResponse,
    {
      productId: string;
      imageSlotIndex: number;
      projectId: string;
      contextRegistry?: ProductStudioSendRequest['contextRegistry'];
    }
  >({
    mutationFn: async ({
      productId,
      imageSlotIndex,
      projectId,
      contextRegistry: payloadContextRegistry,
    }) =>
      productStudioSendResponseSchema.parse(
        await api.post<unknown>(`/api/v2/products/${encodeURIComponent(productId)}/studio/send`, {
          imageSlotIndex,
          projectId,
          ...(payloadContextRegistry ?? contextRegistry
            ? { contextRegistry: payloadContextRegistry ?? contextRegistry }
            : {}),
        })
      ),
    meta: {
      source: 'products.hooks.useSendToStudioMutation',
      operation: 'create',
      resource: 'products.studio.send',
      domain: 'products',
      tags: ['products', 'studio', 'send'],
      description: 'Creates products studio send.',
    },
    invalidate: (queryClient, _data, { projectId }) => {
      void invalidateImageStudioSlots(queryClient, projectId);
    },
  });
}

export function useAcceptVariantMutation() {
  return createUpdateMutationV2<
    ProductStudioProductResponse,
    { productId: string; imageSlotIndex: number; generationSlotId: string; projectId: string }
  >({
    mutationFn: async ({ productId, imageSlotIndex, generationSlotId, projectId }) =>
      productStudioProductResponseSchema.parse(
        await api.post<unknown>(`/api/v2/products/${encodeURIComponent(productId)}/studio/accept`, {
          imageSlotIndex,
          generationSlotId,
          projectId,
        })
      ),
    meta: {
      source: 'products.hooks.useAcceptVariantMutation',
      operation: 'update',
      resource: 'products.studio.accept',
      domain: 'products',
      tags: ['products', 'studio', 'accept'],
      description: 'Updates products studio accept.',
    },
    invalidate: (queryClient) => {
      void invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useRotateImageSlotMutation() {
  return createUpdateMutationV2<
    ProductStudioProductResponse,
    { productId: string; imageSlotIndex: number; direction: 'left' | 'right' }
  >({
    mutationFn: async ({ productId, imageSlotIndex, direction }) =>
      productStudioProductResponseSchema.parse(
        await api.post<unknown>(`/api/v2/products/${encodeURIComponent(productId)}/studio/rotate`, {
          imageSlotIndex,
          direction,
        })
      ),
    meta: {
      source: 'products.hooks.useRotateImageSlotMutation',
      operation: 'update',
      resource: 'products.studio.rotate',
      domain: 'products',
      tags: ['products', 'studio', 'rotate'],
      description: 'Updates products studio rotate.',
    },
    invalidate: (queryClient) => {
      void invalidateProductsAndCounts(queryClient);
    },
  });
}
