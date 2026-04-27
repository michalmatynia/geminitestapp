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
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { FilemakerOrganizationMasterTreeNode } from '../components/shared/FilemakerOrganizationMasterTreeNode';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { buildFilemakerOrganizationListNodes } from '../entity-master-tree';
import { useFilemakerOrganiserImportAction } from './useFilemakerOrganiserImportAction';
import { FILEMAKER_DATABASE_KEY } from '../settings';
import type { FilemakerOrganization } from '../types';
import {
  DEFAULT_ORGANIZATION_PAGE_SIZE,
  EMPTY_ORGANIZATIONS_RESPONSE,
  createDefaultOrganizationFilters,
  type MongoFilemakerOrganizationsResponse,
  type MongoFilemakerOrganizationsState,
  type OrganizationFilters,
  type OrganizationListState,
} from '../pages/AdminFilemakerOrganizationsPage.types';

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

function useOrganizationActions(router: ReturnType<typeof useRouter>): {
  actions: PanelAction[];
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
  const actions = useMemo(
    () => [
      {
        key: 'create-organization',
        label: 'Create Organization',
        icon: <Plus className='size-4' />,
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
  return { actions, openOrganization };
}

function useOrganizationRenderNode(
  organizations: FilemakerOrganization[],
  onOpenOrganization: (organizationId: string) => void
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
        organizationById={organizationById}
        onOpenOrganization={onOpenOrganization}
      />
    ),
    [onOpenOrganization, organizationById]
  );
}

export function useAdminFilemakerOrganizationsListState(): OrganizationListState {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_ORGANIZATION_PAGE_SIZE);
  const [filters, setFilters] = useState<OrganizationFilters>(createDefaultOrganizationFilters);
  const deferredQuery = useDeferredValue(query.trim());
  const debouncedQuery = useDebouncedValue(deferredQuery, 250);
  const mongoOrganizations = useMongoFilemakerOrganizations({
    filters,
    page,
    pageSize,
    query: debouncedQuery,
  });
  const { actions, openOrganization } = useOrganizationActions(router);
  const organizations = mongoOrganizations.organizations;
  const nodes = useMemo(() => buildFilemakerOrganizationListNodes(organizations), [organizations]);
  const renderNode = useOrganizationRenderNode(organizations, openOrganization);
  const { importActions, isImporting } = useFilemakerOrganiserImportAction({
    rawDatabase: settingsStore.get(FILEMAKER_DATABASE_KEY),
    refetchSettings: settingsStore.refetch,
  });

  return {
    actions,
    customActions: importActions,
    error: mongoOrganizations.error,
    filters,
    isLoading: isImporting || mongoOrganizations.isLoading,
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
      setFilters(createDefaultOrganizationFilters());
      setPage(1);
    },
    page,
    pageSize,
    query,
    renderNode,
    shownCount: organizations.length,
    totalCount: mongoOrganizations.totalCount,
    totalCountIsExact: mongoOrganizations.totalCountIsExact,
    totalPages: mongoOrganizations.totalPages,
  };
}
