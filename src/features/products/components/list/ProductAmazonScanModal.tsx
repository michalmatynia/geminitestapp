'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  ProductAmazonBatchScanResponse,
  ProductScanListResponse,
  ProductScanRecord,
  ProductScanStatus,
} from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus, isProductScanTerminalStatus } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import {
  invalidateProductScans,
  invalidateProductsAndDetail,
  invalidateProductsAndCounts,
} from '@/shared/lib/query-invalidation';
import { safeSetInterval, safeClearInterval, type SafeTimerId } from '@/shared/lib/timers';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/ui/toast';

type ProductAmazonScanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  products: ProductWithImages[];
};

type ScanModalRow = {
  productId: string;
  productName: string;
  requestedAt: string;
  scanId: string | null;
  runId: string | null;
  status: ProductScanStatus | 'enqueuing';
  message: string | null;
  scan: ProductScanRecord | null;
};

const STATUS_LABELS: Record<ScanModalRow['status'], string> = {
  enqueuing: 'Enqueuing',
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  no_match: 'No Match',
  conflict: 'Conflict',
  failed: 'Failed',
};

const STATUS_CLASSES: Record<ScanModalRow['status'], string> = {
  enqueuing: 'border-border/70 text-muted-foreground',
  queued: 'border-border/70 text-muted-foreground',
  running: 'border-blue-500/40 text-blue-300',
  completed: 'border-emerald-500/40 text-emerald-300',
  no_match: 'border-amber-500/40 text-amber-300',
  conflict: 'border-orange-500/40 text-orange-300',
  failed: 'border-destructive/40 text-destructive',
};

const MISSING_BATCH_RESULT_MESSAGE = 'Amazon scan request did not return a result for this product.';
const MISSING_SCAN_RECORD_MESSAGE = 'Amazon scan record could not be refreshed.';
const UNTRACKABLE_ACTIVE_SCAN_MESSAGE =
  'Amazon scan request returned an active scan without a trackable scan id.';

const resolveActiveStatusMessage = (
  status: ProductScanStatus | 'enqueuing',
  fallback: string | null
): string | null => {
  if (status === 'enqueuing') {
    return fallback;
  }

  if (status === 'queued') {
    return 'Amazon reverse image scan queued.';
  }

  if (status === 'running') {
    return 'Amazon reverse image scan running.';
  }

  return fallback;
};

const formatSummary = (rows: ScanModalRow[]): string => {
  if (rows.length === 0) {
    return 'No products selected';
  }

  const counts = {
    enqueuing: rows.filter((row) => row.status === 'enqueuing').length,
    queued: rows.filter((row) => row.status === 'queued').length,
    running: rows.filter((row) => row.status === 'running').length,
    completed: rows.filter((row) => row.status === 'completed').length,
    noMatch: rows.filter((row) => row.status === 'no_match').length,
    conflict: rows.filter((row) => row.status === 'conflict').length,
    failed: rows.filter((row) => row.status === 'failed').length,
  };

  return [
    `${rows.length} selected`,
    counts.enqueuing > 0 && `${counts.enqueuing} enqueuing`,
    counts.queued > 0 && `${counts.queued} queued`,
    counts.running > 0 && `${counts.running} running`,
    counts.completed > 0 && `${counts.completed} completed`,
    counts.noMatch > 0 && `${counts.noMatch} no match`,
    counts.conflict > 0 && `${counts.conflict} conflicts`,
    counts.failed > 0 && `${counts.failed} failed`,
  ]
    .filter(Boolean)
    .join(' · ');
};

const buildToastSummaryFromRows = (
  rows: ScanModalRow[]
): { message: string; variant: 'success' | 'warning' } => {
  const counts = {
    queued: rows.filter((row) => row.status === 'queued').length,
    running: rows.filter((row) => row.status === 'running').length,
    completed: rows.filter((row) => row.status === 'completed').length,
    noMatch: rows.filter((row) => row.status === 'no_match').length,
    conflict: rows.filter((row) => row.status === 'conflict').length,
    failed: rows.filter((row) => row.status === 'failed').length,
  };

  const summary = [
    counts.queued > 0 && `${counts.queued} queued`,
    counts.running > 0 && `${counts.running} running`,
    counts.completed > 0 && `${counts.completed} completed`,
    counts.noMatch > 0 && `${counts.noMatch} no match`,
    counts.conflict > 0 && `${counts.conflict} conflicts`,
    counts.failed > 0 && `${counts.failed} failed`,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    message: summary ? `Amazon scans: ${summary}.` : 'No Amazon scans were queued.',
    variant: counts.failed > 0 || counts.conflict > 0 ? 'warning' : 'success',
  };
};

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const isDiscoveredScanCurrentForRow = (
  row: ScanModalRow,
  discoveredScan: ProductScanRecord | null
): discoveredScan is ProductScanRecord => {
  if (!discoveredScan) {
    return false;
  }

  if (isProductScanActiveStatus(discoveredScan.status)) {
    return true;
  }

  const requestedAtTs = Date.parse(row.requestedAt);
  const createdAtTs = Date.parse(discoveredScan.createdAt || '');
  if (!Number.isFinite(requestedAtTs) || !Number.isFinite(createdAtTs)) {
    return false;
  }

  return createdAtTs >= requestedAtTs - 1_000;
};

const resolveRowDisplayMessages = (
  row: ScanModalRow
): { infoMessage: string | null; errorMessage: string | null } => {
  if (!row.scan) {
    return row.status === 'failed'
      ? { infoMessage: null, errorMessage: row.message }
      : { infoMessage: row.message, errorMessage: null };
  }

  if (row.scan.status === 'completed') {
    return {
      infoMessage: row.message,
      errorMessage: null,
    };
  }

  if (row.scan.status === 'no_match') {
    return {
      infoMessage: row.scan.asinUpdateMessage ?? row.scan.error ?? row.message,
      errorMessage: null,
    };
  }

  if (row.scan.status === 'conflict' || row.scan.status === 'failed') {
    return {
      infoMessage: null,
      errorMessage: row.scan.error ?? row.scan.asinUpdateMessage ?? row.message,
    };
  }

  return {
    infoMessage: row.message,
    errorMessage: row.scan.error,
  };
};

export function ProductAmazonScanModal(
  props: ProductAmazonScanModalProps
): React.JSX.Element {
  const { isOpen, onClose, productIds, products } = props;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pollTimerRef = useRef<SafeTimerId | null>(null);
  const modalSessionRef = useRef(0);
  const rowsRef = useRef<ScanModalRow[]>([]);
  const selectedProductsRef = useRef<Array<{ productId: string; productName: string }>>([]);
  const [rows, setRows] = useState<ScanModalRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const productNamesById = useMemo(
    () =>
      new Map(
        products.map((product) => [
          product.id,
          product.name_en || product.name_pl || product.name_de || product.sku || product.id,
        ])
      ),
    [products]
  );

  const selectedProducts = useMemo(
    () =>
      Array.from(
        new Set(
          productIds
            .map((productId) => productId.trim())
            .filter((productId) => productId.length > 0)
        )
      ).map((productId) => ({
        productId,
        productName: productNamesById.get(productId) ?? productId,
      })),
    [productIds, productNamesById]
  );
  const selectedProductIdsKey = useMemo(
    () =>
      selectedProducts
        .map((entry) => entry.productId)
        .slice()
        .sort()
        .join('\u0000'),
    [selectedProducts]
  );

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      safeClearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    selectedProductsRef.current = selectedProducts;
  }, [selectedProducts]);

  useEffect(() => {
    const selectedProductNames = new Map(
      selectedProducts.map(({ productId, productName }) => [productId, productName])
    );

    setRows((currentRows) => {
      let didChange = false;
      const nextRows = currentRows.map((row) => {
        const nextProductName = selectedProductNames.get(row.productId);
        if (!nextProductName || nextProductName === row.productName) {
          return row;
        }
        didChange = true;
        return {
          ...row,
          productName: nextProductName,
        };
      });

      if (didChange) {
        rowsRef.current = nextRows;
      }

      return didChange ? nextRows : currentRows;
    });
  }, [selectedProducts]);

  const invalidateProductViews = useCallback(
    async (productId: string) => {
      await Promise.allSettled([
        invalidateProductsAndDetail(queryClient, productId),
        invalidateProductsAndCounts(queryClient),
        invalidateProductScans(queryClient, productId),
      ]);
    },
    [queryClient]
  );

  const refreshScanRows = useCallback(async (sessionId = modalSessionRef.current) => {
    if (sessionId !== modalSessionRef.current) {
      return;
    }

    const currentRows = rowsRef.current;
    const scanIds = currentRows
      .map((row) => row.scanId)
      .filter((scanId): scanId is string => Boolean(scanId));
    const untrackedProductIds = Array.from(
      new Set(
        currentRows
          .filter((row) => !row.scanId)
          .map((row) => row.productId.trim())
          .filter((productId) => productId.length > 0)
      )
    );
    const scansById = new Map<string, ProductScanRecord>();
    const scansByProductId = new Map<string, ProductScanRecord | null>();
    const discoveryFailedProductIds = new Set<string>();
    let trackedLookupFailed = false;
    let refreshError: unknown = null;

    if (scanIds.length === 0 && untrackedProductIds.length === 0) {
      stopPolling();
      return;
    }

    if (scanIds.length > 0) {
      try {
        const response = await api.get<ProductScanListResponse>('/api/v2/products/scans', {
          cache: 'no-store',
          params: {
            ids: scanIds.join(','),
            limit: scanIds.length,
          },
        });
        if (sessionId !== modalSessionRef.current) {
          return;
        }

        response.scans.forEach((scan) => {
          scansById.set(scan.id, scan);
        });
      } catch (error) {
        trackedLookupFailed = true;
        refreshError ??= error;
      }
    }

    const missingTrackedProductIds = Array.from(
      new Set(
        currentRows
          .filter((row) => row.scanId && !scansById.has(row.scanId))
          .map((row) => row.productId.trim())
          .filter((productId) => productId.length > 0)
      )
    );
    const productIdsForDiscovery = Array.from(
      new Set([...untrackedProductIds, ...missingTrackedProductIds])
    );

    if (productIdsForDiscovery.length > 0) {
      const discoveredScans = await Promise.all(
        productIdsForDiscovery.map(async (productId) => {
          try {
            return {
              productId,
              response: await api.get<ProductScanListResponse>(
                `/api/v2/products/${productId}/scans`,
                {
                  cache: 'no-store',
                  params: { limit: 1 },
                }
              ),
              error: null,
            };
          } catch (error) {
            return {
              productId,
              response: null,
              error,
            };
          }
        })
      );
      if (sessionId !== modalSessionRef.current) {
        return;
      }

      discoveredScans.forEach(({ productId, response, error }) => {
        if (error) {
          discoveryFailedProductIds.add(productId);
          refreshError ??= error;
          return;
        }

        if (response?.scans) {
          scansByProductId.set(
            productId,
            response.scans.find((scan) => scan.productId === productId) ?? null
          );
        }
      });
    }

    const hadSuccessfulLookup =
      (scanIds.length > 0 && !trackedLookupFailed) ||
      scansByProductId.size > 0 ||
      (productIdsForDiscovery.length > 0 &&
        discoveryFailedProductIds.size < productIdsForDiscovery.length);
    if (!hadSuccessfulLookup && refreshError) {
      throw refreshError;
    }

    const terminalProductIds: string[] = [];
    const nextRows = currentRows.map((row) => {
      const currentDiscoveredScan = isDiscoveredScanCurrentForRow(
        row,
        scansByProductId.get(row.productId) ?? null
      )
        ? (scansByProductId.get(row.productId) ?? null)
        : null;
      const lookupUnavailable =
        (Boolean(row.scanId) && trackedLookupFailed && !scansById.has(row.scanId ?? '')) ||
        discoveryFailedProductIds.has(row.productId);
      if (lookupUnavailable && !currentDiscoveredScan && !scansById.get(row.scanId ?? '')) {
        return row;
      }
      const refreshedScan = row.scanId
        ? (scansById.get(row.scanId) ?? currentDiscoveredScan ?? null)
        : (currentDiscoveredScan ?? row.scan);
      const isMissingRefreshedScan =
        Boolean(row.scanId) && !scansById.get(row.scanId ?? '') && !currentDiscoveredScan;
      const scan = isMissingRefreshedScan ? null : refreshedScan;
      const status = scan?.status ?? row.status;
      const wasTerminal =
        row.status !== 'enqueuing' && isProductScanTerminalStatus(row.status);
      const hasNewTerminalScan =
        scan &&
        isProductScanTerminalStatus(scan.status) &&
        (!wasTerminal || scan.id !== row.scan?.id);
      if (isMissingRefreshedScan || hasNewTerminalScan) {
        terminalProductIds.push(row.productId);
      }
      if (isMissingRefreshedScan) {
        return {
          ...row,
          scanId: null,
          runId: null,
          status: 'failed' as const,
          message: MISSING_SCAN_RECORD_MESSAGE,
          scan: null,
        };
      }
      return {
        ...row,
        scanId: scan?.id ?? row.scanId,
        runId: scan?.engineRunId ?? row.runId,
        status,
        message:
          scan?.status === 'completed'
            ? (scan.asinUpdateMessage ?? null)
            : scan && isProductScanActiveStatus(scan.status)
              ? resolveActiveStatusMessage(scan.status, row.message)
            : scan && isProductScanTerminalStatus(scan.status)
              ? null
              : row.message,
        scan,
      };
    });

    rowsRef.current = nextRows;
    setRows(nextRows);

    if (sessionId !== modalSessionRef.current) {
      return;
    }
    await Promise.all(terminalProductIds.map(async (productId) => await invalidateProductViews(productId)));

    if (!nextRows.some((row) => row.status === 'enqueuing' || isProductScanActiveStatus(row.status))) {
      stopPolling();
    }
  }, [invalidateProductViews, stopPolling]);

  const handleRefreshFailure = useCallback(
    (error: unknown, options?: { stopPolling?: boolean; sessionId?: number }) => {
      if (
        typeof options?.sessionId === 'number' &&
        options.sessionId !== modalSessionRef.current
      ) {
        return;
      }
      if (options?.stopPolling) {
        stopPolling();
      }
      const message =
        error instanceof Error ? error.message : 'Failed to refresh Amazon scans.';
      toast(message, { variant: 'error' });
    },
    [stopPolling, toast]
  );

  const startPolling = useCallback((sessionId = modalSessionRef.current) => {
    stopPolling();
    if (sessionId !== modalSessionRef.current) {
      return;
    }
    setIsPolling(true);
    pollTimerRef.current = safeSetInterval(() => {
      void refreshScanRows(sessionId).catch((error: unknown) => {
        handleRefreshFailure(error, { stopPolling: true, sessionId });
      });
    }, 3000);
  }, [handleRefreshFailure, refreshScanRows, stopPolling]);

  const ensurePollingForTrackedActiveRows = useCallback((sessionId = modalSessionRef.current) => {
    if (sessionId !== modalSessionRef.current) {
      return;
    }

    if (
      !pollTimerRef.current &&
      rowsRef.current.some((row) => Boolean(row.scanId) && isProductScanActiveStatus(row.status))
    ) {
      startPolling(sessionId);
    }
  }, [startPolling]);

  const handleManualRefresh = useCallback(() => {
    const sessionId = modalSessionRef.current;
    void refreshScanRows(sessionId)
      .then(() => {
        ensurePollingForTrackedActiveRows(sessionId);
      })
      .catch((error: unknown) => {
        handleRefreshFailure(error, { sessionId });
      });
  }, [ensurePollingForTrackedActiveRows, handleRefreshFailure, refreshScanRows]);

  useEffect(() => {
    if (!isOpen) {
      modalSessionRef.current += 1;
      rowsRef.current = [];
      setRows([]);
      setIsSubmitting(false);
      stopPolling();
      return;
    }

    const sessionId = modalSessionRef.current + 1;
    modalSessionRef.current = sessionId;
    const selectedProductEntries = selectedProductsRef.current;
    if (selectedProductEntries.length === 0) {
      rowsRef.current = [];
      setRows([]);
      setIsSubmitting(false);
      stopPolling();
      return;
    }

    const initialRows = selectedProductEntries.map(({ productId, productName }) => ({
      productId,
      productName,
      requestedAt: new Date().toISOString(),
      scanId: null,
      runId: null,
      status: 'enqueuing' as const,
      message: null,
      scan: null,
    }));
    rowsRef.current = initialRows;
    setRows(initialRows);
    setIsSubmitting(true);

    void (async () => {
      try {
        const response = await api.post<ProductAmazonBatchScanResponse>(
          '/api/v2/products/scans/amazon/batch',
          { productIds: selectedProductEntries.map(({ productId }) => productId) }
        );
        if (sessionId !== modalSessionRef.current) {
          return;
        }

        const resultsByProductId = new Map(response.results.map((result) => [result.productId, result]));
        const summaryCounts = {
          queued: response.queued,
          running: response.running,
          alreadyRunning: response.alreadyRunning,
          failed: response.failed,
        };
        let toastMessage: string | null = null;
        let toastVariant: 'success' | 'warning' = 'success';

        const queuedRows: ScanModalRow[] = initialRows.map((row) => {
          const result = resultsByProductId.get(row.productId);
          if (!result) {
            summaryCounts.failed += 1;
            return {
              ...row,
              status: 'failed' as const,
              message: MISSING_BATCH_RESULT_MESSAGE,
            };
          }
          const resultIsActive =
            result.status === 'queued' ||
            result.status === 'running' ||
            result.status === 'already_running';
          if (resultIsActive && !result.scanId) {
            if (result.status === 'queued') {
              summaryCounts.queued = Math.max(0, summaryCounts.queued - 1);
            } else if (result.status === 'running') {
              summaryCounts.running = Math.max(0, summaryCounts.running - 1);
            } else {
              summaryCounts.alreadyRunning = Math.max(0, summaryCounts.alreadyRunning - 1);
            }
            summaryCounts.failed += 1;
            return {
              ...row,
              status: 'failed' as const,
              message: UNTRACKABLE_ACTIVE_SCAN_MESSAGE,
            };
          }
          const nextStatus: ScanModalRow['status'] =
            result.status === 'already_running'
              ? (result.currentStatus && isProductScanActiveStatus(result.currentStatus)
                  ? result.currentStatus
                  : 'running')
              : result.status;
          return {
            ...row,
            scanId: result.scanId,
            runId: result.runId,
            status: nextStatus,
            message: result.message,
          };
        });
        rowsRef.current = queuedRows;
        setRows(queuedRows);
        await Promise.all(
          Array.from(new Set(queuedRows.map((row) => row.productId))).map(
            async (productId) => await invalidateProductScans(queryClient, productId)
          )
        );

        const immediateTerminalProductIds = queuedRows
          .filter((row) => row.status === 'failed')
          .map((row) => row.productId);
        if (immediateTerminalProductIds.length > 0) {
          await Promise.all(
            immediateTerminalProductIds.map(
              async (productId) => await invalidateProductViews(productId)
            )
          );
        }

        if (queuedRows.some((row) => row.status === 'queued' || row.status === 'running')) {
          startPolling(sessionId);
          void refreshScanRows(sessionId).catch((error: unknown) => {
            handleRefreshFailure(error, { stopPolling: true, sessionId });
          });
        } else if (queuedRows.some((row) => !row.scanId)) {
          let recoveredRows = queuedRows;
          try {
            await refreshScanRows(sessionId);
            ensurePollingForTrackedActiveRows(sessionId);
            recoveredRows = rowsRef.current;
          } catch {
            recoveredRows = queuedRows;
          }

          const recoveredState = recoveredRows.some((row, index) => {
            const queuedRow = queuedRows[index];
            return (
              queuedRow?.scan !== row.scan ||
              queuedRow?.scanId !== row.scanId ||
              queuedRow?.runId !== row.runId ||
              queuedRow?.status !== row.status ||
              queuedRow?.message !== row.message
            );
          });
          if (recoveredState) {
            const recoveredSummary = buildToastSummaryFromRows(recoveredRows);
            toastMessage = recoveredSummary.message;
            toastVariant = recoveredSummary.variant;
          }
        }

        if (!toastMessage) {
          const totalFailedCount = summaryCounts.failed;
          const summary = [
            summaryCounts.queued > 0 && `${summaryCounts.queued} queued`,
            summaryCounts.running > 0 && `${summaryCounts.running} running`,
            summaryCounts.alreadyRunning > 0 &&
              `${summaryCounts.alreadyRunning} already in progress`,
            totalFailedCount > 0 && `${totalFailedCount} failed`,
          ]
            .filter(Boolean)
            .join(', ');
          toastMessage = summary ? `Amazon scans: ${summary}.` : 'No Amazon scans were queued.';
          toastVariant = totalFailedCount > 0 ? 'warning' : 'success';
        }

        if (sessionId !== modalSessionRef.current) {
          return;
        }
        toast(toastMessage, {
          variant: toastVariant,
        });
      } catch (error) {
        if (sessionId !== modalSessionRef.current) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Failed to enqueue Amazon scans.';
        const failedRows = initialRows.map((row) => ({
          ...row,
          status: 'failed' as const,
          message,
        }));
        rowsRef.current = failedRows;
        setRows(failedRows);
        await Promise.all(
          Array.from(new Set(initialRows.map((row) => row.productId))).map(
            async (productId) => await invalidateProductScans(queryClient, productId)
          )
        );
        await Promise.all(
          Array.from(new Set(initialRows.map((row) => row.productId))).map(
            async (productId) => await invalidateProductViews(productId)
          )
        );
        let recoveredState = false;
        try {
          await refreshScanRows(sessionId);
          ensurePollingForTrackedActiveRows(sessionId);
          const latestRows = rowsRef.current;
          recoveredState = latestRows.some((row, index) => {
            const failedRow = failedRows[index];
            return (
              failedRow?.scan !== row.scan ||
              failedRow?.scanId !== row.scanId ||
              failedRow?.runId !== row.runId ||
              failedRow?.status !== row.status ||
              failedRow?.message !== row.message
            );
          });
        } catch {
          // Keep the original enqueue failure visible when recovery probing also fails.
        }
        if (sessionId !== modalSessionRef.current || recoveredState) {
          return;
        }
        toast(message, { variant: 'error' });
      } finally {
        if (sessionId === modalSessionRef.current) {
          setIsSubmitting(false);
        }
      }
    })();

    return () => {
      if (modalSessionRef.current === sessionId) {
        modalSessionRef.current += 1;
      }
      stopPolling();
    };
  }, [ensurePollingForTrackedActiveRows, handleRefreshFailure, isOpen, refreshScanRows, selectedProductIdsKey, startPolling, stopPolling, toast]);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title='Amazon Reverse Image Scan'
      subtitle={formatSummary(rows)}
      size='lg'
      headerActions={
        <Button
          variant='ghost'
          size='sm'
          onClick={handleManualRefresh}
          disabled={isSubmitting}
          className='h-8 gap-1.5 px-2 text-xs'
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPolling ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {rows.length === 0 ? (
        <div className='flex min-h-[160px] items-center justify-center gap-3 text-sm text-muted-foreground'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Preparing Amazon scans...
        </div>
      ) : (
        <div className='space-y-3'>
          {rows.map((row) => (
            (() => {
              const { infoMessage, errorMessage } = resolveRowDisplayMessages(row);

              return (
                <section
                  key={row.productId}
                  className='space-y-2 rounded-md border border-border/60 px-4 py-4'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='text-sm font-medium'>{row.productName}</span>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[row.status]}`}
                      >
                        {row.status === 'running' ? <Loader2 className='mr-1 h-3 w-3 animate-spin' /> : null}
                        {STATUS_LABELS[row.status]}
                      </span>
                    </div>
                    <span className='text-xs text-muted-foreground'>
                      {formatTimestamp(row.scan?.createdAt)}
                    </span>
                  </div>

                  {row.scan?.title ? <p className='text-sm font-medium'>{row.scan.title}</p> : null}
                  {row.scan?.asin || row.scan?.price ? (
                    <p className='text-xs text-muted-foreground'>
                      {[row.scan?.asin && `ASIN ${row.scan.asin}`, row.scan?.price && `Price ${row.scan.price}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                  {row.scan?.url ? (
                    <a
                      href={row.scan.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                    >
                      Open Amazon Result
                      <ExternalLink className='h-3.5 w-3.5' />
                    </a>
                  ) : null}
                  {row.scan?.description ? (
                    <p className='line-clamp-3 text-sm text-muted-foreground'>{row.scan.description}</p>
                  ) : null}
                  {infoMessage ? <p className='text-sm text-muted-foreground'>{infoMessage}</p> : null}
                  {errorMessage ? <p className='text-sm text-destructive'>{errorMessage}</p> : null}
                </section>
              );
            })()
          ))}
        </div>
      )}
    </AppModal>
  );
}
