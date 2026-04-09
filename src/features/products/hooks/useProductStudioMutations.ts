'use client';
'use no memo';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { productStudioProductResponseSchema, productStudioSendResponseSchema } from '@/shared/contracts/products/studio';
import {
  type ProductStudioSendRequest,
  type ProductStudioSendResponse,
  type ProductStudioProductResponse,
} from '@/shared/contracts/products';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { useOptionalContextRegistryPageEnvelope } from '@/shared/lib/ai-context-registry/page-context';
import { api } from '@/shared/lib/api-client';

import { invalidateProductsAndCounts, invalidateImageStudioSlots } from './productCache';

type SendToStudioVariables = {
  productId: string;
  imageSlotIndex: number;
  projectId: string;
  contextRegistry?: ProductStudioSendRequest['contextRegistry'];
};

type AcceptVariantVariables = {
  productId: string;
  imageSlotIndex: number;
  generationSlotId: string;
  projectId: string;
};

type RotateImageSlotVariables = {
  productId: string;
  imageSlotIndex: number;
  direction: 'left' | 'right';
};

export function useSendToStudioMutation(): MutationResult<
  ProductStudioSendResponse,
  SendToStudioVariables
> {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const queryClient = useQueryClient();

  return useMutation<ProductStudioSendResponse, Error, SendToStudioVariables>({
    meta: {
      source: 'products.hooks.useSendToStudioMutation',
      operation: 'create',
      resource: 'products.studio.send',
      domain: 'products',
      tags: ['products', 'studio', 'send'],
      description: 'Creates products studio send.',
    },
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
    onSuccess: async (_data, { projectId }) => {
      await invalidateImageStudioSlots(queryClient, projectId);
    },
  });
}

export function useAcceptVariantMutation(): MutationResult<
  ProductStudioProductResponse,
  AcceptVariantVariables
> {
  const queryClient = useQueryClient();

  return useMutation<ProductStudioProductResponse, Error, AcceptVariantVariables>({
    meta: {
      source: 'products.hooks.useAcceptVariantMutation',
      operation: 'update',
      resource: 'products.studio.accept',
      domain: 'products',
      tags: ['products', 'studio', 'accept'],
      description: 'Updates products studio accept.',
    },
    mutationFn: async ({ productId, imageSlotIndex, generationSlotId, projectId }) =>
      productStudioProductResponseSchema.parse(
        await api.post<unknown>(`/api/v2/products/${encodeURIComponent(productId)}/studio/accept`, {
          imageSlotIndex,
          generationSlotId,
          projectId,
        })
      ),
    onSuccess: async () => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useRotateImageSlotMutation(): MutationResult<
  ProductStudioProductResponse,
  RotateImageSlotVariables
> {
  const queryClient = useQueryClient();

  return useMutation<ProductStudioProductResponse, Error, RotateImageSlotVariables>({
    meta: {
      source: 'products.hooks.useRotateImageSlotMutation',
      operation: 'update',
      resource: 'products.studio.rotate',
      domain: 'products',
      tags: ['products', 'studio', 'rotate'],
      description: 'Updates products studio rotate.',
    },
    mutationFn: async ({ productId, imageSlotIndex, direction }) =>
      productStudioProductResponseSchema.parse(
        await api.post<unknown>(`/api/v2/products/${encodeURIComponent(productId)}/studio/rotate`, {
          imageSlotIndex,
          direction,
        })
      ),
    onSuccess: async () => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}
