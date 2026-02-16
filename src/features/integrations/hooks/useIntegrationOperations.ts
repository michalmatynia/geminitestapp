'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { Dispatch, SetStateAction } from 'react';

import type { ProductWithImages } from '@/features/products';
import { api } from '@/shared/lib/api-client';
import { createListQuery } from '@/shared/lib/query-factories-v2';
import { invalidateListingBadges } from '@/shared/lib/query-invalidation';

import { listingBadgesQueryKey } from './listingCache';

type MarketplaceBadgeEntry = {
  base?: string;
  tradera?: string;
};
type ListingBadgesPayload = Record<string, MarketplaceBadgeEntry>;

const toMarketplaceEntry = (value: unknown): MarketplaceBadgeEntry =>
  value && typeof value === 'object' ? (value as MarketplaceBadgeEntry) : {};

export function useIntegrationOperations(): {
  integrationsProduct: ProductWithImages | null;
  setIntegrationsProduct: Dispatch<SetStateAction<ProductWithImages | null>>;
  showListProductModal: boolean;
  setShowListProductModal: Dispatch<SetStateAction<boolean>>;
  listProductPreset: { integrationId: string; connectionId: string } | null;
  setListProductPreset: Dispatch<SetStateAction<{ integrationId: string; connectionId: string } | null>>;
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
  const [listProductPreset, setListProductPreset] = useState<{ integrationId: string; connectionId: string } | null>(null);

  // Export settings state - opens ListProductModal directly for products with existing listings
  const [exportSettingsProduct, setExportSettingsProduct] = useState<ProductWithImages | null>(null);

  // Load listing badges using createListQuery factory
  const listingsBadgeQuery = createListQuery<MarketplaceBadgeEntry, ListingBadgesPayload>({
    queryKey: listingBadgesQueryKey,
    queryFn: async (): Promise<ListingBadgesPayload> => {
      try {
        return await api.get<ListingBadgesPayload>(
          '/api/integrations/product-listings',
          {
            cache: 'no-store',
          }
        );
      } catch {
        return {};
      }
    },
    options: {
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
          Object.values(toMarketplaceEntry(entry)).some((status) =>
            typeof status === 'string' && activeStatuses.has(status.trim().toLowerCase())
          )
        );
        return hasInFlight ? 2500 : false;
      },
      refetchIntervalInBackground: true,
    },
  });

  const payload = listingsBadgeQuery.data || {};
  const integrationBadgeStatuses = new Map<string, string>();
  const integrationBadgeIds = new Set<string>();
  const traderaBadgeStatuses = new Map<string, string>();
  const traderaBadgeIds = new Set<string>();

  for (const [productId, rawMarketplaces] of Object.entries(payload)) {
    const marketplaces = toMarketplaceEntry(rawMarketplaces);
    const baseStatus =
      typeof marketplaces?.base === 'string'
        ? marketplaces.base.trim().toLowerCase()
        : '';
    if (baseStatus) {
      integrationBadgeIds.add(productId);
      integrationBadgeStatuses.set(productId, baseStatus);
    }

    const traderaStatus =
      typeof marketplaces?.tradera === 'string'
        ? marketplaces.tradera.trim().toLowerCase()
        : '';
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
