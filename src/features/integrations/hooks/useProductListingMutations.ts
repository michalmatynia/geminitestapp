'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type { ImageTransformOptions } from '@/features/data-import-export';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import type { ProductListingWithDetails } from '@/features/integrations/types/listings';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ProductJob } from '@/shared/types/listing-jobs';

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

type ExportResponse = {
  logs?: CapturedLog[];
  error?: string;
  skuExists?: boolean;
  runId?: string | null;
};

const listingKeys = QUERY_KEYS.integrations;
const integrationJobsQueryKey = ['jobs', 'integrations'] as const;
const aiPathsJobQueueQueryKey = ['ai-paths-job-queue'] as const;
const aiPathsQueueStatusQueryKey = ['ai-paths-queue-status'] as const;
const listingBadgesQueryKey = ['integrations', 'product-listings-badges'] as const;

export function useGenericExportToBaseMutation(): UseMutationResult<
  ExportResponse,
  Error,
  ExportToBaseVariables & { productId: string }
  > {
  const queryClient = useQueryClient();

  return useMutation<ExportResponse, Error, ExportToBaseVariables & { productId: string }>({
    mutationFn: async (vars: ExportToBaseVariables & { productId: string }): Promise<ExportResponse> => {
      const { productId, ...payload } = vars;
      try {
        return await api.post<ExportResponse>(`/api/integrations/products/${productId}/export-to-base`, payload);
      } catch (error: any) {
        const payloadRes = error?.data as ExportResponse | undefined;
        if (payloadRes?.skuExists) {
          throw new Error(payloadRes.error || 'SKU already exists in Base.com');
        }
        throw error;
      }
    },
    onSuccess: (_: ExportResponse, vars: ExportToBaseVariables & { productId: string }): void => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.listings(vars.productId) });
      void queryClient.invalidateQueries({ queryKey: integrationJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsJobQueueQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsQueueStatusQueryKey });
      void queryClient.invalidateQueries({ queryKey: listingBadgesQueryKey });
    },
    onSettled: (_data, _error, vars): void => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.listings(vars.productId) });
      void queryClient.invalidateQueries({ queryKey: integrationJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsJobQueueQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsQueueStatusQueryKey });
      void queryClient.invalidateQueries({ queryKey: listingBadgesQueryKey });
    }
  });
}

export function useGenericCreateListingMutation(): UseMutationResult<
  Record<string, unknown>,
  Error,
  { productId: string; integrationId: string; connectionId: string }
  > {
  const queryClient = useQueryClient();

  return useMutation<Record<string, unknown>, Error, { productId: string; integrationId: string; connectionId: string }>({
    mutationFn: ({ productId, integrationId, connectionId }: { productId: string; integrationId: string; connectionId: string }) => 
      api.post<Record<string, unknown>>(`/api/integrations/products/${productId}/listings`, {
        integrationId,
        connectionId,
      }),
    onSuccess: (_: Record<string, unknown>, vars: { productId: string; integrationId: string; connectionId: string }): void => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.listings(vars.productId) });
      void queryClient.invalidateQueries({ queryKey: listingBadgesQueryKey });
    },
  });
}

export function useDeleteFromBaseMutation(productId: string): UseMutationResult<
  { status?: string; message?: string; runId?: string | null },
  Error,
  { listingId: string; inventoryId?: string }
> {
  const queryClient = useQueryClient();
  const listingQueryKey = listingKeys.listings(productId);

  return useMutation<
    { status?: string; message?: string; runId?: string | null },
    Error,
    { listingId: string; inventoryId?: string },
    {
      previousListings: ProductListingWithDetails[] | undefined;
      previousIntegrationJobs: ProductJob[] | undefined;
    }
  >({
    mutationFn: ({ listingId, inventoryId }: { listingId: string; inventoryId?: string }) => 
      api.post<{ status?: string; message?: string; runId?: string | null }>(
        `/api/integrations/products/${productId}/listings/${listingId}/delete-from-base`,
        { inventoryId }
      ),
    onMutate: async ({ listingId }): Promise<{
      previousListings: ProductListingWithDetails[] | undefined;
      previousIntegrationJobs: ProductJob[] | undefined;
    }> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listingQueryKey }),
        queryClient.cancelQueries({ queryKey: integrationJobsQueryKey }),
      ]);

      const previousListings = queryClient.getQueryData<ProductListingWithDetails[]>(
        listingQueryKey
      );
      const previousIntegrationJobs = queryClient.getQueryData<ProductJob[]>(
        integrationJobsQueryKey
      );
      const now = new Date();
      const nowIso = now.toISOString();

      if (previousListings) {
        queryClient.setQueryData<ProductListingWithDetails[]>(
          listingQueryKey,
          previousListings.map((listing: ProductListingWithDetails): ProductListingWithDetails =>
            listing.id === listingId
              ? { ...listing, status: 'running', updatedAt: now }
              : listing
          )
        );
      }

      if (previousIntegrationJobs) {
        queryClient.setQueryData<ProductJob[]>(
          integrationJobsQueryKey,
          previousIntegrationJobs.map((job: ProductJob): ProductJob => ({
            ...job,
            listings: job.listings.map((listing) =>
              listing.id === listingId
                ? { ...listing, status: 'running', updatedAt: nowIso }
                : listing
            ),
          }))
        );
      }

      return { previousListings, previousIntegrationJobs };
    },
    onError: (_error, _variables, context): void => {
      if (context?.previousListings) {
        queryClient.setQueryData(listingQueryKey, context.previousListings);
      }
      if (context?.previousIntegrationJobs) {
        queryClient.setQueryData(integrationJobsQueryKey, context.previousIntegrationJobs);
      }
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: listingQueryKey });
      void queryClient.invalidateQueries({ queryKey: integrationJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsJobQueueQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsQueueStatusQueryKey });
      void queryClient.invalidateQueries({ queryKey: listingBadgesQueryKey });
    },
    onSettled: (): void => {
      void queryClient.invalidateQueries({ queryKey: listingQueryKey });
      void queryClient.invalidateQueries({ queryKey: integrationJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsJobQueueQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsQueueStatusQueryKey });
      void queryClient.invalidateQueries({ queryKey: listingBadgesQueryKey });
    }
  });
}

export function usePurgeListingMutation(productId: string): UseMutationResult<
  void,
  Error,
  { listingId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId }: { listingId: string }) => 
      api.delete<void>(`/api/integrations/products/${productId}/listings/${listingId}/purge`),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.listings(productId) });
      void queryClient.invalidateQueries({ queryKey: listingBadgesQueryKey });
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
    mutationFn: ({ listingId, inventoryId }: { listingId: string; inventoryId: string }) => 
      api.patch<Record<string, unknown>>(`/api/integrations/products/${productId}/listings/${listingId}`, { inventoryId }),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.listings(productId) });
      void queryClient.invalidateQueries({ queryKey: listingBadgesQueryKey });
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
      const payload = await api.post<any>(`/api/integrations/products/${productId}/listings/${listingId}/sync-base-images`, { inventoryId });
      return {
        status: payload.status ?? 'synced',
        count: payload.count ?? 0,
        added: payload.added ?? 0,
      };
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.listings(productId) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all });
      void queryClient.invalidateQueries({ queryKey: listingBadgesQueryKey });
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
      try {
        return await api.post<ExportResponse>(`/api/integrations/products/${productId}/export-to-base`, payload);
      } catch (error: any) {
        const payloadRes = error?.data as ExportResponse | undefined;
        if (payloadRes?.skuExists) {
          throw new Error(payloadRes.error || 'SKU already exists in Base.com');
        }
        throw error;
      }
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.listings(productId) });
      void queryClient.invalidateQueries({ queryKey: integrationJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsJobQueueQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsQueueStatusQueryKey });
      void queryClient.invalidateQueries({ queryKey: listingBadgesQueryKey });
    },
    onSettled: (): void => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.listings(productId) });
      void queryClient.invalidateQueries({ queryKey: integrationJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsJobQueueQueryKey });
      void queryClient.invalidateQueries({ queryKey: aiPathsQueueStatusQueryKey });
      void queryClient.invalidateQueries({ queryKey: listingBadgesQueryKey });
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
    mutationFn: ({ integrationId, connectionId }: { integrationId: string; connectionId: string }) => 
      api.post<Record<string, unknown>>(`/api/integrations/products/${productId}/listings`, {
        integrationId,
        connectionId,
      }),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.listings(productId) });
      void queryClient.invalidateQueries({ queryKey: listingBadgesQueryKey });
    },
  });
}
