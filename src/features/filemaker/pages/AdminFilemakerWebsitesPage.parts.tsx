'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import type { FilterField } from '@/shared/contracts/ui/panels';
import { Pagination } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { FilterPanel, StandardDataTablePanel } from '@/shared/ui/templates.public';

import type {
  MongoFilemakerWebsiteSummary,
  WebsiteLinkFilter,
} from '../filemaker-websites.types';
import { formatTimestamp } from './filemaker-page-utils';

export const WEBSITE_PAGE_SIZE_OPTIONS = [24, 48, 96, 200];
export const DEFAULT_WEBSITE_PAGE_SIZE = 48;

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

export const normalizeWebsiteLinkFilter = (value: unknown): WebsiteLinkFilter => {
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

function WebsiteIdentityCell(props: {
  website: MongoFilemakerWebsiteSummary;
}): React.JSX.Element {
  return (
    <div className='min-w-0 space-y-1'>
      <div className='truncate text-sm font-semibold text-white'>{props.website.url}</div>
      <div className='truncate text-xs text-gray-300'>{props.website.host ?? 'n/a'}</div>
      <div className='truncate text-[10px] text-gray-600'>
        Legacy UUID: {props.website.legacyUuid ?? 'n/a'}
      </div>
    </div>
  );
}

function WebsiteLinksCell(props: {
  website: MongoFilemakerWebsiteSummary;
}): React.JSX.Element {
  return (
    <div className='space-y-0.5 text-[11px] text-gray-500'>
      <div>Total: {props.website.linkCount}</div>
      <div>Organisations: {props.website.organizationLinkCount}</div>
      <div>Persons: {props.website.personLinkCount}</div>
      <div>Events: {props.website.eventLinkCount}</div>
    </div>
  );
}

function WebsiteActionsCell(props: {
  onOpenDetails: (websiteId: string) => void;
  website: MongoFilemakerWebsiteSummary;
}): React.JSX.Element {
  const href = resolveWebsiteHref(props.website.url);
  return (
    <div className='flex justify-end gap-2'>
      <Button
        type='button'
        variant='outline'
        size='xs'
        onClick={(): void => props.onOpenDetails(props.website.id)}
      >
        Details
      </Button>
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='size-7'
        aria-label={`Open website ${props.website.url}`}
        title={`Open website ${props.website.url}`}
        disabled={href === null}
        onClick={(): void => {
          if (href !== null) window.open(href, '_blank', 'noopener,noreferrer');
        }}
      >
        <ExternalLink className='size-3.5' />
      </Button>
    </div>
  );
}

export const createWebsiteColumns = (input: {
  onOpenDetails: (websiteId: string) => void;
}): ColumnDef<MongoFilemakerWebsiteSummary>[] => [
  {
    id: 'website',
    header: 'Website',
    cell: ({ row }): React.JSX.Element => <WebsiteIdentityCell website={row.original} />,
  },
  {
    id: 'links',
    header: 'Links',
    cell: ({ row }): React.JSX.Element => <WebsiteLinksCell website={row.original} />,
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }): React.JSX.Element => (
      <span className='text-[10px] text-gray-600'>{formatTimestamp(row.original.updatedAt)}</span>
    ),
  },
  {
    id: 'actions',
    header: (): React.JSX.Element => <div className='text-right'>Actions</div>,
    cell: ({ row }): React.JSX.Element => (
      <WebsiteActionsCell website={row.original} onOpenDetails={input.onOpenDetails} />
    ),
  },
];

function WebsiteCountBadges(props: {
  error: string | null;
  shownCount: number;
  totalCount: number;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Websites: {props.totalCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Shown: {props.shownCount}
      </Badge>
      {props.error !== null ? (
        <Badge variant='destructive' className='text-[10px]'>
          {props.error}
        </Badge>
      ) : null}
    </div>
  );
}

export type WebsiteListHeaderProps = {
  error: string | null;
  isLoading: boolean;
  linkFilter: WebsiteLinkFilter;
  onLinkFilterChange: (value: WebsiteLinkFilter) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onQueryChange: (query: string) => void;
  onReset: () => void;
  page: number;
  pageSize: number;
  query: string;
  shownCount: number;
  totalCount: number;
  totalPages: number;
};

export function WebsiteListHeader(props: WebsiteListHeaderProps): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <WebsiteCountBadges
          error={props.error}
          shownCount={props.shownCount}
          totalCount={props.totalCount}
        />
        <Pagination
          page={props.page}
          totalPages={props.totalPages}
          totalCount={props.totalCount}
          pageSize={props.pageSize}
          onPageChange={props.onPageChange}
          onPageSizeChange={props.onPageSizeChange}
          pageSizeOptions={WEBSITE_PAGE_SIZE_OPTIONS}
          showPageSize
          showInfo
          showLabels={false}
          showPageJump
          isLoading={props.isLoading}
          variant='compact'
        />
      </div>
      <FilterPanel
        filters={WEBSITE_FILTER_FIELDS}
        values={{ links: props.linkFilter }}
        search={props.query}
        searchPlaceholder='Search URL, host, or legacy UUID.'
        onFilterChange={(key: string, value: unknown): void => {
          if (key === 'links') props.onLinkFilterChange(normalizeWebsiteLinkFilter(value));
        }}
        onSearchChange={props.onQueryChange}
        onReset={props.onReset}
        showHeader={false}
        collapsible
        defaultExpanded
      />
    </div>
  );
}

export type WebsiteListPanelProps = Omit<WebsiteListHeaderProps, 'shownCount'> & {
  columns: ColumnDef<MongoFilemakerWebsiteSummary>[];
  websites: MongoFilemakerWebsiteSummary[];
};

export function WebsiteListPanel(props: WebsiteListPanelProps): React.JSX.Element {
  return (
    <StandardDataTablePanel
      header={<WebsiteListHeader {...props} shownCount={props.websites.length} />}
      columns={props.columns}
      data={props.websites}
      isLoading={props.isLoading}
    />
  );
}
