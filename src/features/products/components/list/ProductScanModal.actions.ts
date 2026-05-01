import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import {
  invalidateProductScans,
  invalidateProductsAndCounts,
  invalidateProductsAndDetail,
} from '@/shared/lib/query-invalidation';
import type { SafeTimerId } from '@/shared/lib/timers';

import { useProductScanAmazonCandidateExtraction } from './ProductScanModal.amazon-extraction';
import {
  useProductScanPollingControls,
  useProductScanStopPolling,
} from './ProductScanModal.polling';
import { useProductScanModalRefreshRows } from './ProductScanModal.refresh';
import type {
  ProductScanModalConfig,
  ProductScanModalProvider,
  ScanModalRow,
} from './ProductScanModal.types';

type ToastVariant = 'success' | 'warning' | 'error' | 'info';
type ProductScanToast = (message: string, options?: { variant?: ToastVariant }) => void;
type RefreshSessionResult = { ok: boolean; message: string };
type RefreshFailureHandler = (
  error: unknown,
  options?: { stopPolling?: boolean; sessionId?: number }
) => void;

type Refresh1688SessionInput = {
  active1688ConnectionId: string | null;
  active1688IntegrationId: string | null;
  active1688ProfileName: string | null;
};

type ProductScanModalActionsInput = {
  active1688ConnectionId: string | null;
  active1688IntegrationId: string | null;
  active1688ProfileName: string | null;
  ensurePollingForTrackedActiveRowsRef: MutableRefObject<(sessionId?: number) => void>;
  handle1688RefreshSessionRef: MutableRefObject<() => Promise<RefreshSessionResult>>;
  handleRefreshFailureRef: MutableRefObject<RefreshFailureHandler>;
  missingScanRecordMessage: string;
  modalConfig: ProductScanModalConfig;
  modalSessionRef: MutableRefObject<number>;
  pollTimerRef: MutableRefObject<SafeTimerId | null>;
  provider: ProductScanModalProvider;
  queryClient: QueryClient;
  refresh1688Session: (sessionInput: Refresh1688SessionInput) => Promise<RefreshSessionResult>;
  refreshScanRowsRef: MutableRefObject<(sessionId?: number) => Promise<void>>;
  rowsRef: MutableRefObject<ScanModalRow[]>;
  setExtractingCandidateUrlsByProductId: Dispatch<SetStateAction<Record<string, string | null>>>;
  setIsPolling: Dispatch<SetStateAction<boolean>>;
  setRows: Dispatch<SetStateAction<ScanModalRow[]>>;
  startPollingRef: MutableRefObject<(sessionId?: number) => void>;
  stopPollingRef: MutableRefObject<() => void>;
  toast: ProductScanToast;
};

type ProductScanModalActions = {
  handle1688RefreshSession: () => Promise<RefreshSessionResult>;
  handleExtractAmazonCandidate: ReturnType<typeof useProductScanAmazonCandidateExtraction>;
  handleManualRefresh: () => void;
  invalidateProductViews: (productId: string) => Promise<void>;
  refreshScanRows: (sessionId?: number) => Promise<void>;
  stopPolling: () => void;
};

const useProductScan1688RefreshHandler = (
  input: Pick<
    ProductScanModalActionsInput,
    'active1688ConnectionId' | 'active1688IntegrationId' | 'active1688ProfileName' | 'refresh1688Session'
  >
): (() => Promise<RefreshSessionResult>) => {
  const {
    active1688ConnectionId,
    active1688IntegrationId,
    active1688ProfileName,
    refresh1688Session,
  } = input;

  return useCallback(
    (): Promise<RefreshSessionResult> =>
      refresh1688Session({
        active1688ConnectionId,
        active1688IntegrationId,
        active1688ProfileName,
      }),
    [
      active1688ConnectionId,
      active1688IntegrationId,
      active1688ProfileName,
      refresh1688Session,
    ]
  );
};

const useProductScanProductInvalidation = (
  queryClient: QueryClient
): ((productId: string) => Promise<void>) =>
  useCallback(
    async (productId: string): Promise<void> => {
      await Promise.allSettled([
        invalidateProductsAndDetail(queryClient, productId),
        invalidateProductsAndCounts(queryClient),
        invalidateProductScans(queryClient, productId),
      ]);
    },
    [queryClient]
  );

export const useProductScanModalActions = (
  input: ProductScanModalActionsInput
): ProductScanModalActions => {
  const { handle1688RefreshSessionRef, refreshScanRowsRef } = input;
  const handle1688RefreshSession = useProductScan1688RefreshHandler(input);
  const invalidateProductViews = useProductScanProductInvalidation(input.queryClient);
  const stopPolling = useProductScanStopPolling({
    pollTimerRef: input.pollTimerRef,
    setIsPolling: input.setIsPolling,
  });
  const handleExtractAmazonCandidate = useProductScanAmazonCandidateExtraction(input);
  const refreshScanRows = useProductScanModalRefreshRows({
    invalidateProductViews,
    missingScanRecordMessage: input.missingScanRecordMessage,
    modalSessionRef: input.modalSessionRef,
    provider: input.provider,
    resultStatusLabel: input.modalConfig.resultStatusLabel,
    rowsRef: input.rowsRef,
    setRows: input.setRows,
    stopPolling,
  });
  const { handleManualRefresh } = useProductScanPollingControls({
    ...input,
    refreshScanRows,
    stopPolling,
  });

  useEffect((): void => {
    handle1688RefreshSessionRef.current = handle1688RefreshSession;
    refreshScanRowsRef.current = refreshScanRows;
  }, [handle1688RefreshSession, handle1688RefreshSessionRef, refreshScanRows, refreshScanRowsRef]);

  return {
    handle1688RefreshSession,
    handleExtractAmazonCandidate,
    handleManualRefresh,
    invalidateProductViews,
    refreshScanRows,
    stopPolling,
  };
};
