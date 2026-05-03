'use client';

import React, { useMemo } from 'react';

import type { FilterField } from '@/shared/contracts/ui/panels';
import {
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
} from '@/shared/lib/foldertree/public';
import { MasterTreeSettingsButton, Pagination } from '@/shared/ui/navigation-and-layout.public';
import { Badge } from '@/shared/ui/primitives.public';
import { FilterPanel, StandardDataTablePanel } from '@/shared/ui/templates.public';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import {
  EVENT_PAGE_SIZE_OPTIONS,
  type EventListState,
} from '../../pages/AdminFilemakerEventsPage.types';

const FILEMAKER_EVENT_TREE_INSTANCE: FolderTreeInstance = 'filemaker_events';

const EVENT_FILTER_FIELDS: FilterField[] = [
  {
    key: 'organization',
    label: 'Organisation Links',
    type: 'select',
    options: [
      { value: 'all', label: 'All link states' },
      { value: 'with_organizations', label: 'With organisations' },
      { value: 'without_organizations', label: 'Without organisations' },
    ],
    width: '230px',
  },
  {
    key: 'address',
    label: 'Address',
    type: 'select',
    options: [
      { value: 'all', label: 'All address states' },
      { value: 'with_address', label: 'With default address' },
      { value: 'without_address', label: 'Without default address' },
    ],
    width: '220px',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'all', label: 'All statuses' },
      { value: 'active', label: 'Active' },
      { value: 'discontinued', label: 'Discontinued' },
    ],
    width: '180px',
  },
  {
    key: 'updatedBy',
    label: 'Updated By',
    type: 'text',
    placeholder: 'Admin',
    width: '180px',
  },
];

function EventListBadges(
  props: Pick<EventListState, 'error' | 'isLoading' | 'shownCount' | 'totalCount'>
): React.JSX.Element {
  const hasError = props.error !== null && props.error.length > 0;
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Events: {props.totalCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Shown: {props.shownCount}
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

function EventListHeader(props: EventListState): React.JSX.Element {
  const filterValues = useMemo(
    () => ({
      address: props.filters.address,
      organization: props.filters.organization,
      status: props.filters.status,
      updatedBy: props.filters.updatedBy,
    }),
    [
      props.filters.address,
      props.filters.organization,
      props.filters.status,
      props.filters.updatedBy,
    ]
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <EventListBadges
          error={props.error}
          isLoading={props.isLoading}
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
          pageSizeOptions={EVENT_PAGE_SIZE_OPTIONS}
          showPageSize
          showInfo
          showLabels={false}
          showPageJump
          isLoading={props.isLoading}
          variant='compact'
        />
      </div>
      <FilterPanel
        filters={EVENT_FILTER_FIELDS}
        values={filterValues}
        search={props.query}
        searchPlaceholder='Search event, linked organisation, address, dates, or legacy UUID.'
        onFilterChange={props.onFilterChange}
        onSearchChange={props.onQueryChange}
        onReset={props.onResetFilters}
        showHeader={false}
        collapsible
        defaultExpanded
      />
    </div>
  );
}

function EventListViewport(props: EventListState): React.JSX.Element {
  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: FILEMAKER_EVENT_TREE_INSTANCE,
    nodes: props.nodes,
  });
  const hasQuery = props.query.trim().length > 0;

  return (
    <div className='relative'>
      <FolderTreeViewportV2
        controller={controller}
        scrollToNodeRef={scrollToNodeRef}
        rootDropUi={rootDropUi}
        enableDnd={false}
        emptyLabel={hasQuery ? 'No events found' : 'No events found'}
        estimateRowHeight={82}
        renderNode={props.renderNode}
      />
      <MasterTreeSettingsButton instance={FILEMAKER_EVENT_TREE_INSTANCE} />
    </div>
  );
}

export function FilemakerEventsListPanel(props: EventListState): React.JSX.Element {
  return (
    <StandardDataTablePanel
      header={<EventListHeader {...props} />}
      columns={[]}
      data={[]}
      isLoading={false}
      showTable={false}
      contentClassName='space-y-3'
    >
      <EventListViewport {...props} />
    </StandardDataTablePanel>
  );
}
