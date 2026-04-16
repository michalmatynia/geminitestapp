'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo, useRef } from 'react';
import { type Dispatch, type SetStateAction } from 'react';

import { type MarketplaceBadgeEntry, type ListingBadgesPayload } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { invalidateListingBadges } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { readPersistedTraderaQuickListFeedback } from '@/features/integrations/utils/traderaQuickListFeedback';
import { readPersistedVintedQuickListFeedback } from '@/features/integrations/utils/vintedQuickListFeedback';


const listingBadgesQueryKey = QUERY_KEYS.integrations.productListingsBadges();
const EMPTY_LISTING_BADGES_PAYLOAD: ListingBadgesPayload = Object.freeze({});
const LISTING_BADGE_IN_FLIGHT_REFETCH_MS = 10_000;
const LISTING_BADGE_RECONCILIATION_REFETCH_MS = 30_000;
const LISTING_BADGE_QUERY_TIMEOUT_MS = 45_000;
const LISTING_BADGE_RECONCILIATION_STATUSES = new Set([
  'failed',
  'needs_login',
  'auth_required',
  'error',
]);

type IntegrationListingBadgeState = {
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  traderaBadgeIds: Set<string>;
  traderaBadgeStatuses: Map<string, string>;
  playwrightProgrammableBadgeIds: Set<string>;
  playwrightProgrammableBadgeStatuses: Map<string, string>;
  vintedBadgeIds: Set<string>;
  vintedBadgeStatuses: Map<string, string>;
};

const EMPTY_INTEGRATION_LISTING_BADGE_STATE: IntegrationListingBadgeState = {
  integrationBadgeIds: new Set<string>(),
  integrationBadgeStatuses: new Map<string, string>(),
  traderaBadgeIds: new Set<string>(),
  traderaBadgeStatuses: new Map<string, string>(),
  playwrightProgrammableBadgeIds: new Set<string>(),
  playwrightProgrammableBadgeStatuses: new Map<string, string>(),
  vintedBadgeIds: new Set<string>(),
  vintedBadgeStatuses: new Map<string, string>(),
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
  areStringMapsEqual(previous.traderaBadgeStatuses, next.traderaBadgeStatuses) &&
  areStringSetsEqual(
    previous.playwrightProgrammableBadgeIds,
    next.playwrightProgrammableBadgeIds
  ) &&
  areStringMapsEqual(
    previous.playwrightProgrammableBadgeStatuses,
    next.playwrightProgrammableBadgeStatuses
  ) &&
  areStringSetsEqual(previous.vintedBadgeIds, next.vintedBadgeIds) &&
  areStringMapsEqual(previous.vintedBadgeStatuses, next.vintedBadgeStatuses);

const buildIntegrationListingBadgeState = (
  payload: ListingBadgesPayload
): IntegrationListingBadgeState => {
  const nextIntegrationBadgeStatuses = new Map<string, string>();
  const nextIntegrationBadgeIds = new Set<string>();
  const nextTraderaBadgeStatuses = new Map<string, string>();
  const nextTraderaBadgeIds = new Set<string>();
  const nextPlaywrightProgrammableBadgeStatuses = new Map<string, string>();
  const nextPlaywrightProgrammableBadgeIds = new Set<string>();
  const nextVintedBadgeStatuses = new Map<string, string>();
  const nextVintedBadgeIds = new Set<string>();

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

    const vintedStatus =
      typeof marketplaces?.vinted === 'string' ? marketplaces.vinted.trim().toLowerCase() : '';
    if (vintedStatus) {
      nextVintedBadgeIds.add(productId);
      nextVintedBadgeStatuses.set(productId, vintedStatus);
    }

    const playwrightProgrammableStatus =
      typeof marketplaces?.playwrightProgrammable === 'string'
        ? marketplaces.playwrightProgrammable.trim().toLowerCase()
        : '';
    if (playwrightProgrammableStatus) {
      nextPlaywrightProgrammableBadgeIds.add(productId);
      nextPlaywrightProgrammableBadgeStatuses.set(productId, playwrightProgrammableStatus);
    }
  }

  return {
    integrationBadgeIds: nextIntegrationBadgeIds,
    integrationBadgeStatuses: nextIntegrationBadgeStatuses,
    traderaBadgeIds: nextTraderaBadgeIds,
    traderaBadgeStatuses: nextTraderaBadgeStatuses,
    playwrightProgrammableBadgeIds: nextPlaywrightProgrammableBadgeIds,
    playwrightProgrammableBadgeStatuses: nextPlaywrightProgrammableBadgeStatuses,
    vintedBadgeIds: nextVintedBadgeIds,
    vintedBadgeStatuses: nextVintedBadgeStatuses,
  };
};

const hasAnyMarketplaceStatus = (payload: ListingBadgesPayload): boolean =>
  Object.values(payload).some((entry) =>
    Object.values(toMarketplaceEntry(entry)).some(
      (status) => typeof status === 'string' && status.trim().length > 0
    )
  );

const hasReconciliationCandidateStatus = (payload: ListingBadgesPayload): boolean =>
  Object.values(payload).some((entry) =>
    Object.values(toMarketplaceEntry(entry)).some(
      (status) =>
        typeof status === 'string' &&
        LISTING_BADGE_RECONCILIATION_STATUSES.has(status.trim().toLowerCase())
    )
  );

const normalizeMarketplaceBadgeStatus = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const resolveEffectiveMarketplaceBadgeStatus = (
  serverStatus: string,
  localFeedbackStatus: string
): string => {
  if (!serverStatus) return '';
  if (!LISTING_BADGE_RECONCILIATION_STATUSES.has(serverStatus)) {
    return serverStatus;
  }
  if (localFeedbackStatus === 'processing' || localFeedbackStatus === 'queued') {
    return localFeedbackStatus;
  }
  if (localFeedbackStatus === 'completed') {
    return 'active';
  }
  return serverStatus;
};

export const resolveEffectiveListingBadgesPayload = (
  payload: ListingBadgesPayload
): ListingBadgesPayload => {
  const nextPayload: ListingBadgesPayload = {};

  for (const [productId, rawMarketplaces] of Object.entries(payload)) {
    const marketplaces = toMarketplaceEntry(rawMarketplaces);
    const traderaFeedbackStatus = normalizeMarketplaceBadgeStatus(
      readPersistedTraderaQuickListFeedback(productId)?.status
    );
    const vintedFeedbackStatus = normalizeMarketplaceBadgeStatus(
      readPersistedVintedQuickListFeedback(productId)?.status
    );

    nextPayload[productId] = {
      ...marketplaces,
      ...(marketplaces.tradera
        ? {
            tradera: resolveEffectiveMarketplaceBadgeStatus(
              normalizeMarketplaceBadgeStatus(marketplaces.tradera),
              traderaFeedbackStatus
            ),
          }
        : {}),
      ...(marketplaces.vinted
        ? {
            vinted: resolveEffectiveMarketplaceBadgeStatus(
              normalizeMarketplaceBadgeStatus(marketplaces.vinted),
              vintedFeedbackStatus
            ),
          }
        : {}),
    };
  }

  return nextPayload;
};

export const resolveListingBadgeRefetchInterval = (
  payload: ListingBadgesPayload | undefined
): number | false => {
  if (!payload) return 5000;
  if (!hasAnyMarketplaceStatus(payload)) return false;

  const activeStatuses = new Set([
    'queued',
    'queued_relist',
    'pending',
    'running',
    'processing',
    'in_progress',
  ]);
  const hasInFlight = Object.values(payload).some((entry) =>
    Object.values(toMarketplaceEntry(entry)).some(
      (status) => typeof status === 'string' && activeStatuses.has(status.trim().toLowerCase())
    )
  );

  if (hasInFlight) {
    return LISTING_BADGE_IN_FLIGHT_REFETCH_MS;
  }

  // Keep a low-frequency reconciliation poll only for stale terminal failure states
  // so the Products page can self-heal after background status changes such as
  // auth_required -> active without continuously polling healthy success badges.
  return hasReconciliationCandidateStatus(payload)
    ? LISTING_BADGE_RECONCILIATION_REFETCH_MS
    : false;
};

export function useIntegrationListingBadges(
  productIds: readonly string[] = [],
  { enabled = true }: { enabled?: boolean } = {}
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
        return await api.post<ListingBadgesPayload>(
          '/api/v2/integrations/product-listings',
          { productIds: scopedProductIds },
          {
            cache: 'no-store',
            timeout: LISTING_BADGE_QUERY_TIMEOUT_MS,
          }
        );
      } catch (error) {
        logClientError(error);
        return {};
      }
    },
    enabled: enabled && scopedProductIds.length > 0,
    retry: 1,
    refetchInterval: (query) =>
      resolveListingBadgeRefetchInterval(
        query.state.data
          ? resolveEffectiveListingBadgesPayload(query.state.data)
          : query.state.data
      ),
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
      resolveEffectiveListingBadgesPayload(
        listingsBadgeQuery.data ?? EMPTY_LISTING_BADGES_PAYLOAD
      )
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
  listProductPreset:
    | { integrationId: string; connectionId: string; autoSubmit?: boolean }
    | null;
  setListProductPreset: Dispatch<
    SetStateAction<
      { integrationId: string; connectionId: string; autoSubmit?: boolean } | null
    >
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
    autoSubmit?: boolean;
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
  listProductPreset:
    | { integrationId: string; connectionId: string; autoSubmit?: boolean }
    | null;
  setListProductPreset: Dispatch<
    SetStateAction<{ integrationId: string; connectionId: string } | null>
  >;
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  traderaBadgeIds: Set<string>;
  traderaBadgeStatuses: Map<string, string>;
  playwrightProgrammableBadgeIds: Set<string>;
  playwrightProgrammableBadgeStatuses: Map<string, string>;
  vintedBadgeIds: Set<string>;
  vintedBadgeStatuses: Map<string, string>;
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
