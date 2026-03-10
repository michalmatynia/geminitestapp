'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { Dispatch, SetStateAction } from 'react';

import {
  type MarketplaceBadgeEntry,
  type ListingBadgesPayload,
} from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { invalidateListingBadges } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const listingBadgesQueryKey = QUERY_KEYS.integrations.productListingsBadges();

const toMarketplaceEntry = (value: unknown): MarketplaceBadgeEntry =>
  value && typeof value === 'object' ? (value as MarketplaceBadgeEntry) : {};

const normalizeProductIds = (productIds: readonly string[]): string[] =>
  Array.from(
    new Set(
      productIds.map((productId) => productId.trim()).filter((productId) => productId.length > 0)
    )
  ).sort();

export function useIntegrationOperations(productIds: readonly string[] = []): {
  integrationsProduct: ProductWithImages | null;
  setIntegrationsProduct: Dispatch<SetStateAction<ProductWithImages | null>>;
  showListProductModal: boolean;
  setShowListProductModal: Dispatch<SetStateAction<boolean>>;
  listProductPreset: { integrationId: string; connectionId: string } | null;
  setListProductPreset: Dispatch<
    SetStateAction<{ integrationId: string; connectionId: string } | null>
  >;
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  traderaBadgeIds: Set<string>;
  traderaBadgeStatuses: Map<string, string>;
  exportSettingsProduct: ProductWithImages | null;
  setExportSettingsProduct: Dispatch<SetStateAction<ProductWithImages | null>>;
  refreshListingBadges: () => Promise<void>;
  handleListProductSuccess: () => void;
} {
  const queryClient = useQueryClient();

  // Integrations state
  const [integrationsProduct, setIntegrationsProduct] = useState<ProductWithImages | null>(null);
  const [showListProductModal, setShowListProductModal] = useState(false);
  const [listProductPreset, setListProductPreset] = useState<{
    integrationId: string;
    connectionId: string;
  } | null>(null);

  // Export settings state - opens ListProductModal directly for products with existing listings
  const [exportSettingsProduct, setExportSettingsProduct] = useState<ProductWithImages | null>(
    null
  );
  const scopedProductIds = useMemo(() => normalizeProductIds(productIds), [productIds]);
  const scopedListingBadgesQueryKey = useMemo(
    () => [...listingBadgesQueryKey, { productIds: scopedProductIds }] as const,
    [scopedProductIds]
  );

  // Load listing badges using query factory
  const listingsBadgeQuery = createListQueryV2<MarketplaceBadgeEntry, ListingBadgesPayload>({
    queryKey: scopedListingBadgesQueryKey,
    queryFn: async (): Promise<ListingBadgesPayload> => {
      try {
        const productIdsParam = encodeURIComponent(scopedProductIds.join(','));
        return await api.get<ListingBadgesPayload>(
          `/api/v2/integrations/product-listings?productIds=${productIdsParam}`,
          {
            cache: 'no-store',
          }
        );
      } catch {
        return {};
      }
    },
    enabled: scopedProductIds.length > 0,
    retry: 1,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 5000;
      const activeStatuses = new Set([
        'queued',
        'queued_relist',
        'pending',
        'running',
        'processing',
        'in_progress',
      ]);
      const hasInFlight = Object.values(data).some((entry) =>
        Object.values(toMarketplaceEntry(entry)).some(
          (status) => typeof status === 'string' && activeStatuses.has(status.trim().toLowerCase())
        )
      );
      return hasInFlight ? 2500 : false;
    },
    refetchIntervalInBackground: true,
    meta: {
      source: 'integrations.hooks.useIntegrationOperations.listingBadges',
      operation: 'polling',
      resource: 'integrations.product-listings.badges',
      domain: 'integrations',
      queryKey: scopedListingBadgesQueryKey,
      tags: ['integrations', 'listings', 'badges'],
      description: 'Polls integrations product listings badges.'},
  });

  const payload = listingsBadgeQuery.data || {};
  const integrationBadgeStatuses = new Map<string, string>();
  const integrationBadgeIds = new Set<string>();
  const traderaBadgeStatuses = new Map<string, string>();
  const traderaBadgeIds = new Set<string>();

  for (const [productId, rawMarketplaces] of Object.entries(payload)) {
    const marketplaces = toMarketplaceEntry(rawMarketplaces);
    const baseStatus =
      typeof marketplaces?.base === 'string' ? marketplaces.base.trim().toLowerCase() : '';
    if (baseStatus) {
      integrationBadgeIds.add(productId);
      integrationBadgeStatuses.set(productId, baseStatus);
    }

    const traderaStatus =
      typeof marketplaces?.tradera === 'string' ? marketplaces.tradera.trim().toLowerCase() : '';
    if (traderaStatus) {
      traderaBadgeIds.add(productId);
      traderaBadgeStatuses.set(productId, traderaStatus);
    }
  }

  const refreshListingBadges = useCallback(async (): Promise<void> => {
    await invalidateListingBadges(queryClient);
  }, [queryClient]);

  const handleListProductSuccess = (): void => {
    setShowListProductModal(false);
    void refreshListingBadges();
  };

  return {
    integrationsProduct,
    setIntegrationsProduct,
    showListProductModal,
    setShowListProductModal,
    listProductPreset,
    setListProductPreset,
    integrationBadgeIds,
    integrationBadgeStatuses,
    traderaBadgeIds,
    traderaBadgeStatuses,
    exportSettingsProduct,
    setExportSettingsProduct,
    refreshListingBadges,
    handleListProductSuccess,
  };
}
