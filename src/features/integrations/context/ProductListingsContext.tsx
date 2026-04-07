'use client';

import React, { useEffect, useState, useMemo } from 'react';

import { useTraderaQuickListFeedback } from '@/features/integrations/hooks/useTraderaQuickListFeedback';
import { useVintedQuickListFeedback } from '@/features/integrations/hooks/useVintedQuickListFeedback';
import { useProductListings } from '@/features/integrations/hooks/useListingQueries';
import {
  areProductListingsRecoveryContextsEqual,
  createTraderaRecoveryContext,
  createVintedRecoveryContext,
  mergeProductListingsRecoveryContext,
  resolveProductListingsIntegrationScope,
} from '@/features/integrations/utils/product-listings-recovery';
import { useTraderaQuickExportPolling } from '@/features/integrations/hooks/useTraderaQuickExportPolling';
import { useVintedQuickExportPolling } from '@/features/integrations/hooks/useVintedQuickExportPolling';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import type { PlaywrightRelistBrowserMode, ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ImageRetryPreset } from '@/shared/contracts/integrations/base';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { createStrictContext } from './createStrictContext';
import { useProductListingsActionsImpl } from './useProductListingsActionsImpl';
import {
  doesTraderaRecoveryContextMatchFeedback,
  doesVintedRecoveryContextMatchFeedback,
} from './ProductListingsContext.utils';

// --- Granular Contexts ---

export interface ProductListingsData {
  product: ProductWithImages;
  listings: ProductListingWithDetails[];
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}
export const { Context: DataContext, useValue: useProductListingsData } =
  createStrictContext<ProductListingsData>({
    displayName: 'ProductListingsDataContext',
    errorMessage: 'useProductListingsData must be used within ProductListingsProvider',
  });

export interface ProductListingsUIState {
  deletingFromBase: string | null;
  purgingListing: string | null;
  exportingListing: string | null;
  savingInventoryId: string | null;
  syncingImages: string | null;
  syncingTraderaListing: string | null;
  relistingListing: string | null;
  relistingBrowserMode: PlaywrightRelistBrowserMode | null;
  openingTraderaLogin: string | null;
  inventoryOverrides: Record<string, string>;
  setInventoryOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  historyOpenByListing: Record<string, boolean>;
  setHistoryOpenByListing: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}
export const { Context: UIStateContext, useValue: useProductListingsUIState } =
  createStrictContext<ProductListingsUIState>({
    displayName: 'ProductListingsUIStateContext',
    errorMessage: 'useProductListingsUIState must be used within ProductListingsProvider',
  });

export interface ProductListingsModals {
  listingToDelete: string | null;
  setListingToDelete: (id: string | null) => void;
  listingToPurge: string | null;
  setListingToPurge: (id: string | null) => void;
  isSyncImagesConfirmOpen: boolean;
  setIsSyncImagesConfirmOpen: (open: boolean) => void;
  onClose: () => void;
  onStartListing?:
    | ((
        integrationId: string,
        connectionId: string,
        options?: { autoSubmit?: boolean }
      ) => void)
    | undefined;
  filterIntegrationSlug?: string | null | undefined;
  recoveryContext?: ProductListingsRecoveryContext | null | undefined;
  setRecoveryContext: React.Dispatch<React.SetStateAction<ProductListingsRecoveryContext | null>>;
}
export const { Context: ModalsContext, useValue: useProductListingsModals } =
  createStrictContext<ProductListingsModals>({
    displayName: 'ProductListingsModalsContext',
    errorMessage: 'useProductListingsModals must be used within ProductListingsProvider',
  });

export interface ProductListingsLogs {
  exportLogs: CapturedLog[];
  logsOpen: boolean;
  setLogsOpen: (open: boolean) => void;
  lastExportListingId: string | null;
}
export const { Context: LogsContext, useValue: useProductListingsLogs } =
  createStrictContext<ProductListingsLogs>({
    displayName: 'ProductListingsLogsContext',
    errorMessage: 'useProductListingsLogs must be used within ProductListingsProvider',
  });

export interface ProductListingsActions {
  handleDeleteFromBase: (listingId: string) => Promise<void>;
  handlePurgeListing: (listingId: string) => Promise<void>;
  handleSaveInventoryId: (listingId: string) => Promise<void>;
  handleSyncBaseImages: (baseListing: ProductListingWithDetails | null) => Promise<void>;
  handleSyncTradera: (
    listingId: string,
    options?: {
      integrationId?: string | null;
      connectionId?: string | null;
      skipSessionPreflight?: boolean;
    }
  ) => Promise<void>;
  handleRelistTradera: (
    listingId: string,
    options?: {
      skipSessionPreflight?: boolean;
      browserMode?: PlaywrightRelistBrowserMode;
    }
  ) => Promise<void>;
  handleOpenTraderaLogin: (
    listingId: string,
    integrationId: string,
    connectionId: string
  ) => Promise<boolean>;
  handleExportAgain: (listingId: string) => Promise<void>;
  handleExportImagesOnly: (listingId: string, preset?: ImageRetryPreset) => Promise<void>;
  handleImageRetry: (preset: ImageRetryPreset) => Promise<void>;
  refetchListings: () => Promise<void>;
}
export const { Context: ActionsContext, useValue: useProductListingsActions } =
  createStrictContext<ProductListingsActions>({
    displayName: 'ProductListingsActionsContext',
    errorMessage: 'useProductListingsActions must be used within ProductListingsProvider',
  });

export function ProductListingsProvider({
  product,
  children,
  onListingsUpdated,
  onClose,
  onStartListing,
  filterIntegrationSlug,
  recoveryContext,
}: {
  product: ProductWithImages;
  children: React.ReactNode;
  onListingsUpdated?: (() => void) | undefined;
  onClose: () => void;
  onStartListing?:
    | ((
        integrationId: string,
        connectionId: string,
        options?: { autoSubmit?: boolean }
      ) => void)
    | undefined;
  filterIntegrationSlug?: string | null | undefined;
  recoveryContext?: ProductListingsRecoveryContext | null | undefined;
}): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [deletingFromBase, setDeletingFromBase] = useState<string | null>(null);
  const [purgingListing, setPurgingListing] = useState<string | null>(null);
  const [exportingListing, setExportingListing] = useState<string | null>(null);
  const [inventoryOverrides, setInventoryOverrides] = useState<Record<string, string>>({});
  const [savingInventoryId, setSavingInventoryId] = useState<string | null>(null);
  const [historyOpenByListing, setHistoryOpenByListing] = useState<Record<string, boolean>>({});
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState<boolean>(false);
  const [lastExportListingId, setLastExportListingId] = useState<string | null>(null);
  const [syncingImages, setSyncingImages] = useState<string | null>(null);
  const [syncingTraderaListing, setSyncingTraderaListing] = useState<string | null>(null);
  const [relistingListing, setRelistingListing] = useState<string | null>(null);
  const [relistingBrowserMode, setRelistingBrowserMode] =
    useState<PlaywrightRelistBrowserMode | null>(null);
  const [openingTraderaLogin, setOpeningTraderaLogin] = useState<string | null>(null);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [listingToPurge, setListingToPurge] = useState<string | null>(null);
  const [isSyncImagesConfirmOpen, setIsSyncImagesConfirmOpen] = useState(false);
  const [resolvedRecoveryContext, setResolvedRecoveryContext] =
    useState<ProductListingsRecoveryContext | null>(recoveryContext ?? null);
  const {
    feedback: traderaQuickListFeedback,
    setFeedbackStatus: setTraderaQuickListFeedbackStatus,
  } = useTraderaQuickListFeedback(product.id);
  const {
    feedback: vintedQuickListFeedback,
    setFeedbackStatus: setVintedQuickListFeedbackStatus,
  } = useVintedQuickListFeedback(product.id);

  useEffect(() => {
    setResolvedRecoveryContext((current) => {
      const nextRecoveryContext = mergeProductListingsRecoveryContext(recoveryContext ?? null, current);
      return areProductListingsRecoveryContextsEqual(current, nextRecoveryContext)
        ? current
        : nextRecoveryContext;
    });
  }, [recoveryContext]);

  const resolvedFilterIntegrationSlug = useMemo(
    () =>
      resolveProductListingsIntegrationScope({
        filterIntegrationSlug,
        recoveryContext: resolvedRecoveryContext,
      }),
    [filterIntegrationSlug, resolvedRecoveryContext]
  );

  const listingsQuery = useProductListings(product.id);
  const listings = listingsQuery.data ?? [];
  const isListingsLoading =
    listingsQuery.isLoading || (listingsQuery.isFetching && listings.length === 0);

  useTraderaQuickExportPolling(
    product.id,
    traderaQuickListFeedback,
    setTraderaQuickListFeedbackStatus
  );
  useVintedQuickExportPolling(
    product.id,
    vintedQuickListFeedback,
    setVintedQuickListFeedbackStatus
  );

  useEffect(() => {
    if (!traderaQuickListFeedback) {
      return;
    }

    const feedbackStatus = (traderaQuickListFeedback.status ?? '').trim().toLowerCase();

    if (feedbackStatus === 'auth_required' || feedbackStatus === 'failed') {
      const nextRecoveryContext = createTraderaRecoveryContext({
        status: traderaQuickListFeedback.status,
        runId: traderaQuickListFeedback.runId ?? null,
        failureReason: traderaQuickListFeedback.failureReason ?? null,
        requestId: traderaQuickListFeedback.requestId ?? null,
        integrationId: traderaQuickListFeedback.integrationId ?? null,
        connectionId: traderaQuickListFeedback.connectionId ?? null,
      });

      setResolvedRecoveryContext((current) => {
        const mergedRecoveryContext = mergeProductListingsRecoveryContext(
          nextRecoveryContext,
          current
        );
        return areProductListingsRecoveryContextsEqual(current, mergedRecoveryContext)
          ? current
          : mergedRecoveryContext;
      });
      return;
    }

    if (
      feedbackStatus === 'processing' ||
      feedbackStatus === 'queued' ||
      feedbackStatus === 'completed'
    ) {
      setResolvedRecoveryContext((current) => {
        if (!doesTraderaRecoveryContextMatchFeedback(current, traderaQuickListFeedback)) {
          return current;
        }
        return null;
      });
    }
  }, [
    traderaQuickListFeedback,
    traderaQuickListFeedback?.connectionId,
    traderaQuickListFeedback?.failureReason,
    traderaQuickListFeedback?.integrationId,
    traderaQuickListFeedback?.requestId,
    traderaQuickListFeedback?.runId,
    traderaQuickListFeedback?.status,
  ]);

  useEffect(() => {
    if (!vintedQuickListFeedback) {
      return;
    }

    const feedbackStatus = (vintedQuickListFeedback.status ?? '').trim().toLowerCase();

    if (feedbackStatus === 'auth_required' || feedbackStatus === 'failed') {
      const nextRecoveryContext = createVintedRecoveryContext({
        status: vintedQuickListFeedback.status,
        runId: vintedQuickListFeedback.runId ?? null,
        failureReason: vintedQuickListFeedback.failureReason ?? null,
        requestId: vintedQuickListFeedback.requestId ?? null,
        integrationId: vintedQuickListFeedback.integrationId ?? null,
        connectionId: vintedQuickListFeedback.connectionId ?? null,
      });

      setResolvedRecoveryContext((current) => {
        const mergedRecoveryContext = mergeProductListingsRecoveryContext(
          nextRecoveryContext,
          current
        );
        return areProductListingsRecoveryContextsEqual(current, mergedRecoveryContext)
          ? current
          : mergedRecoveryContext;
      });
      return;
    }

    if (
      feedbackStatus === 'processing' ||
      feedbackStatus === 'queued' ||
      feedbackStatus === 'completed'
    ) {
      setResolvedRecoveryContext((current) => {
        if (!doesVintedRecoveryContextMatchFeedback(current, vintedQuickListFeedback)) {
          return current;
        }
        return null;
      });
    }
  }, [
    vintedQuickListFeedback,
    vintedQuickListFeedback?.connectionId,
    vintedQuickListFeedback?.failureReason,
    vintedQuickListFeedback?.integrationId,
    vintedQuickListFeedback?.requestId,
    vintedQuickListFeedback?.runId,
    vintedQuickListFeedback?.status,
  ]);

  const actions = useProductListingsActionsImpl({
    inventoryOverrides,
    lastExportListingId,
    listings,
    onListingsUpdated,
    productId: product.id,
    refetchListingsQuery: listingsQuery.refetch,
    setDeletingFromBase,
    setError,
    setExportingListing,
    setExportLogs,
    setInventoryOverrides,
    setIsSyncImagesConfirmOpen,
    setLastExportListingId,
    setListingToDelete,
    setListingToPurge,
    setLogsOpen,
    setOpeningTraderaLogin,
    setRecoveryContext: setResolvedRecoveryContext,
    setRelistingBrowserMode,
    setPurgingListing,
    setRelistingListing,
    setSavingInventoryId,
    setSyncingImages,
    setSyncingTraderaListing,
  });

  const dataValue = useMemo<ProductListingsData>(
    () => ({
      product,
      listings,
      isLoading: isListingsLoading,
      error,
      setError,
    }),
    [product, listings, isListingsLoading, error]
  );

  const uiStateValue = useMemo<ProductListingsUIState>(
    () => ({
      deletingFromBase,
      purgingListing,
      exportingListing,
      savingInventoryId,
      syncingImages,
      syncingTraderaListing,
      relistingListing,
      relistingBrowserMode,
      openingTraderaLogin,
      inventoryOverrides,
      setInventoryOverrides,
      historyOpenByListing,
      setHistoryOpenByListing,
    }),
    [
      deletingFromBase,
      purgingListing,
      exportingListing,
      savingInventoryId,
      syncingImages,
      syncingTraderaListing,
      relistingListing,
      relistingBrowserMode,
      openingTraderaLogin,
      inventoryOverrides,
      historyOpenByListing,
    ]
  );

  const modalsValue = useMemo<ProductListingsModals>(
    () => ({
      listingToDelete,
      setListingToDelete,
      listingToPurge,
      setListingToPurge,
      isSyncImagesConfirmOpen,
      setIsSyncImagesConfirmOpen,
      onClose,
      onStartListing,
      filterIntegrationSlug: resolvedFilterIntegrationSlug,
      recoveryContext: resolvedRecoveryContext,
      setRecoveryContext: setResolvedRecoveryContext,
    }),
    [
      listingToDelete,
      listingToPurge,
      isSyncImagesConfirmOpen,
      onClose,
      onStartListing,
      resolvedRecoveryContext,
      resolvedFilterIntegrationSlug,
    ]
  );

  const logsValue = useMemo<ProductListingsLogs>(
    () => ({
      exportLogs,
      logsOpen,
      setLogsOpen,
      lastExportListingId,
    }),
    [exportLogs, logsOpen, lastExportListingId]
  );

  const actionsValue = useMemo<ProductListingsActions>(
    () => actions,
    [actions]
  );

  return (
    <DataContext.Provider value={dataValue}>
      <UIStateContext.Provider value={uiStateValue}>
        <ModalsContext.Provider value={modalsValue}>
          <LogsContext.Provider value={logsValue}>
            <ActionsContext.Provider value={actionsValue}>{children}</ActionsContext.Provider>
          </LogsContext.Provider>
        </ModalsContext.Provider>
      </UIStateContext.Provider>
    </DataContext.Provider>
  );
}
