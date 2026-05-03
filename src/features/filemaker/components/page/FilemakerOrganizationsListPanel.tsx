'use client';
/* eslint-disable max-lines */

import { ArrowUpDown, BriefcaseBusiness, PlusIcon } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import {
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
} from '@/shared/lib/foldertree/public';
import { useAdminLayoutActions, useAdminLayoutState } from '@/shared/providers/AdminLayoutProvider';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import {
  FocusModeTogglePortal,
  MasterTreeSettingsButton,
  Pagination,
} from '@/shared/ui/navigation-and-layout.public';
import { Button } from '@/shared/ui/button';
import Link from 'next/link';
import { FilterPanel, StandardDataTablePanel } from '@/shared/ui/templates.public';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import {
  ORGANIZATION_PAGE_SIZE_OPTIONS,
  type OrganizationFilters,
  type OrganizationListState,
  type OrganizationSortOption,
} from '../../pages/AdminFilemakerOrganizationsPage.types';
import { FilemakerOrganizationAdvancedFilterModal } from './FilemakerOrganizationAdvancedFilterModal';
import { ORGANIZATION_FILTER_FIELDS } from './FilemakerOrganizationsListPanel.constants';
import { FilemakerOrganizationsSelectionActions } from './FilemakerOrganizationsSelectionActions';

const FILEMAKER_ORGANIZATION_TREE_INSTANCE: FolderTreeInstance = 'filemaker_organizations';
const CREATE_ORGANIZATION_ACTION_KEY = 'create-organization';

function OrganizationCreateAction(props: {
  actions: PanelAction[];
}): React.JSX.Element | null {
  const action = props.actions.find(
    (candidate: PanelAction): boolean => candidate.key === CREATE_ORGANIZATION_ACTION_KEY
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

function OrganizationSecondaryActions(props: {
  actions: PanelAction[];
  isLoading: boolean;
}): React.JSX.Element | null {
  const actions = props.actions.filter(
    (action: PanelAction): boolean => action.key !== CREATE_ORGANIZATION_ACTION_KEY
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

const renderOrganizationTitle = (): React.JSX.Element => (
  <h1 className='text-3xl font-bold tracking-tight text-white'>Organisations</h1>
);

const renderOrganizationBreadcrumb = (): React.JSX.Element => (
  <AdminFilemakerBreadcrumbs current='Organisations' />
);

const renderTitleBreadcrumbHeader = (
  titleStackClassName?: string,
  actions?: React.ReactNode,
  actionsClassName?: string
): React.JSX.Element => (
  <AdminTitleBreadcrumbHeader
    title={renderOrganizationTitle()}
    breadcrumb={renderOrganizationBreadcrumb()}
    titleStackClassName={titleStackClassName}
    actions={actions}
    actionsClassName={actionsClassName}
  />
);

function OrganizationCreateActionRail(props: OrganizationListState): React.JSX.Element | null {
  return <OrganizationCreateAction actions={props.actions} />;
}

function OrganizationSecondaryActionRail(props: OrganizationListState): React.JSX.Element | null {
  return <OrganizationSecondaryActions actions={props.actions} isLoading={props.isLoading} />;
}

function OrganizationPaginationControl(props: OrganizationListState): React.JSX.Element {
  return (
    <Pagination
      page={props.page}
      totalPages={props.totalPages}
      pageSize={props.pageSize}
      onPageChange={props.onPageChange}
      onPageSizeChange={props.onPageSizeChange}
      pageSizeOptions={ORGANIZATION_PAGE_SIZE_OPTIONS}
      showPageSize
      showLabels={false}
      showPageJump
      variant='compact'
    />
  );
}

function OrganizationPrimaryHeaderControls(props: OrganizationListState): React.JSX.Element {
  return (
    <>
      <OrganizationCreateActionRail {...props} />
      <Link
        href='/admin/filemaker/job-listings'
        className='inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 px-3 text-xs text-gray-300 hover:bg-white/5'
        title='View all job listings'
      >
        <BriefcaseBusiness className='size-3.5' aria-hidden='true' />
        Job Listings
      </Link>
      <OrganizationPaginationControl {...props} />
    </>
  );
}

function OrganizationSecondaryHeaderControls(props: OrganizationListState): React.JSX.Element {
  return <OrganizationSecondaryActionRail {...props} />;
}

function OrganizationMobileHeader(props: OrganizationListState): React.JSX.Element {
  return (
    <div className='space-y-3 lg:hidden'>
      {renderTitleBreadcrumbHeader(undefined, <OrganizationCreateActionRail {...props} />, 'pt-0')}
      <div className='space-y-3'>
        <div className='relative z-10 flex justify-center'>
          <OrganizationPaginationControl {...props} />
        </div>
        <div className='flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end'>
          <OrganizationSecondaryActionRail {...props} />
        </div>
      </div>
    </div>
  );
}

function OrganizationDesktopHeader(props: OrganizationListState): React.JSX.Element {
  return (
    <div className='hidden space-y-3 lg:block'>
      {renderTitleBreadcrumbHeader(
        'shrink-0 min-w-max',
        <OrganizationPrimaryHeaderControls {...props} />,
        'relative z-0 min-w-0 flex-1 justify-center'
      )}
      <div className='flex w-full flex-wrap items-center gap-2'>
        <OrganizationSecondaryHeaderControls {...props} />
      </div>
    </div>
  );
}

const createActiveOrganizationFilterValues = (
  filters: OrganizationFilters
): Record<string, unknown> => ({
  address: filters.address === 'all' ? '' : filters.address,
  advancedFilter: filters.advancedFilter.trim(),
  bank: filters.bank === 'all' ? '' : filters.bank,
  parent: filters.parent === 'all' ? '' : filters.parent,
  updatedBy: filters.updatedBy.trim(),
});

function OrganizationFiltersPanel(props: {
  filterValues: OrganizationFilters;
  listState: OrganizationListState;
}): React.JSX.Element {
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const hasAdvancedFilter = props.filterValues.advancedFilter.trim().length > 0;
  const activeFilterValues = useMemo(
    () => createActiveOrganizationFilterValues(props.filterValues),
    [
      props.filterValues.address,
      props.filterValues.advancedFilter,
      props.filterValues.bank,
      props.filterValues.parent,
      props.filterValues.updatedBy,
    ]
  );

  return (
    <div className='w-full'>
      <FilterPanel
        filters={ORGANIZATION_FILTER_FIELDS}
        values={props.filterValues}
        activeValues={activeFilterValues}
        search={props.listState.query}
        searchPlaceholder='Search name, address, tax ID, bank UUID, or legacy UUID.'
        onFilterChange={props.listState.onFilterChange}
        onSearchChange={props.listState.onQueryChange}
        onReset={props.listState.onResetFilters}
        actions={
          <Button
            type='button'
            size='sm'
            variant={hasAdvancedFilter ? 'default' : 'outline'}
            onClick={(): void => setIsAdvancedFilterOpen(true)}
            className='h-8 w-full sm:w-auto'
          >
            Advanced Filter
          </Button>
        }
        showHeader={false}
        collapsible
        defaultExpanded
      />
      {isAdvancedFilterOpen ? (
        <FilemakerOrganizationAdvancedFilterModal
          open={isAdvancedFilterOpen}
          value={props.filterValues.advancedFilter}
          presets={props.listState.advancedFilterPresets}
          onClose={(): void => setIsAdvancedFilterOpen(false)}
          onApply={props.listState.onSetAdvancedFilterState}
          onClear={(): void => props.listState.onSetAdvancedFilterState('', null)}
          onSavePresets={props.listState.onSetAdvancedFilterPresets}
        />
      ) : null}
    </div>
  );
}

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

function OrganizationListHeader(props: OrganizationListState): React.JSX.Element {
  const { isMenuHidden } = useAdminLayoutState();
  const { setIsMenuHidden } = useAdminLayoutActions();
  const filterValues = useMemo<OrganizationFilters>(
    () => ({
      address: props.filters.address,
      advancedFilter: props.filters.advancedFilter,
      bank: props.filters.bank,
      parent: props.filters.parent,
      updatedBy: props.filters.updatedBy,
    }),
    [
      props.filters.address,
      props.filters.advancedFilter,
      props.filters.bank,
      props.filters.parent,
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
        <OrganizationMobileHeader {...props} />
        <OrganizationDesktopHeader {...props} />
        <OrganizationFiltersPanel filterValues={filterValues} listState={props} />
      </div>
    </div>
  );
}

function OrganizationListViewport(props: OrganizationListState): React.JSX.Element {
  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: FILEMAKER_ORGANIZATION_TREE_INSTANCE,
    nodes: props.nodes,
  });
  const hasQuery = props.query.trim().length > 0;

  return (
    <div className='relative space-y-1'>
      <OrganizationTableHeader {...props} />
      <FolderTreeViewportV2
        controller={controller}
        scrollToNodeRef={scrollToNodeRef}
        rootDropUi={rootDropUi}
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
