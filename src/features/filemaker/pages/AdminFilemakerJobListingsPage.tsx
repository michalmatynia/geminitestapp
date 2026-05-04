'use client';

import { useDeferredValue } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';

import {
  FILEMAKER_JOB_APPLICATION_SETTINGS_KEY,
  parseFilemakerJobApplicationSettings,
} from '../filemaker-job-application-settings';
import type { EnrichedJobListing } from './AdminFilemakerJobListingsPage.components';
import {
  JobListingsControls,
  JobListingsNotice,
  getDisplayPersonName,
  renderListSection,
} from './AdminFilemakerJobListingsPage.layout';

const jobApplicationLogEntrySchema = z.object({
  id: z.string(),
  appliedAt: z.string(),
  personId: z.string().nullable().optional(),
  personName: z.string().nullable().optional(),
  method: z.string(),
  toStatus: z.string().nullable().optional(),
});

const enrichedJobListingSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    title: z.string(),
    status: z.enum(['open', 'draft', 'paused', 'closed']),
    organizationName: z.string().nullable().optional(),
    isApplied: z.boolean(),
    applicationId: z.string().nullable(),
    applicationLog: z.array(jobApplicationLogEntrySchema),
    updatedAt: z.string(),
    postedAt: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    salaryText: z.string().nullable().optional(),
    salaryMin: z.number().nullable().optional(),
    salaryMax: z.number().nullable().optional(),
    salaryCurrency: z.string().nullable().optional(),
    sourceSite: z.string().nullable().optional(),
    sourceUrl: z.string().nullable().optional(),
  })
  .passthrough();

const jobListingsResponseSchema = z.object({
  listings: z.array(enrichedJobListingSchema),
  total: z.number(),
});

type JobListingsResponse = z.infer<typeof jobListingsResponseSchema>;

type JobListingsState = {
  error: string | null;
  isLoading: boolean;
  listings: EnrichedJobListing[];
  total: number;
};

function useJobListings(
  query: string,
  status: string,
  personId: string,
  refreshTick: number
): JobListingsState {
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
        const parsedResponse = jobListingsResponseSchema.safeParse(
          (await response.json()) as unknown
        );
        if (!parsedResponse.success) {
          throw new Error('Invalid job listings response format.');
        }
        return parsedResponse.data;
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

    return (): void => {
      controller.abort();
    };
  }, [query, status, personId, refreshTick]);

  return state;
}

type UsePageDataStateResult = {
  rawQuery: string;
  status: string;
  settingsLoading: boolean;
  defaultPersonId: string;
  defaultPersonName: string;
  hasDefaultPerson: boolean;
  listingCount: number;
  isLoading: boolean;
  error: string | null;
  listings: EnrichedJobListing[];
  onSearch: (query: string) => void;
  onStatus: (status: string) => void;
  onResetSearch: () => void;
  onRefresh: () => void;
  displayPersonName: string | null;
};

const usePageDataState = (): UsePageDataStateResult => {
  const [rawQuery, setRawQuery] = useState('');
  const [status, setStatus] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const query = useDeferredValue(rawQuery);
  const settingsStore = useSettingsStore();
  const settingsLoading = settingsStore.isLoading;
  const rawJobApplicationSettings = settingsStore.get(FILEMAKER_JOB_APPLICATION_SETTINGS_KEY);
  const jobApplicationSettings = parseFilemakerJobApplicationSettings(rawJobApplicationSettings);
  const defaultPersonId = jobApplicationSettings.defaultPersonId.trim();
  const defaultPersonName = jobApplicationSettings.defaultPersonName.trim();
  const hasDefaultPerson = defaultPersonId.length > 0;

  const { error, isLoading, listings, total } = useJobListings(
    query,
    status,
    defaultPersonId,
    refreshTick
  );

  const requestRefreshListings = useCallback((): void => {
    setRefreshTick((value) => value + 1);
  }, []);

  return {
    rawQuery,
    status,
    settingsLoading,
    defaultPersonId,
    defaultPersonName,
    hasDefaultPerson,
    listingCount: total,
    isLoading,
    error,
    listings,
    onSearch: setRawQuery,
    onStatus: setStatus,
    onResetSearch: () => {
      setRawQuery('');
    },
    onRefresh: requestRefreshListings,
    displayPersonName: getDisplayPersonName({
      hasDefaultPerson,
      defaultPersonName,
      defaultPersonId,
    }),
  };
};

export function AdminFilemakerJobListingsPage(): React.JSX.Element {
  const {
    rawQuery,
    status,
    isLoading,
    listingCount,
    settingsLoading,
    hasDefaultPerson,
    defaultPersonId,
    defaultPersonName,
    displayPersonName,
    error,
    listings,
    onSearch,
    onStatus,
    onResetSearch,
    onRefresh,
  } = usePageDataState();

  return (
    <div className='w-full max-w-none space-y-3 pb-4 pt-0'>
      <AdminTitleBreadcrumbHeader
        title={<h1 className='text-3xl font-bold tracking-tight text-white'>Job Listings</h1>}
        breadcrumb={<AdminFilemakerBreadcrumbs current='Job Listings' />}
        titleStackClassName='shrink-0 min-w-max'
        actionsClassName='relative z-0 min-w-0 flex-1 justify-end pt-0'
      />
      <JobListingsNotice
        settingsLoading={settingsLoading}
        hasDefaultPerson={hasDefaultPerson}
        displayPersonName={displayPersonName}
      />
      <JobListingsControls
        rawQuery={rawQuery}
        status={status}
        isLoading={isLoading}
        listingCount={listingCount}
        onSearch={onSearch}
        onStatus={onStatus}
        onResetSearch={onResetSearch}
      />
      {renderListSection({
        error,
        isLoading,
        listings,
        onRefresh,
        defaultPersonId,
        defaultPersonName,
      })}
    </div>
  );
}
