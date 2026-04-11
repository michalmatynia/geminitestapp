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

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
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

  const invalidateProductViews = useCallback(
    async (productId: string) => {
      await Promise.all([
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
    if (scanIds.length === 0) {
      stopPolling();
      return;
    }

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

    const scansById = new Map(response.scans.map((scan) => [scan.id, scan]));

    const terminalProductIds: string[] = [];
    const nextRows = currentRows.map((row) => {
      const scan = row.scanId ? (scansById.get(row.scanId) ?? row.scan) : row.scan;
      const status = scan?.status ?? row.status;
      const wasTerminal =
        row.status !== 'enqueuing' && isProductScanTerminalStatus(row.status);
      if (scan && isProductScanTerminalStatus(scan.status) && !wasTerminal) {
        terminalProductIds.push(row.productId);
      }
      return {
        ...row,
        status,
        message:
          scan?.status === 'completed'
            ? (scan.asinUpdateMessage ?? null)
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

  const startPolling = useCallback((sessionId = modalSessionRef.current) => {
    stopPolling();
    if (sessionId !== modalSessionRef.current) {
      return;
    }
    setIsPolling(true);
    pollTimerRef.current = safeSetInterval(() => {
      void refreshScanRows(sessionId).catch(() => undefined);
    }, 3000);
  }, [refreshScanRows, stopPolling]);

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
    const initialRows = productIds.map((productId) => ({
      productId,
      productName: productNamesById.get(productId) ?? productId,
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
          { productIds }
        );
        if (sessionId !== modalSessionRef.current) {
          return;
        }

        const resultsByProductId = new Map(response.results.map((result) => [result.productId, result]));

        const queuedRows = initialRows.map((row) => {
          const result = resultsByProductId.get(row.productId);
          if (!result) return row;
          const nextStatus: ScanModalRow['status'] =
            result.status === 'already_running' ? 'running' : result.status;
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

        if (response.results.some((result) => result.status === 'queued' || result.status === 'already_running')) {
          startPolling(sessionId);
          void refreshScanRows(sessionId).catch(() => undefined);
        }

        const summary = [
          response.queued > 0 && `${response.queued} queued`,
          response.alreadyRunning > 0 && `${response.alreadyRunning} already running`,
          response.failed > 0 && `${response.failed} failed`,
        ]
          .filter(Boolean)
          .join(', ');

        if (sessionId !== modalSessionRef.current) {
          return;
        }
        toast(summary ? `Amazon scans: ${summary}.` : 'No Amazon scans were queued.', {
          variant: response.failed > 0 ? 'warning' : 'success',
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
  }, [isOpen, productIds, productNamesById, refreshScanRows, startPolling, stopPolling, toast]);

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
          onClick={() => void refreshScanRows(modalSessionRef.current)}
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
                      rel='noreferrer'
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
