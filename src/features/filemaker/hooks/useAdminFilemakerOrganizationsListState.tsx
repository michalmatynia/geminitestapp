'use client';
/* eslint-disable max-lines, max-lines-per-function, max-params */

import { useRouter } from 'nextjs-toploader/app';
import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';

import { FilemakerOrganizationMasterTreeNode } from '../components/shared/FilemakerOrganizationMasterTreeNode';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { buildFilemakerOrganizationListNodes } from '../entity-master-tree';
import {
  FILEMAKER_DATABASE_KEY,
  getFilemakerEventsForOrganization,
  getFilemakerJobListingsForOrganization,
  parseFilemakerDatabase,
} from '../settings';
import type { FilemakerEvent, FilemakerJobListing, FilemakerOrganization } from '../types';
import {
  DEFAULT_ORGANIZATION_PAGE_SIZE,
  EMPTY_ORGANIZATIONS_RESPONSE,
  createDefaultOrganizationFilters,
  type MongoFilemakerOrganizationsResponse,
  type MongoFilemakerOrganizationsState,
  type OrganizationFilters,
  type OrganizationListState,
  type OrganizationSelectionState,
} from '../pages/AdminFilemakerOrganizationsPage.types';

type OrganizationEmailScrapeResponse = {
  promoted?: Array<{ status?: string }>;
  skipped?: Array<{ reason?: string }>;
  runId?: string | null;
};

const ADDRESS_FILTERS = new Set(['with_address', 'without_address']);
const BANK_FILTERS = new Set(['with_bank', 'without_bank']);
const PARENT_FILTERS = new Set(['root', 'child']);

const normalizeSelectFilter = <T extends string>(
  value: string,
  allowed: Set<string>,
  fallback: T
): T => (allowed.has(value) ? (value as T) : fallback);

const FILTER_NORMALIZERS: Record<
  string,
  (value: string) => Partial<OrganizationFilters>
> = {
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

const buildOrganizationListParams = (input: {
  filters: OrganizationFilters;
  page: number;
  pageSize: number;
  query: string;
}): URLSearchParams => {
  const params = new URLSearchParams({
    address: input.filters.address,
    bank: input.filters.bank,
    page: String(input.page),
    pageSize: String(input.pageSize),
    parent: input.filters.parent,
  });
  if (input.query.length > 0) params.set('query', input.query);
  const updatedBy = input.filters.updatedBy.trim();
  if (updatedBy.length > 0) params.set('updatedBy', updatedBy);
  return params;
};

function useMongoFilemakerOrganizations(input: {
  filters: OrganizationFilters;
  page: number;
  pageSize: number;
  query: string;
}): MongoFilemakerOrganizationsState {
  const { filters, page, pageSize, query } = input;
  const [state, setState] = useState<MongoFilemakerOrganizationsState>({
    ...EMPTY_ORGANIZATIONS_RESPONSE,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    const params = buildOrganizationListParams({ filters, page, pageSize, query });
    setState((current) => ({ ...current, error: null, isLoading: true }));
    fetch(`/api/filemaker/organizations?${params.toString()}`, { signal: controller.signal })
      .then(async (response: Response): Promise<MongoFilemakerOrganizationsResponse> => {
        if (!response.ok) throw new Error(`Failed to load organisations (${response.status}).`);
        return (await response.json()) as MongoFilemakerOrganizationsResponse;
      })
      .then((response: MongoFilemakerOrganizationsResponse): void => {
        setState({ ...response, error: null, isLoading: false });
      })
      .catch((error: unknown): void => {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : 'Failed to load organisations.',
          isLoading: false,
        }));
      });
    return () => {
      controller.abort();
    };
  }, [filters, page, pageSize, query]);

  return state;
}

const loadOrganizationIdsForSelection = async (input: {
  filters: OrganizationFilters;
  query: string;
}): Promise<string[]> => {
  const params = buildOrganizationListParams({
    filters: input.filters,
    page: 1,
    pageSize: 1,
    query: input.query,
  });
  params.set('idsOnly', 'true');
  const response = await fetch(`/api/filemaker/organizations?${params.toString()}`);
  if (!response.ok) throw new Error(`Failed to load organisation IDs (${response.status}).`);
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

function useOrganizationRenderNode(
  eventsById: ReadonlyMap<string, FilemakerEvent>,
  jobListingsById: ReadonlyMap<string, FilemakerJobListing>,
  organizations: FilemakerOrganization[],
  organizationEmailScrapeState: Record<string, boolean>,
  organizationSelection: OrganizationSelectionState,
  onLaunchOrganizationEmailScrape: (organizationId: string) => void,
  onOpenEvent: (eventId: string) => void,
  onOpenJobListing: (organizationId: string, jobListingId: string) => void,
  onOpenOrganization: (organizationId: string) => void,
  onToggleOrganizationSelection: (organizationId: string, checked: boolean) => void
): (input: FolderTreeViewportRenderNodeInput) => React.ReactNode {
  const organizationById = useMemo(
    () =>
      new Map<string, FilemakerOrganization>(
        organizations.map((organization) => [organization.id, organization])
      ),
    [organizations]
  );
  return useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <FilemakerOrganizationMasterTreeNode
        {...input}
        eventsById={eventsById}
        jobListingsById={jobListingsById}
        organizationEmailScrapeState={organizationEmailScrapeState}
        organizationSelection={organizationSelection}
        organizationById={organizationById}
        onLaunchOrganizationEmailScrape={onLaunchOrganizationEmailScrape}
        onOpenEvent={onOpenEvent}
        onOpenJobListing={onOpenJobListing}
        onOpenOrganization={onOpenOrganization}
        onToggleOrganizationSelection={onToggleOrganizationSelection}
      />
    ),
    [
      eventsById,
      jobListingsById,
      onLaunchOrganizationEmailScrape,
      onOpenEvent,
      onOpenJobListing,
      onOpenOrganization,
      onToggleOrganizationSelection,
      organizationById,
      organizationEmailScrapeState,
      organizationSelection,
    ]
  );
}

const selectedOrganizationIdsFromState = (
  selection: OrganizationSelectionState
): string[] => Object.keys(selection).filter((id: string): boolean => selection[id] === true);

const buildOrganizationRelationMaps = (
  organizations: FilemakerOrganization[],
  linkedEventsByOrganizationId: Record<string, FilemakerEvent[]>,
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
    database.jobListings.map(
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
    const jobListings = getFilemakerJobListingsForOrganization(database, organization.id);
    if (jobListings.length > 0) jobListingsByOrganizationId.set(organization.id, jobListings);
  });
  return {
    eventsById,
    eventsByOrganizationId,
    jobListingsById,
    jobListingsByOrganizationId,
  };
};

export function useAdminFilemakerOrganizationsListState(): OrganizationListState {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_ORGANIZATION_PAGE_SIZE);
  const [filters, setFilters] = useState<OrganizationFilters>(createDefaultOrganizationFilters);
  const [isSelectingAllOrganizations, setIsSelectingAllOrganizations] = useState(false);
  const [organizationEmailScrapeState, setOrganizationEmailScrapeState] =
    useState<Record<string, boolean>>({});
  const [organizationSelection, setOrganizationSelection] =
    useState<OrganizationSelectionState>({});
  const deferredQuery = useDeferredValue(query.trim());
  const debouncedQuery = useDebouncedValue(deferredQuery, 250);
  const mongoOrganizations = useMongoFilemakerOrganizations({
    filters,
    page,
    pageSize,
    query: debouncedQuery,
  });
  const { actions, openEvent, openJobListing, openOrganization } = useOrganizationActions(router);
  const organizations = mongoOrganizations.organizations;
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const organizationRelations = useMemo(
    () =>
      buildOrganizationRelationMaps(
        organizations,
        mongoOrganizations.linkedEventsByOrganizationId,
        rawDatabase ?? null
      ),
    [mongoOrganizations.linkedEventsByOrganizationId, organizations, rawDatabase]
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
  }, [filters, query, toast]);
  const launchOrganizationEmailScrape = useCallback(
    (organizationId: string): void => {
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
            throw new Error(`Email scrape failed (${response.status}).`);
          }
          const result = (await response.json()) as OrganizationEmailScrapeResponse;
          const promoted = result.promoted ?? [];
          const createdCount = promoted.filter((item) => item.status === 'created').length;
          const linkedCount = promoted.filter((item) => item.status === 'linked').length;
          const alreadyLinkedCount = promoted.filter(
            (item) => item.status === 'already-linked'
          ).length;
          const skippedCount = result.skipped?.length ?? 0;
          toast(
            `Email scrape finished: ${createdCount} created, ${linkedCount} linked, ${alreadyLinkedCount} already linked, ${skippedCount} skipped.`,
            { variant: 'success' }
          );
        } catch (error) {
          toast(error instanceof Error ? error.message : 'Email scrape failed.', {
            variant: 'error',
          });
        } finally {
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
  const renderNode = useOrganizationRenderNode(
    organizationRelations.eventsById,
    organizationRelations.jobListingsById,
    organizations,
    organizationEmailScrapeState,
    organizationSelection,
    launchOrganizationEmailScrape,
    openEvent,
    openJobListing,
    openOrganization,
    toggleOrganizationSelection
  );
  const selectedOrganizationCount = selectedOrganizationIdsFromState(organizationSelection).length;

  return {
    actions,
    error: mongoOrganizations.error,
    filters,
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
    onFilterChange: (key, value) => {
      setFilters((current) => ({ ...current, ...normalizeFilterValue(key, value) }));
      setPage(1);
    },
    onPageChange: setPage,
    onPageSizeChange: (value) => {
      setPageSize(value);
      setPage(1);
    },
    onQueryChange: (value) => {
      setQuery(value);
      setPage(1);
    },
    onResetFilters: () => {
      setQuery('');
      setFilters(createDefaultOrganizationFilters());
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
    onToggleOrganizationSelection: toggleOrganizationSelection,
    onLaunchOrganizationEmailScrape: launchOrganizationEmailScrape,
    organizationEmailScrapeState,
    organizationSelection,
    organizations,
    page,
    pageSize,
    query,
    renderNode,
    selectedOrganizationCount,
    shownCount: organizations.length,
    totalCount: mongoOrganizations.totalCount,
    totalCountIsExact: mongoOrganizations.totalCountIsExact,
    totalPages: mongoOrganizations.totalPages,
  };
}
