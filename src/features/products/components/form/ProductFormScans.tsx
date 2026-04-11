'use client';

import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import type { ProductScanListResponse, ProductScanRecord, ProductScanStatus } from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Button } from '@/shared/ui/button';

const STATUS_LABELS: Record<ProductScanStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  no_match: 'No Match',
  conflict: 'Conflict',
  failed: 'Failed',
};

const STATUS_CLASSES: Record<ProductScanStatus, string> = {
  queued: 'border-border/70 text-muted-foreground',
  running: 'border-blue-500/40 text-blue-300',
  completed: 'border-emerald-500/40 text-emerald-300',
  no_match: 'border-amber-500/40 text-amber-300',
  conflict: 'border-orange-500/40 text-orange-300',
  failed: 'border-destructive/40 text-destructive',
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

export default function ProductFormScans(): React.JSX.Element {
  const { product } = useProductFormCore();
  const productId = product?.id?.trim() || '';

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

  if (scansQuery.isError) {
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

  const scans = scansQuery.data?.scans ?? [];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-sm font-medium'>Scan History</h3>
          <p className='text-xs text-muted-foreground'>
            Amazon reverse image scans for this product.
          </p>
        </div>
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

      {scans.length === 0 ? (
        <div className='rounded-md border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground'>
          No scans have been recorded for this product yet.
        </div>
      ) : (
        <div className='space-y-3'>
          {scans.map((scan) => (
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
                  rel='noreferrer'
                  className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                >
                  Open Result
                  <ExternalLink className='h-3.5 w-3.5' />
                </a>
              ) : null}
              {scan.description ? (
                <p className='line-clamp-3 text-sm text-muted-foreground'>{scan.description}</p>
              ) : null}
              {scan.error ? <p className='text-sm text-destructive'>{scan.error}</p> : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
