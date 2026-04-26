'use client';

import { Plus } from 'lucide-react';
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

import { FilemakerEventMasterTreeNode } from '../components/shared/FilemakerEventMasterTreeNode';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { buildFilemakerEventListNodes } from '../entity-master-tree';
import {
  DEFAULT_EVENT_PAGE_SIZE,
  EMPTY_EVENTS_RESPONSE,
  createDefaultEventFilters,
  type EventFilters,
  type EventListState,
  type MongoFilemakerEvent,
  type MongoFilemakerEventsResponse,
  type MongoFilemakerEventsState,
} from '../pages/AdminFilemakerEventsPage.types';

const ADDRESS_FILTERS = new Set(['with_address', 'without_address']);
const ORGANIZATION_FILTERS = new Set(['with_organizations', 'without_organizations']);
const STATUS_FILTERS = new Set(['active', 'discontinued']);

const normalizeSelectFilter = <T extends string>(
  value: string,
  allowed: Set<string>,
  fallback: T
): T => (allowed.has(value) ? (value as T) : fallback);

const FILTER_NORMALIZERS: Record<string, (value: string) => Partial<EventFilters>> = {
  address: (value: string) => ({
    address: normalizeSelectFilter(value, ADDRESS_FILTERS, 'all'),
  }),
  organization: (value: string) => ({
    organization: normalizeSelectFilter(value, ORGANIZATION_FILTERS, 'all'),
  }),
  status: (value: string) => ({
    status: normalizeSelectFilter(value, STATUS_FILTERS, 'all'),
  }),
  updatedBy: (value: string) => ({ updatedBy: value }),
};

const normalizeFilterValue = (key: string, value: unknown): Partial<EventFilters> => {
  const normalizer = FILTER_NORMALIZERS[key];
  return normalizer ? normalizer(typeof value === 'string' ? value : '') : {};
};

const buildEventListParams = (input: {
  filters: EventFilters;
  page: number;
  pageSize: number;
  query: string;
}): URLSearchParams => {
  const params = new URLSearchParams({
    address: input.filters.address,
    organization: input.filters.organization,
    page: String(input.page),
    pageSize: String(input.pageSize),
    status: input.filters.status,
  });
  if (input.query.length > 0) params.set('query', input.query);
  const updatedBy = input.filters.updatedBy.trim();
  if (updatedBy.length > 0) params.set('updatedBy', updatedBy);
  return params;
};

function useMongoFilemakerEvents(input: {
  filters: EventFilters;
  page: number;
  pageSize: number;
  query: string;
}): MongoFilemakerEventsState {
  const { filters, page, pageSize, query } = input;
  const [state, setState] = useState<MongoFilemakerEventsState>({
    ...EMPTY_EVENTS_RESPONSE,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    const params = buildEventListParams({ filters, page, pageSize, query });
    setState((current) => ({ ...current, error: null, isLoading: true }));
    fetch(`/api/filemaker/events?${params.toString()}`, { signal: controller.signal })
      .then(async (response: Response): Promise<MongoFilemakerEventsResponse> => {
        if (!response.ok) throw new Error(`Failed to load events (${response.status}).`);
        return (await response.json()) as MongoFilemakerEventsResponse;
      })
      .then((response: MongoFilemakerEventsResponse): void => {
        setState({ ...response, error: null, isLoading: false });
      })
      .catch((error: unknown): void => {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : 'Failed to load events.',
          isLoading: false,
        }));
      });
    return () => {
      controller.abort();
    };
  }, [filters, page, pageSize, query]);

  return state;
}

function useEventActions(router: ReturnType<typeof useRouter>): {
  actions: PanelAction[];
  openEvent: (eventId: string) => void;
} {
  const openEvent = useCallback(
    (eventId: string): void => {
      startTransition(() => {
        router.push(`/admin/filemaker/events/${encodeURIComponent(eventId)}`);
      });
    },
    [router]
  );
  const actions = useMemo(
    () => [
      {
        key: 'create-event',
        label: 'Create Event',
        icon: <Plus className='size-4' />,
        onClick: () => {
          startTransition(() => {
            router.push('/admin/filemaker/events/new');
          });
        },
      },
      ...buildFilemakerNavActions(router, 'events'),
    ],
    [router]
  );
  return { actions, openEvent };
}

function useEventRenderNode(
  events: MongoFilemakerEvent[],
  onOpenEvent: (eventId: string) => void
): (input: FolderTreeViewportRenderNodeInput) => React.ReactNode {
  const eventById = useMemo(
    () => new Map<string, MongoFilemakerEvent>(events.map((event) => [event.id, event])),
    [events]
  );
  return useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <FilemakerEventMasterTreeNode
        {...input}
        eventById={eventById}
        onOpenEvent={onOpenEvent}
      />
    ),
    [eventById, onOpenEvent]
  );
}

export function useAdminFilemakerEventsListState(): EventListState {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_EVENT_PAGE_SIZE);
  const [filters, setFilters] = useState<EventFilters>(createDefaultEventFilters);
  const deferredQuery = useDeferredValue(query.trim());
  const mongoEvents = useMongoFilemakerEvents({
    filters,
    page,
    pageSize,
    query: deferredQuery,
  });
  const { actions, openEvent } = useEventActions(router);
  const events = mongoEvents.events;
  const nodes = useMemo(() => buildFilemakerEventListNodes(events), [events]);
  const renderNode = useEventRenderNode(events, openEvent);

  return {
    actions,
    error: mongoEvents.error,
    filters,
    isLoading: mongoEvents.isLoading,
    nodes,
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
      setFilters(createDefaultEventFilters());
      setPage(1);
    },
    page,
    pageSize,
    query,
    renderNode,
    shownCount: events.length,
    totalCount: mongoEvents.totalCount,
    totalPages: mongoEvents.totalPages,
  };
}
