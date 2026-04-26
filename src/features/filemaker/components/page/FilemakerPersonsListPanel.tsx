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
  PERSON_PAGE_SIZE_OPTIONS,
  type PersonListState,
} from '../../pages/AdminFilemakerPersonsPage.types';

const FILEMAKER_PERSON_TREE_INSTANCE: FolderTreeInstance = 'filemaker_persons';

const PERSON_FILTER_FIELDS: FilterField[] = [
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
    key: 'bank',
    label: 'Bank',
    type: 'select',
    options: [
      { value: 'all', label: 'All bank states' },
      { value: 'with_bank', label: 'With default bank' },
      { value: 'without_bank', label: 'Without default bank' },
    ],
    width: '210px',
  },
  {
    key: 'updatedBy',
    label: 'Updated By',
    type: 'text',
    placeholder: 'Admin',
    width: '180px',
  },
];

function PersonListBadges(
  props: Pick<PersonListState, 'error' | 'isLoading' | 'shownCount' | 'totalCount'>
): React.JSX.Element {
  const hasError = props.error !== null && props.error.length > 0;
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Persons: {props.totalCount}
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

function PersonListHeader(props: PersonListState): React.JSX.Element {
  const filterValues = useMemo(
    () => ({
      address: props.filters.address,
      bank: props.filters.bank,
      organization: props.filters.organization,
      updatedBy: props.filters.updatedBy,
    }),
    [
      props.filters.address,
      props.filters.bank,
      props.filters.organization,
      props.filters.updatedBy,
    ]
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <PersonListBadges
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
          pageSizeOptions={PERSON_PAGE_SIZE_OPTIONS}
          showPageSize
          showInfo
          showLabels={false}
          showPageJump
          isLoading={props.isLoading}
          variant='compact'
        />
      </div>
      <FilterPanel
        filters={PERSON_FILTER_FIELDS}
        values={filterValues}
        search={props.query}
        searchPlaceholder='Search name, linked organisation, address UUID, bank UUID, or legacy UUID.'
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

function PersonListViewport(props: PersonListState): React.JSX.Element {
  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: FILEMAKER_PERSON_TREE_INSTANCE,
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
        emptyLabel={hasQuery ? 'No persons found' : 'No persons found'}
        estimateRowHeight={72}
        renderNode={props.renderNode}
      />
      <MasterTreeSettingsButton instance={FILEMAKER_PERSON_TREE_INSTANCE} />
    </div>
  );
}

export function FilemakerPersonsListPanel(props: PersonListState): React.JSX.Element {
  return (
    <StandardDataTablePanel
      header={<PersonListHeader {...props} />}
      columns={[]}
      data={[]}
      isLoading={false}
      showTable={false}
      contentClassName='space-y-3'
    >
      <PersonListViewport {...props} />
    </StandardDataTablePanel>
  );
}
