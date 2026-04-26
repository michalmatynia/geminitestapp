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

import { FilemakerPersonMasterTreeNode } from '../components/shared/FilemakerPersonMasterTreeNode';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { buildFilemakerPersonListNodes } from '../entity-master-tree';
import {
  DEFAULT_PERSON_PAGE_SIZE,
  EMPTY_PERSONS_RESPONSE,
  createDefaultPersonFilters,
  type MongoFilemakerPerson,
  type MongoFilemakerPersonsResponse,
  type MongoFilemakerPersonsState,
  type PersonFilters,
  type PersonListState,
} from '../pages/AdminFilemakerPersonsPage.types';

const ADDRESS_FILTERS = new Set(['with_address', 'without_address']);
const BANK_FILTERS = new Set(['with_bank', 'without_bank']);
const ORGANIZATION_FILTERS = new Set(['with_organizations', 'without_organizations']);

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

const buildPersonListParams = (input: {
  filters: PersonFilters;
  page: number;
  pageSize: number;
  query: string;
}): URLSearchParams => {
  const params = new URLSearchParams({
    address: input.filters.address,
    bank: input.filters.bank,
    organization: input.filters.organization,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  if (input.query.length > 0) params.set('query', input.query);
  const updatedBy = input.filters.updatedBy.trim();
  if (updatedBy.length > 0) params.set('updatedBy', updatedBy);
  return params;
};

function useMongoFilemakerPersons(input: {
  filters: PersonFilters;
  page: number;
  pageSize: number;
  query: string;
}): MongoFilemakerPersonsState {
  const { filters, page, pageSize, query } = input;
  const [state, setState] = useState<MongoFilemakerPersonsState>({
    ...EMPTY_PERSONS_RESPONSE,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    const params = buildPersonListParams({ filters, page, pageSize, query });
    setState((current) => ({ ...current, error: null, isLoading: true }));
    fetch(`/api/filemaker/persons?${params.toString()}`, { signal: controller.signal })
      .then(async (response: Response): Promise<MongoFilemakerPersonsResponse> => {
        if (!response.ok) throw new Error(`Failed to load persons (${response.status}).`);
        return (await response.json()) as MongoFilemakerPersonsResponse;
      })
      .then((response: MongoFilemakerPersonsResponse): void => {
        setState({ ...response, error: null, isLoading: false });
      })
      .catch((error: unknown): void => {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : 'Failed to load persons.',
          isLoading: false,
        }));
      });
    return () => {
      controller.abort();
    };
  }, [filters, page, pageSize, query]);

  return state;
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
        icon: <Plus className='size-4' />,
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
  const [filters, setFilters] = useState<PersonFilters>(createDefaultPersonFilters);
  const deferredQuery = useDeferredValue(query.trim());
  const mongoPersons = useMongoFilemakerPersons({
    filters,
    page,
    pageSize,
    query: deferredQuery,
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
      setPage(1);
    },
    page,
    pageSize,
    query,
    renderNode,
    shownCount: persons.length,
    totalCount: mongoPersons.totalCount,
    totalPages: mongoPersons.totalPages,
  };
}
