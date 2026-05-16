'use client';

import { Globe } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { PanelHeader } from '@/shared/ui/templates.public';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import type { MongoFilemakerWebsitesResponse, WebsiteLinkFilter } from '../filemaker-websites.types';
import {
  createWebsiteColumns,
  DEFAULT_WEBSITE_PAGE_SIZE,
  WebsiteListPanel,
  type WebsiteListPanelProps,
} from './AdminFilemakerWebsitesPage.parts';

type WebsiteListState = MongoFilemakerWebsitesResponse & {
  error: string | null;
  isLoading: boolean;
};

type WebsiteListInput = {
  linkFilter: WebsiteLinkFilter;
  page: number;
  pageSize: number;
  query: string;
};

const FILEMAKER_WEBSITES_QUERY_KEY = ['filemaker', 'websites'] as const;

const EMPTY_WEBSITES_RESPONSE: MongoFilemakerWebsitesResponse = {
  collectionCount: 0,
  filters: { links: 'all' },
  limit: DEFAULT_WEBSITE_PAGE_SIZE,
  page: 1,
  pageSize: DEFAULT_WEBSITE_PAGE_SIZE,
  query: '',
  totalCount: 0,
  totalPages: 1,
  websites: [],
};

const buildWebsiteListParams = (input: WebsiteListInput): URLSearchParams => {
  const params = new URLSearchParams({
    links: input.linkFilter,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  if (input.query.length > 0) params.set('query', input.query);
  return params;
};

const buildWebsiteListQueryKey = (input: WebsiteListInput) =>
  [...FILEMAKER_WEBSITES_QUERY_KEY, input] as const;

const fetchMongoFilemakerWebsites = async (
  input: WebsiteListInput,
  signal: AbortSignal
): Promise<MongoFilemakerWebsitesResponse> => {
  const params = buildWebsiteListParams(input);
  const response = await fetch(`/api/filemaker/websites?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Failed to load websites (${response.status}).`);
  return (await response.json()) as MongoFilemakerWebsitesResponse;
};

function useMongoFilemakerWebsites(input: WebsiteListInput): WebsiteListState {
  const queryKey = buildWebsiteListQueryKey(input);
  const websitesQuery = useSingleQueryV2<
    MongoFilemakerWebsitesResponse,
    MongoFilemakerWebsitesResponse,
    typeof queryKey
  >({
    queryKey,
    queryFn: async ({ signal }) => fetchMongoFilemakerWebsites(input, signal),
    placeholderData: (previousData) => previousData ?? EMPTY_WEBSITES_RESPONSE,
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerWebsitesPage.useMongoFilemakerWebsites',
      operation: 'list',
      resource: 'filemaker.websites',
      domain: 'files',
      description: 'Load imported Filemaker website records for the admin websites table.',
      errorPresentation: 'inline',
    },
    telemetryContext: {
      linkFilter: input.linkFilter,
      page: input.page,
      pageSize: input.pageSize,
      queryLength: input.query.length,
    },
  });

  return {
    ...(websitesQuery.data ?? EMPTY_WEBSITES_RESPONSE),
    error: websitesQuery.error === null ? null : websitesQuery.error.message,
    isLoading: websitesQuery.isFetching,
  };
}

type WebsiteListPanelInput = {
  columns: WebsiteListPanelProps['columns'];
  linkFilter: WebsiteLinkFilter;
  onLinkFilterChange: (value: WebsiteLinkFilter) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onQueryChange: (query: string) => void;
  onReset: () => void;
  query: string;
  state: WebsiteListState;
};

const createWebsiteListPanelProps = (input: WebsiteListPanelInput): WebsiteListPanelProps => ({
  columns: input.columns,
  error: input.state.error,
  isLoading: input.state.isLoading,
  linkFilter: input.linkFilter,
  onLinkFilterChange: input.onLinkFilterChange,
  onPageChange: input.onPageChange,
  onPageSizeChange: input.onPageSizeChange,
  onQueryChange: input.onQueryChange,
  onReset: input.onReset,
  page: input.state.page,
  pageSize: input.state.pageSize,
  query: input.query,
  totalCount: input.state.totalCount,
  totalPages: input.state.totalPages,
  websites: input.state.websites,
});

function useWebsiteListController(): {
  navActions: PanelAction[];
  tableProps: WebsiteListPanelProps;
} {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_WEBSITE_PAGE_SIZE);
  const [linkFilter, setLinkFilter] = useState<WebsiteLinkFilter>('all');
  const deferredQuery = useDeferredValue(query.trim());
  const listInput = useMemo(
    () => ({ linkFilter, page, pageSize, query: deferredQuery }),
    [deferredQuery, linkFilter, page, pageSize]
  );
  const state = useMongoFilemakerWebsites(listInput);
  const handleOpenDetails = useCallback(
    (websiteId: string): void => {
      startTransition(() => {
        router.push(`/admin/filemaker/websites/${encodeURIComponent(websiteId)}`);
      });
    },
    [router]
  );
  const handlePageSizeChange = useCallback((value: number): void => {
    setPageSize(value);
    setPage(1);
  }, []);
  const handleLinkFilterChange = useCallback((value: WebsiteLinkFilter): void => {
    setLinkFilter(value);
    setPage(1);
  }, []);
  const handleQueryChange = useCallback((value: string): void => {
    setQuery(value);
    setPage(1);
  }, []);
  const handleResetFilters = useCallback((): void => {
    setQuery('');
    setLinkFilter('all');
    setPage(1);
  }, []);
  const columns = useMemo(
    () => createWebsiteColumns({ onOpenDetails: handleOpenDetails }),
    [handleOpenDetails]
  );

  return {
    navActions: buildFilemakerNavActions(router, 'websites'),
    tableProps: createWebsiteListPanelProps({
      columns,
      linkFilter,
      onLinkFilterChange: handleLinkFilterChange,
      onPageChange: setPage,
      onPageSizeChange: handlePageSizeChange,
      onQueryChange: handleQueryChange,
      onReset: handleResetFilters,
      query,
      state,
    }),
  };
}

export function AdminFilemakerWebsitesPage(): React.JSX.Element {
  const controller = useWebsiteListController();

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker Websites'
        description='Search imported WebsiteBook records and open their linked organisations, persons, and events.'
        icon={<Globe className='size-4' />}
        actions={controller.navActions}
      />
      <WebsiteListPanel {...controller.tableProps} />
    </div>
  );
}
