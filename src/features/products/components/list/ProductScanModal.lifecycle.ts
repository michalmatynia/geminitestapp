import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { runProductScanBatch } from './ProductScanModal.batch';
import type {
  ProductScanModalConfig,
  ProductScanModalProvider,
  ProductScanModalSelectedProduct,
  ScanModalRow,
} from './ProductScanModal.types';

type RefreshSessionResult = { ok: boolean; message: string };

type ProductScanModalLifecycleInput = {
  active1688ConnectionId: string | null;
  active1688ProfileName: string | null;
  amazonImageSearchPageUrl: string;
  amazonSelectorProfile: string;
  autoStarted1688ConnectionIdsRef: MutableRefObject<Set<string>>;
  ensurePollingForTrackedActiveRowsRef: MutableRefObject<(sessionId?: number) => void>;
  handle1688RefreshSessionRef: MutableRefObject<() => Promise<RefreshSessionResult>>;
  handleRefreshFailureRef: MutableRefObject<
    (error: unknown, options?: { stopPolling?: boolean; sessionId?: number }) => void
  >;
  hasResolved1688Session: boolean;
  invalidateProductViews: (productId: string) => Promise<void>;
  is1688ConnectionBootstrapPending: boolean;
  isOpen: boolean;
  latest1688SessionError: string | null;
  missingBatchResultMessage: string;
  modalConfig: ProductScanModalConfig;
  modalSessionRef: MutableRefObject<number>;
  provider: ProductScanModalProvider;
  queryClient: Parameters<typeof runProductScanBatch>[0]['queryClient'];
  refreshScanRowsRef: MutableRefObject<(sessionId?: number) => Promise<void>>;
  reset1688SessionState: () => void;
  resetRowExpansion: () => void;
  resolved1688ConnectionId: string | null;
  rowsRef: MutableRefObject<ScanModalRow[]>;
  selectedProductIdsKey: string;
  selectedProductsRef: MutableRefObject<ProductScanModalSelectedProduct[]>;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  setRows: Dispatch<SetStateAction<ScanModalRow[]>>;
  startPollingRef: MutableRefObject<(sessionId?: number) => void>;
  stopPollingRef: MutableRefObject<() => void>;
  toastRef: Parameters<typeof runProductScanBatch>[0]['toastRef'];
  untrackableActiveScanMessage: string;
};

type SessionAction =
  | { kind: 'continue' }
  | { kind: 'block'; message: string }
  | { kind: 'refresh'; connectionId: string };

const noopCleanup = (): void => {};

const buildInitialRows = (
  selectedProductEntries: ProductScanModalSelectedProduct[]
): ScanModalRow[] =>
  selectedProductEntries.map(({ productId, productName }) => ({
    productId,
    productName,
    requestedAt: new Date().toISOString(),
    scanId: null,
    runId: null,
    status: 'enqueuing',
    message: null,
    scan: null,
  }));

const buildBlockedRows = (rows: ScanModalRow[], message: string): ScanModalRow[] =>
  rows.map((row) => ({ ...row, status: 'failed', message }));

const resolveMissing1688SessionMessage = (
  active1688ConnectionId: string | null,
  active1688ProfileName: string | null
): string => {
  if (active1688ConnectionId === null) {
    return '1688 browser profile required before running supplier scans.';
  }
  return `1688 login required for profile ${active1688ProfileName ?? '1688 profile'}. Refresh the saved browser session before scanning.`;
};

const resolve1688SessionAction = (input: {
  active1688ConnectionId: string | null;
  active1688ProfileName: string | null;
  autoStarted1688ConnectionIds: Set<string>;
  hasResolved1688Session: boolean;
  latest1688SessionError: string | null;
  provider: ProductScanModalProvider;
}): SessionAction => {
  if (input.provider !== '1688') return { kind: 'continue' };
  const message = resolveMissing1688SessionMessage(
    input.active1688ConnectionId,
    input.active1688ProfileName
  );
  if (input.active1688ConnectionId === null) return { kind: 'block', message };
  if (input.hasResolved1688Session) return { kind: 'continue' };
  if (input.autoStarted1688ConnectionIds.has(input.active1688ConnectionId) === false) {
    return { kind: 'refresh', connectionId: input.active1688ConnectionId };
  }
  return { kind: 'block', message: input.latest1688SessionError ?? message };
};

const closeLifecycle = (input: ProductScanModalLifecycleInput): (() => void) => {
  const { autoStarted1688ConnectionIdsRef, modalSessionRef, reset1688SessionState, resetRowExpansion, rowsRef, setIsSubmitting, setRows, stopPollingRef } = input;
  modalSessionRef.current += 1;
  rowsRef.current = [];
  setRows([]);
  setIsSubmitting(false);
  autoStarted1688ConnectionIdsRef.current = new Set();
  reset1688SessionState();
  resetRowExpansion();
  stopPollingRef.current();
  return noopCleanup;
};

const bootstrapLifecycle = (input: ProductScanModalLifecycleInput): (() => void) => {
  const { rowsRef, setIsSubmitting, setRows, stopPollingRef } = input;
  rowsRef.current = [];
  setRows([]);
  setIsSubmitting(true);
  stopPollingRef.current();
  return noopCleanup;
};

const emptySelectionLifecycle = (input: ProductScanModalLifecycleInput): (() => void) => {
  const { resetRowExpansion, rowsRef, setIsSubmitting, setRows, stopPollingRef } = input;
  rowsRef.current = [];
  setRows([]);
  setIsSubmitting(false);
  resetRowExpansion();
  stopPollingRef.current();
  return noopCleanup;
};

const blockRowsLifecycle = (
  input: ProductScanModalLifecycleInput,
  initialRows: ScanModalRow[],
  message: string
): (() => void) => {
  const { rowsRef, setIsSubmitting, setRows, stopPollingRef } = input;
  rowsRef.current = buildBlockedRows(initialRows, message);
  setRows(rowsRef.current);
  setIsSubmitting(false);
  stopPollingRef.current();
  return noopCleanup;
};

const refreshSessionLifecycle = (
  input: ProductScanModalLifecycleInput,
  initialRows: ScanModalRow[],
  sessionId: number,
  connectionId: string
): (() => void) => {
  const { autoStarted1688ConnectionIdsRef, handle1688RefreshSessionRef, modalSessionRef, rowsRef, setIsSubmitting, setRows, stopPollingRef } = input;
  autoStarted1688ConnectionIdsRef.current.add(connectionId);
  rowsRef.current = [];
  setRows([]);
  setIsSubmitting(true);
  stopPollingRef.current();
  void handle1688RefreshSessionRef.current().then((result): void => {
    if (sessionId !== modalSessionRef.current || result.ok) return;
    rowsRef.current = buildBlockedRows(initialRows, result.message);
    setRows(rowsRef.current);
    setIsSubmitting(false);
  });
  return noopCleanup;
};

const startBatchLifecycle = (
  input: ProductScanModalLifecycleInput,
  initialRows: ScanModalRow[],
  sessionId: number
): (() => void) => {
  const { modalSessionRef, rowsRef, setIsSubmitting, setRows, stopPollingRef } = input;
  rowsRef.current = initialRows;
  setRows(initialRows);
  setIsSubmitting(true);
  void runProductScanBatch({ ...input, initialRows, sessionId });

  return (): void => {
    if (modalSessionRef.current === sessionId) modalSessionRef.current += 1;
    stopPollingRef.current();
  };
};

const runProductScanModalLifecycle = (input: ProductScanModalLifecycleInput): (() => void) => {
  if (input.isOpen === false) return closeLifecycle(input);
  if (input.is1688ConnectionBootstrapPending) return bootstrapLifecycle(input);

  const { modalSessionRef, selectedProductsRef } = input;
  const sessionId = modalSessionRef.current + 1;
  modalSessionRef.current = sessionId;
  const initialRows = buildInitialRows(selectedProductsRef.current);
  if (initialRows.length === 0) return emptySelectionLifecycle(input);

  const action = resolve1688SessionAction({
    active1688ConnectionId: input.active1688ConnectionId,
    active1688ProfileName: input.active1688ProfileName,
    autoStarted1688ConnectionIds: input.autoStarted1688ConnectionIdsRef.current,
    hasResolved1688Session: input.hasResolved1688Session,
    latest1688SessionError: input.latest1688SessionError,
    provider: input.provider,
  });
  if (action.kind === 'block') return blockRowsLifecycle(input, initialRows, action.message);
  if (action.kind === 'refresh') {
    return refreshSessionLifecycle(input, initialRows, sessionId, action.connectionId);
  }
  return startBatchLifecycle(input, initialRows, sessionId);
};

export const useProductScanModalLifecycle = (input: ProductScanModalLifecycleInput): void => {
  useEffect(() => runProductScanModalLifecycle(input), [
    input.active1688ConnectionId,
    input.active1688ProfileName,
    input.amazonImageSearchPageUrl,
    input.amazonSelectorProfile,
    input.autoStarted1688ConnectionIdsRef,
    input.ensurePollingForTrackedActiveRowsRef,
    input.handle1688RefreshSessionRef,
    input.handleRefreshFailureRef,
    input.hasResolved1688Session,
    input.invalidateProductViews,
    input.is1688ConnectionBootstrapPending,
    input.isOpen,
    input.latest1688SessionError,
    input.missingBatchResultMessage,
    input.modalConfig,
    input.modalSessionRef,
    input.provider,
    input.queryClient,
    input.refreshScanRowsRef,
    input.reset1688SessionState,
    input.resetRowExpansion,
    input.resolved1688ConnectionId,
    input.rowsRef,
    input.selectedProductIdsKey,
    input.selectedProductsRef,
    input.setIsSubmitting,
    input.setRows,
    input.startPollingRef,
    input.stopPollingRef,
    input.toastRef,
    input.untrackableActiveScanMessage,
  ]);
};
