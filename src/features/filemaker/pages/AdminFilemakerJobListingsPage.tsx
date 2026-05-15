'use client';

import { useRouter } from 'nextjs-toploader/app';
import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';
import { z } from 'zod';

import { filemakerJobListingSchema } from '@/shared/contracts/filemaker';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { FilemakerJobListingMasterTreeNode } from '../components/shared/FilemakerJobListingMasterTreeNode';
import { buildFilemakerJobListingListNodes } from '../entity-master-tree';
import {
  FILEMAKER_JOB_APPLICATION_SETTINGS_KEY,
  parseFilemakerJobApplicationSettings,
} from '../filemaker-job-application-settings';
import type { EnrichedJobListing } from './AdminFilemakerJobListingsPage.components';
import {
  FilemakerJobListingsListPanel,
  getDisplayPersonName,
} from './AdminFilemakerJobListingsPage.layout';

const jobApplicationLogEntrySchema = z.object({
  id: z.string(),
  appliedAt: z.string(),
  personId: z.string().nullable().optional(),
  personName: z.string().nullable().optional(),
  method: z.string(),
  toStatus: z.string().nullable().optional(),
});

const enrichedJobListingSchema = filemakerJobListingSchema.extend({
  organizationName: z.string().nullable().optional(),
  isApplied: z.boolean(),
  applicationId: z.string().nullable(),
  applicationLog: z.array(jobApplicationLogEntrySchema),
});

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

type JobListingsInput = {
  personId: string;
  query: string;
  refreshTick: number;
  status: string;
};

const EMPTY_JOB_LISTINGS_RESPONSE: JobListingsResponse = {
  listings: [],
  total: 0,
};

const FILEMAKER_JOB_LISTINGS_QUERY_KEY = ['filemaker', 'job-listings'] as const;

const buildJobListingsParams = (input: JobListingsInput): URLSearchParams => {
  const params = new URLSearchParams();
  if (input.query.length > 0) params.set('query', input.query);
  if (input.status.length > 0) params.set('status', input.status);
  if (input.personId.length > 0) params.set('personId', input.personId);
  return params;
};

const buildJobListingsQueryKey = (input: JobListingsInput) =>
  [...FILEMAKER_JOB_LISTINGS_QUERY_KEY, input] as const;

const fetchJobListings = async (
  input: JobListingsInput,
  signal: AbortSignal
): Promise<JobListingsResponse> => {
  const params = buildJobListingsParams(input);
  const response = await fetch(`/api/filemaker/job-listings?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Failed to load job listings (${response.status}).`);
  const parsedResponse = jobListingsResponseSchema.safeParse((await response.json()) as unknown);
  if (!parsedResponse.success) {
    throw new Error('Invalid job listings response format.');
  }
  return parsedResponse.data;
};

function useJobListings(input: JobListingsInput): JobListingsState {
  const queryKey = buildJobListingsQueryKey(input);
  const jobListingsQuery = useSingleQueryV2<
    JobListingsResponse,
    JobListingsResponse,
    typeof queryKey
  >({
    queryKey,
    queryFn: async ({ signal }) => fetchJobListings(input, signal),
    placeholderData: (previousData) => previousData ?? EMPTY_JOB_LISTINGS_RESPONSE,
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerJobListingsPage.useJobListings',
      operation: 'list',
      resource: 'filemaker.job-listings',
      domain: 'files',
      description: 'Load Filemaker job listings for the admin job listings page.',
      errorPresentation: 'inline',
    },
    telemetryContext: {
      hasPersonFilter: input.personId.length > 0,
      queryLength: input.query.length,
      refreshTick: input.refreshTick,
      status: input.status,
    },
  });

  return {
    error: jobListingsQuery.error === null ? null : jobListingsQuery.error.message,
    isLoading: jobListingsQuery.isFetching,
    listings: jobListingsQuery.data?.listings ?? [],
    total: jobListingsQuery.data?.total ?? 0,
  };
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
  onResetFilters: () => void;
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

  const { error, isLoading, listings, total } = useJobListings({
    personId: defaultPersonId,
    query,
    status,
    refreshTick,
  });

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
    onResetFilters: () => {
      setRawQuery('');
      setStatus('');
    },
    onRefresh: requestRefreshListings,
    displayPersonName: getDisplayPersonName({
      hasDefaultPerson,
      defaultPersonName,
      defaultPersonId,
    }),
  };
};

function useJobListingRenderNode(input: {
  defaultPersonId: string;
  defaultPersonName: string;
  listings: EnrichedJobListing[];
  onRefresh: () => void;
  onOpenJobListing: (organizationId: string, jobListingId: string) => void;
}): {
  nodes: MasterTreeNode[];
  renderNode: (nodeInput: FolderTreeViewportRenderNodeInput) => React.ReactNode;
} {
  const { defaultPersonId, defaultPersonName, listings, onOpenJobListing, onRefresh } = input;
  const nodes = useMemo(() => buildFilemakerJobListingListNodes(listings), [listings]);
  const jobListingById = useMemo(
    () =>
      new Map<string, EnrichedJobListing>(
        listings.map((listing: EnrichedJobListing): [string, EnrichedJobListing] => [
          listing.id,
          listing,
        ])
      ),
    [listings]
  );
  const renderNode = useCallback(
    (nodeInput: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <FilemakerJobListingMasterTreeNode
        {...nodeInput}
        jobListingById={jobListingById}
        personId={defaultPersonId}
        personName={defaultPersonName}
        onOpenJobListing={onOpenJobListing}
        onRefreshListings={onRefresh}
      />
    ),
    [defaultPersonId, defaultPersonName, jobListingById, onOpenJobListing, onRefresh]
  );

  return { nodes, renderNode };
}

export function AdminFilemakerJobListingsPage(): React.JSX.Element {
  const router = useRouter();
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
    onResetFilters,
    onRefresh,
  } = usePageDataState();
  const onOpenJobListing = useCallback(
    (organizationId: string, jobListingId: string): void => {
      startTransition(() => {
        router.push(
          `/admin/filemaker/organizations/${encodeURIComponent(
            organizationId
          )}/job-listings#job-listing-${encodeURIComponent(jobListingId)}`
        );
      });
    },
    [router]
  );
  const { nodes, renderNode } = useJobListingRenderNode({
    defaultPersonId,
    defaultPersonName,
    listings,
    onOpenJobListing,
    onRefresh,
  });

  return (
    <FilemakerJobListingsListPanel
      error={error}
      isLoading={isLoading}
      listingCount={listingCount}
      nodes={nodes}
      rawQuery={rawQuery}
      renderNode={renderNode}
      status={status}
      settingsLoading={settingsLoading}
      hasDefaultPerson={hasDefaultPerson}
      displayPersonName={displayPersonName}
      onSearch={onSearch}
      onStatus={onStatus}
      onResetFilters={onResetFilters}
    />
  );
}
