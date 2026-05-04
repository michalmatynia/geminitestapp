'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';

import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { Badge } from '@/shared/ui/primitives.public';

import type { FilemakerJobApplication, FilemakerJobApplicationLogEntry } from '../types';
import { JobBoardOriginBadge } from '../components/shared/JobBoardOriginBadge';
import { formatTimestamp } from './filemaker-page-utils';
import { MarkAppliedButton } from './AdminFilemakerJobListingsPage.mark-applied';
import type {
  EnrichedJobListing,
  SalaryCell,
  STATUS_VARIANT_MAP,
} from './AdminFilemakerJobListingsPage.components';

type JobListingRowProps = {
  listing: EnrichedJobListing;
  personId: string;
  personName: string;
  onRefreshListings: () => Promise<void> | void;
};

type JobApplicationLogPanelProps = {
  entries: FilemakerJobApplicationLogEntry[];
  applicationId: string | null;
  isDeleting: boolean;
  onDelete: () => Promise<void>;
};

type JobListingRowState = {
  logEntries: FilemakerJobApplicationLogEntry[];
  applicationId: string | null;
  isApplied: boolean;
  isDeleting: boolean;
  deleteGen: number;
  onApplicationUpdated: (application: FilemakerJobApplication | null) => void;
  onDeleteClick: () => Promise<void>;
};

function JobApplicationLogPanel({
  entries,
  applicationId,
  isDeleting,
  onDelete,
}: JobApplicationLogPanelProps): React.JSX.Element | null {
  if (entries.length === 0) return null;
  return (
    <div className='border-t border-border/30 px-4 pb-2.5 pt-2'>
      <div className='mb-1 flex items-center justify-between'>
        <p className='text-[10px] font-medium uppercase tracking-wide text-gray-600'>
          Application log
        </p>
        {applicationId === null ? null : (
          <button
            type='button'
            className='flex items-center gap-1 text-[10px] text-gray-600 hover:text-red-400 disabled:opacity-50'
            title='Delete application record'
            aria-label='Delete application record'
            disabled={isDeleting}
            onClick={(): void => {
              void onDelete();
            }}
          >
            <span>Delete</span>
          </button>
        )}
      </div>
      <div className='flex flex-col gap-1'>
        {entries.map((entry) => (
          <div key={entry.id} className='flex items-center gap-2 text-xs text-gray-400'>
            <span className='text-gray-300'>{entry.personName ?? entry.personId}</span>
            <span>marked applied</span>
            <span className='text-gray-500'>·</span>
            <span>{formatTimestamp(entry.appliedAt)}</span>
            {entry.method === 'manual' ? (
              <span className='rounded bg-gray-800 px-1 py-0.5 text-[10px] text-gray-500'>manual</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const useJobListingRowState = (
  listing: EnrichedJobListing,
  onRefreshListings: () => Promise<void> | void
): JobListingRowState => {
  const [logEntries, setLogEntries] = useState<FilemakerJobApplicationLogEntry[]>(listing.applicationLog);
  const [applicationId, setApplicationId] = useState<string | null>(listing.applicationId);
  const [isApplied, setIsApplied] = useState(listing.isApplied);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteGen, setDeleteGen] = useState(0);

  useEffect(() => {
    setLogEntries(listing.applicationLog);
    setApplicationId(listing.applicationId);
    setIsApplied(listing.isApplied);
  }, [listing.applicationId, listing.applicationLog, listing.isApplied]);

  const onApplicationUpdated = useCallback((application: FilemakerJobApplication | null): void => {
    if (application === null) {
      setApplicationId(null);
      setIsApplied(false);
      setLogEntries([]);
      return;
    }
    setLogEntries(application.applicationLog ?? []);
    setApplicationId(application.id);
    setIsApplied(application.status === 'applied');
  }, []);

  const onDeleteClick = useCallback(async (): Promise<void> => {
    if (applicationId === null) return;
    if (!window.confirm('Delete this application record? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/filemaker/job-applications/${encodeURIComponent(applicationId)}`, {
        method: 'DELETE',
        headers: withCsrfHeaders({}),
      });
      if (!response.ok) {
        throw new Error(`Failed to delete application (${response.status}).`);
      }
      setLogEntries([]);
      setApplicationId(null);
      setIsApplied(false);
      setDeleteGen((n) => n + 1);
      void onRefreshListings();
    } finally {
      setIsDeleting(false);
    }
  }, [applicationId, onRefreshListings]);

  return {
    logEntries,
    applicationId,
    isApplied,
    isDeleting,
    deleteGen,
    onApplicationUpdated,
    onDeleteClick,
  };
};

type JobListingDetailsProps = {
  listing: EnrichedJobListing;
  isApplied: boolean;
  orgHref: string;
  displayOrgName: string;
};

const JobListingDetails = ({
  listing,
  isApplied,
  orgHref,
  displayOrgName,
}: JobListingDetailsProps): React.JSX.Element => (
  <div className='min-w-0 flex-1'>
    <JobListingTitle listing={listing} orgHref={orgHref} isApplied={isApplied} />
    <div className='mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400'>
      <Link href={orgHref} className='text-gray-300 underline-offset-2 hover:underline'>
        {displayOrgName}
      </Link>
      {(listing.location?.trim().length ?? 0) > 0 ? <span>{listing.location}</span> : null}
      <SalaryCell listing={listing} />
      {(listing.postedAt?.trim().length ?? 0) > 0 ? <span>Posted {formatTimestamp(listing.postedAt)}</span> : null}
    </div>
  </div>
);

type JobListingActionPanelProps = {
  listing: EnrichedJobListing;
  personId: string;
  personName: string;
  applicationId: string | null;
  isApplied: boolean;
  deleteGen: number;
  orgHref: string;
  onApplicationRefresh: () => Promise<void> | void;
  onApplicationUpdated: (application: FilemakerJobApplication | null) => void;
};

const JobListingActionPanel = ({
  listing,
  personId,
  personName,
  applicationId,
  isApplied,
  deleteGen,
  orgHref,
  onApplicationRefresh,
  onApplicationUpdated,
}: JobListingActionPanelProps): React.JSX.Element => (
  <div className='flex shrink-0 flex-wrap items-center gap-2'>
    <MarkAppliedButton
      key={deleteGen}
      listing={listing}
      applicationId={applicationId}
      personId={personId}
      personName={personName}
      initialApplied={isApplied}
      onApplicationUpdated={onApplicationUpdated}
      onRefreshRequested={onApplicationRefresh}
    />
    <span className='text-xs text-gray-600'>{formatTimestamp(listing.updatedAt)}</span>
    <Link
      href={orgHref}
      className='inline-flex size-6 items-center justify-center rounded text-gray-500 hover:text-gray-300'
      aria-label='Open in organisation job listings'
      title='Open in organisation job listings'
    >
      <ExternalLink className='size-3.5' aria-hidden='true' />
    </Link>
  </div>
);

const JobListingTitle = ({
  listing,
  orgHref,
  isApplied,
}: {
  listing: EnrichedJobListing;
  orgHref: string;
  isApplied: boolean;
}): React.JSX.Element => {
  const statusVariant = STATUS_VARIANT_MAP[listing.status];
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Link href={orgHref} className='font-semibold text-white underline-offset-4 hover:underline'>
        {listing.title.trim().length > 0 ? listing.title : 'Untitled listing'}
      </Link>
      <Badge variant={statusVariant} className='h-5 text-[10px] capitalize'>
        {listing.status}
      </Badge>
      {isApplied ? <Badge variant='success' className='h-5 text-[10px]'>Applied</Badge> : null}
      <JobBoardOriginBadge compact sourceSite={listing.sourceSite} sourceUrl={listing.sourceUrl} />
    </div>
  );
};

function JobListingRow({
  listing,
  personId,
  personName,
  onRefreshListings,
}: JobListingRowProps): React.JSX.Element {
  const {
    logEntries,
    applicationId,
    isApplied,
    isDeleting,
    deleteGen,
    onApplicationUpdated,
    onDeleteClick,
  } = useJobListingRowState(listing, onRefreshListings);

  const orgHref = `/admin/filemaker/organizations/${encodeURIComponent(listing.organizationId)}/job-listings`;
  const displayOrgName = listing.organizationName ?? listing.organizationId;

  return (
    <div className='rounded-md border border-border/40 bg-background/20 transition hover:bg-background/40'>
      <div className='flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4'>
        <JobListingDetails
          listing={listing}
          isApplied={isApplied}
          orgHref={orgHref}
          displayOrgName={displayOrgName}
        />
        <JobListingActionPanel
          listing={listing}
          personId={personId}
          personName={personName}
          applicationId={applicationId}
          isApplied={isApplied}
          deleteGen={deleteGen}
          orgHref={orgHref}
          onApplicationRefresh={onRefreshListings}
          onApplicationUpdated={onApplicationUpdated}
        />
      </div>
      <JobApplicationLogPanel
        entries={logEntries}
        applicationId={applicationId}
        isDeleting={isDeleting}
        onDelete={onDeleteClick}
      />
    </div>
  );
}

export { JobListingRow };
