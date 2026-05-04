import { BriefcaseBusiness, Search, X } from 'lucide-react';
import React, { type JSX } from 'react';

import { JobListingRow } from './AdminFilemakerJobListingsPage.row';
import type { EnrichedJobListing } from './AdminFilemakerJobListingsPage.components';

type ListingSectionInput = {
  error: string | null;
  isLoading: boolean;
  listings: ReadonlyArray<Record<string, unknown>>;
  onRefresh: () => Promise<void> | void;
  defaultPersonId: string;
  defaultPersonName: string;
};

const toListingForRender = (listing: Record<string, unknown>): EnrichedJobListing | null => {
  const candidateId = listing.id;
  if (typeof candidateId !== 'string') return null;
  return listing as EnrichedJobListing;
};

export const renderListSection = (input: ListingSectionInput): JSX.Element => {
  if (input.error !== null) {
    return (
      <p className='rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
        {input.error}
      </p>
    );
  }

  if (input.isLoading) {
    return (
      <div className='space-y-2'>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className='h-16 animate-pulse rounded-md border border-border/30 bg-background/20'
          />
        ))}
      </div>
    );
  }

  if (input.listings.length === 0) {
    return (
      <div className='flex flex-col items-center gap-2 py-12 text-center text-gray-500'>
        <BriefcaseBusiness className='size-8 opacity-30' />
        <p className='text-sm'>No job listings found.</p>
      </div>
    );
  }

  return (
    <div className='space-y-1.5'>
      {input.listings
        .map(toListingForRender)
        .filter((listing): listing is EnrichedJobListing => listing !== null)
        .map((listing) => (
          <JobListingRow
            key={listing.id}
            listing={listing}
            personId={input.defaultPersonId}
            personName={input.defaultPersonName}
            onRefreshListings={input.onRefresh}
          />
        ))}
    </div>
  );
};

type JobListingsNoticeProps = {
  settingsLoading: boolean;
  hasDefaultPerson: boolean;
  displayPersonName: string | null;
};

export const JobListingsNotice = ({
  settingsLoading,
  hasDefaultPerson,
  displayPersonName,
}: JobListingsNoticeProps): JSX.Element | null => {
  if (settingsLoading) return null;
  if (!hasDefaultPerson) {
    return (
      <p className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300'>
        No default person set. Go to Filemaker Settings to set a default person before marking applications
        as applied.
      </p>
    );
  }

  if (displayPersonName === null) return null;
  return (
    <p className='text-xs text-gray-500'>
      Marking applied as:{' '}
      <span className='text-gray-300'>{displayPersonName}</span>
    </p>
  );
};

type JobListingSearchInputProps = {
  rawQuery: string;
  onSearch: (query: string) => void;
  onResetSearch: () => void;
};

const JobListingSearchInput = ({
  rawQuery,
  onSearch,
  onResetSearch,
}: JobListingSearchInputProps): JSX.Element => (
  <div className='relative flex min-w-0 flex-1 items-center'>
    <label htmlFor='job-listing-search' className='sr-only'>
      Search job listings
    </label>
    <Search className='absolute left-2.5 size-3.5 text-gray-500' aria-hidden='true' />
    <input
      aria-label='Search job listings'
      id='job-listing-search'
      type='text'
      value={rawQuery}
      onChange={(e): void => {
        onSearch(e.target.value);
      }}
      placeholder='Search title, organisation, location…'
      className='h-8 w-full rounded-md border border-border/60 bg-background/40 pl-8 pr-8 text-xs text-gray-200 placeholder:text-gray-600 focus:border-border focus:outline-none focus:ring-1 focus:ring-ring'
    />
    {rawQuery.length > 0 ? (
      <button
        type='button'
        onClick={onResetSearch}
        className='absolute right-2.5 text-gray-500 hover:text-gray-300'
        aria-label='Clear search'
      >
        <X className='size-3.5' />
      </button>
    ) : null}
  </div>
);

type JobListingStatusFilterProps = {
  status: string;
  onStatus: (status: string) => void;
};

const STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All statuses', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Draft', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
];

const JobListingStatusFilter = ({ status, onStatus }: JobListingStatusFilterProps): JSX.Element => (
  <select
    value={status}
    onChange={(e): void => {
      onStatus(e.target.value);
    }}
    className='h-8 rounded-md border border-border/60 bg-background/40 px-2 text-xs text-gray-200 focus:border-border focus:outline-none focus:ring-1 focus:ring-ring'
  >
    {STATUS_OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

type JobListingsControlsProps = {
  rawQuery: string;
  status: string;
  isLoading: boolean;
  listingCount: number;
  onSearch: (query: string) => void;
  onStatus: (status: string) => void;
  onResetSearch: () => void;
};

export const JobListingsControls = ({
  rawQuery,
  status,
  isLoading,
  listingCount,
  onSearch,
  onStatus,
  onResetSearch,
}: JobListingsControlsProps): JSX.Element => (
  <div className='flex flex-wrap items-center gap-2'>
    <JobListingSearchInput rawQuery={rawQuery} onSearch={onSearch} onResetSearch={onResetSearch} />
    <JobListingStatusFilter status={status} onStatus={onStatus} />
    {!isLoading ? <span className='text-xs text-gray-500'>{listingCount} listing{listingCount !== 1 ? 's' : ''}</span> : null}
  </div>
);

export const getDisplayPersonName = (input: {
  hasDefaultPerson: boolean;
  defaultPersonName: string;
  defaultPersonId: string;
}): string | null => {
  if (!input.hasDefaultPerson) return null;
  return input.defaultPersonName.length > 0 ? input.defaultPersonName : input.defaultPersonId;
};
