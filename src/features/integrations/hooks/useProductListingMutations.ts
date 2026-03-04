'use client';

import { useQueryClient } from '@tanstack/react-query';

import { invalidateProducts } from '@/features/products/hooks/productCache';
import type {
  ProductListingWithDetails,
  ProductJob,
  ExportToBaseVariables,
  ExportResponse,
} from '@/shared/contracts/integrations';
import type { CreateMutation, UpdateMutation, DeleteMutation } from '@/shared/contracts/ui';

export type { ExportToBaseVariables };
import { api, ApiError } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';

import {
  cancelProductListingsAndJobs,
  getProductListingsQueryKey,
  integrationJobsQueryKey,
  invalidateListingsBadgesAndQueues,
  invalidateProductListingsAndBadges,
  listingBadgesQueryKey,
} from '@/features/integrations/hooks/listingCache';

type MarketplaceBadgeEntry = {
  base?: string;
  tradera?: string;
};
type ListingBadgesPayload = Record<string, MarketplaceBadgeEntry>;
type GenericExportToBaseVariables = ExportToBaseVariables & {
  productId: string;
  requestId?: string;
};
type ListingBadgesSnapshot = Array<[readonly unknown[], ListingBadgesPayload | undefined]>;

interface ListingBadgeContext {
  previousListingBadges?: ListingBadgesSnapshot | undefined;
}

interface ProductListingAndJobsContext {
  previousListings: ProductListingWithDetails[] | undefined;
  previousIntegrationJobs: ProductJob[] | undefined;
}

const toBadgeEntry = (value: unknown): MarketplaceBadgeEntry =>
  value && typeof value === 'object' ? (value as MarketplaceBadgeEntry) : {};

const getListingBadgesSnapshot = (
  queryClient: ReturnType<typeof useQueryClient>
): ListingBadgesSnapshot =>
  queryClient.getQueriesData<ListingBadgesPayload>({
    queryKey: listingBadgesQueryKey,
  });

const restoreListingBadgesSnapshot = (
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: ListingBadgesSnapshot | undefined
): void => {
  if (!snapshot) return;
  snapshot.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
};

const setListingBadgeStatus = (
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  marketplace: keyof MarketplaceBadgeEntry,
  status: string
): void => {
  queryClient.setQueriesData<ListingBadgesPayload>(
    {
      queryKey: listingBadgesQueryKey,
    },
    (current) => ({
      ...(current ?? {}),
      [productId]: {
        ...toBadgeEntry(current?.[productId]),
        [marketplace]: status,
      },
    })
  );
};

const removeListingBadgeStatus = (
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  marketplace: keyof MarketplaceBadgeEntry
): void => {
  queryClient.setQueriesData<ListingBadgesPayload>(
    {
      queryKey: listingBadgesQueryKey,
    },
    (current) => {
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
    }
  );
};

export function useGenericExportToBaseMutation(): UpdateMutation<
  ExportResponse,
  GenericExportToBaseVariables
> {
  const mutationKey = listingBadgesQueryKey;
  const queryClient = useQueryClient();

  return createCreateMutationV2({
    mutationFn: async (vars: GenericExportToBaseVariables): Promise<ExportResponse> => {
      const { productId, requestId, ...payload } = vars;
      const requestKey = requestId?.trim();
      const options = requestKey ? { headers: { 'x-idempotency-key': requestKey } } : undefined;
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
    mutationKey,
    meta: {
      source: 'integrations.hooks.useGenericExportToBaseMutation',
      operation: 'create',
      resource: 'integrations.listings.export-to-base',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'listings', 'export-to-base'],
    },
    onMutate: async (vars: GenericExportToBaseVariables): Promise<ListingBadgeContext> => {
      await queryClient.cancelQueries({ queryKey: listingBadgesQueryKey });
      const previousListingBadges = getListingBadgesSnapshot(queryClient);
      setListingBadgeStatus(queryClient, vars.productId, 'base', 'pending');
      return { previousListingBadges };
    },
    onError: (_error, vars, context: ListingBadgeContext | undefined): void => {
      if (context?.previousListingBadges) {
        restoreListingBadgesSnapshot(queryClient, context.previousListingBadges);
        return;
      }
      removeListingBadgeStatus(queryClient, vars.productId, 'base');
    },
    invalidate: async (queryClient, _data, vars) => {
      setListingBadgeStatus(queryClient, vars.productId, 'base', 'active');
      await invalidateListingsBadgesAndQueues(queryClient, vars.productId);
    },
  });
}

export function useGenericCreateListingMutation(): CreateMutation<
  Record<string, unknown>,
  { productId: string; integrationId: string; connectionId: string }
> {
  return createCreateMutationV2({
    mutationFn: ({
      productId,
      integrationId,
      connectionId,
    }: {
      productId: string;
      integrationId: string;
      connectionId: string;
    }) =>
      api.post<Record<string, unknown>>(`/api/integrations/products/${productId}/listings`, {
        integrationId,
        connectionId,
      }),
    mutationKey: integrationJobsQueryKey,
    meta: {
      source: 'integrations.hooks.useGenericCreateListingMutation',
      operation: 'create',
      resource: 'integrations.listings',
      domain: 'integrations',
      mutationKey: integrationJobsQueryKey,
      tags: ['integrations', 'listings', 'create'],
    },
    invalidate: async (queryClient, _data, vars) => {
      await invalidateProductListingsAndBadges(queryClient, vars.productId);
    },
  });
}

export function useDeleteFromBaseMutation(
  productId: string
): UpdateMutation<
  { status?: string; message?: string; runId?: string | null },
  { listingId: string; inventoryId?: string }
> {
  const listingQueryKey = getProductListingsQueryKey(productId);
  const queryClient = useQueryClient();

  return createDeleteMutationV2({
    mutationFn: ({ listingId, inventoryId }: { listingId: string; inventoryId?: string }) =>
      api.post<{ status?: string; message?: string; runId?: string | null }>(
        `/api/integrations/products/${productId}/listings/${listingId}/delete-from-base`,
        { inventoryId }
      ),
    mutationKey: listingQueryKey,
    meta: {
      source: 'integrations.hooks.useDeleteFromBaseMutation',
      operation: 'delete',
      resource: 'integrations.listings.base',
      domain: 'integrations',
      mutationKey: listingQueryKey,
      tags: ['integrations', 'listings', 'base', 'delete'],
    },
    onMutate: async ({ listingId }): Promise<ProductListingAndJobsContext> => {
      await cancelProductListingsAndJobs(queryClient, productId);

      const previousListings =
        queryClient.getQueryData<ProductListingWithDetails[]>(listingQueryKey);
      const previousIntegrationJobs =
        queryClient.getQueryData<ProductJob[]>(integrationJobsQueryKey);
      const now = new Date();
      const nowIso = now.toISOString();

      if (previousListings) {
        queryClient.setQueryData<ProductListingWithDetails[]>(
          listingQueryKey,
          previousListings.map(
            (listing: ProductListingWithDetails): ProductListingWithDetails =>
              listing.id === listingId
                ? { ...listing, status: 'running', updatedAt: nowIso }
                : listing
          )
        );
      }

      if (previousIntegrationJobs) {
        queryClient.setQueryData<ProductJob[]>(
          integrationJobsQueryKey,
          previousIntegrationJobs.map(
            (job: ProductJob): ProductJob => ({
              ...job,
              listings: job.listings.map((listing) =>
                listing.id === listingId
                  ? { ...listing, status: 'running', updatedAt: nowIso }
                  : listing
              ),
            })
          )
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
    invalidate: async (queryClient) => {
      await invalidateListingsBadgesAndQueues(queryClient, productId);
    },
  });
}

export function usePurgeListingMutation(productId: string): DeleteMutation {
  return createDeleteMutationV2({
    mutationFn: (listingId: string) =>
      api.delete<void>(`/api/integrations/products/${productId}/listings/${listingId}/purge`),
    mutationKey: getProductListingsQueryKey(productId),
    meta: {
      source: 'integrations.hooks.usePurgeListingMutation',
      operation: 'delete',
      resource: 'integrations.listings.purge',
      domain: 'integrations',
      mutationKey: getProductListingsQueryKey(productId),
      tags: ['integrations', 'listings', 'purge'],
    },
    invalidate: async (queryClient) => {
      await invalidateProductListingsAndBadges(queryClient, productId);
    },
  });
}

export function useUpdateListingInventoryIdMutation(
  productId: string
): UpdateMutation<Record<string, unknown>, { listingId: string; inventoryId: string }> {
  return createUpdateMutationV2({
    mutationFn: ({ listingId, inventoryId }: { listingId: string; inventoryId: string }) =>
      api.patch<Record<string, unknown>>(
        `/api/integrations/products/${productId}/listings/${listingId}`,
        { inventoryId }
      ),
    mutationKey: getProductListingsQueryKey(productId),
    meta: {
      source: 'integrations.hooks.useUpdateListingInventoryIdMutation',
      operation: 'update',
      resource: 'integrations.listings.inventory-id',
      domain: 'integrations',
      mutationKey: getProductListingsQueryKey(productId),
      tags: ['integrations', 'listings', 'inventory-id', 'update'],
    },
    invalidate: async (queryClient) => {
      await invalidateProductListingsAndBadges(queryClient, productId);
    },
  });
}

export function useSyncBaseImagesMutation(
  productId: string
): UpdateMutation<
  { status: string; count: number; added: number },
  { listingId: string; inventoryId?: string }
> {
  return createUpdateMutationV2({
    mutationFn: async ({
      listingId,
      inventoryId,
    }: {
      listingId: string;
      inventoryId?: string;
    }): Promise<{ status: string; count: number; added: number }> => {
      const payload = await api.post<{ status?: string; count?: number; added?: number }>(
        `/api/integrations/products/${productId}/listings/${listingId}/sync-base-images`,
        { inventoryId }
      );
      return {
        status: payload.status ?? 'synced',
        count: payload.count ?? 0,
        added: payload.added ?? 0,
      };
    },
    mutationKey: getProductListingsQueryKey(productId),
    meta: {
      source: 'integrations.hooks.useSyncBaseImagesMutation',
      operation: 'update',
      resource: 'integrations.listings.base-images',
      domain: 'integrations',
      mutationKey: getProductListingsQueryKey(productId),
      tags: ['integrations', 'listings', 'base-images', 'sync'],
    },
    invalidate: async (queryClient) => {
      await invalidateProductListingsAndBadges(queryClient, productId);
      await invalidateProducts(queryClient);
    },
  });
}

export function useExportToBaseMutation(
  productId: string
): UpdateMutation<ExportResponse, ExportToBaseVariables> {
  const queryClient = useQueryClient();
  return createCreateMutationV2({
    mutationFn: async (payload: ExportToBaseVariables): Promise<ExportResponse> => {
      const { requestId, ...body } = payload;
      const requestKey = requestId?.trim();
      const options = requestKey ? { headers: { 'x-idempotency-key': requestKey } } : undefined;
      try {
        return await api.post<ExportResponse>(
          `/api/integrations/products/${productId}/export-to-base`,
          body,
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
    mutationKey: getProductListingsQueryKey(productId),
    meta: {
      source: 'integrations.hooks.useExportToBaseMutation',
      operation: 'create',
      resource: 'integrations.listings.export-to-base',
      domain: 'integrations',
      mutationKey: getProductListingsQueryKey(productId),
      tags: ['integrations', 'listings', 'export-to-base'],
    },
    onMutate: async (_vars): Promise<ListingBadgeContext> => {
      await queryClient.cancelQueries({ queryKey: listingBadgesQueryKey });
      const previousListingBadges = getListingBadgesSnapshot(queryClient);
      setListingBadgeStatus(queryClient, productId, 'base', 'pending');
      return { previousListingBadges };
    },
    onError: (_error, _vars, context: ListingBadgeContext | undefined): void => {
      if (context?.previousListingBadges) {
        restoreListingBadgesSnapshot(queryClient, context.previousListingBadges);
        return;
      }
      removeListingBadgeStatus(queryClient, productId, 'base');
    },
    invalidate: async (queryClient) => {
      setListingBadgeStatus(queryClient, productId, 'base', 'active');
      await invalidateListingsBadgesAndQueues(queryClient, productId);
    },
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
  return createCreateMutationV2({
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
        ...(typeof autoRelistEnabled === 'boolean' ? { autoRelistEnabled } : {}),
        ...(typeof autoRelistLeadMinutes === 'number' ? { autoRelistLeadMinutes } : {}),
        ...(templateId !== undefined ? { templateId } : {}),
      }),
    mutationKey: getProductListingsQueryKey(productId),
    meta: {
      source: 'integrations.hooks.useCreateListingMutation',
      operation: 'create',
      resource: 'integrations.listings',
      domain: 'integrations',
      mutationKey: getProductListingsQueryKey(productId),
      tags: ['integrations', 'listings', 'create'],
    },
    invalidate: async (queryClient, data) => {
      const queueName = (data as { queue?: { name?: string } } | null)?.queue?.name ?? null;
      if (queueName === 'tradera-listings') {
        setListingBadgeStatus(queryClient, productId, 'tradera', 'queued');
      }
      await invalidateProductListingsAndBadges(queryClient, productId);
    },
  });
}

export function useRelistTraderaMutation(productId: string): UpdateMutation<
  {
    queued?: boolean;
    listingId?: string;
    queue?: { name?: string; jobId?: string; enqueuedAt?: string };
  },
  { listingId: string }
> {
  return createCreateMutationV2({
    mutationFn: ({ listingId }: { listingId: string }) =>
      api.post<{
        queued?: boolean;
        listingId?: string;
        queue?: { name?: string; jobId?: string; enqueuedAt?: string };
      }>(`/api/integrations/products/${productId}/listings/${listingId}/relist`, {}),
    mutationKey: getProductListingsQueryKey(productId),
    meta: {
      source: 'integrations.hooks.useRelistTraderaMutation',
      operation: 'create',
      resource: 'integrations.listings.tradera-relist',
      domain: 'integrations',
      mutationKey: getProductListingsQueryKey(productId),
      tags: ['integrations', 'listings', 'tradera', 'relist'],
    },
    invalidate: async (queryClient) => {
      setListingBadgeStatus(queryClient, productId, 'tradera', 'queued_relist');
      await invalidateProductListingsAndBadges(queryClient, productId);
      await invalidateProducts(queryClient);
    },
  });
}
