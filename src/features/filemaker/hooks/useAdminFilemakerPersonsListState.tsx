'use client';

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
import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';

import { FilemakerPersonMasterTreeNode } from '../components/shared/FilemakerPersonMasterTreeNode';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { buildFilemakerPersonListNodes } from '../entity-master-tree';
import {
  DEFAULT_PERSON_PAGE_SIZE,
  DEFAULT_PERSON_SORT,
  EMPTY_PERSONS_RESPONSE,
  createDefaultPersonFilters,
  type MongoFilemakerPerson,
  type MongoFilemakerPersonsResponse,
  type MongoFilemakerPersonsState,
  type PersonFilters,
  type PersonListState,
  type PersonSortOption,
} from '../pages/AdminFilemakerPersonsPage.types';

const ADDRESS_FILTERS = new Set(['with_address', 'without_address']);
const BANK_FILTERS = new Set(['with_bank', 'without_bank']);
const ORGANIZATION_FILTERS = new Set(['with_organizations', 'without_organizations']);
const FILEMAKER_PERSONS_QUERY_KEY = ['filemaker', 'persons'] as const;

type PersonListInput = {
  filters: PersonFilters;
  page: number;
  pageSize: number;
  query: string;
  sort: PersonSortOption;
};

const normalizeSelectFilter = <T extends string>(
  value: string,
  allowed: Set<string>,
  fallback: T
): T => (allowed.has(value) ? (value as T) : fallback);

const FILTER_NORMALIZERS: Record<string, (value: string) => Partial<PersonFilters>> = {
  address: (value: string) => ({
    address: normalizeSelectFilter(value, ADDRESS_FILTERS, 'all'),
  }),
  bank: (value: string) => ({
    bank: normalizeSelectFilter(value, BANK_FILTERS, 'all'),
  }),
  organization: (value: string) => ({
    organization: normalizeSelectFilter(value, ORGANIZATION_FILTERS, 'all'),
  }),
  updatedBy: (value: string) => ({ updatedBy: value }),
};

const normalizeFilterValue = (key: string, value: unknown): Partial<PersonFilters> => {
  const normalizer = FILTER_NORMALIZERS[key];
  return normalizer ? normalizer(typeof value === 'string' ? value : '') : {};
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

const buildPersonListParams = (input: PersonListInput): URLSearchParams => {
  const params = new URLSearchParams({
    address: input.filters.address,
    bank: input.filters.bank,
    organization: input.filters.organization,
    page: String(input.page),
    pageSize: String(input.pageSize),
    sort: input.sort,
  });
  if (input.query.length > 0) params.set('query', input.query);
  const updatedBy = input.filters.updatedBy.trim();
  if (updatedBy.length > 0) params.set('updatedBy', updatedBy);
  return params;
};

const buildPersonListQueryKey = (input: PersonListInput) =>
  [...FILEMAKER_PERSONS_QUERY_KEY, input] as const;

const fetchMongoFilemakerPersons = async (
  input: PersonListInput,
  signal: AbortSignal
): Promise<MongoFilemakerPersonsResponse> => {
  const params = buildPersonListParams(input);
  const response = await fetch(`/api/filemaker/persons?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Failed to load persons (${response.status}).`);
  return (await response.json()) as MongoFilemakerPersonsResponse;
};

function useMongoFilemakerPersons(input: PersonListInput): MongoFilemakerPersonsState {
  const queryKey = buildPersonListQueryKey(input);
  const personsQuery = useSingleQueryV2<
    MongoFilemakerPersonsResponse,
    MongoFilemakerPersonsResponse,
    typeof queryKey
  >({
    queryKey,
    queryFn: async ({ signal }) => fetchMongoFilemakerPersons(input, signal),
    placeholderData: (previousData) => previousData ?? EMPTY_PERSONS_RESPONSE,
    meta: {
      source: 'features.filemaker.hooks.useAdminFilemakerPersonsListState.useMongoFilemakerPersons',
      operation: 'list',
      resource: 'filemaker.persons',
      domain: 'files',
      description: 'Load imported Filemaker persons for the admin persons list.',
      errorPresentation: 'inline',
    },
    telemetryContext: {
      filters: input.filters,
      page: input.page,
      pageSize: input.pageSize,
      queryLength: input.query.length,
      sort: input.sort,
    },
  });

  return {
    ...(personsQuery.data ?? EMPTY_PERSONS_RESPONSE),
    error: personsQuery.error === null ? null : personsQuery.error.message,
    isLoading: personsQuery.isFetching,
  };
}

function usePersonActions(router: ReturnType<typeof useRouter>): {
  actions: PanelAction[];
  openPerson: (personId: string) => void;
} {
  const openPerson = useCallback(
    (personId: string): void => {
      startTransition(() => {
        router.push(`/admin/filemaker/persons/${encodeURIComponent(personId)}`);
      });
    },
    [router]
  );
  const actions = useMemo(
    () => [
      {
        key: 'create-person',
        label: 'Create Person',
        onClick: () => {
          startTransition(() => {
            router.push('/admin/filemaker/persons/new');
          });
        },
      },
      ...buildFilemakerNavActions(router, 'persons'),
    ],
    [router]
  );
  return { actions, openPerson };
}

function usePersonRenderNode(
  persons: MongoFilemakerPerson[],
  onOpenPerson: (personId: string) => void
): (input: FolderTreeViewportRenderNodeInput) => React.ReactNode {
  const personById = useMemo(
    () =>
      new Map<string, MongoFilemakerPerson>(
        persons.map((person: MongoFilemakerPerson) => [person.id, person])
      ),
    [persons]
  );
  return useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <FilemakerPersonMasterTreeNode
        {...input}
        personById={personById}
        onOpenPerson={onOpenPerson}
      />
    ),
    [onOpenPerson, personById]
  );
}

export function useAdminFilemakerPersonsListState(): PersonListState {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PERSON_PAGE_SIZE);
  const [sort, setSort] = useState<PersonSortOption>(DEFAULT_PERSON_SORT);
  const [filters, setFilters] = useState<PersonFilters>(createDefaultPersonFilters);
  const deferredQuery = useDeferredValue(query.trim());
  const debouncedQuery = useDebouncedValue(deferredQuery, 250);
  const mongoPersons = useMongoFilemakerPersons({
    filters,
    page,
    pageSize,
    query: debouncedQuery,
    sort,
  });
  const { actions, openPerson } = usePersonActions(router);
  const persons = mongoPersons.persons;
  const nodes = useMemo(() => buildFilemakerPersonListNodes(persons), [persons]);
  const renderNode = usePersonRenderNode(persons, openPerson);

  return {
    actions,
    error: mongoPersons.error,
    filters,
    isLoading: mongoPersons.isLoading,
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
      setFilters(createDefaultPersonFilters());
      setSort(DEFAULT_PERSON_SORT);
      setPage(1);
    },
    onSortChange: (value) => {
      setSort(value);
      setPage(1);
    },
    page,
    pageSize,
    query,
    renderNode,
    shownCount: persons.length,
    sort,
    totalCount: mongoPersons.totalCount,
    totalCountIsExact: mongoPersons.totalCountIsExact,
    totalPages: mongoPersons.totalPages,
  };
}
