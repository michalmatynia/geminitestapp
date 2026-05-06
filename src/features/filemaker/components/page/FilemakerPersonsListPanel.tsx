'use client';
/* eslint-disable max-lines */

import { ArrowUpDown, PlusIcon } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';

import type { FilterField, PanelAction } from '@/shared/contracts/ui/panels';
import {
  MasterFolderTreeViewport,
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import { useAdminLayoutActions, useAdminLayoutState } from '@/shared/providers/AdminLayoutProvider';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { Button } from '@/shared/ui/button';
import {
  FocusModeTogglePortal,
  MasterTreeSettingsButton,
  Pagination,
} from '@/shared/ui/navigation-and-layout.public';
import { FilterPanel, StandardDataTablePanel } from '@/shared/ui/templates.public';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import {
  PERSON_PAGE_SIZE_OPTIONS,
  type PersonFilters,
  type PersonListState,
  type PersonSortOption,
} from '../../pages/AdminFilemakerPersonsPage.types';

const FILEMAKER_PERSON_TREE_INSTANCE: FolderTreeInstance = 'filemaker_persons';
const CREATE_PERSON_ACTION_KEY = 'create-person';

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

function PersonCreateAction(props: { actions: PanelAction[] }): React.JSX.Element | null {
  const action = props.actions.find(
    (candidate: PanelAction): boolean => candidate.key === CREATE_PERSON_ACTION_KEY
  );
  if (!action) return null;

  const label = action.tooltip ?? action.label;
  return (
    <Button
      onClick={(): void => {
        void action.onClick();
      }}
      variant='outline'
      aria-label={label}
      title={label}
      disabled={action.disabled === true}
      className='h-7 w-7 rounded-full border border-white/20 bg-transparent p-0 text-white transition-colors hover:border-white/40 hover:bg-white/10'
    >
      <PlusIcon className='h-3 w-3' />
    </Button>
  );
}

function PersonSecondaryActions(props: {
  actions: PanelAction[];
  isLoading: boolean;
}): React.JSX.Element | null {
  const actions = props.actions.filter(
    (action: PanelAction): boolean => action.key !== CREATE_PERSON_ACTION_KEY
  );
  if (actions.length === 0) return null;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {actions.map((action: PanelAction): React.JSX.Element => (
        <Button
          key={action.key}
          variant={action.variant ?? 'outline'}
          size='sm'
          onClick={(): void => {
            void action.onClick();
          }}
          disabled={action.disabled === true || props.isLoading}
          title={action.tooltip}
          className='h-8'
        >
          {action.icon !== undefined && action.icon !== null ? (
            <span className='mr-1'>{action.icon}</span>
          ) : null}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

const renderPersonTitle = (): React.JSX.Element => (
  <h1 className='text-3xl font-bold tracking-tight text-white'>Persons</h1>
);

const renderPersonBreadcrumb = (): React.JSX.Element => (
  <AdminFilemakerBreadcrumbs current='Persons' />
);

const renderTitleBreadcrumbHeader = (
  titleStackClassName?: string,
  actions?: React.ReactNode,
  actionsClassName?: string
): React.JSX.Element => (
  <AdminTitleBreadcrumbHeader
    title={renderPersonTitle()}
    breadcrumb={renderPersonBreadcrumb()}
    titleStackClassName={titleStackClassName}
    actions={actions}
    actionsClassName={actionsClassName}
  />
);

function PersonCreateActionRail(props: PersonListState): React.JSX.Element | null {
  return <PersonCreateAction actions={props.actions} />;
}

function PersonSecondaryActionRail(props: PersonListState): React.JSX.Element | null {
  return <PersonSecondaryActions actions={props.actions} isLoading={props.isLoading} />;
}

function PersonPaginationControl(props: PersonListState): React.JSX.Element {
  return (
    <Pagination
      page={props.page}
      totalPages={props.totalPages}
      pageSize={props.pageSize}
      onPageChange={props.onPageChange}
      onPageSizeChange={props.onPageSizeChange}
      pageSizeOptions={PERSON_PAGE_SIZE_OPTIONS}
      showPageSize
      showLabels={false}
      showPageJump
      variant='compact'
    />
  );
}

function PersonPrimaryHeaderControls(props: PersonListState): React.JSX.Element {
  return (
    <>
      <PersonCreateActionRail {...props} />
      <PersonPaginationControl {...props} />
    </>
  );
}

function PersonSecondaryHeaderControls(props: PersonListState): React.JSX.Element {
  return <PersonSecondaryActionRail {...props} />;
}

function PersonMobileHeader(props: PersonListState): React.JSX.Element {
  return (
    <div className='space-y-3 lg:hidden'>
      {renderTitleBreadcrumbHeader(undefined, <PersonCreateActionRail {...props} />, 'pt-0')}
      <div className='space-y-3'>
        <div className='relative z-10 flex justify-center'>
          <PersonPaginationControl {...props} />
        </div>
        <div className='flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end'>
          <PersonSecondaryActionRail {...props} />
        </div>
      </div>
    </div>
  );
}

function PersonDesktopHeader(props: PersonListState): React.JSX.Element {
  return (
    <div className='hidden space-y-3 lg:block'>
      {renderTitleBreadcrumbHeader(
        'shrink-0 min-w-max',
        <PersonPrimaryHeaderControls {...props} />,
        'relative z-0 min-w-0 flex-1 justify-center'
      )}
      <div className='flex w-full flex-wrap items-center gap-2'>
        <PersonSecondaryHeaderControls {...props} />
      </div>
    </div>
  );
}

const createActivePersonFilterValues = (filters: PersonFilters): Record<string, unknown> => ({
  address: filters.address === 'all' ? '' : filters.address,
  bank: filters.bank === 'all' ? '' : filters.bank,
  organization: filters.organization === 'all' ? '' : filters.organization,
  updatedBy: filters.updatedBy.trim(),
});

function PersonFiltersPanel(props: {
  filterValues: PersonFilters;
  listState: PersonListState;
}): React.JSX.Element {
  const activeFilterValues = useMemo(
    () => createActivePersonFilterValues(props.filterValues),
    [
      props.filterValues.address,
      props.filterValues.bank,
      props.filterValues.organization,
      props.filterValues.updatedBy,
    ]
  );

  return (
    <div className='w-full'>
      <FilterPanel
        filters={PERSON_FILTER_FIELDS}
        values={props.filterValues}
        activeValues={activeFilterValues}
        search={props.listState.query}
        searchPlaceholder='Search name, linked organisation, address UUID, bank UUID, or legacy UUID.'
        onFilterChange={props.listState.onFilterChange}
        onSearchChange={props.listState.onQueryChange}
        onReset={props.listState.onResetFilters}
        showHeader={false}
        collapsible
        defaultExpanded
      />
    </div>
  );
}

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

function PersonListHeader(props: PersonListState): React.JSX.Element {
  const { isMenuHidden } = useAdminLayoutState();
  const { setIsMenuHidden } = useAdminLayoutActions();
  const filterValues = useMemo<PersonFilters>(
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
        <PersonMobileHeader {...props} />
        <PersonDesktopHeader {...props} />
        <PersonFiltersPanel filterValues={filterValues} listState={props} />
      </div>
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
