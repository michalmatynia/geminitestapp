'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';

import { JobsProvider, useJobsContext } from '@/features/jobs/context/JobsContext';
import { useProductListingJobsProps } from '@/features/jobs/hooks/useProductListingJobsProps';
import { getStatusIcon } from '@/features/jobs/utils/job-icons';
import { Button, AppModal, ListPanel, SectionHeader, StatusBadge, Pagination, DynamicFilters, RefreshButton, type FilterField } from '@/shared/ui';

import { ProductListingJobsPanelViewProvider, useProductListingJobsPanelView } from './context/ProductListingJobsPanelViewContext';
import { JobTable } from './JobTable';

type ProductListingJobsPanelProps = {
  showBackToProducts?: boolean;
};

function ProductListingJobsPanelContent(): React.JSX.Element {
  const { showBackToProducts } = useProductListingJobsPanelView();
  const {
    listingJobsRefreshing: isRefreshing,
    refetchListingJobs: refetch,
    listingJobsError: error,
    traderaQueueHealth,
    traderaQueueHealthLoading,
    query,
    setQuery,
    setPage,
    pageSize,
    setPageSize,
    selectedListing,
    setSelectedListing,
  } = useJobsContext();

  const {
    tableData,
    isLoading,
    totalRows,
    totalPages,
    clampedPage,
    startIndex,
    endIndex,
  } = useProductListingJobsProps();

  const formatDateTime = (value: Date | string | null): string => {
    if (!value) return '—';
    const date: Date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  const selectedStatus = selectedListing?.listing.status ?? '';
  const traderaListingsQueue = traderaQueueHealth?.queues.listings ?? null;
  const traderaSchedulerQueue =
    traderaQueueHealth?.queues.relistScheduler ?? null;

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
            <Button asChild variant='outline' size='xs'>
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
      onChange={(_, value) => setQuery(Array.isArray(value) ? (value[0] ?? '') : value)}
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

  const alerts = (
    <div className='space-y-3'>
      {error ? (
        <div className='rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
          {error.message}
        </div>
      ) : null}
      <div className='grid grid-cols-1 gap-2 md:grid-cols-3'>
        <div className='rounded-md border border-border/70 bg-card/60 px-3 py-2 text-xs text-gray-300'>
          <div className='uppercase tracking-wide text-gray-500'>Tradera mode</div>
          <div className='mt-1 text-sm text-white'>
            {traderaQueueHealthLoading
              ? 'Loading...'
              : traderaQueueHealth
                ? `${traderaQueueHealth.mode} (${traderaQueueHealth.redisAvailable ? 'redis up' : 'redis unavailable'})`
                : 'Unavailable'}
          </div>
        </div>
        <div className='rounded-md border border-border/70 bg-card/60 px-3 py-2 text-xs text-gray-300'>
          <div className='uppercase tracking-wide text-gray-500'>Listing queue</div>
          <div className='mt-1 text-sm text-white'>
            {traderaListingsQueue
              ? `running=${traderaListingsQueue.running ? 'yes' : 'no'} waiting=${traderaListingsQueue.waitingCount} active=${traderaListingsQueue.activeCount} failed=${traderaListingsQueue.failedCount}`
              : 'Not registered'}
          </div>
        </div>
        <div className='rounded-md border border-border/70 bg-card/60 px-3 py-2 text-xs text-gray-300'>
          <div className='uppercase tracking-wide text-gray-500'>Relist scheduler</div>
          <div className='mt-1 text-sm text-white'>
            {traderaSchedulerQueue
              ? `running=${traderaSchedulerQueue.running ? 'yes' : 'no'} waiting=${traderaSchedulerQueue.waitingCount} active=${traderaSchedulerQueue.activeCount}`
              : 'Not registered'}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ListPanel
        header={header}
        alerts={alerts}
        filters={filters}
        footer={footer}
      >
        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='size-8 animate-spin text-gray-500' />
          </div>
        ) : !error ? (
          <JobTable
            data={tableData}
            isLoading={isLoading}
          />
        ) : null}
      </ListPanel>
      {selectedListing && (
        <AppModal
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
        </AppModal>
      )}
    </>
  );
}

export default function ProductListingJobsPanel(props: ProductListingJobsPanelProps): React.JSX.Element {
  const { showBackToProducts = true } = props;
  return (
    <JobsProvider>
      <ProductListingJobsPanelViewProvider value={{ showBackToProducts }}>
        <ProductListingJobsPanelContent />
      </ProductListingJobsPanelViewProvider>
    </JobsProvider>
  );
}
