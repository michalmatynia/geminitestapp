'use client';

import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { JobsProvider, useJobsContext } from '@/features/jobs/context/JobsContext';
import type { ListingJob, ProductJob } from '@/shared/types/domain/listing-jobs';
import { Button, SharedModal, ListPanel, SectionHeader, StatusBadge, Pagination, DynamicFilters, RefreshButton, type FilterField } from '@/shared/ui';

import { JobTable, type JobRowData } from './JobTable';

type ProductListingJobsPanelProps = {
  showBackToProducts?: boolean;
};

type ListingRow = {
  job: ProductJob;
  listing: ListingJob;
};

const getStatusIcon = (status: string): React.JSX.Element => {
  switch (status) {
    case 'pending':
      return <Clock className='size-3' />;
    case 'completed':
    case 'success':
    case 'listed':
      return <CheckCircle className='size-3' />;
    case 'deleted':
    case 'removed':
      return <XCircle className='size-3' />;
    case 'failed':
    case 'error':
      return <XCircle className='size-3' />;
    case 'processing':
    case 'running':
    case 'in_progress':
      return <Loader2 className='size-3 animate-spin' />;
    default:
      return <Clock className='size-3' />;
  }
};

function ProductListingJobsPanelContent({
  showBackToProducts = true,
}: ProductListingJobsPanelProps): React.JSX.Element {
  const {
    listingJobs: jobs,
    listingJobsLoading: isLoading,
    listingJobsRefreshing: isRefreshing,
    refetchListingJobs: refetch,
    listingJobsError: error,
    query,
    setQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    selectedListing,
    setSelectedListing,
  } = useJobsContext();

  const formatDateTime = (value: Date | string | null): string => {
    if (!value) return '—';
    const date: Date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  const listingRows: ListingRow[] = useMemo(
    () =>
      jobs.flatMap((job: ProductJob) =>
        job.listings.map((listing: ListingJob) => ({
          job,
          listing,
        }))
      ),
    [jobs]
  );

  const filteredRows = useMemo(() => listingRows.filter(({ job, listing }: ListingRow) => {
    if (!query.trim()) return true;
    const target = [
      job.productName,
      job.productSku ?? '',
      job.productId,
      listing.integrationName,
      listing.connectionName,
      listing.id,
      listing.externalListingId ?? '',
      listing.inventoryId ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return target.includes(query.trim().toLowerCase());
  }), [listingRows, query]);

  const sortedRows = useMemo(() => [...filteredRows].sort((a: ListingRow, b: ListingRow) => {
    const aTime: number = new Date(a.listing.updatedAt ?? a.listing.createdAt).getTime();
    const bTime: number = new Date(b.listing.updatedAt ?? b.listing.createdAt).getTime();
    return bTime - aTime;
  }), [filteredRows]);

  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedRows = sortedRows.slice(startIndex, endIndex);

  const selectedStatus = selectedListing?.listing.status ?? '';

  const header = (
    <SectionHeader
      title='Export Jobs'
      description='Track product export and listing jobs across all integrations'
      size='md'
      actions={
        <>
          <RefreshButton
            onRefresh={() => void refetch()}
            isRefreshing={isRefreshing}
          />
          {showBackToProducts && (
            <Button asChild variant='outline' size='sm'>
              <Link href='/admin/products'>Back to Products</Link>
            </Button>
          )}
        </>
      }
    />
  );

  const filterFields: FilterField[] = [
    { key: 'query', label: 'Search', type: 'search', placeholder: 'Search by product, SKU, integration, or ID...' },
  ];

  const filters = !isLoading && !error ? (
    <DynamicFilters
      fields={filterFields}
      values={{ query }}
      onChange={(_, value) => setQuery(value)}
      onReset={() => setQuery('')}
      hasActiveFilters={Boolean(query)}
    />
  ) : null;

  const footer = !isLoading && !error ? (
    <div className='flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4'>
      <div className='text-xs text-gray-400'>
        Showing {totalRows === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, totalRows)} of {totalRows}
      </div>
      <Pagination
        page={clampedPage}
        totalPages={totalPages}
        onPageChange={setPage}
        showPageSize
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        variant='compact'
      />
    </div>
  ) : null;

  return (
    <>
      <ListPanel
        header={header}
        alerts={
          error ? (
            <div className='rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
              {error.message}
            </div>
          ) : null
        }
        filters={filters}
        footer={footer}
      >
        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='size-8 animate-spin text-gray-500' />
          </div>
        ) : !error ? (
          <JobTable
            data={pagedRows.map((row: ListingRow): JobRowData => {
              const { job, listing } = row;
              const status = listing.status ?? 'unknown';
              const typeLabel =
                status === 'deleted' || status === 'removed' ? 'Removal' : 'Export';
              
              return {
                id: listing.id,
                type: `${typeLabel}: ${listing.integrationName}`,
                status: status as JobRowData['status'],
                entityName: job.productName,
                entitySubText: `SKU: ${job.productSku || 'N/A'} · Listing`,
                productId: job.productId,
                createdAt: listing.createdAt,
                finishedAt: listing.updatedAt,
              };
            })}
            isLoading={isLoading}
          />
        ) : null}
      </ListPanel>
      {selectedListing && (
        <SharedModal
          open={true}
          onClose={(): void => setSelectedListing(null)}
          title='Export Job Details'
          size='lg'
        >
          <div className='space-y-6 text-sm'>
            <div className='grid grid-cols-2 gap-4 rounded-md bg-gray-900 p-4'>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Status</div>
                <div className='mt-1'>
                  <StatusBadge 
                    status={selectedStatus || selectedListing.listing.status} 
                    icon={getStatusIcon(selectedStatus || selectedListing.listing.status)}
                  />
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Integration</div>
                <div className='text-white font-medium'>
                  {selectedListing.listing.integrationName}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Connection</div>
                <div className='text-white font-medium'>
                  {selectedListing.listing.connectionName}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Product</div>
                <div className='text-white font-medium'>
                  {selectedListing.job.productName}
                </div>
                <div className='text-xs text-gray-500'>
                    SKU: {selectedListing.job.productSku ?? '—'}
                </div>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4 rounded-md border border-border bg-card/60 p-4'>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Job ID</div>
                <div className='text-white font-mono text-xs'>
                  {selectedListing.listing.id}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>External ID</div>
                <div className='text-white font-mono text-xs'>
                  {selectedListing.listing.externalListingId ?? '—'}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Inventory ID</div>
                <div className='text-white font-mono text-xs'>
                  {selectedListing.listing.inventoryId ?? '—'}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Created</div>
                <div className='text-white'>
                  {formatDateTime(selectedListing.listing.createdAt)}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Updated</div>
                <div className='text-white'>
                  {formatDateTime(selectedListing.listing.updatedAt)}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Listed At</div>
                <div className='text-white'>
                  {formatDateTime(selectedListing.listing.listedAt)}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Integration ID</div>
                <div className='text-white font-mono text-xs'>
                  {selectedListing.listing.integrationId}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Integration Slug</div>
                <div className='text-white font-mono text-xs'>
                  {selectedListing.listing.integrationSlug}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Connection ID</div>
                <div className='text-white font-mono text-xs'>
                  {selectedListing.listing.connectionId}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Product ID</div>
                <div className='text-white font-mono text-xs'>
                  {selectedListing.job.productId}
                </div>
              </div>
              <div>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>Product Link</div>
                <Link
                  href={`/admin/products?id=${selectedListing.job.productId}`}
                  className='text-blue-400 hover:text-blue-300'
                >
                    Open product
                </Link>
              </div>
            </div>


            <div className='grid grid-cols-1 gap-6'>
              <div className='space-y-2'>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>
                    Listing Payload
                </div>
                <pre className='max-h-72 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-400 border border-border'>
                  {JSON.stringify(selectedListing.listing, null, 2)}
                </pre>
              </div>
              <div className='space-y-2'>
                <div className='text-gray-500 uppercase text-[10px] font-bold'>
                    Job Payload
                </div>
                <pre className='max-h-72 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-400 border border-border'>
                  {JSON.stringify(selectedListing.job, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </SharedModal>
      )}
    </>
  );
}

export default function ProductListingJobsPanel(props: ProductListingJobsPanelProps): React.JSX.Element {
  return (
    <JobsProvider>
      <ProductListingJobsPanelContent {...props} />
    </JobsProvider>
  );
}