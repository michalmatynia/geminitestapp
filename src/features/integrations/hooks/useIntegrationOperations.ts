'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo, useRef } from 'react';
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
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const listingBadgesQueryKey = QUERY_KEYS.integrations.productListingsBadges();
const EMPTY_LISTING_BADGES_PAYLOAD: ListingBadgesPayload = Object.freeze({});

type IntegrationListingBadgeState = {
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  traderaBadgeIds: Set<string>;
  traderaBadgeStatuses: Map<string, string>;
};

const EMPTY_INTEGRATION_LISTING_BADGE_STATE: IntegrationListingBadgeState = {
  integrationBadgeIds: new Set<string>(),
  integrationBadgeStatuses: new Map<string, string>(),
  traderaBadgeIds: new Set<string>(),
  traderaBadgeStatuses: new Map<string, string>(),
};

const toMarketplaceEntry = (value: unknown): MarketplaceBadgeEntry =>
  value && typeof value === 'object' ? (value as MarketplaceBadgeEntry) : {};

const normalizeProductIds = (productIds: readonly string[]): string[] =>
  Array.from(
    new Set(
      productIds.map((productId) => productId.trim()).filter((productId) => productId.length > 0)
    )
  ).sort();

const areStringSetsEqual = (
  previous: ReadonlySet<string>,
  next: ReadonlySet<string>
): boolean => {
  if (previous.size !== next.size) return false;
  for (const value of next) {
    if (!previous.has(value)) return false;
  }
  return true;
};

const areStringMapsEqual = (
  previous: ReadonlyMap<string, string>,
  next: ReadonlyMap<string, string>
): boolean => {
  if (previous.size !== next.size) return false;
  for (const [key, value] of next) {
    if (previous.get(key) !== value) return false;
  }
  return true;
};

const areIntegrationListingBadgeStatesEqual = (
  previous: IntegrationListingBadgeState,
  next: IntegrationListingBadgeState
): boolean =>
  areStringSetsEqual(previous.integrationBadgeIds, next.integrationBadgeIds) &&
  areStringMapsEqual(previous.integrationBadgeStatuses, next.integrationBadgeStatuses) &&
  areStringSetsEqual(previous.traderaBadgeIds, next.traderaBadgeIds) &&
  areStringMapsEqual(previous.traderaBadgeStatuses, next.traderaBadgeStatuses);

const buildIntegrationListingBadgeState = (
  payload: ListingBadgesPayload
): IntegrationListingBadgeState => {
  const nextIntegrationBadgeStatuses = new Map<string, string>();
  const nextIntegrationBadgeIds = new Set<string>();
  const nextTraderaBadgeStatuses = new Map<string, string>();
  const nextTraderaBadgeIds = new Set<string>();

  for (const [productId, rawMarketplaces] of Object.entries(payload)) {
    const marketplaces = toMarketplaceEntry(rawMarketplaces);
    const baseStatus =
      typeof marketplaces?.base === 'string' ? marketplaces.base.trim().toLowerCase() : '';
    if (baseStatus) {
      nextIntegrationBadgeIds.add(productId);
      nextIntegrationBadgeStatuses.set(productId, baseStatus);
    }

    const traderaStatus =
      typeof marketplaces?.tradera === 'string' ? marketplaces.tradera.trim().toLowerCase() : '';
    if (traderaStatus) {
      nextTraderaBadgeIds.add(productId);
      nextTraderaBadgeStatuses.set(productId, traderaStatus);
    }
  }

  return {
    integrationBadgeIds: nextIntegrationBadgeIds,
    integrationBadgeStatuses: nextIntegrationBadgeStatuses,
    traderaBadgeIds: nextTraderaBadgeIds,
    traderaBadgeStatuses: nextTraderaBadgeStatuses,
  };
};

export function useIntegrationListingBadges(
  productIds: readonly string[] = []
): IntegrationListingBadgeState {
  const scopedProductIds = useMemo(() => normalizeProductIds(productIds), [productIds]);
  const scopedListingBadgesQueryKey = useMemo(
    () => [...listingBadgesQueryKey, { productIds: scopedProductIds }] as const,
    [scopedProductIds]
  );
  const badgeStateRef = useRef<IntegrationListingBadgeState>(EMPTY_INTEGRATION_LISTING_BADGE_STATE);

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
      } catch (error) {
        logClientError(error);
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
      return hasInFlight ? 10_000 : false;
    },
    refetchIntervalInBackground: false,
    meta: {
      source: 'integrations.hooks.useIntegrationListingBadges',
      operation: 'polling',
      resource: 'integrations.product-listings.badges',
      domain: 'integrations',
      queryKey: scopedListingBadgesQueryKey,
      tags: ['integrations', 'listings', 'badges'],
      description: 'Polls integrations product listings badges.'},
  });

  return useMemo(() => {
    const nextState = buildIntegrationListingBadgeState(
      listingsBadgeQuery.data ?? EMPTY_LISTING_BADGES_PAYLOAD
    );
    if (areIntegrationListingBadgeStatesEqual(badgeStateRef.current, nextState)) {
      return badgeStateRef.current;
    }

    badgeStateRef.current = nextState;
    return nextState;
  }, [listingsBadgeQuery.data]);
}

export function useIntegrationModalOperations(): {
  integrationsProduct: ProductWithImages | null;
  setIntegrationsProduct: Dispatch<SetStateAction<ProductWithImages | null>>;
  showListProductModal: boolean;
  setShowListProductModal: Dispatch<SetStateAction<boolean>>;
  listProductPreset: { integrationId: string; connectionId: string } | null;
  setListProductPreset: Dispatch<
    SetStateAction<{ integrationId: string; connectionId: string } | null>
  >;
  exportSettingsProduct: ProductWithImages | null;
  setExportSettingsProduct: Dispatch<SetStateAction<ProductWithImages | null>>;
  refreshListingBadges: () => Promise<void>;
  handleListProductSuccess: () => void;
} {
  const queryClient = useQueryClient();

  const [integrationsProduct, setIntegrationsProduct] = useState<ProductWithImages | null>(null);
  const [showListProductModal, setShowListProductModal] = useState(false);
  const [listProductPreset, setListProductPreset] = useState<{
    integrationId: string;
    connectionId: string;
  } | null>(null);
  const [exportSettingsProduct, setExportSettingsProduct] = useState<ProductWithImages | null>(
    null
  );

  const refreshListingBadges = useCallback(async (): Promise<void> => {
    await invalidateListingBadges(queryClient);
  }, [queryClient]);

  const handleListProductSuccess = useCallback((): void => {
    setShowListProductModal(false);
    void refreshListingBadges();
  }, [refreshListingBadges]);

  return {
    integrationsProduct,
    setIntegrationsProduct,
    showListProductModal,
    setShowListProductModal,
    listProductPreset,
    setListProductPreset,
    exportSettingsProduct,
    setExportSettingsProduct,
    refreshListingBadges,
    handleListProductSuccess,
  };
}

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
  const badgeState = useIntegrationListingBadges(productIds);
  const modalOperations = useIntegrationModalOperations();

  return {
    ...modalOperations,
    ...badgeState,
  };
}
