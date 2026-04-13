'use no memo';

import { useQueryClient } from '@tanstack/react-query';

import {
  PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG,
  TRADERA_INTEGRATION_SLUGS,
  normalizeIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { buildQueuedTraderaStatusCheckMarketplaceData } from '@/features/integrations/utils/tradera-status-check';
import type { ListingBadgesPayload, MarketplaceBadgeEntry, ProductListingCreatePayload, ProductListingCreateResponse, ProductListingCreateVariables, ProductListingDeleteFromBaseResponse, ProductListingDeleteFromBaseVariables, ProductListingInventoryUpdateVariables, ProductListingRelistResponse, ProductListingRelistVariables, ProductListingSyncBaseImagesResponse, ProductListingSyncBaseImagesVariables, ProductListingSyncResponse, ProductListingSyncVariables, ProductListingUpdateResponse, ProductListingWithDetails, TraderaProductLinkExistingPayload, TraderaProductLinkExistingResponse } from '@/shared/contracts/integrations/listings';
import type { ProductJob } from '@/shared/contracts/integrations/domain';
import type { ExportToBaseVariables, ExportResponse } from '@/shared/contracts/integrations/base-com';
import type { CreateMutation, UpdateMutation, DeleteMutation } from '@/shared/contracts/ui/queries';
import { api, ApiError } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import {
  invalidateListingsBadgesAndQueues,
  invalidateProductListingsAndBadges,
  invalidateProducts,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type { ExportToBaseVariables };

type GenericExportToBaseVariables = ExportToBaseVariables & {
  productId: string;
  requestId?: string;
};
type ListingBadgesSnapshot = Array<[readonly unknown[], ListingBadgesPayload | undefined]>;

const listingBadgesQueryKey = QUERY_KEYS.integrations.productListingsBadges();
const integrationJobsQueryKey = QUERY_KEYS.jobs.integrations();

const getProductListingsQueryKey = (productId: string): readonly unknown[] =>
  QUERY_KEYS.integrations.listings(productId);

const cancelProductListingsAndJobs = async (
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string
): Promise<void> => {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: getProductListingsQueryKey(productId) }),
    queryClient.cancelQueries({ queryKey: integrationJobsQueryKey }),
  ]);
};

interface ListingBadgeContext {
  previousListingBadges?: ListingBadgesSnapshot | undefined;
}

interface ProductListingAndJobsContext {
  previousListings: ProductListingWithDetails[] | undefined;
  previousIntegrationJobs: ProductJob[] | undefined;
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const toBadgeEntry = (value: unknown): MarketplaceBadgeEntry =>
  value && typeof value === 'object' ? (value as MarketplaceBadgeEntry) : {};

type ListingQueueBrowserMode = ProductListingRelistVariables['browserMode'];

const patchQueuedPlaywrightRelist = (
  listing: ProductListingWithDetails,
  options: {
    browserMode?: ProductListingRelistVariables['browserMode'];
    requestId?: string | null;
    queuedAt?: string | null;
  }
): ProductListingWithDetails => {
  const previousMarketplaceData = toRecord(listing.marketplaceData);
  const previousPlaywrightData = toRecord(previousMarketplaceData['playwright']);

  return {
    ...listing,
    status: 'queued_relist',
    failureReason: null,
    marketplaceData: {
      ...previousMarketplaceData,
      marketplace: 'playwright-programmable',
      playwright: {
        ...previousPlaywrightData,
        pendingExecution: {
          requestedBrowserMode: options.browserMode ?? 'connection_default',
          requestId: options.requestId ?? null,
          queuedAt: options.queuedAt ?? null,
        },
      },
    },
  };
};

const patchQueuedTraderaRelist = (
  listing: ProductListingWithDetails,
  options: {
    action?: 'relist' | 'sync';
    browserMode?: ListingQueueBrowserMode;
    requestId?: string | null;
    queuedAt?: string | null;
  }
): ProductListingWithDetails => {
  const previousMarketplaceData = toRecord(listing.marketplaceData);
  const previousTraderaData = toRecord(previousMarketplaceData['tradera']);

  return {
    ...listing,
    status: 'queued_relist',
    failureReason: null,
    marketplaceData: {
      ...previousMarketplaceData,
      marketplace: 'tradera',
      tradera: {
        ...previousTraderaData,
        pendingExecution: {
          action: options.action ?? 'relist',
          requestedBrowserMode: options.browserMode ?? 'connection_default',
          requestId: options.requestId ?? null,
          queuedAt: options.queuedAt ?? null,
        },
      },
    },
  };
};

const patchQueuedTraderaStatusCheck = (
  listing: ProductListingWithDetails,
  options: {
    browserMode?: ListingQueueBrowserMode;
    requestId?: string | null;
    queuedAt?: string | null;
  }
): ProductListingWithDetails => ({
  ...listing,
  marketplaceData: buildQueuedTraderaStatusCheckMarketplaceData({
    existingMarketplaceData: listing.marketplaceData,
    requestId: options.requestId ?? `pending-check-status-${listing.id}`,
    queuedAt: options.queuedAt ?? new Date().toISOString(),
    ...(options.browserMode ? { requestedBrowserMode: options.browserMode } : {}),
  }),
});

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
          `/api/v2/integrations/products/${productId}/export-to-base`,
          payload,
          options
        );
      } catch (error: unknown) {
        logClientError(error);
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
      description: 'Creates integrations listings export to base.'},
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
    invalidate: async (queryClient, data, vars) => {
      // Keep badge as 'pending' when the export is queued for background processing.
      // Only invalidate the specific product's listings — avoid invalidating all
      // badges which would cause the entire product list to re-render.
      const badgeStatus = data?.status === 'queued' ? 'pending' : 'active';
      setListingBadgeStatus(queryClient, vars.productId, 'base', badgeStatus);
      await invalidateProductListingsAndBadges(queryClient, vars.productId);
    },
  });
}

export function useGenericCreateListingMutation(): CreateMutation<
  ProductListingCreateResponse,
  ProductListingCreateVariables
  > {
  return createCreateMutationV2({
    mutationFn: ({
      productId,
      ...payload
    }: ProductListingCreateVariables) =>
      api.post<ProductListingCreateResponse>(
        `/api/v2/integrations/products/${productId}/listings`,
        payload
      ),
    mutationKey: integrationJobsQueryKey,
    meta: {
      source: 'integrations.hooks.useGenericCreateListingMutation',
      operation: 'create',
      resource: 'integrations.listings',
      domain: 'integrations',
      mutationKey: integrationJobsQueryKey,
      tags: ['integrations', 'listings', 'create'],
      description: 'Creates integrations listings.'},
    invalidate: async (queryClient, _data, vars) => {
      await invalidateProductListingsAndBadges(queryClient, vars.productId);
    },
  });
}

export function useDeleteFromBaseMutation(
  productId: string
): UpdateMutation<
  ProductListingDeleteFromBaseResponse,
  ProductListingDeleteFromBaseVariables
> {
  const listingQueryKey = getProductListingsQueryKey(productId);
  const queryClient = useQueryClient();

  return createDeleteMutationV2({
    mutationFn: ({ listingId, inventoryId }: ProductListingDeleteFromBaseVariables) =>
      api.post<ProductListingDeleteFromBaseResponse>(
        `/api/v2/integrations/products/${productId}/listings/${listingId}/delete-from-base`,
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
      description: 'Deletes integrations listings base.'},
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
      await invalidateProducts(queryClient);
    },
  });
}

export function usePurgeListingMutation(productId: string): DeleteMutation {
  return createDeleteMutationV2({
    mutationFn: (listingId: string) =>
      api.delete<void>(`/api/v2/integrations/products/${productId}/listings/${listingId}/purge`),
    mutationKey: getProductListingsQueryKey(productId),
    meta: {
      source: 'integrations.hooks.usePurgeListingMutation',
      operation: 'delete',
      resource: 'integrations.listings.purge',
      domain: 'integrations',
      mutationKey: getProductListingsQueryKey(productId),
      tags: ['integrations', 'listings', 'purge'],
      description: 'Deletes integrations listings purge.'},
    invalidate: async (queryClient) => {
      await invalidateProductListingsAndBadges(queryClient, productId);
    },
  });
}

export function useUpdateListingInventoryIdMutation(
  productId: string
): UpdateMutation<ProductListingUpdateResponse, ProductListingInventoryUpdateVariables> {
  return createUpdateMutationV2({
    mutationFn: ({ listingId, inventoryId }: ProductListingInventoryUpdateVariables) =>
      api.patch<ProductListingUpdateResponse>(
        `/api/v2/integrations/products/${productId}/listings/${listingId}`,
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
      description: 'Updates integrations listings inventory id.'},
    invalidate: async (queryClient) => {
      await invalidateProductListingsAndBadges(queryClient, productId);
    },
  });
}

export function useSyncBaseImagesMutation(
  productId: string
): UpdateMutation<ProductListingSyncBaseImagesResponse, ProductListingSyncBaseImagesVariables> {
  return createUpdateMutationV2({
    mutationFn: ({ listingId, inventoryId }: ProductListingSyncBaseImagesVariables) =>
      api.post<ProductListingSyncBaseImagesResponse>(
        `/api/v2/integrations/products/${productId}/listings/${listingId}/sync-base-images`,
        { inventoryId }
      ),
    mutationKey: getProductListingsQueryKey(productId),
    meta: {
      source: 'integrations.hooks.useSyncBaseImagesMutation',
      operation: 'update',
      resource: 'integrations.listings.base-images',
      domain: 'integrations',
      mutationKey: getProductListingsQueryKey(productId),
      tags: ['integrations', 'listings', 'base-images', 'sync'],
      description: 'Updates integrations listings base images.'},
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
          `/api/v2/integrations/products/${productId}/export-to-base`,
          body,
          options
        );
      } catch (error: unknown) {
        logClientError(error);
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
      description: 'Creates integrations listings export to base.'},
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
  ProductListingCreateResponse,
  ProductListingCreatePayload
> {
  return createCreateMutationV2({
    mutationFn: ({
      integrationId,
      connectionId,
      durationHours,
      autoRelistEnabled,
      autoRelistLeadMinutes,
      templateId,
    }: ProductListingCreatePayload) =>
      api.post<ProductListingCreateResponse>(`/api/v2/integrations/products/${productId}/listings`, {
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
      description: 'Creates integrations listings.'},
    invalidate: async (queryClient, data) => {
      const queueName = data.queue?.name ?? null;
      if (queueName === 'tradera-listings') {
        setListingBadgeStatus(queryClient, productId, 'tradera', 'queued');
      }
      if (queueName === 'playwright-programmable-listings') {
        setListingBadgeStatus(queryClient, productId, 'playwrightProgrammable', 'queued');
      }
      await invalidateProductListingsAndBadges(queryClient, productId);
    },
  });
}

export function useLinkExistingTraderaListingMutation(productId: string): CreateMutation<
  TraderaProductLinkExistingResponse,
  TraderaProductLinkExistingPayload
> {
  return createCreateMutationV2({
    mutationFn: ({ listingUrl, connectionId }: TraderaProductLinkExistingPayload) =>
      api.post<TraderaProductLinkExistingResponse>(
        `/api/v2/integrations/products/${productId}/tradera/link-existing`,
        {
          listingUrl,
          ...(connectionId ? { connectionId } : {}),
        }
      ),
    mutationKey: getProductListingsQueryKey(productId),
    meta: {
      source: 'integrations.hooks.useLinkExistingTraderaListingMutation',
      operation: 'create',
      resource: 'integrations.listings.tradera-link-existing',
      domain: 'integrations',
      mutationKey: getProductListingsQueryKey(productId),
      tags: ['integrations', 'listings', 'tradera', 'link-existing'],
      description: 'Links an existing Tradera listing to a product.',
    },
    invalidate: async (queryClient) => {
      setListingBadgeStatus(queryClient, productId, 'tradera', 'active');
      await invalidateProductListingsAndBadges(queryClient, productId);
    },
  });
}

export function useRelistTraderaMutation(productId: string): UpdateMutation<
  ProductListingRelistResponse,
  ProductListingRelistVariables
> {
  const queryClient = useQueryClient();
  const listingQueryKey = getProductListingsQueryKey(productId);

  return createCreateMutationV2({
    mutationFn: ({ listingId, browserMode }: ProductListingRelistVariables) =>
      api.post<ProductListingRelistResponse>(
        `/api/v2/integrations/products/${productId}/listings/${listingId}/relist`,
        {
          ...(browserMode ? { browserMode } : {}),
        }
      ),
    mutationKey: getProductListingsQueryKey(productId),
    meta: {
      source: 'integrations.hooks.useRelistTraderaMutation',
      operation: 'create',
      resource: 'integrations.listings.tradera-relist',
      domain: 'integrations',
      mutationKey: listingQueryKey,
      tags: ['integrations', 'listings', 'tradera', 'relist'],
      description: 'Creates integrations listings tradera relist.'},
    onMutate: async (vars): Promise<ProductListingAndJobsContext> => {
      await cancelProductListingsAndJobs(queryClient, productId);

      const previousListings =
        queryClient.getQueryData<ProductListingWithDetails[]>(listingQueryKey);
      const previousIntegrationJobs =
        queryClient.getQueryData<ProductJob[]>(integrationJobsQueryKey);

      if (previousListings) {
        queryClient.setQueryData<ProductListingWithDetails[]>(
          listingQueryKey,
          previousListings.map((listing) => {
            if (listing.id !== vars.listingId) return listing;

            const integrationSlug = normalizeIntegrationSlug(listing.integration?.slug);
            if (integrationSlug === PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG) {
              return patchQueuedPlaywrightRelist(listing, { browserMode: vars.browserMode });
            }
            if (TRADERA_INTEGRATION_SLUGS.has(integrationSlug)) {
              return patchQueuedTraderaRelist(listing, { browserMode: vars.browserMode });
            }

            return { ...listing, status: 'queued_relist', failureReason: null };
          })
        );
      }

      return { previousListings, previousIntegrationJobs };
    },
    onError: (_error, _vars, context: ProductListingAndJobsContext | undefined): void => {
      if (context?.previousListings) {
        queryClient.setQueryData(listingQueryKey, context.previousListings);
      }
      if (context?.previousIntegrationJobs) {
        queryClient.setQueryData(integrationJobsQueryKey, context.previousIntegrationJobs);
      }
    },
    invalidate: async (queryClient, data, vars) => {
      if (data.queue?.name === 'playwright-programmable-listings') {
        const queuedAt = data.queue.enqueuedAt ?? null;
        const requestId = data.queue.jobId ?? null;
        queryClient.setQueryData<ProductListingWithDetails[]>(
          listingQueryKey,
          (current) =>
            current?.map((listing) =>
              listing.id === vars.listingId
                ? patchQueuedPlaywrightRelist(listing, {
                    browserMode: vars.browserMode,
                    requestId,
                    queuedAt,
                  })
                : listing
            ) ?? current
        );
      }
      if (data.queue?.name === 'tradera-listings') {
        const queuedAt = data.queue.enqueuedAt ?? null;
        const requestId = data.queue.jobId ?? null;
        queryClient.setQueryData<ProductListingWithDetails[]>(
          listingQueryKey,
          (current) =>
            current?.map((listing) =>
              listing.id === vars.listingId
                ? patchQueuedTraderaRelist(listing, {
                    browserMode: vars.browserMode,
                    requestId,
                    queuedAt,
                  })
                : listing
            ) ?? current
        );
      }
      const queueName = data.queue?.name ?? null;
      if (queueName === 'tradera-listings') {
        setListingBadgeStatus(queryClient, productId, 'tradera', 'queued_relist');
      }
      if (queueName === 'playwright-programmable-listings') {
        setListingBadgeStatus(queryClient, productId, 'playwrightProgrammable', 'queued_relist');
      }
      await invalidateProductListingsAndBadges(queryClient, productId);
      await invalidateProducts(queryClient);
    },
  });
}

export function useSyncTraderaMutation(productId: string): UpdateMutation<
  ProductListingSyncResponse,
  ProductListingSyncVariables
> {
  const queryClient = useQueryClient();
  const listingQueryKey = getProductListingsQueryKey(productId);

  return createCreateMutationV2({
    mutationFn: ({ listingId, browserMode, skipImages }: ProductListingSyncVariables) =>
      api.post<ProductListingSyncResponse>(
        `/api/v2/integrations/products/${productId}/listings/${listingId}/sync`,
        {
          ...(browserMode ? { browserMode } : {}),
          ...(skipImages ? { skipImages } : {}),
        }
      ),
    mutationKey: getProductListingsQueryKey(productId),
    meta: {
      source: 'integrations.hooks.useSyncTraderaMutation',
      operation: 'create',
      resource: 'integrations.listings.tradera-sync',
      domain: 'integrations',
      mutationKey: listingQueryKey,
      tags: ['integrations', 'listings', 'tradera', 'sync'],
      description: 'Creates integrations listings tradera sync.',
    },
    onMutate: async (vars): Promise<ProductListingAndJobsContext> => {
      await cancelProductListingsAndJobs(queryClient, productId);

      const previousListings =
        queryClient.getQueryData<ProductListingWithDetails[]>(listingQueryKey);
      const previousIntegrationJobs =
        queryClient.getQueryData<ProductJob[]>(integrationJobsQueryKey);

      if (previousListings) {
        queryClient.setQueryData<ProductListingWithDetails[]>(
          listingQueryKey,
          previousListings.map((listing) =>
            listing.id === vars.listingId
              ? patchQueuedTraderaRelist(listing, {
                  action: 'sync',
                  browserMode: vars.browserMode,
                })
              : listing
          )
        );
      }

      return { previousListings, previousIntegrationJobs };
    },
    onError: (_error, _vars, context: ProductListingAndJobsContext | undefined): void => {
      if (context?.previousListings) {
        queryClient.setQueryData(listingQueryKey, context.previousListings);
      }
      if (context?.previousIntegrationJobs) {
        queryClient.setQueryData(integrationJobsQueryKey, context.previousIntegrationJobs);
      }
    },
    invalidate: async (queryClient, data, vars) => {
      if (data.queue?.name === 'tradera-listings') {
        const queuedAt = data.queue.enqueuedAt ?? null;
        const requestId = data.queue.jobId ?? null;
        queryClient.setQueryData<ProductListingWithDetails[]>(
          listingQueryKey,
          (current) =>
            current?.map((listing) =>
              listing.id === vars.listingId
                ? patchQueuedTraderaRelist(listing, {
                    action: 'sync',
                    browserMode: vars.browserMode,
                    requestId,
                    queuedAt,
                  })
                : listing
            ) ?? current
        );
        setListingBadgeStatus(queryClient, productId, 'tradera', 'queued_relist');
      }
      await invalidateProductListingsAndBadges(queryClient, productId);
      await invalidateProducts(queryClient);
    },
  });
}

export function useCheckTraderaStatusMutation(productId: string): UpdateMutation<
  ProductListingSyncResponse,
  ProductListingRelistVariables
> {
  const queryClient = useQueryClient();
  const listingQueryKey = getProductListingsQueryKey(productId);

  return createCreateMutationV2({
    mutationFn: ({ listingId, browserMode }: ProductListingRelistVariables) =>
      api.post<ProductListingSyncResponse>(
        `/api/v2/integrations/products/${productId}/listings/${listingId}/check-status`,
        {
          ...(browserMode ? { browserMode } : {}),
        }
      ),
    mutationKey: listingQueryKey,
    meta: {
      source: 'integrations.hooks.useCheckTraderaStatusMutation',
      operation: 'create',
      resource: 'integrations.listings.tradera-check-status',
      domain: 'integrations',
      mutationKey: listingQueryKey,
      tags: ['integrations', 'listings', 'tradera', 'check-status'],
      description: 'Creates integrations listings tradera check status.',
    },
    onMutate: async (vars): Promise<ProductListingAndJobsContext> => {
      await cancelProductListingsAndJobs(queryClient, productId);

      const previousListings =
        queryClient.getQueryData<ProductListingWithDetails[]>(listingQueryKey);
      const previousIntegrationJobs =
        queryClient.getQueryData<ProductJob[]>(integrationJobsQueryKey);

      if (previousListings) {
        queryClient.setQueryData<ProductListingWithDetails[]>(
          listingQueryKey,
          previousListings.map((listing) =>
            listing.id === vars.listingId
              ? patchQueuedTraderaStatusCheck(listing, {
                  browserMode: vars.browserMode,
                })
              : listing
          )
        );
      }

      return { previousListings, previousIntegrationJobs };
    },
    onError: (_error, _vars, context: ProductListingAndJobsContext | undefined): void => {
      if (context?.previousListings) {
        queryClient.setQueryData(listingQueryKey, context.previousListings);
      }
      if (context?.previousIntegrationJobs) {
        queryClient.setQueryData(integrationJobsQueryKey, context.previousIntegrationJobs);
      }
    },
    invalidate: async (queryClient, data, vars) => {
      if (data.queue?.name === 'tradera-listings') {
        const queuedAt = data.queue.enqueuedAt ?? null;
        const requestId = data.queue.jobId ?? null;
        queryClient.setQueryData<ProductListingWithDetails[]>(
          listingQueryKey,
          (current) =>
            current?.map((listing) =>
              listing.id === vars.listingId
                ? patchQueuedTraderaStatusCheck(listing, {
                    browserMode: vars.browserMode,
                    requestId,
                    queuedAt,
                  })
                : listing
            ) ?? current
        );
      }
      await invalidateProductListingsAndBadges(queryClient, productId);
      await invalidateProducts(queryClient);
    },
  });
}
