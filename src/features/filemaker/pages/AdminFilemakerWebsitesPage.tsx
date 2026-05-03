'use client';

/* eslint-disable max-lines-per-function */

import { ExternalLink, Globe } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { FilterField } from '@/shared/contracts/ui/panels';
import { Pagination } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { FilterPanel, PanelHeader, StandardDataTablePanel } from '@/shared/ui/templates.public';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import type {
  MongoFilemakerWebsitesResponse,
  MongoFilemakerWebsiteSummary,
  WebsiteLinkFilter,
} from '../filemaker-websites.types';
import { formatTimestamp } from './filemaker-page-utils';
import type { ColumnDef } from '@tanstack/react-table';

const WEBSITE_PAGE_SIZE_OPTIONS = [24, 48, 96, 200];
const DEFAULT_WEBSITE_PAGE_SIZE = 48;

type WebsiteListState = MongoFilemakerWebsitesResponse & {
  error: string | null;
  isLoading: boolean;
};

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

const WEBSITE_FILTER_FIELDS: FilterField[] = [
  {
    key: 'links',
    label: 'Links',
    type: 'select',
    options: [
      { value: 'all', label: 'All websites' },
      { value: 'with_links', label: 'With links' },
      { value: 'without_links', label: 'Without links' },
      { value: 'organizations', label: 'Linked to organisations' },
      { value: 'persons', label: 'Linked to persons' },
      { value: 'events', label: 'Linked to events' },
    ],
    width: '240px',
  },
];

const normalizeWebsiteLinkFilter = (value: unknown): WebsiteLinkFilter => {
  if (
    value === 'with_links' ||
    value === 'without_links' ||
    value === 'organizations' ||
    value === 'persons' ||
    value === 'events'
  ) {
    return value;
  }
  return 'all';
};

const buildWebsiteListParams = (input: {
  linkFilter: WebsiteLinkFilter;
  page: number;
  pageSize: number;
  query: string;
}): URLSearchParams => {
  const params = new URLSearchParams({
    links: input.linkFilter,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  if (input.query.length > 0) params.set('query', input.query);
  return params;
};

const resolveWebsiteHref = (url: string): string | null => {
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

function useMongoFilemakerWebsites(input: {
  linkFilter: WebsiteLinkFilter;
  page: number;
  pageSize: number;
  query: string;
}): WebsiteListState {
  const [state, setState] = useState<WebsiteListState>({
    ...EMPTY_WEBSITES_RESPONSE,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    const params = buildWebsiteListParams(input);
    setState((current: WebsiteListState) => ({ ...current, error: null, isLoading: true }));
    fetch(`/api/filemaker/websites?${params.toString()}`, { signal: controller.signal })
      .then(async (response: Response): Promise<MongoFilemakerWebsitesResponse> => {
        if (!response.ok) throw new Error(`Failed to load websites (${response.status}).`);
        return (await response.json()) as MongoFilemakerWebsitesResponse;
      })
      .then((response: MongoFilemakerWebsitesResponse): void => {
        setState({ ...response, error: null, isLoading: false });
      })
      .catch((error: unknown): void => {
        if (controller.signal.aborted) return;
        setState((current: WebsiteListState) => ({
          ...current,
          error: error instanceof Error ? error.message : 'Failed to load websites.',
          isLoading: false,
        }));
      });
    return () => {
      controller.abort();
    };
  }, [input]);

  return state;
}

export function AdminFilemakerWebsitesPage(): React.JSX.Element {
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

  const columns = useMemo<ColumnDef<MongoFilemakerWebsiteSummary>[]>(
    () => [
      {
        id: 'website',
        header: 'Website',
        cell: ({ row }) => {
          const website = row.original;
          return (
            <div className='min-w-0 space-y-1'>
              <div className='truncate text-sm font-semibold text-white'>{website.url}</div>
              <div className='truncate text-xs text-gray-300'>{website.host ?? 'n/a'}</div>
              <div className='truncate text-[10px] text-gray-600'>
                Legacy UUID: {website.legacyUuid ?? 'n/a'}
              </div>
            </div>
          );
        },
      },
      {
        id: 'links',
        header: 'Links',
        cell: ({ row }) => {
          const website = row.original;
          return (
            <div className='space-y-0.5 text-[11px] text-gray-500'>
              <div>Total: {website.linkCount}</div>
              <div>Organisations: {website.organizationLinkCount}</div>
              <div>Persons: {website.personLinkCount}</div>
              <div>Events: {website.eventLinkCount}</div>
            </div>
          );
        },
      },
      {
        id: 'updated',
        header: 'Updated',
        cell: ({ row }) => (
          <span className='text-[10px] text-gray-600'>
            {formatTimestamp(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => {
          const href = resolveWebsiteHref(row.original.url);
          return (
            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                size='xs'
                onClick={(): void => {
                  startTransition(() => {
                    router.push(`/admin/filemaker/websites/${encodeURIComponent(row.original.id)}`);
                  });
                }}
              >
                Details
              </Button>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='size-7'
                aria-label={`Open website ${row.original.url}`}
                title={`Open website ${row.original.url}`}
                disabled={href === null}
                onClick={(): void => {
                  if (href !== null) window.open(href, '_blank', 'noopener,noreferrer');
                }}
              >
                <ExternalLink className='size-3.5' />
              </Button>
            </div>
          );
        },
      },
    ],
    [router]
  );

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker Websites'
        description='Search imported WebsiteBook records and open their linked organisations, persons, and events.'
        icon={<Globe className='size-4' />}
        actions={buildFilemakerNavActions(router, 'websites')}
      />

      <StandardDataTablePanel
        header={
          <div className='space-y-4'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant='outline' className='text-[10px]'>
                  Websites: {state.totalCount}
                </Badge>
                <Badge variant='outline' className='text-[10px]'>
                  Shown: {state.websites.length}
                </Badge>
                {state.error !== null ? (
                  <Badge variant='destructive' className='text-[10px]'>
                    {state.error}
                  </Badge>
                ) : null}
              </div>
              <Pagination
                page={state.page}
                totalPages={state.totalPages}
                totalCount={state.totalCount}
                pageSize={state.pageSize}
                onPageChange={setPage}
                onPageSizeChange={(value: number): void => {
                  setPageSize(value);
                  setPage(1);
                }}
                pageSizeOptions={WEBSITE_PAGE_SIZE_OPTIONS}
                showPageSize
                showInfo
                showLabels={false}
                showPageJump
                isLoading={state.isLoading}
                variant='compact'
              />
            </div>
            <FilterPanel
              filters={WEBSITE_FILTER_FIELDS}
              values={{ links: linkFilter }}
              search={query}
              searchPlaceholder='Search URL, host, or legacy UUID.'
              onFilterChange={(key: string, value: unknown): void => {
                if (key === 'links') setLinkFilter(normalizeWebsiteLinkFilter(value));
                setPage(1);
              }}
              onSearchChange={(value: string): void => {
                setQuery(value);
                setPage(1);
              }}
              onReset={(): void => {
                setQuery('');
                setLinkFilter('all');
                setPage(1);
              }}
              showHeader={false}
              collapsible
              defaultExpanded
            />
          </div>
        }
        columns={columns}
        data={state.websites}
        isLoading={state.isLoading}
      />
    </div>
  );
}
