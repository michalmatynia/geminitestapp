'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'nextjs-toploader/app';
import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';

import { FilemakerOrganizationMasterTreeNode } from '../components/shared/FilemakerOrganizationMasterTreeNode';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { buildFilemakerOrganizationListNodes } from '../entity-master-tree';
import {
  organizationAdvancedFilterPresetSchema,
  type OrganizationAdvancedFilterPreset,
} from '../filemaker-organization-advanced-filters';
import {
  buildOrganizationEmailScrapeToast,
  buildOrganizationWebsiteSocialScrapeToast,
  readOrganizationEmailScrapeErrorMessage,
  readOrganizationWebsiteSocialScrapeErrorMessage,
  type OrganizationEmailScrapeResponse,
  type OrganizationWebsiteSocialScrapeResponse,
} from '../filemaker-organization-scrape-client';
import {
  FILEMAKER_DATABASE_KEY,
  getFilemakerEventsForOrganization,
  getFilemakerJobListingsForOrganization,
  parseFilemakerDatabase,
} from '../settings';
import type { FilemakerEvent, FilemakerJobListing, FilemakerOrganization } from '../types';
import {
  DEFAULT_ORGANIZATION_PAGE_SIZE,
  DEFAULT_ORGANIZATION_SORT,
  EMPTY_ORGANIZATIONS_RESPONSE,
  createDefaultOrganizationFilters,
  type MongoFilemakerOrganizationsResponse,
  type MongoFilemakerOrganizationsState,
  type OrganizationFilters,
  type OrganizationListState,
  type OrganizationSelectionState,
  type OrganizationSortOption,
} from '../pages/AdminFilemakerOrganizationsPage.types';

/* eslint-disable max-lines */

const ADDRESS_FILTERS = new Set(['with_address', 'without_address']);
const BANK_FILTERS = new Set(['with_bank', 'without_bank']);
const PARENT_FILTERS = new Set(['root', 'child']);
const ORGANIZATION_ADVANCED_FILTER_PRESETS_STORAGE_KEY =
  'filemakerOrganizationAdvancedFilterPresets';
const ORGANIZATION_APPLIED_ADVANCED_FILTER_STORAGE_KEY =
  'filemakerOrganizationAppliedAdvancedFilter';
const ORGANIZATION_APPLIED_ADVANCED_FILTER_PRESET_STORAGE_KEY =
  'filemakerOrganizationAppliedAdvancedFilterPresetId';
const FILEMAKER_ORGANIZATIONS_QUERY_KEY = ['filemaker', 'organizations'] as const;

type OrganizationListInput = {
  filters: OrganizationFilters;
  page: number;
  pageSize: number;
  query: string;
  refreshKey: number;
  sort: OrganizationSortOption;
};
type OrganizationListParamsInput = Omit<OrganizationListInput, 'refreshKey'>;

const normalizeSelectFilter = <T extends string>(
  value: string,
  allowed: Set<string>,
  fallback: T
): T => (allowed.has(value) ? (value as T) : fallback);

const FILTER_NORMALIZERS: Record<
  string,
  (value: string) => Partial<OrganizationFilters>
> = {
  advancedFilter: (value: string) => ({ advancedFilter: value.trim() }),
  address: (value: string) => ({
    address: normalizeSelectFilter(value, ADDRESS_FILTERS, 'all'),
  }),
  bank: (value: string) => ({
    bank: normalizeSelectFilter(value, BANK_FILTERS, 'all'),
  }),
  parent: (value: string) => ({
    parent: normalizeSelectFilter(value, PARENT_FILTERS, 'all'),
  }),
  updatedBy: (value: string) => ({ updatedBy: value }),
};

function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

const normalizeFilterValue = (key: string, value: unknown): Partial<OrganizationFilters> => {
  const normalizer = FILTER_NORMALIZERS[key];
  return normalizer ? normalizer(typeof value === 'string' ? value : '') : {};
};

const readOrganizationAdvancedFilterPresets = (): OrganizationAdvancedFilterPreset[] => {
  if (typeof window === 'undefined') return [];
  try {
    const rawValue = window.localStorage.getItem(ORGANIZATION_ADVANCED_FILTER_PRESETS_STORAGE_KEY);
    if (rawValue === null || rawValue.trim().length === 0) return [];
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry: unknown): OrganizationAdvancedFilterPreset | null => {
        const result = organizationAdvancedFilterPresetSchema.safeParse(entry);
        return result.success ? result.data : null;
      })
      .filter((entry): entry is OrganizationAdvancedFilterPreset => entry !== null);
  } catch {
    return [];
  }
};

const readStoredString = (key: string): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(key)?.trim() ?? '';
};

const persistAdvancedFilterPresets = (
  presets: OrganizationAdvancedFilterPreset[]
): Promise<void> => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      ORGANIZATION_ADVANCED_FILTER_PRESETS_STORAGE_KEY,
      JSON.stringify(presets)
    );
  }
  return Promise.resolve();
};

const persistAppliedAdvancedFilterState = (state: {
  presetId: string | null;
  value: string;
}): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ORGANIZATION_APPLIED_ADVANCED_FILTER_STORAGE_KEY, state.value);
  if (state.presetId !== null && state.presetId.length > 0) {
    window.localStorage.setItem(
      ORGANIZATION_APPLIED_ADVANCED_FILTER_PRESET_STORAGE_KEY,
      state.presetId
    );
  } else {
    window.localStorage.removeItem(ORGANIZATION_APPLIED_ADVANCED_FILTER_PRESET_STORAGE_KEY);
  }
};

const buildOrganizationListParams = (input: OrganizationListParamsInput): URLSearchParams => {
  const params = new URLSearchParams({
    address: input.filters.address,
    bank: input.filters.bank,
    page: String(input.page),
    pageSize: String(input.pageSize),
    parent: input.filters.parent,
    sort: input.sort,
  });
  if (input.filters.advancedFilter.length > 0) {
    params.set('advancedFilter', input.filters.advancedFilter);
  }
  if (input.query.length > 0) params.set('query', input.query);
  const updatedBy = input.filters.updatedBy.trim();
  if (updatedBy.length > 0) params.set('updatedBy', updatedBy);
  return params;
};

type MongoFilemakerOrganizationsHookState = MongoFilemakerOrganizationsState & {
  removeOrganizations: (organizationIds: readonly string[]) => void;
};

type BatchDeleteOrganizationsResponse = {
  deletedJobListingCount?: number;
  deletedOrganizationCount?: number;
  deletedOrganizationIds?: string[];
  missingOrganizationIds?: string[];
};

const buildOrganizationListQueryKey = (input: OrganizationListInput) =>
  [...FILEMAKER_ORGANIZATIONS_QUERY_KEY, input] as const;

const removeOrganizationsFromResponse = (
  current: MongoFilemakerOrganizationsResponse,
  organizationIdSet: ReadonlySet<string>
): MongoFilemakerOrganizationsResponse => {
  const organizations = current.organizations.filter(
    (organization: FilemakerOrganization): boolean => !organizationIdSet.has(organization.id)
  );
  const removedCount = current.organizations.length - organizations.length;
  const totalCount = Math.max(0, current.totalCount - removedCount);
  return {
    ...current,
    collectionCount: Math.max(0, current.collectionCount - removedCount),
    linkedEventsByOrganizationId: Object.fromEntries(
      Object.entries(current.linkedEventsByOrganizationId).filter(
        ([organizationId]: [string, FilemakerEvent[]]): boolean =>
          !organizationIdSet.has(organizationId)
      )
    ),
    linkedJobListingsByOrganizationId: Object.fromEntries(
      Object.entries(current.linkedJobListingsByOrganizationId).filter(
        ([organizationId]: [string, FilemakerJobListing[]]): boolean =>
          !organizationIdSet.has(organizationId)
      )
    ),
    organizations,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / current.pageSize)),
  };
};

const fetchMongoFilemakerOrganizations = async (
  input: OrganizationListInput,
  signal: AbortSignal
): Promise<MongoFilemakerOrganizationsResponse> => {
  const params = buildOrganizationListParams(input);
  const response = await fetch(`/api/filemaker/organizations?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load organisations (${response.status}).`);
  }
  return (await response.json()) as MongoFilemakerOrganizationsResponse;
};

function useMongoFilemakerOrganizations(
  input: OrganizationListInput
): MongoFilemakerOrganizationsHookState {
  const queryClient = useQueryClient();
  const queryKey = buildOrganizationListQueryKey(input);
  const organizationsQuery = createSingleQueryV2<
    MongoFilemakerOrganizationsResponse,
    MongoFilemakerOrganizationsResponse,
    typeof queryKey
  >({
    queryKey,
    queryFn: async ({ signal }) => fetchMongoFilemakerOrganizations(input, signal),
    placeholderData: (previousData) => previousData ?? EMPTY_ORGANIZATIONS_RESPONSE,
    meta: {
      source:
        'features.filemaker.hooks.useAdminFilemakerOrganizationsListState.useMongoFilemakerOrganizations',
      operation: 'list',
      resource: 'filemaker.organizations',
      domain: 'files',
      description: 'Load imported Filemaker organisations for the admin organisations list.',
      errorPresentation: 'inline',
    },
    telemetryContext: {
      filters: input.filters,
      page: input.page,
      pageSize: input.pageSize,
      queryLength: input.query.length,
      refreshKey: input.refreshKey,
      sort: input.sort,
    },
  });
  const removeOrganizations = useCallback((organizationIds: readonly string[]): void => {
    const organizationIdSet = new Set(
      organizationIds
        .map((organizationId: string): string => organizationId.trim())
        .filter((organizationId: string): boolean => organizationId.length > 0)
    );
    if (organizationIdSet.size === 0) return;
    queryClient.setQueryData<MongoFilemakerOrganizationsResponse>(queryKey, (current) => {
      if (current === undefined) return current;
      return removeOrganizationsFromResponse(current, organizationIdSet);
    });
  }, [queryClient, queryKey]);

  return {
    ...(organizationsQuery.data ?? EMPTY_ORGANIZATIONS_RESPONSE),
    error: organizationsQuery.error === null ? null : organizationsQuery.error.message,
    isLoading: organizationsQuery.isFetching,
    removeOrganizations,
  };
}

const loadOrganizationIdsForSelection = async (input: {
  filters: OrganizationFilters;
  query: string;
  sort: OrganizationSortOption;
}): Promise<string[]> => {
  const params = buildOrganizationListParams({
    filters: input.filters,
    page: 1,
    pageSize: 1,
    query: input.query,
    sort: input.sort,
  });
  params.set('idsOnly', 'true');
  const response = await fetch(`/api/filemaker/organizations?${params.toString()}`);
  if (!response.ok) {
    // API request to load organization IDs returned an error status
    throw new Error(`Failed to load organisation IDs (${response.status}).`);
  }
  const body = (await response.json()) as { ids?: unknown };
  if (!Array.isArray(body.ids)) return [];
  return body.ids.filter(
    (id: unknown): id is string => typeof id === 'string' && id.length > 0
  );
};

function useOrganizationActions(router: ReturnType<typeof useRouter>): {
  actions: PanelAction[];
  openEvent: (eventId: string) => void;
  openJobListing: (organizationId: string, jobListingId: string) => void;
  openOrganization: (organizationId: string) => void;
} {
  const openOrganization = useCallback(
    (organizationId: string): void => {
      startTransition(() => {
        router.push(`/admin/filemaker/organizations/${encodeURIComponent(organizationId)}`);
      });
    },
    [router]
  );
  const openEvent = useCallback(
    (eventId: string): void => {
      startTransition(() => {
        router.push(`/admin/filemaker/events/${encodeURIComponent(eventId)}`);
      });
    },
    [router]
  );
  const openJobListing = useCallback(
    (organizationId: string, jobListingId: string): void => {
      startTransition(() => {
        router.push(
          `/admin/filemaker/organizations/${encodeURIComponent(
            organizationId
          )}#job-listing-${encodeURIComponent(jobListingId)}`
        );
      });
    },
    [router]
  );
  const actions = useMemo(
    () => [
      {
        key: 'create-organization',
        label: 'Create Organisation',
        onClick: () => {
          startTransition(() => {
            router.push('/admin/filemaker/organizations/new');
          });
        },
      },
      ...buildFilemakerNavActions(router, 'organizations'),
    ],
    [router]
  );
  return { actions, openEvent, openJobListing, openOrganization };
}

// eslint-disable-next-line max-lines-per-function
function useOrganizationRenderNode(
  input: {
    eventsById: ReadonlyMap<string, FilemakerEvent>;
    jobListingsById: ReadonlyMap<string, FilemakerJobListing>;
    jobListingsByOrganizationId: ReadonlyMap<string, readonly FilemakerJobListing[]>;
    organizations: FilemakerOrganization[];
    organizationEmailScrapeState: Record<string, boolean>;
    organizationWebsiteSocialScrapeState: Record<string, boolean>;
    organizationSelection: OrganizationSelectionState;
    onLaunchOrganizationEmailScrape: (organizationId: string) => void;
    onLaunchOrganizationWebsiteSocialScrape: (organizationId: string) => void;
    onDeleteOrganization: (organization: FilemakerOrganization) => void;
    onOpenEvent: (eventId: string) => void;
    onOpenJobListing: (organizationId: string, jobListingId: string) => void;
    onOpenOrganization: (organizationId: string) => void;
    onToggleOrganizationSelection: (organizationId: string, checked: boolean) => void;
  }
): (renderInput: FolderTreeViewportRenderNodeInput) => React.ReactNode {
  const {
    eventsById,
    jobListingsById,
    jobListingsByOrganizationId,
    organizations,
    organizationEmailScrapeState,
    organizationWebsiteSocialScrapeState,
    organizationSelection,
    onLaunchOrganizationEmailScrape,
    onLaunchOrganizationWebsiteSocialScrape,
    onDeleteOrganization,
    onOpenEvent,
    onOpenJobListing,
    onOpenOrganization,
    onToggleOrganizationSelection,
  } = input;
  const organizationById = useMemo(
    () =>
      new Map<string, FilemakerOrganization>(
        organizations.map((organization) => [organization.id, organization])
      ),
    [organizations]
  );
  return useCallback(
    (renderInput: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <FilemakerOrganizationMasterTreeNode
        {...renderInput}
        eventsById={eventsById}
        jobListingsById={jobListingsById}
        jobListingsByOrganizationId={jobListingsByOrganizationId}
        organizationEmailScrapeState={organizationEmailScrapeState}
        organizationWebsiteSocialScrapeState={organizationWebsiteSocialScrapeState}
        organizationSelection={organizationSelection}
        organizationById={organizationById}
        onLaunchOrganizationEmailScrape={onLaunchOrganizationEmailScrape}
        onLaunchOrganizationWebsiteSocialScrape={onLaunchOrganizationWebsiteSocialScrape}
        onDeleteOrganization={onDeleteOrganization}
        onOpenEvent={onOpenEvent}
        onOpenJobListing={onOpenJobListing}
        onOpenOrganization={onOpenOrganization}
        onToggleOrganizationSelection={onToggleOrganizationSelection}
      />
    ),
    [
      eventsById,
      jobListingsById,
      jobListingsByOrganizationId,
      onLaunchOrganizationEmailScrape,
      onLaunchOrganizationWebsiteSocialScrape,
      onDeleteOrganization,
      onOpenEvent,
      onOpenJobListing,
      onOpenOrganization,
      onToggleOrganizationSelection,
      organizationById,
      organizationEmailScrapeState,
      organizationWebsiteSocialScrapeState,
      organizationSelection,
    ]
  );
}

const selectedOrganizationIdsFromState = (
  selection: OrganizationSelectionState
): string[] => Object.keys(selection).filter((id: string): boolean => selection[id] === true);

const pluralizeCount = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;

const buildDeletedOrganizationsToast = (input: {
  deletedJobListingCount: number;
  deletedOrganizationCount: number;
}): string =>
  `Deleted ${pluralizeCount(
    input.deletedOrganizationCount,
    'organisation',
    'organisations'
  )} and ${pluralizeCount(input.deletedJobListingCount, 'job listing', 'job listings')}.`;

const buildOrganizationRelationMaps = (
  organizations: FilemakerOrganization[],
  linkedEventsByOrganizationId: Record<string, FilemakerEvent[]>,
  linkedJobListingsByOrganizationId: Record<string, FilemakerJobListing[]>,
  rawDatabase: string | null
): {
  eventsById: Map<string, FilemakerEvent>;
  eventsByOrganizationId: Map<string, FilemakerEvent[]>;
  jobListingsById: Map<string, FilemakerJobListing>;
  jobListingsByOrganizationId: Map<string, FilemakerJobListing[]>;
} => {
  const database = parseFilemakerDatabase(rawDatabase);
  const eventsById = new Map<string, FilemakerEvent>(
    database.events.map((event: FilemakerEvent): [string, FilemakerEvent] => [event.id, event])
  );
  Object.values(linkedEventsByOrganizationId)
    .flat()
    .forEach((event: FilemakerEvent): void => {
      eventsById.set(event.id, event);
    });
  const jobListingsById = new Map<string, FilemakerJobListing>(
    [
      ...database.jobListings,
      ...Object.values(linkedJobListingsByOrganizationId).flat(),
    ].map(
      (listing: FilemakerJobListing): [string, FilemakerJobListing] => [listing.id, listing]
    )
  );
  const eventsByOrganizationId = new Map<string, FilemakerEvent[]>();
  const jobListingsByOrganizationId = new Map<string, FilemakerJobListing[]>();
  organizations.forEach((organization: FilemakerOrganization): void => {
    const settingsEvents = getFilemakerEventsForOrganization(database, organization.id);
    const events =
      settingsEvents.length > 0
        ? settingsEvents
        : (linkedEventsByOrganizationId[organization.id] ?? []);
    if (events.length > 0) eventsByOrganizationId.set(organization.id, events);
    const jobListingsByListingId = new Map<string, FilemakerJobListing>();
    getFilemakerJobListingsForOrganization(database, organization.id).forEach(
      (listing: FilemakerJobListing): void => {
        jobListingsByListingId.set(listing.id, listing);
      }
    );
    (linkedJobListingsByOrganizationId[organization.id] ?? []).forEach(
      (listing: FilemakerJobListing): void => {
        jobListingsByListingId.set(listing.id, listing);
      }
    );
    const jobListings = Array.from(jobListingsByListingId.values());
    if (jobListings.length > 0) jobListingsByOrganizationId.set(organization.id, jobListings);
  });
  return {
    eventsById,
    eventsByOrganizationId,
    jobListingsById,
    jobListingsByOrganizationId,
  };
};

// eslint-disable-next-line max-lines-per-function
export function useAdminFilemakerOrganizationsListState(): OrganizationListState {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_ORGANIZATION_PAGE_SIZE);
  const [sort, setSort] = useState<OrganizationSortOption>(DEFAULT_ORGANIZATION_SORT);
  const [filters, setFilters] = useState<OrganizationFilters>(() => ({
    ...createDefaultOrganizationFilters(),
    advancedFilter: readStoredString(ORGANIZATION_APPLIED_ADVANCED_FILTER_STORAGE_KEY),
  }));
  const [activeAdvancedFilterPresetId, setActiveAdvancedFilterPresetId] = useState<string | null>(
    () => {
      const value = readStoredString(ORGANIZATION_APPLIED_ADVANCED_FILTER_PRESET_STORAGE_KEY);
      return value.length > 0 ? value : null;
    }
  );
  const [advancedFilterPresets, setAdvancedFilterPresets] = useState<
    OrganizationAdvancedFilterPreset[]
  >(readOrganizationAdvancedFilterPresets);
  const [organizationsRefreshKey, setOrganizationsRefreshKey] = useState(0);
  const [isDeletingOrganizations, setIsDeletingOrganizations] = useState(false);
  const [isSelectingAllOrganizations, setIsSelectingAllOrganizations] = useState(false);
  const [organizationEmailScrapeState, setOrganizationEmailScrapeState] =
    useState<Record<string, boolean>>({});
  const [organizationWebsiteSocialScrapeState, setOrganizationWebsiteSocialScrapeState] =
    useState<Record<string, boolean>>({});
  const [organizationSelection, setOrganizationSelection] =
    useState<OrganizationSelectionState>({});
  const organizationEmailScrapeInFlightRef = useRef<Set<string>>(new Set());
  const organizationWebsiteSocialScrapeInFlightRef = useRef<Set<string>>(new Set());
  const deferredQuery = useDeferredValue(query.trim());
  const debouncedQuery = useDebouncedValue(deferredQuery, 250);
  const mongoOrganizations = useMongoFilemakerOrganizations({
    filters,
    page,
    pageSize,
    query: debouncedQuery,
    refreshKey: organizationsRefreshKey,
    sort,
  });
  const { actions, openEvent, openJobListing, openOrganization } = useOrganizationActions(router);
  const organizations = mongoOrganizations.organizations;
  const removeMongoOrganizations = mongoOrganizations.removeOrganizations;
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const organizationRelations = useMemo(
    () =>
      buildOrganizationRelationMaps(
        organizations,
        mongoOrganizations.linkedEventsByOrganizationId,
        mongoOrganizations.linkedJobListingsByOrganizationId,
        rawDatabase ?? null
      ),
    [
      mongoOrganizations.linkedEventsByOrganizationId,
      mongoOrganizations.linkedJobListingsByOrganizationId,
      organizations,
      rawDatabase,
    ]
  );
  const nodes = useMemo(
    () =>
      buildFilemakerOrganizationListNodes(organizations, {
        eventsByOrganizationId: organizationRelations.eventsByOrganizationId,
        jobListingsByOrganizationId: organizationRelations.jobListingsByOrganizationId,
      }),
    [
      organizationRelations.eventsByOrganizationId,
      organizationRelations.jobListingsByOrganizationId,
      organizations,
    ]
  );
  const toggleOrganizationSelection = useCallback(
    (organizationId: string, checked: boolean): void => {
      setOrganizationSelection((current: OrganizationSelectionState): OrganizationSelectionState => {
        const next = { ...current };
        if (checked) {
          next[organizationId] = true;
        } else {
          delete next[organizationId];
        }
        return next;
      });
    },
    []
  );
  const selectAllOrganizations = useCallback(async (): Promise<void> => {
    setIsSelectingAllOrganizations(true);
    try {
      const ids = await loadOrganizationIdsForSelection({
        filters,
        query: query.trim(),
        sort,
      });
      setOrganizationSelection(
        ids.reduce<OrganizationSelectionState>(
          (selection: OrganizationSelectionState, id: string): OrganizationSelectionState => ({
            ...selection,
            [id]: true,
          }),
          {}
        )
      );
      toast(`Selected ${ids.length} organisation${ids.length === 1 ? '' : 's'}.`, {
        variant: 'success',
      });
    } catch {
      toast('Failed to select all organisations.', { variant: 'error' });
    } finally {
      setIsSelectingAllOrganizations(false);
    }
  }, [filters, query, sort, toast]);
  const launchOrganizationEmailScrape = useCallback(
    (organizationId: string): void => {
      if (organizationEmailScrapeInFlightRef.current.has(organizationId)) return;
      organizationEmailScrapeInFlightRef.current.add(organizationId);
      setOrganizationEmailScrapeState((current) => ({ ...current, [organizationId]: true }));
      void (async (): Promise<void> => {
        try {
          const response = await fetch(
            `/api/filemaker/organizations/${encodeURIComponent(organizationId)}/email-scrape`,
            {
              method: 'POST',
              headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({ maxPages: 8 }),
            }
          );
          if (!response.ok) {
            throw new Error(await readOrganizationEmailScrapeErrorMessage(response));
          }
          const result = (await response.json()) as OrganizationEmailScrapeResponse;
          const scrapeToast = buildOrganizationEmailScrapeToast(result);
          toast(scrapeToast.message, { variant: scrapeToast.variant });
        } catch (error) {
          toast(error instanceof Error ? error.message : 'Email scrape failed.', {
            variant: 'error',
          });
        } finally {
          organizationEmailScrapeInFlightRef.current.delete(organizationId);
          setOrganizationEmailScrapeState((current) => {
            const next = { ...current };
            delete next[organizationId];
            return next;
          });
        }
      })();
    },
    [toast]
  );
  const launchOrganizationWebsiteSocialScrape = useCallback(
    (organizationId: string): void => {
      if (organizationWebsiteSocialScrapeInFlightRef.current.has(organizationId)) return;
      organizationWebsiteSocialScrapeInFlightRef.current.add(organizationId);
      setOrganizationWebsiteSocialScrapeState((current) => ({
        ...current,
        [organizationId]: true,
      }));
      void (async (): Promise<void> => {
        try {
          const response = await fetch(
            `/api/filemaker/organizations/${encodeURIComponent(
              organizationId
            )}/website-social-scrape`,
            {
              method: 'POST',
              headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({ maxPages: 6, maxSearchResults: 8 }),
            }
          );
          if (!response.ok) {
            throw new Error(await readOrganizationWebsiteSocialScrapeErrorMessage(response));
          }
          const result = (await response.json()) as OrganizationWebsiteSocialScrapeResponse;
          const scrapeToast = buildOrganizationWebsiteSocialScrapeToast(result);
          toast(scrapeToast.message, { variant: scrapeToast.variant });
        } catch (error) {
          toast(error instanceof Error ? error.message : 'Website/social scrape failed.', {
            variant: 'error',
          });
        } finally {
          organizationWebsiteSocialScrapeInFlightRef.current.delete(organizationId);
          setOrganizationWebsiteSocialScrapeState((current) => {
            const next = { ...current };
            delete next[organizationId];
            return next;
          });
        }
      })();
    },
    [toast]
  );
  const deleteOrganization = useCallback(
    (organization: FilemakerOrganization): void => {
      confirm({
        title: 'Delete Organisation',
        message: `Delete organisation "${organization.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        isDangerous: true,
        onConfirm: async (): Promise<void> => {
          const response = await fetch(
            `/api/filemaker/organizations/${encodeURIComponent(organization.id)}`,
            {
              method: 'DELETE',
              headers: withCsrfHeaders(),
            }
          );
          if (!response.ok) {
            throw new Error(`Failed to delete organisation (${response.status}).`);
          }
          removeMongoOrganizations([organization.id]);
          setOrganizationSelection(
            (current: OrganizationSelectionState): OrganizationSelectionState => {
              const next = { ...current };
              delete next[organization.id];
              return next;
            }
          );
          settingsStore.refetch();
          setOrganizationsRefreshKey((current: number): number => current + 1);
          toast(`Deleted organisation "${organization.name}".`, { variant: 'success' });
        },
      });
    },
    [confirm, removeMongoOrganizations, settingsStore, toast]
  );
  const deleteSelectedOrganizations = useCallback((): void => {
    const selectedIds = selectedOrganizationIdsFromState(organizationSelection);
    if (selectedIds.length === 0) {
      toast('Please select organisations to delete.', { variant: 'error' });
      return;
    }
    confirm({
      title: 'Delete Selected Organisations',
      message: `Delete ${selectedIds.length} selected organisation${
        selectedIds.length === 1 ? '' : 's'
      } and their linked job listings? This action cannot be undone.`,
      confirmText: `Delete ${selectedIds.length}`,
      isDangerous: true,
      onConfirm: async (): Promise<void> => {
        setIsDeletingOrganizations(true);
        try {
          const response = await fetch('/api/filemaker/organizations/batch-delete', {
            method: 'POST',
            headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ organizationIds: selectedIds }),
          });
          if (!response.ok) {
            throw new Error(`Failed to delete organisations (${response.status}).`);
          }
          const result = (await response.json()) as BatchDeleteOrganizationsResponse;
          const deletedIds = new Set([
            ...(result.deletedOrganizationIds ?? []),
            ...(result.missingOrganizationIds ?? []),
          ]);
          const idsToRemove = deletedIds.size > 0 ? Array.from(deletedIds) : selectedIds;
          removeMongoOrganizations(idsToRemove);
          setOrganizationSelection(
            (current: OrganizationSelectionState): OrganizationSelectionState => {
              const next = { ...current };
              selectedIds.forEach((organizationId: string): void => {
                delete next[organizationId];
              });
              return next;
            }
          );
          settingsStore.refetch();
          setOrganizationsRefreshKey((current: number): number => current + 1);
          const deletedOrganizationCount =
            result.deletedOrganizationCount ?? idsToRemove.length;
          const deletedJobListingCount = result.deletedJobListingCount ?? 0;
          toast(
            buildDeletedOrganizationsToast({
              deletedJobListingCount,
              deletedOrganizationCount,
            }),
            { variant: 'success' }
          );
        } finally {
          setIsDeletingOrganizations(false);
        }
      },
    });
  }, [confirm, organizationSelection, removeMongoOrganizations, settingsStore, toast]);
  const renderNode = useOrganizationRenderNode({
    eventsById: organizationRelations.eventsById,
    jobListingsById: organizationRelations.jobListingsById,
    jobListingsByOrganizationId: organizationRelations.jobListingsByOrganizationId,
    organizations,
    organizationEmailScrapeState,
    organizationWebsiteSocialScrapeState,
    organizationSelection,
    onLaunchOrganizationEmailScrape: launchOrganizationEmailScrape,
    onLaunchOrganizationWebsiteSocialScrape: launchOrganizationWebsiteSocialScrape,
    onDeleteOrganization: deleteOrganization,
    onOpenEvent: openEvent,
    onOpenJobListing: openJobListing,
    onOpenOrganization: openOrganization,
    onToggleOrganizationSelection: toggleOrganizationSelection,
  });
  const selectedOrganizationCount = selectedOrganizationIdsFromState(organizationSelection).length;
  const handleJobBoardScrapeCompleted = useCallback((): void => {
    settingsStore.refetch();
    setSort('updatedAt_desc');
    setPage(1);
    setOrganizationsRefreshKey((current) => current + 1);
  }, [settingsStore]);
  const setAdvancedFilterState = useCallback((value: string, presetId: string | null): void => {
    const normalizedValue = value.trim();
    const nextPresetId = normalizedValue.length > 0 ? presetId : null;
    setFilters((current: OrganizationFilters): OrganizationFilters => ({
      ...current,
      advancedFilter: normalizedValue,
    }));
    setActiveAdvancedFilterPresetId(nextPresetId);
    persistAppliedAdvancedFilterState({ value: normalizedValue, presetId: nextPresetId });
    setPage(1);
  }, []);
  const updateAdvancedFilterPresets = useCallback(
    async (presets: OrganizationAdvancedFilterPreset[]): Promise<void> => {
      setAdvancedFilterPresets(presets);
      await persistAdvancedFilterPresets(presets);
    },
    []
  );

  return {
    actions,
    activeAdvancedFilterPresetId,
    advancedFilterPresets,
    error: mongoOrganizations.error,
    filters,
    isDeletingOrganizations,
    isLoading: mongoOrganizations.isLoading,
    isSelectingAllOrganizations,
    nodes,
    onDeselectAllOrganizations: () => {
      setOrganizationSelection({});
    },
    onDeselectOrganizationsPage: () => {
      setOrganizationSelection((current: OrganizationSelectionState): OrganizationSelectionState => {
        const next = { ...current };
        organizations.forEach((organization: FilemakerOrganization): void => {
          delete next[organization.id];
        });
        return next;
      });
    },
    onDeleteOrganization: deleteOrganization,
    onDeleteSelectedOrganizations: deleteSelectedOrganizations,
    onFilterChange: (key, value) => {
      setFilters((current) => ({ ...current, ...normalizeFilterValue(key, value) }));
      setPage(1);
    },
    onPageChange: setPage,
    onPageSizeChange: (value) => {
      setPageSize(value);
      setPage(1);
    },
    onJobBoardScrapeCompleted: handleJobBoardScrapeCompleted,
    onQueryChange: (value) => {
      setQuery(value);
      setPage(1);
    },
    onResetFilters: () => {
      setQuery('');
      setFilters(createDefaultOrganizationFilters());
      setSort(DEFAULT_ORGANIZATION_SORT);
      setActiveAdvancedFilterPresetId(null);
      persistAppliedAdvancedFilterState({ value: '', presetId: null });
      setPage(1);
    },
    onSelectAllOrganizations: selectAllOrganizations,
    onSelectOrganizationsPage: () => {
      setOrganizationSelection((current: OrganizationSelectionState): OrganizationSelectionState => {
        const next = { ...current };
        organizations.forEach((organization: FilemakerOrganization): void => {
          next[organization.id] = true;
        });
        return next;
      });
    },
    onSetAdvancedFilterPresets: updateAdvancedFilterPresets,
    onSetAdvancedFilterState: setAdvancedFilterState,
    onSortChange: (value) => {
      setSort(value);
      setPage(1);
    },
    onToggleOrganizationSelection: toggleOrganizationSelection,
    onLaunchOrganizationEmailScrape: launchOrganizationEmailScrape,
    onLaunchOrganizationWebsiteSocialScrape: launchOrganizationWebsiteSocialScrape,
    organizationEmailScrapeState,
    organizationWebsiteSocialScrapeState,
    organizationSelection,
    organizations,
    page,
    pageSize,
    query,
    renderNode,
    selectedOrganizationCount,
    shownCount: organizations.length,
    sort,
    totalCount: mongoOrganizations.totalCount,
    totalCountIsExact: mongoOrganizations.totalCountIsExact,
    totalPages: mongoOrganizations.totalPages,
    ConfirmationModal,
  };
}
