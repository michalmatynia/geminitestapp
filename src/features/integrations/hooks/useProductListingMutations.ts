'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type { ImageTransformOptions } from '@/features/data-import-export';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';

export type ExportToBaseVariables = {
  connectionId: string;
  inventoryId: string;
  templateId?: string;
  imageBase64Mode?: 'base-only' | 'full-data-uri';
  imageTransform?: ImageTransformOptions | null;
  // For images only export
  imagesOnly?: boolean;
  listingId?: string;
  externalListingId?: string;
  exportImagesAsBase64?: boolean;
  allowDuplicateSku?: boolean;
};

type ExportResponse = { logs?: CapturedLog[]; error?: string; skuExists?: boolean };

export function useGenericExportToBaseMutation(): UseMutationResult<
  ExportResponse,
  Error,
  ExportToBaseVariables & { productId: string }
  > {
  const queryClient = useQueryClient();

  return useMutation<ExportResponse, Error, ExportToBaseVariables & { productId: string }>({
    mutationFn: async (vars: ExportToBaseVariables & { productId: string }): Promise<ExportResponse> => {
      const { productId, ...payload } = vars;
      const res: Response = await fetch(`/api/integrations/products/${productId}/export-to-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const payloadRes: ExportResponse = (await res.json().catch(() => ({}))) as ExportResponse;
      
      if (!res.ok) {
        if (payloadRes.skuExists) {
          throw new Error(payloadRes.error || 'SKU already exists in Base.com');
        }
        throw new Error(payloadRes.error || 'Failed to export product');
      }
      return payloadRes;
    },
    onSuccess: (_: ExportResponse, vars: ExportToBaseVariables & { productId: string }): void => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'product-listings', vars.productId] });
    },
  });
}

export function useGenericCreateListingMutation(): UseMutationResult<
  Record<string, unknown>,
  Error,
  { productId: string; integrationId: string; connectionId: string }
  > {
  const queryClient = useQueryClient();

  return useMutation<Record<string, unknown>, Error, { productId: string; integrationId: string; connectionId: string }>({
    mutationFn: async ({ productId, integrationId, connectionId }: { productId: string; integrationId: string; connectionId: string }): Promise<Record<string, unknown>> => {
      const res: Response = await fetch(`/api/integrations/products/${productId}/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId,
          connectionId,
        }),
      });

      if (!res.ok) {
        const data: { error?: string } = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Failed to create listing');
      }
      return (await res.json()) as Record<string, unknown>;
    },
    onSuccess: (_: Record<string, unknown>, vars: { productId: string; integrationId: string; connectionId: string }): void => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'product-listings', vars.productId] });
    },
  });
}

export function useDeleteFromBaseMutation(productId: string): UseMutationResult<
  Record<string, unknown>,
  Error,
  { listingId: string; inventoryId?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, inventoryId }: { listingId: string; inventoryId?: string }): Promise<Record<string, unknown>> => {
      const body: { inventoryId?: string } = inventoryId ? { inventoryId } : {};
      const res: Response = await fetch(
        `/api/integrations/products/${productId}/listings/${listingId}/delete-from-base`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const payload: { error?: string } = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to delete from Base.com');
      }
      return (await res.json()) as Record<string, unknown>;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'product-listings', productId] });
    },
  });
}

export function usePurgeListingMutation(productId: string): UseMutationResult<
  void,
  Error,
  { listingId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId }: { listingId: string }): Promise<void> => {
      const res: Response = await fetch(
        `/api/integrations/products/${productId}/listings/${listingId}/purge`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        throw new Error('Failed to remove listing history');
      }
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'product-listings', productId] });
    },
  });
}

export function useUpdateListingInventoryIdMutation(productId: string): UseMutationResult<
  Record<string, unknown>,
  Error,
  { listingId: string; inventoryId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, inventoryId }: { listingId: string; inventoryId: string }): Promise<Record<string, unknown>> => {
      const res: Response = await fetch(
        `/api/integrations/products/${productId}/listings/${listingId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inventoryId }),
        }
      );
      if (!res.ok) {
        const payload: { error?: string } = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to save inventory ID');
      }
      return (await res.json()) as Record<string, unknown>;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'product-listings', productId] });
    },
  });
}

export function useSyncBaseImagesMutation(productId: string): UseMutationResult<
  { status: string; count: number; added: number },
  Error,
  { listingId: string; inventoryId?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, inventoryId }: { listingId: string; inventoryId?: string }): Promise<{ status: string; count: number; added: number }> => {
      const body: { inventoryId?: string } = inventoryId ? { inventoryId } : {};
      const res: Response = await fetch(
        `/api/integrations/products/${productId}/listings/${listingId}/sync-base-images`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const payload: { error?: string; status?: string; count?: number; added?: number } = (await res.json().catch(() => ({}))) as { error?: string; status?: string; count?: number; added?: number };
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to sync images from Base.com');
      }
      return {
        status: payload.status ?? 'synced',
        count: payload.count ?? 0,
        added: payload.added ?? 0,
      };
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'product-listings', productId] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useExportToBaseMutation(productId: string): UseMutationResult<
  ExportResponse,
  Error,
  ExportToBaseVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ExportToBaseVariables): Promise<ExportResponse> => {
      const res: Response = await fetch(`/api/integrations/products/${productId}/export-to-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const payloadRes: ExportResponse = (await res.json().catch(() => ({}))) as ExportResponse;
      
      if (!res.ok) {
        if (payloadRes.skuExists) {
          throw new Error(payloadRes.error || 'SKU already exists in Base.com');
        }
        throw new Error(payloadRes.error || 'Failed to export product');
      }
      return payloadRes;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'product-listings', productId] });
    },
  });
}

export function useCreateListingMutation(productId: string): UseMutationResult<
  Record<string, unknown>,
  Error,
  { integrationId: string; connectionId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, connectionId }: { integrationId: string; connectionId: string }): Promise<Record<string, unknown>> => {
      const res: Response = await fetch(`/api/integrations/products/${productId}/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId,
          connectionId,
        }),
      });

      if (!res.ok) {
        const data: { error?: string } = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Failed to create listing');
      }
      return (await res.json()) as Record<string, unknown>;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'product-listings', productId] });
    },
  });
}