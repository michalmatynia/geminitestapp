import type { QueryClient } from '@tanstack/react-query';
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import type { ProductScanAmazonCandidatePreview } from '@/features/products/lib/product-scan-amazon-candidates';
import type { ProductScanAmazonExtractCandidateResponse } from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import { api } from '@/shared/lib/api-client';
import { invalidateProductScans } from '@/shared/lib/query-invalidation';

import type { ScanModalRow } from './ProductScanModal.types';

type ToastVariant = 'success' | 'warning' | 'error' | 'info';
type ProductScanToast = (message: string, options?: { variant?: ToastVariant }) => void;

type UseAmazonCandidateExtractionInput = {
  rowsRef: MutableRefObject<ScanModalRow[]>;
  setRows: Dispatch<SetStateAction<ScanModalRow[]>>;
  setExtractingCandidateUrlsByProductId: Dispatch<SetStateAction<Record<string, string | null>>>;
  queryClient: QueryClient;
  toast: ProductScanToast;
  modalSessionRef: MutableRefObject<number>;
  startPollingRef: MutableRefObject<(sessionId?: number) => void>;
  refreshScanRowsRef: MutableRefObject<(sessionId?: number) => Promise<void>>;
  handleRefreshFailureRef: MutableRefObject<
    (error: unknown, options?: { stopPolling?: boolean; sessionId?: number }) => void
  >;
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return trimmed;
};

const resolveExtractionStatus = (
  response: ProductScanAmazonExtractCandidateResponse
): ScanModalRow['status'] => {
  if (response.status !== 'already_running') return response.status;
  return response.currentStatus ?? 'running';
};

const assertTrackableActiveExtraction = (
  response: ProductScanAmazonExtractCandidateResponse,
  nextStatus: ScanModalRow['status']
): void => {
  if (isProductScanActiveStatus(nextStatus) === false) return;
  if (normalizeText(response.scanId) !== null) return;
  throw new Error('Amazon candidate extraction did not return a trackable scan id.');
};

const applyExtractionResponseToRows = (input: {
  rows: ScanModalRow[];
  row: ScanModalRow;
  response: ProductScanAmazonExtractCandidateResponse;
  nextStatus: ScanModalRow['status'];
}): ScanModalRow[] =>
  input.rows.map((currentRow) => {
    if (currentRow.productId !== input.row.productId) return currentRow;
    return {
      ...currentRow,
      scanId: normalizeText(input.response.scanId),
      runId: normalizeText(input.response.runId),
      status: input.nextStatus,
      message: normalizeText(input.response.message),
      scan: null,
    };
  });

const queueExtractionPolling = (
  input: UseAmazonCandidateExtractionInput,
  nextStatus: ScanModalRow['status']
): void => {
  if (nextStatus !== 'queued' && nextStatus !== 'running') return;
  const sessionId = input.modalSessionRef.current;
  input.startPollingRef.current(sessionId);
  void input.refreshScanRowsRef.current(sessionId).catch((error: unknown): void => {
    input.handleRefreshFailureRef.current(error, { stopPolling: true, sessionId });
  });
};

const runAmazonCandidateExtraction = async (
  input: UseAmazonCandidateExtractionInput,
  row: ScanModalRow,
  candidate: ProductScanAmazonCandidatePreview
): Promise<void> => {
  const {
    queryClient,
    rowsRef,
    setExtractingCandidateUrlsByProductId,
    setRows,
    toast,
  } = input;

  if (row.scan === null) {
    toast('Amazon candidate source scan is no longer available.', { variant: 'error' });
    return;
  }

  setExtractingCandidateUrlsByProductId((current) => ({
    ...current,
    [row.productId]: candidate.url,
  }));

  try {
    const response = await api.post<ProductScanAmazonExtractCandidateResponse>(
      '/api/v2/products/scans/amazon/extract-candidate',
      {
        productId: row.productId,
        scanId: row.scan.id,
        candidateUrl: candidate.url,
        candidateRank: candidate.rank,
        candidateId: candidate.matchedImageId ?? candidate.id,
      }
    );
    const nextStatus = resolveExtractionStatus(response);
    assertTrackableActiveExtraction(response, nextStatus);
    const nextRows = applyExtractionResponseToRows({ rows: rowsRef.current, row, response, nextStatus });
    rowsRef.current = nextRows;
    setRows(nextRows);
    await invalidateProductScans(queryClient, row.productId);
    queueExtractionPolling(input, nextStatus);
    toast(normalizeText(response.message) ?? 'Amazon candidate extraction queued.');
  } catch (error) {
    toast(
      error instanceof Error ? error.message : 'Failed to queue Amazon candidate extraction.',
      { variant: 'error' }
    );
  } finally {
    setExtractingCandidateUrlsByProductId((current) => ({ ...current, [row.productId]: null }));
  }
};

export const useProductScanAmazonCandidateExtraction = (
  input: UseAmazonCandidateExtractionInput
): ((row: ScanModalRow, candidate: ProductScanAmazonCandidatePreview) => Promise<void>) =>
  useCallback(
    async (row: ScanModalRow, candidate: ProductScanAmazonCandidatePreview): Promise<void> =>
      runAmazonCandidateExtraction(input, row, candidate),
    [input]
  );
