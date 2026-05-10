'use client';

import { ArrowUpDown } from 'lucide-react';
import React from 'react';

import {
  MasterFolderTreeViewport,
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import { MasterTreeSettingsButton } from '@/shared/ui/navigation-and-layout.public';
import { Button } from '@/shared/ui/button';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import {
  type OrganizationListState,
  type OrganizationSortOption,
} from '../../pages/AdminFilemakerOrganizationsPage.types';
import { OrganizationListHeader } from './FilemakerOrganizationsListPanel.header';
import { FilemakerOrganizationsSelectionActions } from './FilemakerOrganizationsSelectionActions';

const FILEMAKER_ORGANIZATION_TREE_INSTANCE: FolderTreeInstance = 'filemaker_organizations';

const nextCreatedAtSort = (sort: OrganizationSortOption): OrganizationSortOption =>
  sort === 'createdAt_desc' ? 'createdAt_asc' : 'createdAt_desc';

const nextUpdatedAtSort = (sort: OrganizationSortOption): OrganizationSortOption =>
  sort === 'updatedAt_desc' ? 'updatedAt_asc' : 'updatedAt_desc';

const nextEventCountSort = (sort: OrganizationSortOption): OrganizationSortOption =>
  sort === 'eventCount_desc' ? 'eventCount_asc' : 'eventCount_desc';

const nextJobListingCountSort = (sort: OrganizationSortOption): OrganizationSortOption =>
  sort === 'jobListingCount_desc' ? 'jobListingCount_asc' : 'jobListingCount_desc';

const nextNameSort = (sort: OrganizationSortOption): OrganizationSortOption =>
  sort === 'name_asc' ? 'name_desc' : 'name_asc';

function OrganizationSortHeaderButton(props: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      aria-pressed={props.isActive}
      onClick={props.onClick}
      className={
        props.isActive
          ? 'h-7 px-2 text-xs font-semibold text-white'
          : 'h-7 px-2 text-xs font-semibold text-gray-400'
      }
    >
      {props.label}
      <ArrowUpDown className='ml-2 size-3.5' aria-hidden='true' />
    </Button>
  );
}

function OrganizationTableHeader(props: OrganizationListState): React.JSX.Element {
  const isNameSort = props.sort === 'name_asc' || props.sort === 'name_desc';
  const isEventCountSort = props.sort === 'eventCount_asc' || props.sort === 'eventCount_desc';
  const isJobListingCountSort =
    props.sort === 'jobListingCount_asc' || props.sort === 'jobListingCount_desc';
  const isCreatedAtSort = props.sort === 'createdAt_asc' || props.sort === 'createdAt_desc';
  const isUpdatedAtSort = props.sort === 'updatedAt_asc' || props.sort === 'updatedAt_desc';

  return (
    <div
      data-testid='organization-table-header'
      className='flex items-center gap-2 rounded border border-white/10 bg-muted/20 px-2 py-1.5'
    >
      <div className='hidden w-[5.75rem] shrink-0 md:block' aria-hidden='true' />
      <div className='min-w-0 flex-1'>
        <OrganizationSortHeaderButton
          isActive={isNameSort}
          label='Name'
          onClick={(): void => props.onSortChange(nextNameSort(props.sort))}
        />
      </div>
      <div className='hidden w-20 shrink-0 justify-center md:flex'>
        <OrganizationSortHeaderButton
          isActive={isEventCountSort}
          label='Events'
          onClick={(): void => props.onSortChange(nextEventCountSort(props.sort))}
        />
      </div>
      <div className='hidden w-16 shrink-0 justify-center md:flex'>
        <OrganizationSortHeaderButton
          isActive={isJobListingCountSort}
          label='Jobs'
          onClick={(): void => props.onSortChange(nextJobListingCountSort(props.sort))}
        />
      </div>
      <div className='hidden w-36 shrink-0 justify-end md:flex md:w-44'>
        <OrganizationSortHeaderButton
          isActive={isUpdatedAtSort}
          label='Updated At'
          onClick={(): void => props.onSortChange(nextUpdatedAtSort(props.sort))}
        />
      </div>
      <div className='w-36 shrink-0 text-right md:w-44'>
        <OrganizationSortHeaderButton
          isActive={isCreatedAtSort}
          label='Created At'
          onClick={(): void => props.onSortChange(nextCreatedAtSort(props.sort))}
        />
      </div>
      <div className='hidden w-16 shrink-0 md:block' aria-hidden='true' />
    </div>
  );
}

function OrganizationListViewport(props: OrganizationListState): React.JSX.Element {
  const tree = useMasterFolderTreeViewModel({
    instance: FILEMAKER_ORGANIZATION_TREE_INSTANCE,
    nodes: props.nodes,
  });
  const hasQuery = props.query.trim().length > 0;

  return (
    <div className='relative space-y-1'>
      <OrganizationTableHeader {...props} />
      <MasterFolderTreeViewport
        tree={tree}
        enableDnd={false}
        emptyLabel={hasQuery ? 'No organisations found' : 'No organisations found'}
        estimateRowHeight={72}
        renderNode={props.renderNode}
      />
      <MasterTreeSettingsButton instance={FILEMAKER_ORGANIZATION_TREE_INSTANCE} />
    </div>
  );
}

export function FilemakerOrganizationsListPanel(
  props: OrganizationListState
): React.JSX.Element {
  return (
    <StandardDataTablePanel
      variant='flat'
      className='[&>div:first-child]:mb-3'
      header={<OrganizationListHeader {...props} />}
      actions={<FilemakerOrganizationsSelectionActions {...props} />}
      columns={[]}
      data={[]}
      isLoading={false}
      showTable={false}
      contentClassName='space-y-3'
    >
      <OrganizationListViewport {...props} />
      <props.ConfirmationModal />
    </StandardDataTablePanel>
  );
}
