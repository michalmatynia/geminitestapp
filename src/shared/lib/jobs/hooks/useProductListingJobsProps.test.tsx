import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductListingJobsProps } from '@/shared/lib/jobs/hooks/useProductListingJobsProps';

const useJobsStateMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/jobs/context/JobsContext', () => ({
  useJobsState: useJobsStateMock,
}));

describe('useProductListingJobsProps', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T12:30:00.000Z'));
    useJobsStateMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters, sorts, paginates, and maps listings into table rows', () => {
    useJobsStateMock.mockReturnValue({
      listingJobsLoading: false,
      query: 'tradera',
      page: 1,
      pageSize: 2,
      listingJobs: [
        {
          productId: 'prod-1',
          productName: 'Alpha',
          productSku: 'SKU-1',
          listings: [
            {
              id: 'listing-1',
              integrationName: 'Tradera',
              connectionName: 'North',
              status: 'active',
              createdAt: '2026-03-25T08:00:00.000Z',
              updatedAt: '2026-03-25T10:00:00.000Z',
              externalListingId: 'ext-1',
              inventoryId: 'inv-1',
            },
            {
              id: 'listing-2',
              integrationName: 'Shopify',
              connectionName: 'South',
              status: 'completed',
              createdAt: '2026-03-25T09:00:00.000Z',
              updatedAt: '2026-03-25T09:30:00.000Z',
              externalListingId: 'ext-2',
              inventoryId: 'inv-2',
            },
          ],
        },
        {
          productId: 'prod-2',
          productName: 'Beta',
          productSku: null,
          listings: [
            {
              id: 'listing-3',
              integrationName: 'Tradera',
              connectionName: 'West',
              status: 'removed',
              createdAt: '2026-03-25T07:00:00.000Z',
              updatedAt: '2026-03-25T11:00:00.000Z',
              externalListingId: null,
              inventoryId: null,
            },
          ],
        },
      ],
    });

    const { result } = renderHook(() => useProductListingJobsProps());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.totalRows).toBe(2);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.clampedPage).toBe(1);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(2);
    expect(result.current.tableData).toEqual([
      {
        id: 'listing-3',
        type: 'Removal: Tradera',
        status: 'removed',
        progress: 0,
        error: null,
        entityName: 'Beta',
        entitySubText: 'SKU: N/A · Listing',
        productId: 'prod-2',
        startedAt: '2026-03-25T07:00:00.000Z',
        createdAt: '2026-03-25T07:00:00.000Z',
        finishedAt: '2026-03-25T11:00:00.000Z',
      },
      {
        id: 'listing-1',
        type: 'Export: Tradera',
        status: 'active',
        progress: 100,
        error: null,
        entityName: 'Alpha',
        entitySubText: 'SKU: SKU-1 · Listing',
        productId: 'prod-1',
        startedAt: '2026-03-25T08:00:00.000Z',
        createdAt: '2026-03-25T08:00:00.000Z',
        finishedAt: '2026-03-25T10:00:00.000Z',
      },
    ]);
  });

  it('returns all rows for a blank query, clamps the page, and falls back to now when createdAt is missing', () => {
    useJobsStateMock.mockReturnValue({
      listingJobsLoading: true,
      query: '   ',
      page: 3,
      pageSize: 1,
      listingJobs: [
        {
          productId: 'prod-1',
          productName: 'Gamma',
          productSku: 'SKU-9',
          listings: [
            {
              id: 'listing-9',
              integrationName: 'Allegro',
              connectionName: 'Central',
              status: undefined,
              createdAt: null,
              updatedAt: null,
              externalListingId: null,
              inventoryId: null,
            },
          ],
        },
      ],
    });

    const { result } = renderHook(() => useProductListingJobsProps());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.totalRows).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.clampedPage).toBe(1);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(1);
    expect(result.current.tableData).toEqual([
      {
        id: 'listing-9',
        type: 'Export: Allegro',
        status: 'unknown',
        progress: 0,
        error: null,
        entityName: 'Gamma',
        entitySubText: 'SKU: SKU-9 · Listing',
        productId: 'prod-1',
        startedAt: '2026-03-25T12:30:00.000Z',
        createdAt: '2026-03-25T12:30:00.000Z',
        finishedAt: null,
      },
    ]);
  });
});
