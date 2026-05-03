import type { QueryClient } from '@tanstack/react-query';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';

import type { ProductScanBatchResponse } from '@/shared/contracts/product-scans';
import { api } from '@/shared/lib/api-client';
import { invalidateProductScans } from '@/shared/lib/query-invalidation';

import { buildProductScanToastSummaryFromRows } from './ProductScanModal.summary';
import type {
  ProductScanModalConfig,
  ProductScanModalProvider,
  ScanModalRow,
} from './ProductScanModal.types';

type BatchResult = ProductScanBatchResponse['results'][number];
type ToastVariant = 'success' | 'warning' | 'error' | 'info';
type ProductScanToast = (message: string, options?: { variant?: ToastVariant }) => void;

type SummaryCounts = {
  queued: number;
  running: number;
  alreadyRunning: number;
  failed: number;
};

type RunProductScanBatchInput = {
  amazonImageSearchPageUrl: string;
  amazonSelectorProfile: string;
  ensurePollingForTrackedActiveRowsRef: MutableRefObject<(sessionId?: number) => void>;
  handleRefreshFailureRef: MutableRefObject<
    (error: unknown, options?: { stopPolling?: boolean; sessionId?: number }) => void
  >;
  initialRows: ScanModalRow[];
  invalidateProductViews: (productId: string) => Promise<void>;
  missingBatchResultMessage: string;
  modalConfig: ProductScanModalConfig;
  modalSessionRef: MutableRefObject<number>;
  provider: ProductScanModalProvider;
  queryClient: QueryClient;
  refreshScanRowsRef: MutableRefObject<(sessionId?: number) => Promise<void>>;
  resolved1688ConnectionId: string | null;
  rowsRef: MutableRefObject<ScanModalRow[]>;
  sessionId: number;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  setRows: Dispatch<SetStateAction<ScanModalRow[]>>;
  startPollingRef: MutableRefObject<(sessionId?: number) => void>;
  toastRef: MutableRefObject<ProductScanToast>;
  untrackableActiveScanMessage: string;
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return trimmed;
};

const buildBatchRequestBody = (input: RunProductScanBatchInput): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    productIds: input.initialRows.map(({ productId }) => productId),
  };
  if (input.provider === 'amazon') {
    body['selectorProfile'] = normalizeText(input.amazonSelectorProfile) ?? 'amazon';
    const imageSearchPageUrl = normalizeText(input.amazonImageSearchPageUrl);
    if (imageSearchPageUrl !== null) body['imageSearchPageUrl'] = imageSearchPageUrl;
  }
  if (input.provider === '1688') body['connectionId'] = input.resolved1688ConnectionId;
  return body;
};

const createSummaryCounts = (response: ProductScanBatchResponse): SummaryCounts => ({
  queued: response.queued,
  running: response.running,
  alreadyRunning: response.alreadyRunning,
  failed: response.failed,
});

const decrementActiveSummaryCount = (counts: SummaryCounts, result: BatchResult): SummaryCounts => {
  if (result.status === 'queued') return { ...counts, queued: Math.max(0, counts.queued - 1) };
  if (result.status === 'running') return { ...counts, running: Math.max(0, counts.running - 1) };
  if (result.status === 'already_running') {
    return { ...counts, alreadyRunning: Math.max(0, counts.alreadyRunning - 1) };
  }
  return counts;
};

const isActiveBatchResult = (result: BatchResult): boolean =>
  result.status === 'queued' ||
  result.status === 'running' ||
  result.status === 'already_running';

const resolveBatchResultStatus = (result: BatchResult): ScanModalRow['status'] => {
  if (result.status !== 'already_running') return result.status;
  return result.currentStatus;
};

const buildQueuedRow = (input: {
  missingBatchResultMessage: string;
  result: BatchResult | undefined;
  row: ScanModalRow;
  untrackableActiveScanMessage: string;
}): { row: ScanModalRow; summaryCountsDelta: Partial<SummaryCounts> } => {
  if (input.result === undefined) {
    return {
      row: { ...input.row, status: 'failed', message: input.missingBatchResultMessage },
      summaryCountsDelta: { failed: 1 },
    };
  }
  if (isActiveBatchResult(input.result) && normalizeText(input.result.scanId) === null) {
    return {
      row: { ...input.row, status: 'failed', message: input.untrackableActiveScanMessage },
      summaryCountsDelta: { failed: 1 },
    };
  }
  return {
    row: {
      ...input.row,
      scanId: normalizeText(input.result.scanId),
      runId: normalizeText(input.result.runId),
      status: resolveBatchResultStatus(input.result),
      message: normalizeText(input.result.message),
    },
    summaryCountsDelta: {},
  };
};

const applySummaryCountsDelta = (
  counts: SummaryCounts,
  delta: Partial<SummaryCounts>
): SummaryCounts => ({
  queued: counts.queued + (delta.queued ?? 0),
  running: counts.running + (delta.running ?? 0),
  alreadyRunning: counts.alreadyRunning + (delta.alreadyRunning ?? 0),
  failed: counts.failed + (delta.failed ?? 0),
});

const buildQueuedRows = (input: {
  initialRows: ScanModalRow[];
  missingBatchResultMessage: string;
  response: ProductScanBatchResponse;
  untrackableActiveScanMessage: string;
}): { queuedRows: ScanModalRow[]; summaryCounts: SummaryCounts } => {
  const resultsByProductId = new Map(input.response.results.map((result) => [result.productId, result]));
  let summaryCounts = createSummaryCounts(input.response);
  const queuedRows = input.initialRows.map((row) => {
    const result = resultsByProductId.get(row.productId);
    const adjustedCounts =
      result !== undefined && isActiveBatchResult(result) && normalizeText(result.scanId) === null
        ? decrementActiveSummaryCount(summaryCounts, result)
        : summaryCounts;
    const queuedRow = buildQueuedRow({
      missingBatchResultMessage: input.missingBatchResultMessage,
      result,
      row,
      untrackableActiveScanMessage: input.untrackableActiveScanMessage,
    });
    summaryCounts = applySummaryCountsDelta(adjustedCounts, queuedRow.summaryCountsDelta);
    return queuedRow.row;
  });
  return { queuedRows, summaryCounts };
};

const invalidateProductScanRows = async (
  queryClient: QueryClient,
  rows: ScanModalRow[]
): Promise<void> => {
  await Promise.all(
    Array.from(new Set(rows.map((row) => row.productId))).map((productId) =>
      invalidateProductScans(queryClient, productId)
    )
  );
};

const invalidateProductViewRows = async (
  invalidateProductViews: (productId: string) => Promise<void>,
  rows: ScanModalRow[]
): Promise<void> => {
  await Promise.all(
    Array.from(new Set(rows.map((row) => row.productId))).map((productId) =>
      invalidateProductViews(productId)
    )
  );
};

const rowsChanged = (leftRows: ScanModalRow[], rightRows: ScanModalRow[]): boolean =>
  rightRows.some((row, index) => {
    const leftRow = leftRows[index];
    if (leftRow === undefined) return true;
    return (
      leftRow.scan !== row.scan ||
      leftRow.scanId !== row.scanId ||
      leftRow.runId !== row.runId ||
      leftRow.status !== row.status ||
      leftRow.message !== row.message
    );
  });

const buildSummaryToast = (
  counts: SummaryCounts,
  modalConfig: ProductScanModalConfig
): { message: string; variant: 'success' | 'warning' } => {
  const summary = [
    counts.queued > 0 ? `${counts.queued} queued` : null,
    counts.running > 0 ? `${counts.running} running` : null,
    counts.alreadyRunning > 0 ? `${counts.alreadyRunning} already in progress` : null,
    counts.failed > 0 ? `${counts.failed} failed` : null,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(', ');
  return {
    message: summary !== '' ? `${modalConfig.batchLabel}: ${summary}.` : modalConfig.noQueuedMessage,
    variant: counts.failed > 0 ? 'warning' : 'success',
  };
};

const recoverRowsAfterBatch = async (input: RunProductScanBatchInput): Promise<ScanModalRow[]> => {
  await input.refreshScanRowsRef.current(input.sessionId);
  input.ensurePollingForTrackedActiveRowsRef.current(input.sessionId);
  return input.rowsRef.current;
};

const handleQueuedRowsFollowUp = async (
  input: RunProductScanBatchInput,
  queuedRows: ScanModalRow[]
): Promise<ScanModalRow[] | null> => {
  if (queuedRows.some((row) => row.status === 'queued' || row.status === 'running')) {
    input.startPollingRef.current(input.sessionId);
    void input.refreshScanRowsRef.current(input.sessionId).catch((error: unknown): void => {
      input.handleRefreshFailureRef.current(error, { stopPolling: true, sessionId: input.sessionId });
    });
    return null;
  }
  if (queuedRows.some((row) => normalizeText(row.scanId) === null) === false) return null;
  try {
    return await recoverRowsAfterBatch(input);
  } catch {
    return queuedRows;
  }
};

const handleBatchSuccess = async (
  input: RunProductScanBatchInput,
  response: ProductScanBatchResponse
): Promise<void> => {
  const { rowsRef, setRows } = input;
  const { queuedRows, summaryCounts } = buildQueuedRows({
    initialRows: input.initialRows,
    missingBatchResultMessage: input.missingBatchResultMessage,
    response,
    untrackableActiveScanMessage: input.untrackableActiveScanMessage,
  });
  rowsRef.current = queuedRows;
  setRows(queuedRows);
  await invalidateProductScanRows(input.queryClient, queuedRows);
  await invalidateProductViewRows(input.invalidateProductViews, queuedRows.filter((row) => row.status === 'failed'));
  const recoveredRows = await handleQueuedRowsFollowUp(input, queuedRows);
  const toastSummary =
    recoveredRows !== null && rowsChanged(queuedRows, recoveredRows)
      ? buildProductScanToastSummaryFromRows(recoveredRows, input.modalConfig.batchLabel, input.modalConfig.noQueuedMessage)
      : buildSummaryToast(summaryCounts, input.modalConfig);
  if (input.sessionId !== input.modalSessionRef.current) return;
  input.toastRef.current(toastSummary.message, { variant: toastSummary.variant });
};

const handleBatchFailure = async (
  input: RunProductScanBatchInput,
  error: unknown
): Promise<void> => {
  const { rowsRef, setRows } = input;
  if (input.sessionId !== input.modalSessionRef.current) return;
  const message = error instanceof Error ? error.message : input.modalConfig.batchFailureMessage;
  const failedRows = input.initialRows.map((row) => ({ ...row, status: 'failed' as const, message }));
  rowsRef.current = failedRows;
  setRows(failedRows);
  await invalidateProductScanRows(input.queryClient, input.initialRows);
  await invalidateProductViewRows(input.invalidateProductViews, input.initialRows);
  let recoveredRows = failedRows;
  try {
    recoveredRows = await recoverRowsAfterBatch(input);
  } catch {
    // Keep the original enqueue failure visible when recovery probing also fails.
  }
  if (input.sessionId !== input.modalSessionRef.current || rowsChanged(failedRows, recoveredRows)) return;
  input.toastRef.current(message, { variant: 'error' });
};

export const runProductScanBatch = async (input: RunProductScanBatchInput): Promise<void> => {
  try {
    const response = await api.post<ProductScanBatchResponse>(
      input.modalConfig.batchEndpoint,
      buildBatchRequestBody(input)
    );
    if (input.sessionId !== input.modalSessionRef.current) return;
    await handleBatchSuccess(input, response);
  } catch (error) {
    await handleBatchFailure(input, error);
  } finally {
    if (input.sessionId === input.modalSessionRef.current) input.setIsSubmitting(false);
  }
};
