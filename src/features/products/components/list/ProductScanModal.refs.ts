import { useEffect, useRef } from 'react';

import type { Toast } from '@/shared/ui/toast';
import type { SafeTimerId } from '@/shared/lib/timers';

import type { ProductScanModalSelectedProduct, ScanModalRow } from './ProductScanModal.types';

type ProductScanToast = Toast;

export const useProductScanModalRefs = (toast: ProductScanToast): {
  autoStarted1688ConnectionIdsRef: React.MutableRefObject<Set<string>>;
  ensurePollingForTrackedActiveRowsRef: React.MutableRefObject<(sessionId?: number) => void>;
  handle1688RefreshSessionRef: React.MutableRefObject<() => Promise<{ ok: boolean; message: string }>>;
  handleRefreshFailureRef: React.MutableRefObject<
    (error: unknown, options?: { stopPolling?: boolean; sessionId?: number }) => void
  >;
  modalSessionRef: React.MutableRefObject<number>;
  pollTimerRef: React.MutableRefObject<SafeTimerId | null>;
  refreshScanRowsRef: React.MutableRefObject<(sessionId?: number) => Promise<void>>;
  rowsRef: React.MutableRefObject<ScanModalRow[]>;
  selectedProductsRef: React.MutableRefObject<ProductScanModalSelectedProduct[]>;
  startPollingRef: React.MutableRefObject<(sessionId?: number) => void>;
  stopPollingRef: React.MutableRefObject<() => void>;
  toastRef: React.MutableRefObject<ProductScanToast>;
} => {
  const pollTimerRef = useRef<SafeTimerId | null>(null);
  const modalSessionRef = useRef(0);
  const autoStarted1688ConnectionIdsRef = useRef<Set<string>>(new Set());
  const rowsRef = useRef<ScanModalRow[]>([]);
  const selectedProductsRef = useRef<ProductScanModalSelectedProduct[]>([]);
  const toastRef = useRef(toast);
  const stopPollingRef = useRef<() => void>((): void => { /* no-op */ });
  const refreshScanRowsRef = useRef<(sessionId?: number) => Promise<void>>(
    (): Promise<void> => Promise.resolve()
  );
  const handleRefreshFailureRef = useRef<
    (error: unknown, options?: { stopPolling?: boolean; sessionId?: number }) => void
  >((): void => { /* no-op */ });
  const startPollingRef = useRef<(sessionId?: number) => void>((): void => { /* no-op */ });
  const ensurePollingForTrackedActiveRowsRef = useRef<(sessionId?: number) => void>(
    (): void => { /* no-op */ }
  );
  const handle1688RefreshSessionRef = useRef<() => Promise<{ ok: boolean; message: string }>>(
    (): Promise<{ ok: boolean; message: string }> =>
      Promise.resolve({
        ok: false,
        message: '1688 browser profile required before running supplier scans.',
      })
  );

  useEffect((): void => {
    toastRef.current = toast;
  }, [toast, toastRef]);

  return {
    autoStarted1688ConnectionIdsRef,
    ensurePollingForTrackedActiveRowsRef,
    handle1688RefreshSessionRef,
    handleRefreshFailureRef,
    modalSessionRef,
    pollTimerRef,
    refreshScanRowsRef,
    rowsRef,
    selectedProductsRef,
    startPollingRef,
    stopPollingRef,
    toastRef,
  };
};
