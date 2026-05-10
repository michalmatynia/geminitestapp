'use client';

import { ArrowUpDown } from 'lucide-react';
import React from 'react';

import {
  MasterFolderTreeViewport,
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import { Button } from '@/shared/ui/button';
import { MasterTreeSettingsButton } from '@/shared/ui/navigation-and-layout.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import {
  type PersonListState,
  type PersonSortOption,
} from '../../pages/AdminFilemakerPersonsPage.types';
import { PersonListHeader } from './FilemakerPersonsListPanel.header';

const FILEMAKER_PERSON_TREE_INSTANCE: FolderTreeInstance = 'filemaker_persons';

const nextCreatedAtSort = (sort: PersonSortOption): PersonSortOption =>
  sort === 'createdAt_desc' ? 'createdAt_asc' : 'createdAt_desc';

const nextUpdatedAtSort = (sort: PersonSortOption): PersonSortOption =>
  sort === 'updatedAt_desc' ? 'updatedAt_asc' : 'updatedAt_desc';

const nextOrganizationLinkCountSort = (sort: PersonSortOption): PersonSortOption =>
  sort === 'organizationLinkCount_desc'
    ? 'organizationLinkCount_asc'
    : 'organizationLinkCount_desc';

const nextNameSort = (sort: PersonSortOption): PersonSortOption =>
  sort === 'name_asc' ? 'name_desc' : 'name_asc';

function PersonSortHeaderButton(props: {
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

function PersonTableHeader(props: PersonListState): React.JSX.Element {
  const isNameSort = props.sort === 'name_asc' || props.sort === 'name_desc';
  const isOrganizationLinkCountSort =
    props.sort === 'organizationLinkCount_asc' ||
    props.sort === 'organizationLinkCount_desc';
  const isCreatedAtSort = props.sort === 'createdAt_asc' || props.sort === 'createdAt_desc';
  const isUpdatedAtSort = props.sort === 'updatedAt_asc' || props.sort === 'updatedAt_desc';

  return (
    <div
      data-testid='person-table-header'
      className='flex items-center gap-2 rounded border border-white/10 bg-muted/20 px-2 py-1.5'
    >
      <div className='hidden w-[3.25rem] shrink-0 md:block' aria-hidden='true' />
      <div className='min-w-0 flex-1'>
        <PersonSortHeaderButton
          isActive={isNameSort}
          label='Name'
          onClick={(): void => props.onSortChange(nextNameSort(props.sort))}
        />
      </div>
      <div className='hidden w-32 shrink-0 justify-center md:flex'>
        <PersonSortHeaderButton
          isActive={isOrganizationLinkCountSort}
          label='Organisations'
          onClick={(): void => props.onSortChange(nextOrganizationLinkCountSort(props.sort))}
        />
      </div>
      <div className='hidden w-36 shrink-0 justify-end md:flex md:w-44'>
        <PersonSortHeaderButton
          isActive={isUpdatedAtSort}
          label='Updated At'
          onClick={(): void => props.onSortChange(nextUpdatedAtSort(props.sort))}
        />
      </div>
      <div className='w-36 shrink-0 text-right md:w-44'>
        <PersonSortHeaderButton
          isActive={isCreatedAtSort}
          label='Created At'
          onClick={(): void => props.onSortChange(nextCreatedAtSort(props.sort))}
        />
      </div>
      <div className='hidden w-8 shrink-0 md:block' aria-hidden='true' />
    </div>
  );
}

function PersonListViewport(props: PersonListState): React.JSX.Element {
  const tree = useMasterFolderTreeViewModel({
    instance: FILEMAKER_PERSON_TREE_INSTANCE,
    nodes: props.nodes,
  });
  const hasQuery = props.query.trim().length > 0;

  return (
    <div className='relative space-y-1'>
      <PersonTableHeader {...props} />
      <MasterFolderTreeViewport
        tree={tree}
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
      variant='flat'
      className='[&>div:first-child]:mb-3'
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
