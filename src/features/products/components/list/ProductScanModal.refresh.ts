import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import {
  isProductScanGoogleManualFallbackOpen,
  PRODUCT_SCAN_GOOGLE_MANUAL_FALLBACK_MESSAGE,
  isProductScanGoogleStealthRetrying,
  PRODUCT_SCAN_GOOGLE_STEALTH_RETRY_MESSAGE,
} from '@/features/products/lib/product-scan-run-feedback';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus, isProductScanTerminalStatus } from '@/shared/contracts/product-scans';

import { isDiscoveredScanCurrentForRow } from './ProductScanModal.helpers';
import {
  buildRefreshLookupState,
  hadSuccessfulLookup,
  hasRefreshTargets,
  type RefreshLookupState,
} from './ProductScanModal.refresh-lookups';
import type { ProductScanModalProvider, ScanModalRow } from './ProductScanModal.types';

type RefreshRowsInput = {
  rowsRef: MutableRefObject<ScanModalRow[]>;
  setRows: Dispatch<SetStateAction<ScanModalRow[]>>;
  modalSessionRef: MutableRefObject<number>;
  provider: ProductScanModalProvider;
  resultStatusLabel: string;
  missingScanRecordMessage: string;
  stopPolling: () => void;
  invalidateProductViews: (productId: string) => Promise<void>;
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return trimmed;
};


const resolveActiveStatusMessage = (
  resultStatusLabel: string,
  status: ScanModalRow['status'],
  fallback: string | null
): string | null => {
  if (status === 'queued') return `${resultStatusLabel} queued.`;
  if (status === 'running') return `${resultStatusLabel} running.`;
  return fallback;
};

const resolveActiveScanMessage = (
  scan: ProductScanRecord,
  row: ScanModalRow,
  resultStatusLabel: string
): string | null => {
  const asinUpdateMessage = normalizeText(scan.asinUpdateMessage);
  if (asinUpdateMessage !== null) return asinUpdateMessage;
  if (isProductScanGoogleStealthRetrying(scan)) return PRODUCT_SCAN_GOOGLE_STEALTH_RETRY_MESSAGE;
  if (isProductScanGoogleManualFallbackOpen(scan)) return PRODUCT_SCAN_GOOGLE_MANUAL_FALLBACK_MESSAGE;
  return resolveActiveStatusMessage(resultStatusLabel, scan.status, row.message);
};

const resolveRefreshedRowMessage = (
  scan: ProductScanRecord | null,
  row: ScanModalRow,
  resultStatusLabel: string
): string | null => {
  if (scan?.status === 'completed') return scan.asinUpdateMessage ?? null;
  if (scan !== null && isProductScanActiveStatus(scan.status)) {
    return resolveActiveScanMessage(scan, row, resultStatusLabel);
  }
  if (scan !== null && isProductScanTerminalStatus(scan.status)) return null;
  return row.message;
};

const resolveDiscoveredScan = (
  row: ScanModalRow,
  scansByProductId: Map<string, ProductScanRecord | null>
): ProductScanRecord | null => {
  const discoveredScan = scansByProductId.get(row.productId) ?? null;
  if (isDiscoveredScanCurrentForRow(row, discoveredScan)) return discoveredScan;
  return null;
};

const shouldKeepExistingRow = (
  row: ScanModalRow,
  lookup: RefreshLookupState,
  currentDiscoveredScan: ProductScanRecord | null
): boolean => {
  const scanId = normalizeText(row.scanId);
  const trackedScanUnavailable =
    scanId !== null && lookup.trackedLookupFailed && lookup.scansById.has(scanId) === false;
  return (
    currentDiscoveredScan === null &&
    (trackedScanUnavailable || lookup.discoveryFailedProductIds.has(row.productId))
  );
};

const resolveRefreshedScan = (
  row: ScanModalRow,
  lookup: RefreshLookupState,
  currentDiscoveredScan: ProductScanRecord | null
): ProductScanRecord | null => {
  const scanId = normalizeText(row.scanId);
  if (scanId !== null) return lookup.scansById.get(scanId) ?? currentDiscoveredScan ?? null;
  return currentDiscoveredScan ?? row.scan;
};

type MergeRefreshedRowsInput = {
  lookup: RefreshLookupState;
  missingScanRecordMessage: string;
  resultStatusLabel: string;
  rows: ScanModalRow[];
};

const isMissingRefreshedScan = (
  row: ScanModalRow,
  refreshedScan: ProductScanRecord | null,
  currentDiscoveredScan: ProductScanRecord | null
): boolean =>
  normalizeText(row.scanId) !== null &&
  refreshedScan === null &&
  currentDiscoveredScan === null;

const hasNewTerminalScan = (
  row: ScanModalRow,
  scan: ProductScanRecord | null
): boolean => {
  if (scan === null || isProductScanTerminalStatus(scan.status) === false) return false;
  const wasTerminal = row.status !== 'enqueuing' && isProductScanTerminalStatus(row.status);
  return wasTerminal === false || scan.id !== row.scan?.id;
};

const buildMissingRefreshedScanRow = (
  row: ScanModalRow,
  missingScanRecordMessage: string
): ScanModalRow => ({
  ...row,
  scanId: null,
  runId: null,
  status: 'failed',
  message: missingScanRecordMessage,
  scan: null,
});

const buildUpdatedRefreshRow = (input: {
  resultStatusLabel: string;
  row: ScanModalRow;
  scan: ProductScanRecord | null;
}): ScanModalRow => ({
  ...input.row,
  scanId: input.scan?.id ?? input.row.scanId,
  runId: input.scan?.engineRunId ?? input.row.runId,
  status: input.scan?.status ?? input.row.status,
  message: resolveRefreshedRowMessage(input.scan, input.row, input.resultStatusLabel),
  scan: input.scan,
});

const resolveTerminalProductId = (
  row: ScanModalRow,
  scan: ProductScanRecord | null,
  missingScan: boolean
): string | null => {
  if (missingScan) return row.productId;
  if (hasNewTerminalScan(row, scan)) return row.productId;
  return null;
};

const resolveMergedRefreshRow = (
  input: MergeRefreshedRowsInput,
  row: ScanModalRow
): { row: ScanModalRow; terminalProductId: string | null } => {
  const currentDiscoveredScan = resolveDiscoveredScan(row, input.lookup.scansByProductId);
  if (shouldKeepExistingRow(row, input.lookup, currentDiscoveredScan)) {
    return { row, terminalProductId: null };
  }
  const refreshedScan = resolveRefreshedScan(row, input.lookup, currentDiscoveredScan);
  const missingScan = isMissingRefreshedScan(row, refreshedScan, currentDiscoveredScan);
  const scan = missingScan ? null : refreshedScan;
  if (missingScan) {
    return {
      row: buildMissingRefreshedScanRow(row, input.missingScanRecordMessage),
      terminalProductId: row.productId,
    };
  }
  return {
    row: buildUpdatedRefreshRow({ resultStatusLabel: input.resultStatusLabel, row, scan }),
    terminalProductId: resolveTerminalProductId(row, scan, missingScan),
  };
};

const mergeRefreshedRows = (
  input: MergeRefreshedRowsInput
): { nextRows: ScanModalRow[]; terminalProductIds: string[] } => {
  const terminalProductIds: string[] = [];
  const nextRows = input.rows.map((row) => {
    const result = resolveMergedRefreshRow(input, row);
    if (result.terminalProductId !== null) terminalProductIds.push(result.terminalProductId);
    return result.row;
  });
  return { nextRows, terminalProductIds };
};

const toRefreshError = (error: unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) return error;
  return new Error(fallbackMessage);
};

const shouldThrowLookupError = (lookup: RefreshLookupState, rows: ScanModalRow[]): boolean =>
  hadSuccessfulLookup({ lookup, rows }) === false && lookup.refreshError !== null;

export const useProductScanModalRefreshRows = (
  input: RefreshRowsInput
): ((sessionId?: number) => Promise<void>) => {
  const {
    invalidateProductViews,
    missingScanRecordMessage,
    modalSessionRef,
    provider,
    resultStatusLabel,
    rowsRef,
    setRows,
    stopPolling,
  } = input;

  return useCallback(
    async (sessionId = modalSessionRef.current): Promise<void> => {
      if (sessionId !== modalSessionRef.current) return;
      const rowsForLookup = rowsRef.current;
      if (hasRefreshTargets(rowsForLookup) === false) {
        stopPolling();
        return;
      }

      const lookup = await buildRefreshLookupState(rowsForLookup, provider);
      if (sessionId !== modalSessionRef.current) return;
      if (shouldThrowLookupError(lookup, rowsForLookup)) {
        throw toRefreshError(lookup.refreshError, missingScanRecordMessage);
      }

      const { nextRows, terminalProductIds } = mergeRefreshedRows({
        lookup,
        missingScanRecordMessage,
        resultStatusLabel,
        rows: rowsRef.current,
      });
      rowsRef.current = nextRows;
      setRows(nextRows);
      await Promise.all(terminalProductIds.map((productId) => invalidateProductViews(productId)));

      if (nextRows.some((row) => row.status === 'enqueuing' || isProductScanActiveStatus(row.status)) === false) {
        stopPolling();
      }
    },
    [
      invalidateProductViews,
      missingScanRecordMessage,
      modalSessionRef,
      provider,
      resultStatusLabel,
      rowsRef,
      setRows,
      stopPolling,
    ]
  );
};
