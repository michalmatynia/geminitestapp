'use client';

import React, { useEffect, useState, useMemo } from 'react';

import {
  isBaseIntegrationSlug,
  isTraderaIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { BASE_EXPORT_RUN_PATH_ID } from '@/features/integrations/services/base-export-segments/constants';
import { useTraderaQuickListFeedback } from '@/features/integrations/hooks/useTraderaQuickListFeedback';
import { useVintedQuickListFeedback } from '@/features/integrations/hooks/useVintedQuickListFeedback';
import { useProductListings } from '@/features/integrations/hooks/useListingQueries';
import {
  areProductListingsRecoveryContextsEqual,
  createBaseRecoveryContext,
  createTraderaRecoveryContext,
  createVintedRecoveryContext,
  isBaseQuickExportRecoveryContext,
  isTraderaQuickExportRecoveryContext,
  isVintedQuickExportRecoveryContext,
  mergeProductListingsRecoveryContext,
  normalizeProductListingsIntegrationScope,
  resolveProductListingsIntegrationScope,
} from '@/features/integrations/utils/product-listings-recovery';
import { useTraderaQuickExportPolling } from '@/features/integrations/hooks/useTraderaQuickExportPolling';
import { useVintedQuickExportPolling } from '@/features/integrations/hooks/useVintedQuickExportPolling';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import type { PlaywrightRelistBrowserMode, ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ImageRetryPreset } from '@/shared/contracts/integrations/base';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { getAiPathRun, listAiPathRuns } from '@/shared/lib/ai-paths/api/client';

import { createStrictContext } from './createStrictContext';
import { useProductListingsActionsImpl } from './useProductListingsActionsImpl';
import {
  doesTraderaRecoveryContextMatchFeedback,
  doesVintedRecoveryContextMatchFeedback,
} from './ProductListingsContext.utils';
import { readPersistedTraderaQuickListFeedback } from '@/features/integrations/utils/traderaQuickListFeedback';
import { readPersistedVintedQuickListFeedback } from '@/features/integrations/utils/vintedQuickListFeedback';

const resolveIncomingRecoveryContext = (
  productId: string,
  recoveryContext: ProductListingsRecoveryContext | null | undefined
): ProductListingsRecoveryContext | null => {
  if (!recoveryContext) {
    return null;
  }

  if (isTraderaQuickExportRecoveryContext(recoveryContext)) {
    const feedback = readPersistedTraderaQuickListFeedback(productId);
    const feedbackStatus = (feedback?.status ?? '').trim().toLowerCase();
    if (
      feedback &&
      (feedbackStatus === 'processing' ||
        feedbackStatus === 'queued' ||
        feedbackStatus === 'completed') &&
      doesTraderaRecoveryContextMatchFeedback(recoveryContext, feedback)
    ) {
      return null;
    }
  }

  if (isVintedQuickExportRecoveryContext(recoveryContext)) {
    const feedback = readPersistedVintedQuickListFeedback(productId);
    const feedbackStatus = (feedback?.status ?? '').trim().toLowerCase();
    if (
      feedback &&
      (feedbackStatus === 'processing' ||
        feedbackStatus === 'queued' ||
        feedbackStatus === 'completed') &&
      doesVintedRecoveryContextMatchFeedback(recoveryContext, feedback)
    ) {
      return null;
    }
  }

  return recoveryContext;
};

const BASE_RECOVERY_TIMEOUT_MS = 15_000;

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const readTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const parseTimestamp = (value: unknown): number =>
  typeof value === 'string' && value.trim().length > 0
    ? Number.isFinite(Date.parse(value))
      ? Date.parse(value)
      : 0
    : 0;

const toAiPathRunRecord = (
  value: unknown,
  fallbackRunId?: string | null | undefined
): AiPathRunRecord | null => {
  const record = toRecord(value);
  if (!record) return null;
  const runId =
    readTrimmedString(record['id']) ??
    readTrimmedString(record['runId']) ??
    readTrimmedString(record['_id']) ??
    readTrimmedString(fallbackRunId);
  if (!runId) return null;
  return {
    ...record,
    id: runId,
    status: readTrimmedString(record['status']) ?? 'queued',
  } as AiPathRunRecord;
};

const readBaseRunMeta = (run: Pick<AiPathRunRecord, 'meta'>): Record<string, unknown> =>
  toRecord(run.meta);

const resolveBaseRunFailureReason = (run: Pick<AiPathRunRecord, 'errorMessage'>): string | null =>
  readTrimmedString(run.errorMessage);

const resolveBaseRunProductId = (
  run: Pick<AiPathRunRecord, 'entityId' | 'meta'>
): string | null => {
  const meta = readBaseRunMeta(run);
  const sourceInfo = toRecord(meta['sourceInfo']);
  return (
    readTrimmedString(run.entityId) ??
    readTrimmedString(meta['productId']) ??
    readTrimmedString(sourceInfo['productId'])
  );
};

const resolveBaseRunConnectionId = (run: Pick<AiPathRunRecord, 'meta'>): string | null => {
  const meta = readBaseRunMeta(run);
  const sourceInfo = toRecord(meta['sourceInfo']);
  return readTrimmedString(meta['connectionId']) ?? readTrimmedString(sourceInfo['connectionId']);
};

const resolveBaseRunRequestId = (run: Pick<AiPathRunRecord, 'requestId' | 'meta'>): string | null => {
  const meta = readBaseRunMeta(run);
  const sourceInfo = toRecord(meta['sourceInfo']);
  return (
    readTrimmedString(run.requestId) ??
    readTrimmedString(meta['requestId']) ??
    readTrimmedString(sourceInfo['requestId'])
  );
};

const resolveBaseRunSortTimestamp = (
  run: Pick<AiPathRunRecord, 'updatedAt' | 'finishedAt' | 'startedAt' | 'createdAt'>
): number =>
  parseTimestamp(run.updatedAt) ||
  parseTimestamp(run.finishedAt) ||
  parseTimestamp(run.startedAt) ||
  parseTimestamp(run.createdAt);

const choosePreferredBaseRecoveryRun = (args: {
  runs: unknown[];
  productId: string;
  connectionId?: string | null | undefined;
}): AiPathRunRecord | null => {
  const normalizedConnectionId = readTrimmedString(args.connectionId);
  const candidates = args.runs
    .flatMap((candidate): AiPathRunRecord[] => {
      const run = toAiPathRunRecord(candidate);
      return run ? [run] : [];
    })
    .filter((run) => resolveBaseRunProductId(run) === args.productId)
    .sort((left, right) => {
      const connectionScore =
        normalizedConnectionId === null
          ? 0
          : Number(resolveBaseRunConnectionId(right) === normalizedConnectionId) -
            Number(resolveBaseRunConnectionId(left) === normalizedConnectionId);
      if (connectionScore !== 0) return connectionScore;
      return resolveBaseRunSortTimestamp(right) - resolveBaseRunSortTimestamp(left);
    });

  return candidates[0] ?? null;
};

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
  checkingTraderaStatusListing: string | null;
  relistingListing: string | null;
  relistingBrowserMode: PlaywrightRelistBrowserMode | null;
  openingTraderaLogin: string | null;
  openingVintedLogin: string | null;
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
      browserMode?: PlaywrightRelistBrowserMode;
      skipImages?: boolean;
    }
  ) => Promise<void>;
  handleCheckTraderaStatus: (
    listingId: string,
    options?: {
      skipSessionPreflight?: boolean;
      browserMode?: PlaywrightRelistBrowserMode;
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
  handleRecoverTraderaListing: (options: {
    listingId: string;
    integrationId: string;
    connectionId: string;
    action: 'relist' | 'sync' | 'check_status';
    browserMode?: PlaywrightRelistBrowserMode;
    skipImages?: boolean;
  }) => Promise<boolean>;
  handleOpenVintedLogin: (
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
  const [checkingTraderaStatusListing, setCheckingTraderaStatusListing] =
    useState<string | null>(null);
  const [relistingListing, setRelistingListing] = useState<string | null>(null);
  const [relistingBrowserMode, setRelistingBrowserMode] =
    useState<PlaywrightRelistBrowserMode | null>(null);
  const [openingTraderaLogin, setOpeningTraderaLogin] = useState<string | null>(null);
  const [openingVintedLogin, setOpeningVintedLogin] = useState<string | null>(null);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [listingToPurge, setListingToPurge] = useState<string | null>(null);
  const [isSyncImagesConfirmOpen, setIsSyncImagesConfirmOpen] = useState(false);
  const [resolvedRecoveryContext, setResolvedRecoveryContext] =
    useState<ProductListingsRecoveryContext | null>(() =>
      resolveIncomingRecoveryContext(product.id, recoveryContext ?? null)
    );
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
      const nextRecoveryContext = mergeProductListingsRecoveryContext(
        resolveIncomingRecoveryContext(product.id, recoveryContext ?? null),
        current
      );
      return areProductListingsRecoveryContextsEqual(current, nextRecoveryContext)
        ? current
        : nextRecoveryContext;
    });
  }, [product.id, recoveryContext]);

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
  const explicitFilterScope = normalizeProductListingsIntegrationScope(filterIntegrationSlug);
  const incomingRecoveryScope = normalizeProductListingsIntegrationScope(
    recoveryContext?.integrationSlug
  );
  const allowTraderaRecoveryHydration =
    explicitFilterScope !== null
      ? isTraderaIntegrationSlug(explicitFilterScope)
      : incomingRecoveryScope !== null
        ? isTraderaIntegrationSlug(incomingRecoveryScope)
        : true;
  const allowVintedRecoveryHydration =
    explicitFilterScope !== null
      ? isVintedIntegrationSlug(explicitFilterScope)
      : incomingRecoveryScope !== null
        ? isVintedIntegrationSlug(incomingRecoveryScope)
        : true;
  const allowBaseRecoveryHydration =
    explicitFilterScope !== null
      ? isBaseIntegrationSlug(explicitFilterScope)
      : incomingRecoveryScope !== null
        ? isBaseIntegrationSlug(incomingRecoveryScope)
        : true;

  useEffect(() => {
    if (!allowTraderaRecoveryHydration) {
      return;
    }

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
    allowTraderaRecoveryHydration,
    traderaQuickListFeedback,
    traderaQuickListFeedback?.connectionId,
    traderaQuickListFeedback?.failureReason,
    traderaQuickListFeedback?.integrationId,
    traderaQuickListFeedback?.requestId,
    traderaQuickListFeedback?.runId,
    traderaQuickListFeedback?.status,
  ]);

  useEffect(() => {
    if (!allowVintedRecoveryHydration) {
      return;
    }

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
    allowVintedRecoveryHydration,
    vintedQuickListFeedback,
    vintedQuickListFeedback?.connectionId,
    vintedQuickListFeedback?.failureReason,
    vintedQuickListFeedback?.integrationId,
    vintedQuickListFeedback?.requestId,
    vintedQuickListFeedback?.runId,
    vintedQuickListFeedback?.status,
  ]);

  useEffect(() => {
    const baseRecoveryContext = isBaseQuickExportRecoveryContext(resolvedRecoveryContext)
      ? resolvedRecoveryContext
      : null;
    if (!allowBaseRecoveryHydration || !baseRecoveryContext) {
      return;
    }

    if (readTrimmedString(baseRecoveryContext.failureReason)) {
      return;
    }

    const abortController = new AbortController();
    let active = true;

    void (async () => {
      let recoveredRun: AiPathRunRecord | null = null;
      const currentRunId = readTrimmedString(baseRecoveryContext.runId);

      if (currentRunId) {
        const runResponse = await getAiPathRun(currentRunId, {
          timeoutMs: BASE_RECOVERY_TIMEOUT_MS,
          signal: abortController.signal,
          cache: 'no-store',
        }).catch(() => null);
        if (!active || abortController.signal.aborted) return;
        if (runResponse?.ok) {
          recoveredRun = toAiPathRunRecord(runResponse.data.run, currentRunId);
        }
      }

      if (!recoveredRun || !resolveBaseRunFailureReason(recoveredRun)) {
        const runListResponse = await listAiPathRuns({
          pathId: BASE_EXPORT_RUN_PATH_ID,
          status: 'failed',
          query: product.id,
          limit: 10,
          includeTotal: false,
          fresh: true,
          timeoutMs: BASE_RECOVERY_TIMEOUT_MS,
          signal: abortController.signal,
        }).catch(() => null);
        if (!active || abortController.signal.aborted) return;
        if (runListResponse?.ok) {
          const listedRun = choosePreferredBaseRecoveryRun({
            runs: runListResponse.data.runs,
            productId: product.id,
            connectionId: baseRecoveryContext.connectionId,
          });
          if (listedRun) {
            recoveredRun =
              recoveredRun && resolveBaseRunFailureReason(recoveredRun) ? recoveredRun : listedRun;
          }
        }
      }

      if (!recoveredRun) {
        return;
      }

      const nextRecoveryContext = createBaseRecoveryContext({
        status: readTrimmedString(recoveredRun.status) ?? baseRecoveryContext.status ?? 'failed',
        runId: recoveredRun.id,
        failureReason: resolveBaseRunFailureReason(recoveredRun),
        requestId: baseRecoveryContext.requestId ?? resolveBaseRunRequestId(recoveredRun),
        integrationId: baseRecoveryContext.integrationId ?? null,
        connectionId: baseRecoveryContext.connectionId ?? resolveBaseRunConnectionId(recoveredRun),
      });

      setResolvedRecoveryContext((current) => {
        if (!isBaseQuickExportRecoveryContext(current)) {
          return current;
        }

        const mergedRecoveryContext = mergeProductListingsRecoveryContext(
          nextRecoveryContext,
          current
        );
        return areProductListingsRecoveryContextsEqual(current, mergedRecoveryContext)
          ? current
          : mergedRecoveryContext;
      });
    })();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [
    allowBaseRecoveryHydration,
    product.id,
    resolvedRecoveryContext,
  ]);

  const actions = useProductListingsActionsImpl({
    inventoryOverrides,
    lastExportListingId,
    listings,
    onListingsUpdated,
    productCategoryId: product.categoryId,
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
    setOpeningVintedLogin,
    setRecoveryContext: setResolvedRecoveryContext,
    setRelistingBrowserMode,
    setPurgingListing,
    setRelistingListing,
    setSavingInventoryId,
    setCheckingTraderaStatusListing,
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
      checkingTraderaStatusListing,
      relistingListing,
      relistingBrowserMode,
      openingTraderaLogin,
      openingVintedLogin,
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
      checkingTraderaStatusListing,
      relistingListing,
      relistingBrowserMode,
      openingTraderaLogin,
      openingVintedLogin,
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
