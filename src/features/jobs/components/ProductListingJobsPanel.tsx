'use client';

import Link from 'next/link';

import { JobsProvider, useJobsContext } from '@/features/jobs/context/JobsContext';
import { useProductListingJobsProps } from '@/features/jobs/hooks/useProductListingJobsProps';
import {
  Button,
  SectionHeader,
  StatusBadge,
  Pagination,
  DynamicFilters,
  RefreshButton,
  type FilterField,
  FormSection,
  Alert,
  MetadataItem,
} from '@/shared/ui';

import { ProductListingJobsPanelViewProvider, useProductListingJobsPanelView } from './context/ProductListingJobsPanelViewContext';
import { ExportJobDetailModal } from './ExportJobDetailModal';
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
    ConfirmationModal,
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
    <div className='space-y-4'>
      {error && (
        <Alert variant='error'>{error.message}</Alert>
      )}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <FormSection title='Tradera Status' variant='subtle-compact' className='p-3'>
          <div className='flex items-center justify-between'>
            <span className='text-[10px] text-gray-500 uppercase font-bold'>Runtime Mode</span>
            <StatusBadge status={traderaQueueHealth?.redisAvailable ? 'Redis Up' : 'No Redis'} variant={traderaQueueHealth?.redisAvailable ? 'success' : 'error'} className='text-[9px]' />
          </div>
          
          <div className='mt-2 text-xs text-gray-300 font-medium'>
            {traderaQueueHealthLoading ? 'Scanning...' : traderaQueueHealth?.mode ?? 'Unknown'}
          </div>
        </FormSection>

        <FormSection title='Listing Queue' variant='subtle-compact' className='p-3'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-[10px] text-gray-500 uppercase font-bold'>Health</span>
            <StatusBadge status={traderaListingsQueue?.running ? 'Active' : 'Paused'} variant={traderaListingsQueue?.running ? 'success' : 'warning'} className='text-[9px]' />
          </div>
          
          <div className='grid grid-cols-3 gap-1'>
            <MetadataItem
              label='Wait'
              value={traderaListingsQueue?.waitingCount ?? 0}
              valueClassName='text-blue-400 text-center font-bold'
              className='p-1.5'
            />
            <MetadataItem
              label='Busy'
              value={traderaListingsQueue?.activeCount ?? 0}
              valueClassName='text-amber-400 text-center font-bold'
              className='p-1.5'
            />
            <MetadataItem
              label='Fail'
              value={traderaListingsQueue?.failedCount ?? 0}
              valueClassName='text-rose-400 text-center font-bold'
              className='p-1.5'
            />
          </div>
        </FormSection>

        <FormSection title='Relist Scheduler' variant='subtle-compact' className='p-3'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-[10px] text-gray-500 uppercase font-bold'>Service</span>
            <StatusBadge status={traderaSchedulerQueue?.running ? 'Polling' : 'Idle'} variant={traderaSchedulerQueue?.running ? 'success' : 'warning'} className='text-[9px]' />
          </div>
          
          <div className='grid grid-cols-2 gap-1'>
            <MetadataItem
              label='Pending'
              value={traderaSchedulerQueue?.waitingCount ?? 0}
              valueClassName='text-blue-400 text-center font-bold'
              className='p-1.5'
            />
            <MetadataItem
              label='Active'
              value={traderaSchedulerQueue?.activeCount ?? 0}
              valueClassName='text-amber-400 text-center font-bold'
              className='p-1.5'
            />
          </div>
        </FormSection>
      </div>
    </div>
  );

  return (
    <>
      <JobTable
        data={tableData}
        isLoading={isLoading}
        header={header}
        alerts={alerts}
        filters={filters}
        footer={footer}
      />
      <ExportJobDetailModal
        isOpen={Boolean(selectedListing)}
        onClose={() => setSelectedListing(null)}
        item={selectedListing}
      />
      <ConfirmationModal />
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
