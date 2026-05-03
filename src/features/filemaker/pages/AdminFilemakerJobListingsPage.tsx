'use client';

import { BriefcaseBusiness, CheckCircle2, ExternalLink, Loader2, Search, X } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';

import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { Badge, Button } from '@/shared/ui/primitives.public';

import {
  FILEMAKER_JOB_APPLICATION_SETTINGS_KEY,
  parseFilemakerJobApplicationSettings,
} from '../filemaker-job-application-settings';
import type {
  FilemakerJobApplication,
  FilemakerJobApplicationLogEntry,
  FilemakerJobListing,
  FilemakerJobListingStatus,
} from '../types';
import { JobBoardOriginBadge } from '../components/shared/JobBoardOriginBadge';
import { formatTimestamp } from './filemaker-page-utils';

type EnrichedJobListing = FilemakerJobListing & {
  organizationName: string | null;
  isApplied: boolean;
  applicationLog: FilemakerJobApplicationLogEntry[];
};

type JobListingsResponse = {
  listings: EnrichedJobListing[];
  total: number;
};

type JobListingsState = {
  error: string | null;
  isLoading: boolean;
  listings: EnrichedJobListing[];
  total: number;
};

const STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All statuses', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Draft', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
];

const STATUS_VARIANT_MAP: Record<
  FilemakerJobListingStatus,
  'success' | 'warning' | 'outline' | 'destructive'
> = {
  open: 'success',
  draft: 'outline',
  paused: 'warning',
  closed: 'destructive',
};

function useJobListings(query: string, status: string, personId: string): JobListingsState {
  const [state, setState] = useState<JobListingsState>({
    error: null,
    isLoading: true,
    listings: [],
    total: 0,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((current) => ({ ...current, error: null, isLoading: true }));

    const params = new URLSearchParams();
    if (query.length > 0) params.set('query', query);
    if (status.length > 0) params.set('status', status);
    if (personId.length > 0) params.set('personId', personId);

    fetch(`/api/filemaker/job-listings?${params.toString()}`, { signal: controller.signal })
      .then(async (response): Promise<JobListingsResponse> => {
        if (!response.ok) throw new Error(`Failed to load job listings (${response.status}).`);
        return (await response.json()) as JobListingsResponse;
      })
      .then((data): void => {
        setState({ error: null, isLoading: false, listings: data.listings, total: data.total });
      })
      .catch((err: unknown): void => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setState((current) => ({
          ...current,
          error: err instanceof Error ? err.message : 'Unknown error',
          isLoading: false,
        }));
      });

    return (): void => { controller.abort(); };
  }, [query, status, personId]);

  return state;
}

function SalaryCell({ listing }: { listing: FilemakerJobListing }): React.JSX.Element | null {
  const salaryText = listing.salaryText?.trim() ?? '';
  if (salaryText.length > 0) return <span>{salaryText}</span>;
  if (listing.salaryMin !== null && listing.salaryMin !== undefined) {
    const currency = listing.salaryCurrency?.trim() || 'PLN';
    const min = listing.salaryMin.toLocaleString();
    const max =
      listing.salaryMax !== null && listing.salaryMax !== undefined
        ? `–${listing.salaryMax.toLocaleString()}`
        : '';
    return <span>{min}{max} {currency}</span>;
  }
  return null;
}

function MarkAppliedButton({
  listing,
  personId,
  personName,
  initialApplied,
  onApplied,
}: {
  listing: FilemakerJobListing;
  personId: string;
  personName: string;
  initialApplied: boolean;
  onApplied: (application: FilemakerJobApplication) => void;
}): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [isApplied, setIsApplied] = useState(initialApplied);

  const personLabel = personName.trim().length > 0 ? personName : personId;
  const disabled = personId.trim().length === 0 || isApplied || isLoading;

  const title =
    personId.trim().length === 0
      ? 'Set a default person in Filemaker settings before marking as applied'
      : isApplied
        ? `Already marked applied for ${personLabel}`
        : `Mark applied manually for ${personLabel}`;

  const handleClick = useCallback(async (): Promise<void> => {
    if (disabled) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/filemaker/job-applications', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'mark_applied_manual',
          jobListingId: listing.id,
          jobTitle: listing.title,
          organizationId: listing.organizationId,
          organizationName: null,
          personId,
          personName,
          sourceSite: listing.sourceSite ?? null,
          sourceUrl: listing.sourceUrl ?? null,
        }),
      });
      if (!response.ok) throw new Error(`Failed to mark as applied (${response.status}).`);
      const payload = (await response.json()) as { application?: FilemakerJobApplication };
      setIsApplied(true);
      if (payload.application !== undefined) onApplied(payload.application);
    } catch {
      // allow retry
    } finally {
      setIsLoading(false);
    }
  }, [disabled, listing, personId, personName, onApplied]);

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className='h-7 gap-1.5 text-[11px]'
      disabled={disabled}
      title={title}
      onClick={(): void => { void handleClick(); }}
    >
      {isLoading ? (
        <Loader2 className='size-3 animate-spin' aria-hidden='true' />
      ) : (
        <CheckCircle2 className='size-3' aria-hidden='true' />
      )}
      {isApplied ? 'Applied' : 'Mark applied'}
    </Button>
  );
}

function JobListingRow({
  listing,
  personId,
  personName,
}: {
  listing: EnrichedJobListing;
  personId: string;
  personName: string;
}): React.JSX.Element {
  const [logEntries, setLogEntries] = useState<FilemakerJobApplicationLogEntry[]>(
    listing.applicationLog
  );

  const orgHref = `/admin/filemaker/organizations/${encodeURIComponent(listing.organizationId)}/job-listings`;
  const statusVariant = STATUS_VARIANT_MAP[listing.status] ?? 'outline';
  const displayOrgName = listing.organizationName ?? listing.organizationId;

  const handleApplied = useCallback((application: FilemakerJobApplication): void => {
    if ((application.applicationLog?.length ?? 0) > 0) {
      setLogEntries(application.applicationLog ?? []);
    }
  }, []);

  return (
    <div className='rounded-md border border-border/40 bg-background/20 transition hover:bg-background/40'>
      <div className='flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <Link
              href={orgHref}
              className='font-semibold text-white underline-offset-4 hover:underline'
            >
              {listing.title.trim().length > 0 ? listing.title : 'Untitled listing'}
            </Link>
            <Badge variant={statusVariant} className='h-5 text-[10px] capitalize'>
              {listing.status}
            </Badge>
            {(listing.isApplied || logEntries.length > 0) ? (
              <Badge variant='success' className='h-5 text-[10px]'>Applied</Badge>
            ) : null}
            <JobBoardOriginBadge compact sourceSite={listing.sourceSite} sourceUrl={listing.sourceUrl} />
          </div>
          <div className='mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400'>
            <Link href={orgHref} className='text-gray-300 underline-offset-2 hover:underline'>
              {displayOrgName}
            </Link>
            {(listing.location?.trim().length ?? 0) > 0 ? <span>{listing.location}</span> : null}
            <SalaryCell listing={listing} />
            {(listing.postedAt?.trim().length ?? 0) > 0 ? (
              <span>Posted {formatTimestamp(listing.postedAt)}</span>
            ) : null}
          </div>
        </div>
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          <MarkAppliedButton
            listing={listing}
            personId={personId}
            personName={personName}
            initialApplied={listing.isApplied || logEntries.length > 0}
            onApplied={handleApplied}
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
      </div>
      {logEntries.length > 0 ? (
        <div className='border-t border-border/30 px-4 pb-2.5 pt-2'>
          <p className='mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-600'>Application log</p>
          <div className='flex flex-col gap-1'>
            {logEntries.map((entry) => (
              <div key={entry.id} className='flex items-center gap-2 text-xs text-gray-400'>
                <CheckCircle2 className='size-3 shrink-0 text-green-500' aria-hidden='true' />
                <span className='text-gray-300'>
                  {entry.personName?.trim() || entry.personId || 'Unknown'}
                </span>
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
      ) : null}
    </div>
  );
}

export function AdminFilemakerJobListingsPage(): React.JSX.Element {
  const [rawQuery, setRawQuery] = useState('');
  const [status, setStatus] = useState('');
  const query = useDeferredValue(rawQuery);

  const settingsStore = useSettingsStore();
  const settingsLoading = settingsStore.isLoading;
  const rawJobApplicationSettings = settingsStore.get(FILEMAKER_JOB_APPLICATION_SETTINGS_KEY);
  const jobApplicationSettings = parseFilemakerJobApplicationSettings(rawJobApplicationSettings);
  const defaultPersonId = jobApplicationSettings.defaultPersonId.trim();
  const defaultPersonName = jobApplicationSettings.defaultPersonName.trim();

  const { error, isLoading, listings, total } = useJobListings(query, status, defaultPersonId);

  const handleClearQuery = useCallback((): void => { setRawQuery(''); }, []);

  return (
    <div className='w-full max-w-none space-y-3 pb-4 pt-0'>
      <AdminTitleBreadcrumbHeader
        title={<h1 className='text-3xl font-bold tracking-tight text-white'>Job Listings</h1>}
        breadcrumb={<AdminFilemakerBreadcrumbs current='Job Listings' />}
        titleStackClassName='shrink-0 min-w-max'
        actionsClassName='relative z-0 min-w-0 flex-1 justify-end pt-0'
      />

      {!settingsLoading && defaultPersonId.length === 0 ? (
        <p className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300'>
          No default person set. Go to Filemaker Settings to set a default person before marking applications as applied.
        </p>
      ) : !settingsLoading && defaultPersonId.length > 0 ? (
        <p className='text-xs text-gray-500'>
          Marking applied as:{' '}
          <span className='text-gray-300'>
            {defaultPersonName.length > 0 ? defaultPersonName : defaultPersonId}
          </span>
        </p>
      ) : null}

      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative flex min-w-0 flex-1 items-center'>
          <Search className='absolute left-2.5 size-3.5 text-gray-500' aria-hidden='true' />
          <input
            type='text'
            value={rawQuery}
            onChange={(e): void => { setRawQuery(e.target.value); }}
            placeholder='Search title, organisation, location…'
            className='h-8 w-full rounded-md border border-border/60 bg-background/40 pl-8 pr-8 text-xs text-gray-200 placeholder:text-gray-600 focus:border-border focus:outline-none focus:ring-1 focus:ring-ring'
          />
          {rawQuery.length > 0 ? (
            <button
              type='button'
              onClick={handleClearQuery}
              className='absolute right-2.5 text-gray-500 hover:text-gray-300'
              aria-label='Clear search'
            >
              <X className='size-3.5' />
            </button>
          ) : null}
        </div>
        <select
          value={status}
          onChange={(e): void => { setStatus(e.target.value); }}
          className='h-8 rounded-md border border-border/60 bg-background/40 px-2 text-xs text-gray-200 focus:border-border focus:outline-none focus:ring-1 focus:ring-ring'
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {!isLoading ? (
          <span className='text-xs text-gray-500'>{total} listing{total !== 1 ? 's' : ''}</span>
        ) : null}
      </div>

      {error !== null ? (
        <p className='rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
          {error}
        </p>
      ) : isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='h-16 animate-pulse rounded-md border border-border/30 bg-background/20' />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className='flex flex-col items-center gap-2 py-12 text-center text-gray-500'>
          <BriefcaseBusiness className='size-8 opacity-30' />
          <p className='text-sm'>No job listings found.</p>
        </div>
      ) : (
        <div className='space-y-1.5'>
          {listings.map((listing) => (
            <JobListingRow
              key={listing.id}
              listing={listing}
              personId={defaultPersonId}
              personName={defaultPersonName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
