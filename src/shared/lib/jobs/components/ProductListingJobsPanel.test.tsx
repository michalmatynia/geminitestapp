import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useJobTableActionsRuntime,
  useJobTablePanelRuntime,
} from '@/shared/lib/jobs/components/context/JobTableRuntimeContext';
import ProductListingJobsPanel from '@/shared/lib/jobs/components/ProductListingJobsPanel';

const jobsProviderMock = vi.hoisted(() => vi.fn());
const useJobsActionsMock = vi.hoisted(() => vi.fn());
const useJobsStateMock = vi.hoisted(() => vi.fn());
const useProductListingJobsPropsMock = vi.hoisted(() => vi.fn());
const exportJobDetailModalMock = vi.hoisted(() => vi.fn());
const filterPanelMock = vi.hoisted(() => vi.fn());
const jobTableMock = vi.hoisted(() => vi.fn());

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: React.PropsWithChildren<{ href: string }>) => <a href={href}>{children}</a>,
}));

vi.mock('@/shared/lib/jobs/context/JobsContext', () => ({
  JobsProvider: jobsProviderMock,
  useJobsActions: useJobsActionsMock,
  useJobsState: useJobsStateMock,
}));

vi.mock('@/shared/lib/jobs/hooks/useProductListingJobsProps', () => ({
  useProductListingJobsProps: useProductListingJobsPropsMock,
}));

vi.mock('@/shared/lib/jobs/components/ExportJobDetailModal', () => ({
  ExportJobDetailModal: exportJobDetailModalMock,
}));

vi.mock('@/shared/ui/templates/FilterPanel', () => ({
  FilterPanel: filterPanelMock,
}));

vi.mock('@/shared/lib/jobs/components/JobTable', () => ({
  JobTable: jobTableMock,
}));

vi.mock('@/shared/ui', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid='alert'>{children}</div>,
  Button: ({
    asChild,
    children,
  }: React.PropsWithChildren<{ asChild?: boolean }>) =>
    asChild ? <div data-testid='button-as-child'>{children}</div> : <button>{children}</button>,
  FormSection: ({
    children,
    title,
  }: React.PropsWithChildren<{ title: string }>) => (
    <section data-testid={`form-section-${title}`}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  Hint: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MetadataItem: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>{`${label}:${String(value)}`}</div>
  ),
  Pagination: (props: {
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    page: number;
    pageSize: number;
    totalPages: number;
  }) => {
    const { onPageChange, onPageSizeChange, page, pageSize, totalPages } = props;
    return (
      <div data-testid='pagination'>
        <span>{`${page}/${totalPages}/${pageSize}`}</span>
        <button onClick={() => onPageChange(2)} type='button'>
          page-2
        </button>
        <button onClick={() => onPageSizeChange(50)} type='button'>
          size-50
        </button>
      </div>
    );
  },
  RefreshButton: ({
    isRefreshing,
    onRefresh,
  }: {
    isRefreshing: boolean;
    onRefresh: () => Promise<void> | void;
  }) => (
    <button data-refreshing={isRefreshing ? 'true' : 'false'} onClick={() => void onRefresh()} type='button'>
      Refresh
    </button>
  ),
  SectionHeader: ({
    actions,
    description,
    title,
  }: {
    actions?: React.ReactNode;
    description: string;
    title: string;
  }) => (
    <header data-testid='section-header'>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </header>
  ),
  StatusBadge: ({ status, variant }: { status: string; variant: string }) => (
    <div data-testid={`status-${status}`}>{`${status}:${variant}`}</div>
  ),
}));

describe('ProductListingJobsPanel', () => {
  const listingJob = {
    productId: 'prod-1',
    productName: 'Alpha Product',
    productSku: 'SKU-1',
    listings: [
      {
        id: 'listing-1',
        integrationName: 'Tradera',
        integrationSlug: 'tradera',
        connectionName: 'Main Store',
        status: 'pending',
        externalListingId: 'external-1',
        inventoryId: 'inventory-1',
      },
    ],
  };

  const selectedListing = {
    job: listingJob,
    listing: listingJob.listings[0],
  };

  beforeEach(() => {
    jobsProviderMock.mockReset();
    useJobsActionsMock.mockReset();
    useJobsStateMock.mockReset();
    useProductListingJobsPropsMock.mockReset();
    exportJobDetailModalMock.mockReset();
    filterPanelMock.mockReset();
    jobTableMock.mockReset();

    jobsProviderMock.mockImplementation(({ children }: { children: React.ReactNode }) => <>{children}</>);
    useJobsStateMock.mockReturnValue({
      listingJobsRefreshing: false,
      listingJobsError: null,
      listingJobs: [listingJob],
      traderaQueueHealth: {
        redisAvailable: true,
        mode: 'bullmq',
        queues: {
          listings: {
            running: true,
            waitingCount: 3,
            activeCount: 1,
            failedCount: 2,
          },
          relistScheduler: {
            running: true,
            waitingCount: 4,
            activeCount: 2,
          },
        },
      },
      traderaQueueHealthLoading: false,
      query: 'SKU-1',
      pageSize: 25,
      selectedListing,
    });
    useJobsActionsMock.mockReturnValue({
      refetchListingJobs: vi.fn().mockResolvedValue(undefined),
      setQuery: vi.fn(),
      setPage: vi.fn(),
      setPageSize: vi.fn(),
      setSelectedListing: vi.fn(),
      confirmCancelListing: vi.fn(),
      isCancellingListing: vi.fn(() => false),
      ConfirmationModal: () => <div data-testid='confirmation-modal'>confirmation</div>,
    });
    useProductListingJobsPropsMock.mockReturnValue({
      tableData: [
        {
          id: 'listing-1',
          status: 'pending',
          progress: 0,
          error: null,
          createdAt: '2026-03-25T10:00:00.000Z',
          startedAt: '2026-03-25T10:00:00.000Z',
          finishedAt: null,
          entityName: 'Alpha Product',
          entitySubText: 'SKU: SKU-1',
          productId: 'prod-1',
          type: 'Export: Tradera',
        },
      ],
      isLoading: false,
      totalRows: 1,
      totalPages: 1,
      clampedPage: 1,
      startIndex: 0,
      endIndex: 1,
    });
    exportJobDetailModalMock.mockImplementation(
      ({
        isOpen,
        item,
        onClose,
      }: {
        isOpen: boolean;
        item: { listing?: { id?: string } } | null;
        onClose: () => void;
      }) => (
        <div data-open={isOpen ? 'true' : 'false'} data-testid='export-job-detail-modal'>
          {item?.listing?.id ?? 'none'}
          <button onClick={onClose} type='button'>
            close-modal
          </button>
        </div>
      )
    );
    filterPanelMock.mockImplementation(
      ({
        onFilterChange,
        onReset,
        onSearchChange,
        search,
        values,
      }: {
        onFilterChange: (key: string, value: string) => void;
        onReset: () => void;
        onSearchChange: (value: string) => void;
        search: string;
        values: Record<string, string>;
      }) => (
        <div data-testid='filter-panel'>
          <span>{values.query}</span>
          <span>{search}</span>
          <button onClick={() => onFilterChange('query', 'needle')} type='button'>
            filter-query
          </button>
          <button onClick={() => onSearchChange('search-value')} type='button'>
            search-query
          </button>
          <button onClick={onReset} type='button'>
            reset-query
          </button>
        </div>
      )
    );
    jobTableMock.mockImplementation(
      ({
        data,
        isLoading,
      }: {
        data: Array<{ id: string }>;
        isLoading?: boolean;
      }) => {
        const panel = useJobTablePanelRuntime();
        const actions = useJobTableActionsRuntime();

        return (
          <div data-testid='job-table'>
            <div>{`table:${data.length}:${isLoading ? 'true' : 'false'}`}</div>
            {panel.header}
            {panel.alerts}
            {panel.filters}
            {panel.footer}
            <button onClick={() => actions.onViewDetails('listing-1')} type='button'>
              view-listing
            </button>
            <button onClick={() => actions.onCancel('listing-1')} type='button'>
              cancel-listing
            </button>
          </div>
        );
      }
    );
  });

  it('renders job panel state, wires filters and refresh, and maps row actions to jobs state actions', () => {
    const actions = useJobsActionsMock();

    render(<ProductListingJobsPanel />);

    expect(screen.getByTestId('section-header')).toHaveTextContent('Export Jobs');
    expect(screen.getByText('Track product export and listing jobs across all integrations')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Products' })).toHaveAttribute(
      'href',
      '/admin/products'
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute('data-refreshing', 'false');
    expect(screen.getByTestId('job-table')).toHaveTextContent('table:1:false');
    expect(screen.getByTestId('filter-panel')).toHaveTextContent('SKU-1');
    expect(screen.getByTestId('pagination')).toHaveTextContent('1/1/25');

    expect(screen.getByTestId('status-Redis Up')).toHaveTextContent('Redis Up:success');
    expect(screen.getByTestId('status-Active')).toHaveTextContent('Active:success');
    expect(screen.getByTestId('status-Polling')).toHaveTextContent('Polling:success');
    expect(screen.getByText('Wait:3')).toBeInTheDocument();
    expect(screen.getByText('Pending:4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'filter-query' }));
    fireEvent.click(screen.getByRole('button', { name: 'search-query' }));
    fireEvent.click(screen.getByRole('button', { name: 'reset-query' }));
    fireEvent.click(screen.getByRole('button', { name: 'page-2' }));
    fireEvent.click(screen.getByRole('button', { name: 'size-50' }));
    fireEvent.click(screen.getByRole('button', { name: 'view-listing' }));
    fireEvent.click(screen.getByRole('button', { name: 'cancel-listing' }));
    fireEvent.click(screen.getByRole('button', { name: 'close-modal' }));

    expect(actions.refetchListingJobs).toHaveBeenCalledTimes(1);
    expect(actions.setQuery).toHaveBeenNthCalledWith(1, 'needle');
    expect(actions.setQuery).toHaveBeenNthCalledWith(2, 'search-value');
    expect(actions.setQuery).toHaveBeenNthCalledWith(3, '');
    expect(actions.setPage).toHaveBeenCalledWith(2);
    expect(actions.setPageSize).toHaveBeenCalledWith(50);
    expect(actions.setSelectedListing).toHaveBeenCalledWith(selectedListing);
    expect(actions.confirmCancelListing).toHaveBeenCalledWith('prod-1', 'listing-1');
    expect(actions.setSelectedListing).toHaveBeenCalledWith(null);

    expect(screen.getByTestId('export-job-detail-modal')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('export-job-detail-modal')).toHaveTextContent('listing-1');
    expect(screen.getByTestId('confirmation-modal')).toHaveTextContent('confirmation');
  });

  it('suppresses filters and footer when loading or errored, and respects the back-link flag', () => {
    useJobsStateMock.mockReturnValue({
      listingJobsRefreshing: true,
      listingJobsError: new Error('queue failed'),
      listingJobs: [listingJob],
      traderaQueueHealth: null,
      traderaQueueHealthLoading: true,
      query: '',
      pageSize: 25,
      selectedListing: null,
    });
    useProductListingJobsPropsMock.mockReturnValue({
      tableData: [],
      isLoading: true,
      totalRows: 0,
      totalPages: 1,
      clampedPage: 1,
      startIndex: 0,
      endIndex: 0,
    });

    render(<ProductListingJobsPanel showBackToProducts={false} />);

    expect(screen.queryByRole('link', { name: 'Back to Products' })).not.toBeInTheDocument();
    expect(screen.getByTestId('alert')).toHaveTextContent('queue failed');
    expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();

    expect(screen.getByText('Scanning...')).toBeInTheDocument();
    expect(screen.getByTestId('status-No Redis')).toHaveTextContent('No Redis:error');
    expect(screen.getAllByTestId('status-Paused')).toHaveLength(1);
    expect(screen.getByTestId('status-Idle')).toHaveTextContent('Idle:warning');
    expect(screen.getByTestId('export-job-detail-modal')).toHaveAttribute('data-open', 'false');
    expect(screen.getByTestId('job-table')).toHaveTextContent('table:0:true');
  });
});
