'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { ImageTransformOptions } from '@/features/data-import-export';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import type { ProductListingWithDetails } from '@/features/integrations/types/listings';
import { invalidateProducts } from '@/features/products/hooks/productCache';
import { api, ApiError } from '@/shared/lib/api-client';
import {
  createCreateMutation,
  createUpdateMutation,
  createDeleteMutation,
} from '@/shared/lib/query-factories';
import type { ProductJob } from '@/shared/types/domain/listing-jobs';
import type { CreateMutation, UpdateMutation, DeleteMutation } from '@/shared/types/query-result-types';

import {
  cancelProductListingsAndJobs,
  getProductListingsQueryKey,
  integrationJobsQueryKey,
  invalidateListingsBadgesAndQueues,
  invalidateProductListingsAndBadges,
  listingBadgesQueryKey,
} from './listingCache';

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

type MarketplaceBadgeEntry = {
  base?: string;
  tradera?: string;
};
type ListingBadgesPayload = Record<string, MarketplaceBadgeEntry>;
type GenericExportToBaseVariables = ExportToBaseVariables & {
  productId: string;
  requestId?: string;
};

interface ListingBadgeContext {
  previousListingBadges?: ListingBadgesPayload | undefined;
}

interface ProductListingAndJobsContext {
  previousListings: ProductListingWithDetails[] | undefined;
  previousIntegrationJobs: ProductJob[] | undefined;
}

const toBadgeEntry = (value: unknown): MarketplaceBadgeEntry =>
  value && typeof value === 'object'
    ? (value as MarketplaceBadgeEntry)
    : {};

const setListingBadgeStatus = (
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  marketplace: keyof MarketplaceBadgeEntry,
  status: string
): void => {
  queryClient.setQueryData<ListingBadgesPayload>(listingBadgesQueryKey, (current) => ({
    ...(current ?? {}),
    [productId]: {
      ...toBadgeEntry(current?.[productId]),
      [marketplace]: status,
    },
  }));
};

const removeListingBadgeStatus = (
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  marketplace: keyof MarketplaceBadgeEntry
): void => {
  queryClient.setQueryData<ListingBadgesPayload>(listingBadgesQueryKey, (current) => {
    if (!current) return current;
    const currentProduct = toBadgeEntry(current[productId]);
    if (Object.keys(currentProduct).length === 0) return current;
    const nextProduct = { ...currentProduct };
    delete nextProduct[marketplace];
    const next = { ...current };
    if (Object.keys(nextProduct).length === 0) {
      delete next[productId];
    } else {
      next[productId] = nextProduct;
    }
    return next;
  });
};

export function useGenericExportToBaseMutation(): UpdateMutation<
  ExportResponse,
  GenericExportToBaseVariables
  > {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: async (vars: GenericExportToBaseVariables): Promise<ExportResponse> => {
      const { productId, requestId, ...payload } = vars;
      const requestKey = requestId?.trim();
      const options = requestKey
        ? { headers: { 'x-idempotency-key': requestKey } }
        : undefined;
      try {
        return await api.post<ExportResponse>(
          `/api/integrations/products/${productId}/export-to-base`,
          payload,
          options
        );
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'data' in error) {
          const payloadRes = (error as { data: ExportResponse }).data;
          if (payloadRes?.skuExists) {
            throw new ApiError(payloadRes.error || 'SKU already exists in Base.com', 409);
          }
        }
        throw error;
      }
    },
    options: {
      onMutate: async (vars: GenericExportToBaseVariables): Promise<ListingBadgeContext> => {
        await queryClient.cancelQueries({ queryKey: listingBadgesQueryKey });
        const previousListingBadges = queryClient.getQueryData<ListingBadgesPayload>(listingBadgesQueryKey);
        setListingBadgeStatus(queryClient, vars.productId, 'base', 'pending');
        return { previousListingBadges };
      },
      onError: (_error, vars, context: ListingBadgeContext | undefined): void => {
        if (context?.previousListingBadges) {
          queryClient.setQueryData(listingBadgesQueryKey, context.previousListingBadges);
          return;
        }
        removeListingBadgeStatus(queryClient, vars.productId, 'base');
      },
      onSuccess: (_: ExportResponse, vars: GenericExportToBaseVariables): void => {
        setListingBadgeStatus(queryClient, vars.productId, 'base', 'active');
        void invalidateListingsBadgesAndQueues(queryClient, vars.productId);
      },
      onSettled: (_data, _error, vars): void => {
        void invalidateListingsBadgesAndQueues(queryClient, vars.productId);
      }
    }
  });
}

export function useGenericCreateListingMutation(): CreateMutation<
  Record<string, unknown>,
  { productId: string; integrationId: string; connectionId: string }
  > {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: ({ productId, integrationId, connectionId }: { productId: string; integrationId: string; connectionId: string }) => 
      api.post<Record<string, unknown>>(`/api/integrations/products/${productId}/listings`, {
        integrationId,
        connectionId,
      }),
    options: {
      onSuccess: (_: Record<string, unknown>, vars: { productId: string; integrationId: string; connectionId: string }): void => {
        void invalidateProductListingsAndBadges(queryClient, vars.productId);
      },
    }
  });
}

export function useDeleteFromBaseMutation(productId: string): UpdateMutation<
  { status?: string; message?: string; runId?: string | null },
  { listingId: string; inventoryId?: string }
> {
  const queryClient = useQueryClient();
  const listingQueryKey = getProductListingsQueryKey(productId);

  return createCreateMutation({
    mutationFn: ({ listingId, inventoryId }: { listingId: string; inventoryId?: string }) => 
      api.post<{ status?: string; message?: string; runId?: string | null }>(
        `/api/integrations/products/${productId}/listings/${listingId}/delete-from-base`,
        { inventoryId }
      ),
    options: {
      onMutate: async ({ listingId }): Promise<ProductListingAndJobsContext> => {
        await cancelProductListingsAndJobs(queryClient, productId);

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
      onError: (_error, _variables, context: ProductListingAndJobsContext | undefined): void => {
        if (context?.previousListings) {
          queryClient.setQueryData(listingQueryKey, context.previousListings);
        }
        if (context?.previousIntegrationJobs) {
          queryClient.setQueryData(integrationJobsQueryKey, context.previousIntegrationJobs);
        }
      },
      onSuccess: (): void => {
        void invalidateListingsBadgesAndQueues(queryClient, productId);
      },
      onSettled: (): void => {
        void invalidateListingsBadgesAndQueues(queryClient, productId);
      }
    }
  });
}

export function usePurgeListingMutation(productId: string): DeleteMutation {
  const queryClient = useQueryClient();

  return createDeleteMutation({
    mutationFn: (listingId: string) => 
      api.delete<void>(`/api/integrations/products/${productId}/listings/${listingId}/purge`),
    options: {
      onSuccess: (): void => {
        void invalidateProductListingsAndBadges(queryClient, productId);
      },
    }
  });
}

export function useUpdateListingInventoryIdMutation(productId: string): UpdateMutation<
  Record<string, unknown>,
  { listingId: string; inventoryId: string }
> {
  const queryClient = useQueryClient();

  return createUpdateMutation({
    mutationFn: ({ listingId, inventoryId }: { listingId: string; inventoryId: string }) => 
      api.patch<Record<string, unknown>>(`/api/integrations/products/${productId}/listings/${listingId}`, { inventoryId }),
    options: {
      onSuccess: (): void => {
        void invalidateProductListingsAndBadges(queryClient, productId);
      },
    }
  });
}

export function useSyncBaseImagesMutation(productId: string): UpdateMutation<
  { status: string; count: number; added: number },
  { listingId: string; inventoryId?: string }
> {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: async ({ listingId, inventoryId }: { listingId: string; inventoryId?: string }): Promise<{ status: string; count: number; added: number }> => {
      const payload = await api.post<{ status?: string; count?: number; added?: number }>(`/api/integrations/products/${productId}/listings/${listingId}/sync-base-images`, { inventoryId });
      return {
        status: payload.status ?? 'synced',
        count: payload.count ?? 0,
        added: payload.added ?? 0,
      };
    },
    options: {
      onSuccess: (): void => {
        void invalidateProductListingsAndBadges(queryClient, productId);
        void invalidateProducts(queryClient);
      },
    }
  });
}

export function useExportToBaseMutation(productId: string): UpdateMutation<
  ExportResponse,
  ExportToBaseVariables
> {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: async (payload: ExportToBaseVariables): Promise<ExportResponse> => {
      try {
        return await api.post<ExportResponse>(`/api/integrations/products/${productId}/export-to-base`, payload);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'data' in error) {
          const payloadRes = (error as { data: ExportResponse }).data;
          if (payloadRes?.skuExists) {
            throw new ApiError(payloadRes.error || 'SKU already exists in Base.com', 409);
          }
        }
        throw error;
      }
    },
    options: {
      onMutate: async (): Promise<ListingBadgeContext> => {
        await queryClient.cancelQueries({ queryKey: listingBadgesQueryKey });
        const previousListingBadges = queryClient.getQueryData<ListingBadgesPayload>(listingBadgesQueryKey);
        setListingBadgeStatus(queryClient, productId, 'base', 'pending');
        return { previousListingBadges };
      },
      onError: (_error, _vars, context: ListingBadgeContext | undefined): void => {
        if (context?.previousListingBadges) {
          queryClient.setQueryData(listingBadgesQueryKey, context.previousListingBadges);
          return;
        }
        removeListingBadgeStatus(queryClient, productId, 'base');
      },
      onSuccess: (): void => {
        setListingBadgeStatus(queryClient, productId, 'base', 'active');
        void invalidateListingsBadgesAndQueues(queryClient, productId);
      },
      onSettled: (): void => {
        void invalidateListingsBadgesAndQueues(queryClient, productId);
      },
    }
  });
}

export function useCreateListingMutation(productId: string): CreateMutation<
  Record<string, unknown>,
  {
    integrationId: string;
    connectionId: string;
    durationHours?: number;
    autoRelistEnabled?: boolean;
    autoRelistLeadMinutes?: number;
    templateId?: string | null;
  }
> {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: ({
      integrationId,
      connectionId,
      durationHours,
      autoRelistEnabled,
      autoRelistLeadMinutes,
      templateId,
    }: {
      integrationId: string;
      connectionId: string;
      durationHours?: number;
      autoRelistEnabled?: boolean;
      autoRelistLeadMinutes?: number;
      templateId?: string | null;
    }) =>
      api.post<Record<string, unknown>>(`/api/integrations/products/${productId}/listings`, {
        integrationId,
        connectionId,
        ...(typeof durationHours === 'number' ? { durationHours } : {}),
        ...(typeof autoRelistEnabled === 'boolean'
          ? { autoRelistEnabled }
          : {}),
        ...(typeof autoRelistLeadMinutes === 'number'
          ? { autoRelistLeadMinutes }
          : {}),
        ...(templateId !== undefined ? { templateId } : {}),
      }),
    options: {
      onSuccess: (data): void => {
        const queueName =
          (data as { queue?: { name?: string } } | null)?.queue?.name ?? null;
        if (queueName === 'tradera-listings') {
          setListingBadgeStatus(queryClient, productId, 'tradera', 'queued');
        }
        void invalidateProductListingsAndBadges(queryClient, productId);
      },
    }
  });
}

export function useRelistTraderaMutation(productId: string): UpdateMutation<
  { queued?: boolean; listingId?: string; queue?: { name?: string; jobId?: string; enqueuedAt?: string } },
  { listingId: string }
> {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: ({ listingId }: { listingId: string }) =>
      api.post<{ queued?: boolean; listingId?: string; queue?: { name?: string; jobId?: string; enqueuedAt?: string } }>(
        `/api/integrations/products/${productId}/listings/${listingId}/relist`,
        {}
      ),
    options: {
      onSuccess: (): void => {
        setListingBadgeStatus(queryClient, productId, 'tradera', 'queued_relist');
        void invalidateProductListingsAndBadges(queryClient, productId);
        void invalidateProducts(queryClient);
      },
    }
  });
}
