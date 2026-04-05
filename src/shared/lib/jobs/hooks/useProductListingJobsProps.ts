'use client';

import { useMemo } from 'react';

import type { ListingJob, ProductJob } from '@/shared/contracts/integrations/domain';
import { useJobsState } from '@/shared/lib/jobs/context/JobsContext';

import { type JobRowData } from '../types';

type ListingRow = {
  job: ProductJob;
  listing: ListingJob;
};

export function useProductListingJobsProps() {
  const { listingJobs, listingJobsLoading: isLoading, query, page, pageSize } = useJobsState();

  const jobs: ProductJob[] = listingJobs;

  const listingRows: ListingRow[] = useMemo<ListingRow[]>(
    () =>
      jobs.flatMap((job: ProductJob): ListingRow[] =>
        job.listings.map(
          (listing: ListingJob): ListingRow => ({
            job,
            listing,
          })
        )
      ),
    [jobs]
  );

  const filteredRows: ListingRow[] = useMemo<ListingRow[]>(
    () =>
      listingRows.filter(({ job, listing }: ListingRow) => {
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
      }),
    [listingRows, query]
  );

  const sortedRows: ListingRow[] = useMemo<ListingRow[]>(
    () =>
      [...filteredRows].sort((a: ListingRow, b: ListingRow) => {
        const aTime: number = new Date(a.listing.updatedAt ?? a.listing.createdAt ?? 0).getTime();
        const bTime: number = new Date(b.listing.updatedAt ?? b.listing.createdAt ?? 0).getTime();
        return bTime - aTime;
      }),
    [filteredRows]
  );

  const totalRows: number = sortedRows.length;
  const totalPages: number = Math.max(1, Math.ceil(totalRows / pageSize));
  const clampedPage: number = Math.min(page, totalPages);
  const startIndex: number = (clampedPage - 1) * pageSize;
  const endIndex: number = startIndex + pageSize;
  const pagedRows: ListingRow[] = sortedRows.slice(startIndex, endIndex);

  const tableData: JobRowData[] = useMemo<JobRowData[]>(
    () =>
      pagedRows.map((row: ListingRow): JobRowData => {
        const { job, listing } = row;
        const status = listing.status ?? 'unknown';
        const typeLabel = status === 'deleted' || status === 'removed' ? 'Removal' : 'Export';

        return {
          id: listing.id,
          type: `${typeLabel}: ${listing.integrationName}`,
          status: status as JobRowData['status'],
          progress: status === 'active' ? 100 : 0,
          error: null,
          entityName: job.productName,
          entitySubText: `SKU: ${job.productSku || 'N/A'} · Listing`,
          productId: job.productId,
          startedAt: listing.createdAt || new Date().toISOString(),
          createdAt: listing.createdAt || new Date().toISOString(),
          finishedAt: listing.updatedAt ?? null,
        };
      }),
    [pagedRows]
  );

  return {
    tableData,
    isLoading,
    totalRows,
    totalPages,
    clampedPage,
    startIndex,
    endIndex,
  };
}
