import type { ProductScanListResponse, ProductScanRecord } from '@/shared/contracts/product-scans';
import { api } from '@/shared/lib/api-client';

import type { ProductScanModalProvider, ScanModalRow } from './ProductScanModal.types';

export type RefreshLookupState = {
  discoveryFailedProductIds: Set<string>;
  productIdsForDiscovery: string[];
  refreshError: unknown;
  scansById: Map<string, ProductScanRecord>;
  scansByProductId: Map<string, ProductScanRecord | null>;
  trackedLookupFailed: boolean;
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return trimmed;
};

export const getTrackedScanIds = (rows: ScanModalRow[]): string[] =>
  rows.map((row) => row.scanId).filter((scanId): scanId is string => normalizeText(scanId) !== null);

export const getRowsWithoutTrackedScanIds = (rows: ScanModalRow[]): string[] =>
  Array.from(
    new Set(
      rows
        .filter((row) => normalizeText(row.scanId) === null)
        .map((row) => row.productId.trim())
        .filter((productId) => productId.length > 0)
    )
  );

const getMissingTrackedProductIds = (
  rows: ScanModalRow[],
  scansById: Map<string, ProductScanRecord>
): string[] =>
  Array.from(
    new Set(
      rows
        .filter((row) => {
          const scanId = normalizeText(row.scanId);
          return scanId !== null && scansById.has(scanId) === false;
        })
        .map((row) => row.productId.trim())
        .filter((productId) => productId.length > 0)
    )
  );

const lookupTrackedScans = async (
  scanIds: string[]
): Promise<{ scansById: Map<string, ProductScanRecord>; error: unknown; failed: boolean }> => {
  const scansById = new Map<string, ProductScanRecord>();
  if (scanIds.length === 0) return { scansById, error: null, failed: false };

  try {
    const response = await api.get<ProductScanListResponse>('/api/v2/products/scans', {
      cache: 'no-store',
      params: {
        ids: scanIds.join(','),
        limit: scanIds.length,
      },
    });
    response.scans.forEach((scan) => {
      scansById.set(scan.id, scan);
    });
    return { scansById, error: null, failed: false };
  } catch (error) {
    return { scansById, error, failed: true };
  }
};

const discoverLatestProductScans = async (
  productIds: string[],
  provider: ProductScanModalProvider
): Promise<{
  discoveryFailedProductIds: Set<string>;
  refreshError: unknown;
  scansByProductId: Map<string, ProductScanRecord | null>;
}> => {
  const scansByProductId = new Map<string, ProductScanRecord | null>();
  const discoveryFailedProductIds = new Set<string>();
  let refreshError: unknown = null;

  await Promise.all(
    productIds.map(async (productId): Promise<void> => {
      try {
        const response = await api.get<ProductScanListResponse>(
          `/api/v2/products/${productId}/scans`,
          { cache: 'no-store', params: { limit: 1, provider } }
        );
        scansByProductId.set(
          productId,
          response.scans.find((scan) => scan.productId === productId) ?? null
        );
      } catch (error) {
        discoveryFailedProductIds.add(productId);
        refreshError ??= error;
      }
    })
  );

  return { discoveryFailedProductIds, refreshError, scansByProductId };
};

export const buildRefreshLookupState = async (
  rows: ScanModalRow[],
  provider: ProductScanModalProvider
): Promise<RefreshLookupState> => {
  const scanIds = getTrackedScanIds(rows);
  const untrackedProductIds = getRowsWithoutTrackedScanIds(rows);
  const trackedLookup = await lookupTrackedScans(scanIds);
  const missingTrackedProductIds = getMissingTrackedProductIds(rows, trackedLookup.scansById);
  const productIdsForDiscovery = Array.from(
    new Set([...untrackedProductIds, ...missingTrackedProductIds])
  );
  const discovery = await discoverLatestProductScans(productIdsForDiscovery, provider);

  return {
    discoveryFailedProductIds: discovery.discoveryFailedProductIds,
    productIdsForDiscovery,
    refreshError: trackedLookup.error ?? discovery.refreshError,
    scansById: trackedLookup.scansById,
    scansByProductId: discovery.scansByProductId,
    trackedLookupFailed: trackedLookup.failed,
  };
};

export const hadSuccessfulLookup = (input: {
  lookup: RefreshLookupState;
  rows: ScanModalRow[];
}): boolean => {
  const scanIds = getTrackedScanIds(input.rows);
  return (
    (scanIds.length > 0 && input.lookup.trackedLookupFailed === false) ||
    input.lookup.scansByProductId.size > 0 ||
    (input.lookup.productIdsForDiscovery.length > 0 &&
      input.lookup.discoveryFailedProductIds.size < input.lookup.productIdsForDiscovery.length)
  );
};

export const hasRefreshTargets = (rows: ScanModalRow[]): boolean =>
  getTrackedScanIds(rows).length > 0 || getRowsWithoutTrackedScanIds(rows).length > 0;
