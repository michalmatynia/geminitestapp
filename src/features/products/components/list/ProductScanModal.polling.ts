import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import { safeClearInterval, safeSetInterval, type SafeTimerId } from '@/shared/lib/timers';

import type { ProductScanModalConfig, ProductScanModalProvider, ScanModalRow } from './ProductScanModal.types';

type ToastVariant = 'success' | 'warning' | 'error' | 'info';
type ProductScanToast = (message: string, options?: { variant?: ToastVariant }) => void;

type RefreshFailureHandler = (
  error: unknown,
  options?: { stopPolling?: boolean; sessionId?: number }
) => void;

type ProductScanPollingControlInput = {
  ensurePollingForTrackedActiveRowsRef: MutableRefObject<(sessionId?: number) => void>;
  handleRefreshFailureRef: MutableRefObject<RefreshFailureHandler>;
  modalConfig: ProductScanModalConfig;
  modalSessionRef: MutableRefObject<number>;
  pollTimerRef: MutableRefObject<SafeTimerId | null>;
  provider: ProductScanModalProvider;
  refreshScanRows: (sessionId?: number) => Promise<void>;
  rowsRef: MutableRefObject<ScanModalRow[]>;
  setIsPolling: Dispatch<SetStateAction<boolean>>;
  startPollingRef: MutableRefObject<(sessionId?: number) => void>;
  stopPolling: () => void;
  stopPollingRef: MutableRefObject<() => void>;
  toast: ProductScanToast;
};

export const useProductScanStopPolling = (input: {
  pollTimerRef: MutableRefObject<SafeTimerId | null>;
  setIsPolling: Dispatch<SetStateAction<boolean>>;
}): (() => void) => {
  const { pollTimerRef, setIsPolling } = input;

  return useCallback((): void => {
    if (pollTimerRef.current !== null) {
      safeClearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsPolling(false);
  }, [pollTimerRef, setIsPolling]);
};

export const useProductScanPollingControls = (
  input: ProductScanPollingControlInput
): { handleManualRefresh: () => void } => {
  const {
    ensurePollingForTrackedActiveRowsRef,
    handleRefreshFailureRef,
    modalConfig,
    modalSessionRef,
    pollTimerRef,
    provider,
    refreshScanRows,
    rowsRef,
    setIsPolling,
    startPollingRef,
    stopPolling,
    stopPollingRef,
    toast,
  } = input;
  const handleRefreshFailure = useProductScanRefreshFailureHandler({
    modalConfig,
    modalSessionRef,
    stopPolling,
    toast,
  });
  const startPolling = useProductScanStartPolling({
    handleRefreshFailure,
    modalSessionRef,
    pollTimerRef,
    refreshScanRows,
    setIsPolling,
    stopPolling,
  });
  const ensurePollingForTrackedActiveRows = useEnsureProductScanPolling({
    modalSessionRef,
    pollTimerRef,
    rowsRef,
    startPolling,
  });
  const handleManualRefresh = useProductScanManualRefresh({
    ensurePollingForTrackedActiveRows,
    handleRefreshFailure,
    modalSessionRef,
    provider,
    refreshScanRows,
    rowsRef,
    toast,
  });

  useProductScanPollingRefSync({
    ensurePollingForTrackedActiveRows,
    ensurePollingForTrackedActiveRowsRef,
    handleRefreshFailure,
    handleRefreshFailureRef,
    startPolling,
    startPollingRef,
    stopPolling,
    stopPollingRef,
  });

  return { handleManualRefresh };
};

const useProductScanRefreshFailureHandler = (input: {
  modalConfig: ProductScanModalConfig;
  modalSessionRef: MutableRefObject<number>;
  stopPolling: () => void;
  toast: ProductScanToast;
}): RefreshFailureHandler => {
  const { modalConfig, modalSessionRef, stopPolling, toast } = input;

  const handleRefreshFailure = useCallback<RefreshFailureHandler>(
    (error, options): void => {
      if (
        typeof options?.sessionId === 'number' &&
        options.sessionId !== modalSessionRef.current
      ) {
        return;
      }
      if (options?.stopPolling === true) stopPolling();
      const message =
        error instanceof Error ? error.message : modalConfig.refreshFailureMessage;
      toast(message, { variant: 'error' });
    },
    [modalConfig.refreshFailureMessage, modalSessionRef, stopPolling, toast]
  );

  return handleRefreshFailure;
};

const useProductScanStartPolling = (input: {
  handleRefreshFailure: RefreshFailureHandler;
  modalSessionRef: MutableRefObject<number>;
  pollTimerRef: MutableRefObject<SafeTimerId | null>;
  refreshScanRows: (sessionId?: number) => Promise<void>;
  setIsPolling: Dispatch<SetStateAction<boolean>>;
  stopPolling: () => void;
}): ((sessionId?: number) => void) => {
  const {
    handleRefreshFailure,
    modalSessionRef,
    pollTimerRef,
    refreshScanRows,
    setIsPolling,
    stopPolling,
  } = input;

  return useCallback((sessionId = modalSessionRef.current): void => {
    stopPolling();
    if (sessionId !== modalSessionRef.current) return;
    setIsPolling(true);
    pollTimerRef.current = safeSetInterval((): void => {
      void refreshScanRows(sessionId).catch((error: unknown): void => {
        handleRefreshFailure(error, { stopPolling: true, sessionId });
      });
    }, 3000);
  }, [handleRefreshFailure, modalSessionRef, pollTimerRef, refreshScanRows, setIsPolling, stopPolling]);
};

const useEnsureProductScanPolling = (input: {
  modalSessionRef: MutableRefObject<number>;
  pollTimerRef: MutableRefObject<SafeTimerId | null>;
  rowsRef: MutableRefObject<ScanModalRow[]>;
  startPolling: (sessionId?: number) => void;
}): ((sessionId?: number) => void) => {
  const { modalSessionRef, pollTimerRef, rowsRef, startPolling } = input;

  return useCallback((sessionId = modalSessionRef.current): void => {
    if (sessionId !== modalSessionRef.current) return;
    const hasTrackedActiveRows = rowsRef.current.some(
      (row) => typeof row.scanId === 'string' && row.scanId !== '' && isProductScanActiveStatus(row.status)
    );
    if (pollTimerRef.current === null && hasTrackedActiveRows) startPolling(sessionId);
  }, [modalSessionRef, pollTimerRef, rowsRef, startPolling]);
};

const useProductScanManualRefresh = (input: {
  ensurePollingForTrackedActiveRows: (sessionId?: number) => void;
  handleRefreshFailure: RefreshFailureHandler;
  modalSessionRef: MutableRefObject<number>;
  provider: ProductScanModalProvider;
  refreshScanRows: (sessionId?: number) => Promise<void>;
  rowsRef: MutableRefObject<ScanModalRow[]>;
  toast: ProductScanToast;
}): (() => void) => {
  const {
    ensurePollingForTrackedActiveRows,
    handleRefreshFailure,
    modalSessionRef,
    provider,
    refreshScanRows,
    rowsRef,
    toast,
  } = input;

  return useCallback((): void => {
    const sessionId = modalSessionRef.current;
    if (rowsRef.current.length === 0) {
      toast(resolveNoRowsRefreshMessage(provider), { variant: 'info' });
      return;
    }
    void refreshScanRows(sessionId)
      .then((): void => {
        ensurePollingForTrackedActiveRows(sessionId);
      })
      .catch((error: unknown): void => {
        handleRefreshFailure(error, { sessionId });
      });
  }, [
    ensurePollingForTrackedActiveRows,
    handleRefreshFailure,
    modalSessionRef,
    provider,
    refreshScanRows,
    rowsRef,
    toast,
  ]);
};

const useProductScanPollingRefSync = (input: {
  ensurePollingForTrackedActiveRows: (sessionId?: number) => void;
  ensurePollingForTrackedActiveRowsRef: MutableRefObject<(sessionId?: number) => void>;
  handleRefreshFailure: RefreshFailureHandler;
  handleRefreshFailureRef: MutableRefObject<RefreshFailureHandler>;
  startPolling: (sessionId?: number) => void;
  startPollingRef: MutableRefObject<(sessionId?: number) => void>;
  stopPolling: () => void;
  stopPollingRef: MutableRefObject<() => void>;
}): void => {
  const {
    ensurePollingForTrackedActiveRows,
    ensurePollingForTrackedActiveRowsRef,
    handleRefreshFailure,
    handleRefreshFailureRef,
    startPolling,
    startPollingRef,
    stopPolling,
    stopPollingRef,
  } = input;

  useEffect((): void => {
    ensurePollingForTrackedActiveRowsRef.current = ensurePollingForTrackedActiveRows;
    handleRefreshFailureRef.current = handleRefreshFailure;
    startPollingRef.current = startPolling;
    stopPollingRef.current = stopPolling;
  }, [
    ensurePollingForTrackedActiveRows,
    ensurePollingForTrackedActiveRowsRef,
    handleRefreshFailure,
    handleRefreshFailureRef,
    startPolling,
    startPollingRef,
    stopPolling,
    stopPollingRef,
  ]);
};

const resolveNoRowsRefreshMessage = (provider: ProductScanModalProvider): string => {
  if (provider === '1688') {
    return 'No 1688 scan rows to refresh. Use Refresh 1688 session to renew the browser profile.';
  }
  return 'No scan rows to refresh.';
};
