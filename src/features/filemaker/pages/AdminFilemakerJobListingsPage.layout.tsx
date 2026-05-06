'use client';

import { BriefcaseBusiness, Building2 } from 'lucide-react';
import Link from 'next/link';
import React, { type JSX, useEffect, useMemo } from 'react';

import type { FilterField } from '@/shared/contracts/ui/panels';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import {
  MasterFolderTreeViewport,
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import { useAdminLayoutActions, useAdminLayoutState } from '@/shared/providers/AdminLayoutProvider';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import {
  FocusModeTogglePortal,
  MasterTreeSettingsButton,
} from '@/shared/ui/navigation-and-layout.public';
import { Badge } from '@/shared/ui/primitives.public';
import { FilterPanel, StandardDataTablePanel } from '@/shared/ui/templates.public';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const FILEMAKER_JOB_LISTINGS_TREE_INSTANCE: FolderTreeInstance = 'filemaker_job_listings';

const JOB_LISTING_FILTER_FIELDS: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'All statuses', value: '' },
      { label: 'Open', value: 'open' },
      { label: 'Draft', value: 'draft' },
      { label: 'Paused', value: 'paused' },
      { label: 'Closed', value: 'closed' },
    ],
    width: '180px',
  },
];

type JobListingsNoticeProps = {
  settingsLoading: boolean;
  hasDefaultPerson: boolean;
  displayPersonName: string | null;
};

type JobListingsListPanelProps = JobListingsNoticeProps & {
  error: string | null;
  isLoading: boolean;
  listingCount: number;
  nodes: MasterTreeNode[];
  onResetFilters: () => void;
  onSearch: (query: string) => void;
  onStatus: (status: string) => void;
  rawQuery: string;
  renderNode: (input: FolderTreeViewportRenderNodeInput) => React.ReactNode;
  status: string;
};

export const JobListingsNotice = ({
  settingsLoading,
  hasDefaultPerson,
  displayPersonName,
}: JobListingsNoticeProps): JSX.Element | null => {
  if (settingsLoading) return null;
  if (!hasDefaultPerson) {
    return (
      <p className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300'>
        No default person set. Go to Filemaker Settings to set a default person before marking applications
        as applied.
      </p>
    );
  }

  if (displayPersonName === null) return null;
  return (
    <p className='text-xs text-gray-500'>
      Marking applied as: <span className='text-gray-300'>{displayPersonName}</span>
    </p>
  );
};

export const getDisplayPersonName = (input: {
  hasDefaultPerson: boolean;
  defaultPersonName: string;
  defaultPersonId: string;
}): string | null => {
  if (!input.hasDefaultPerson) return null;
  return input.defaultPersonName.length > 0 ? input.defaultPersonName : input.defaultPersonId;
};

function JobListingsBadges(props: Pick<
  JobListingsListPanelProps,
  'error' | 'isLoading' | 'listingCount' | 'nodes'
>): React.JSX.Element {
  const hasError = props.error !== null && props.error.length > 0;
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Listings: {props.listingCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Shown: {props.nodes.length}
      </Badge>
      {props.isLoading ? (
        <Badge variant='outline' className='text-[10px]'>
          Loading
        </Badge>
      ) : null}
      {hasError ? (
        <Badge variant='destructive' className='text-[10px]'>
          {props.error}
        </Badge>
      ) : null}
    </div>
  );
}

function JobListingsFilters(props: Pick<
  JobListingsListPanelProps,
  'onResetFilters' | 'onSearch' | 'onStatus' | 'rawQuery' | 'status'
>): React.JSX.Element {
  const filterValues = useMemo(
    () => ({
      status: props.status,
    }),
    [props.status]
  );
  const activeFilterValues = useMemo(
    () => ({
      status: props.status,
    }),
    [props.status]
  );

  return (
    <FilterPanel
      filters={JOB_LISTING_FILTER_FIELDS}
      values={filterValues}
      activeValues={activeFilterValues}
      search={props.rawQuery}
      searchPlaceholder='Search title, organisation, location, or source.'
      onFilterChange={(key: string, value: unknown): void => {
        if (key !== 'status') return;
        props.onStatus(typeof value === 'string' ? value : '');
      }}
      onSearchChange={props.onSearch}
      onReset={props.onResetFilters}
      showHeader={false}
      collapsible
      defaultExpanded
    />
  );
}

function JobListingsTitleBreadcrumbHeader(): React.JSX.Element {
  return (
    <AdminTitleBreadcrumbHeader
      title={<h1 className='text-3xl font-bold tracking-tight text-white'>Job Listings</h1>}
      breadcrumb={<AdminFilemakerBreadcrumbs current='Job Listings' />}
      titleStackClassName='shrink-0 min-w-max'
      actions={
        <Link
          href='/admin/filemaker/organizations'
          className='inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 px-3 text-xs text-gray-300 hover:bg-white/5'
          title='View organisations'
        >
          <Building2 className='size-3.5' aria-hidden='true' />
          Organisations
        </Link>
      }
      actionsClassName='relative z-0 min-w-0 flex-1 justify-center'
    />
  );
}

function JobListingsListHeader(props: JobListingsListPanelProps): React.JSX.Element {
  const { isMenuHidden } = useAdminLayoutState();
  const { setIsMenuHidden } = useAdminLayoutActions();

  useEffect(() => {
    return (): void => {
      setIsMenuHidden(false);
    };
  }, [setIsMenuHidden]);

  return (
    <div className='space-y-4'>
      <FocusModeTogglePortal
        isFocusMode={!isMenuHidden}
        onToggleFocusMode={() => setIsMenuHidden(!isMenuHidden)}
      />
      <div className='space-y-3'>
        <JobListingsTitleBreadcrumbHeader />
        <JobListingsNotice
          settingsLoading={props.settingsLoading}
          hasDefaultPerson={props.hasDefaultPerson}
          displayPersonName={props.displayPersonName}
        />
        <JobListingsBadges
          error={props.error}
          isLoading={props.isLoading}
          listingCount={props.listingCount}
          nodes={props.nodes}
        />
        <JobListingsFilters
          rawQuery={props.rawQuery}
          status={props.status}
          onSearch={props.onSearch}
          onStatus={props.onStatus}
          onResetFilters={props.onResetFilters}
        />
      </div>
    </div>
  );
}

function JobListingsTableHeader(): React.JSX.Element {
  return (
    <div
      data-testid='job-listings-table-header'
      className='flex items-center gap-2 rounded border border-white/10 bg-muted/20 px-2 py-1.5'
    >
      <div className='hidden w-9 shrink-0 md:block' aria-hidden='true' />
      <div className='min-w-0 flex-1'>
        <div className='inline-flex h-7 items-center gap-2 px-2 text-xs font-semibold text-gray-400'>
          <BriefcaseBusiness className='size-3.5' aria-hidden='true' />
          Job Listing
        </div>
      </div>
      <div className='hidden w-48 shrink-0 justify-end px-2 text-xs font-semibold text-gray-400 md:flex'>
        Actions
      </div>
    </div>
  );
}

function JobListingsListViewport(props: JobListingsListPanelProps): React.JSX.Element {
  const tree = useMasterFolderTreeViewModel({
    instance: FILEMAKER_JOB_LISTINGS_TREE_INSTANCE,
    nodes: props.nodes,
  });
  const hasQuery = props.rawQuery.trim().length > 0;

  return (
    <div className='relative space-y-1'>
      <JobListingsTableHeader />
      <MasterFolderTreeViewport
        tree={tree}
        enableDnd={false}
        emptyLabel={hasQuery ? 'No job listings found' : 'No job listings found'}
        estimateRowHeight={82}
        renderNode={props.renderNode}
      />
      <MasterTreeSettingsButton instance={FILEMAKER_JOB_LISTINGS_TREE_INSTANCE} />
    </div>
  );
}

export function FilemakerJobListingsListPanel(
  props: JobListingsListPanelProps
): React.JSX.Element {
  return (
    <StandardDataTablePanel
      variant='flat'
      className='[&>div:first-child]:mb-3'
      header={<JobListingsListHeader {...props} />}
      columns={[]}
      data={[]}
      isLoading={false}
      showTable={false}
      contentClassName='space-y-3'
    >
      <JobListingsListViewport {...props} />
    </StandardDataTablePanel>
  );
}
