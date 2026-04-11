'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { PRODUCT_SCANNER_SETTINGS_HREF } from '@/features/products/scanner-settings';
import type { ProductScanListResponse, ProductScanRecord, ProductScanStatus } from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import { api } from '@/shared/lib/api-client';
import { invalidateProductsCountsAndDetail } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Button } from '@/shared/ui/button';

const STATUS_LABELS: Record<ProductScanStatus, string> = {
  enqueuing: 'Enqueuing...',
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  no_match: 'No Match',
  conflict: 'Conflict',
  failed: 'Failed',
};

const STATUS_CLASSES: Record<ProductScanStatus, string> = {
  enqueuing: 'border-border/70 text-muted-foreground',
  queued: 'border-border/70 text-muted-foreground',
  running: 'border-blue-500/40 text-blue-300',
  completed: 'border-emerald-500/40 text-emerald-300',
  no_match: 'border-amber-500/40 text-amber-300',
  conflict: 'border-orange-500/40 text-orange-300',
  failed: 'border-destructive/40 text-destructive',
};

const resolveActiveStatusMessage = (status: ProductScanStatus): string | null => {
  if (status === 'queued') {
    return 'Amazon reverse image scan queued.';
  }

  if (status === 'running') {
    return 'Amazon reverse image scan running.';
  }

  return null;
};

const normalizeComparableAsin = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const renderScanMeta = (scan: ProductScanRecord): React.JSX.Element | null => {
  const parts = [scan.asin && `ASIN ${scan.asin}`, scan.price && `Price ${scan.price}`].filter(
    Boolean
  );

  if (parts.length === 0) {
    return null;
  }

  return <p className='text-xs text-muted-foreground'>{parts.join(' · ')}</p>;
};

const resolveScanMessages = (
  scan: ProductScanRecord
): { infoMessage: string | null; errorMessage: string | null } => {
  if (scan.status === 'completed') {
    return {
      infoMessage: scan.asinUpdateMessage,
      errorMessage: null,
    };
  }

  if (scan.status === 'no_match') {
    return {
      infoMessage: scan.asinUpdateMessage ?? scan.error,
      errorMessage: null,
    };
  }

  if (scan.status === 'conflict' || scan.status === 'failed') {
    return {
      infoMessage: null,
      errorMessage: scan.error ?? scan.asinUpdateMessage,
    };
  }

  if (isProductScanActiveStatus(scan.status)) {
    return {
      infoMessage: scan.asinUpdateMessage ?? resolveActiveStatusMessage(scan.status),
      errorMessage: scan.error,
    };
  }

  return {
    infoMessage: scan.asinUpdateMessage,
    errorMessage: scan.error,
  };
};

export default function ProductFormScans(): React.JSX.Element {
  const { product } = useProductFormCore();
  const productId = product?.id?.trim() || '';
  const queryClient = useQueryClient();
  const invalidatedUpdatedScanIdsRef = useRef<Set<string>>(new Set());
  const pendingUpdatedScanIdsRef = useRef<Set<string>>(new Set());
  const invalidationSessionRef = useRef(0);

  const scansQuery = useQuery<ProductScanListResponse, Error>({
    queryKey: QUERY_KEYS.products.scans(productId),
    enabled: productId.length > 0,
    queryFn: async () =>
      await api.get<ProductScanListResponse>(`/api/v2/products/${productId}/scans`, {
        cache: 'no-store',
      }),
    refetchInterval: (query) => {
      const scans = query.state.data?.scans ?? [];
      return scans.some((scan) => isProductScanActiveStatus(scan.status)) ? 3000 : false;
    },
  });
  const scans = scansQuery.data?.scans ?? [];
  const scansDataUpdatedAt = scansQuery.dataUpdatedAt;

  useEffect(() => {
    invalidationSessionRef.current += 1;
    invalidatedUpdatedScanIdsRef.current = new Set();
    pendingUpdatedScanIdsRef.current = new Set();
  }, [productId]);

  useEffect(() => {
    if (!productId || scans.length === 0) {
      return;
    }

    const currentProductAsin = normalizeComparableAsin(product?.asin);
    const unseenUpdatedScanIds = scans
      .filter((scan) => {
        if (scan.asinUpdateStatus !== 'updated') {
          return false;
        }

        const scanAsin = normalizeComparableAsin(scan.asin);
        return !scanAsin || scanAsin !== currentProductAsin;
      })
      .map((scan) => scan.id)
      .filter(
        (scanId) =>
          !invalidatedUpdatedScanIdsRef.current.has(scanId) &&
          !pendingUpdatedScanIdsRef.current.has(scanId)
      );

    if (unseenUpdatedScanIds.length === 0) {
      return;
    }

    unseenUpdatedScanIds.forEach((scanId) => {
      pendingUpdatedScanIdsRef.current.add(scanId);
    });

    const invalidationSession = invalidationSessionRef.current;
    void invalidateProductsCountsAndDetail(queryClient, productId)
      .then(() => {
        if (invalidationSession !== invalidationSessionRef.current) {
          return;
        }
        unseenUpdatedScanIds.forEach((scanId) => {
          pendingUpdatedScanIdsRef.current.delete(scanId);
          invalidatedUpdatedScanIdsRef.current.add(scanId);
        });
      })
      .catch(() => {
        if (invalidationSession !== invalidationSessionRef.current) {
          return;
        }
        unseenUpdatedScanIds.forEach((scanId) => {
          pendingUpdatedScanIdsRef.current.delete(scanId);
        });
      });
  }, [product?.asin, productId, queryClient, scans, scansDataUpdatedAt]);

  if (!productId) {
    return (
      <div className='rounded-md border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground'>
        Save the product before using scans.
      </div>
    );
  }

  if (scansQuery.isLoading) {
    return (
      <div className='flex min-h-[160px] items-center justify-center gap-3 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' />
        Loading scans...
      </div>
    );
  }

  if (scansQuery.isError && scans.length === 0) {
    return (
      <div className='space-y-3 rounded-md border border-destructive/40 px-4 py-5'>
        <p className='text-sm text-destructive'>
          {scansQuery.error.message || 'Failed to load product scans.'}
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => void scansQuery.refetch()}
          className='h-8 gap-1.5 px-3 text-xs'
        >
          <RefreshCw className='h-3.5 w-3.5' />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-sm font-medium'>Scan History</h3>
          <p className='text-xs text-muted-foreground'>
            Amazon reverse image scans for this product.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button type='button' variant='outline' size='sm' asChild className='h-8 px-3 text-xs'>
            <Link href={PRODUCT_SCANNER_SETTINGS_HREF}>Scanner settings</Link>
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => void scansQuery.refetch()}
            disabled={scansQuery.isFetching}
            className='h-8 gap-1.5 px-3 text-xs'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scansQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {scansQuery.isError ? (
        <div className='rounded-md border border-amber-500/40 px-4 py-3 text-sm text-amber-300'>
          {scansQuery.error.message || 'Failed to refresh product scans.'}
        </div>
      ) : null}

      {scans.length === 0 ? (
        <div className='rounded-md border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground'>
          No scans have been recorded for this product yet.
        </div>
      ) : (
        <div className='space-y-3'>
          {scans.map((scan) => {
            const { infoMessage, errorMessage } = resolveScanMessages(scan);

            return (
              <section
                key={scan.id}
                className='space-y-2 rounded-md border border-border/60 px-4 py-4'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-medium'>Amazon</span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[scan.status]}`}
                    >
                      {STATUS_LABELS[scan.status]}
                    </span>
                  </div>
                  <span className='text-xs text-muted-foreground'>
                    {formatTimestamp(scan.createdAt)}
                  </span>
                </div>

                {scan.title ? <p className='text-sm font-medium'>{scan.title}</p> : null}
                {renderScanMeta(scan)}
                {scan.url ? (
                  <a
                    href={scan.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                  >
                    Open Result
                    <ExternalLink className='h-3.5 w-3.5' />
                  </a>
                ) : null}
                {scan.description ? (
                  <p className='line-clamp-3 text-sm text-muted-foreground'>{scan.description}</p>
                ) : null}
                {infoMessage ? <p className='text-sm text-muted-foreground'>{infoMessage}</p> : null}
                {errorMessage ? <p className='text-sm text-destructive'>{errorMessage}</p> : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
