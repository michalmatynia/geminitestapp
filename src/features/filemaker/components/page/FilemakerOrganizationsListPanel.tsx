'use client';

import { PlusIcon } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';

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
import { Badge } from '@/shared/ui/primitives.public';
import { Button } from '@/shared/ui/button';
import { FilterPanel, StandardDataTablePanel } from '@/shared/ui/templates.public';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import {
  ORGANIZATION_PAGE_SIZE_OPTIONS,
  type OrganizationFilters,
  type OrganizationListState,
} from '../../pages/AdminFilemakerOrganizationsPage.types';
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

function OrganizationListBadges(props: Pick<
  OrganizationListState,
  'error' | 'isLoading' | 'shownCount' | 'totalCount' | 'totalCountIsExact'
>): React.JSX.Element {
  const hasError = props.error !== null && props.error.length > 0;
  const totalCountLabel = props.totalCountIsExact
    ? String(props.totalCount)
    : `>= ${props.totalCount}`;
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Organisations: {totalCountLabel}
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

function OrganizationBadgesRail(props: OrganizationListState): React.JSX.Element {
  return (
    <OrganizationListBadges
      error={props.error}
      isLoading={props.isLoading}
      shownCount={props.shownCount}
      totalCount={props.totalCount}
      totalCountIsExact={props.totalCountIsExact}
    />
  );
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

function OrganizationMobileHeader(props: OrganizationListState): React.JSX.Element {
  return (
    <div className='space-y-3 lg:hidden'>
      {renderTitleBreadcrumbHeader(undefined, <OrganizationCreateActionRail {...props} />, 'pt-0')}
      <div className='space-y-3'>
        <div className='relative z-10 flex justify-center'>
          <OrganizationPaginationControl {...props} />
        </div>
        <div className='flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end'>
          <OrganizationBadgesRail {...props} />
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
        <>
          <OrganizationCreateActionRail {...props} />
          <OrganizationPaginationControl {...props} />
          <OrganizationBadgesRail {...props} />
          <OrganizationSecondaryActionRail {...props} />
        </>,
        'relative z-0 min-w-0 flex-1 justify-end'
      )}
    </div>
  );
}

function OrganizationFiltersPanel(props: {
  filterValues: OrganizationFilters;
  listState: OrganizationListState;
}): React.JSX.Element {
  return (
    <div className='w-full'>
      <FilterPanel
        filters={ORGANIZATION_FILTER_FIELDS}
        values={props.filterValues}
        search={props.listState.query}
        searchPlaceholder='Search name, address, tax ID, bank UUID, or legacy UUID.'
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

function OrganizationListHeader(props: OrganizationListState): React.JSX.Element {
  const { isMenuHidden } = useAdminLayoutState();
  const { setIsMenuHidden } = useAdminLayoutActions();
  const filterValues = useMemo<OrganizationFilters>(
    () => ({
      address: props.filters.address,
      bank: props.filters.bank,
      parent: props.filters.parent,
      updatedBy: props.filters.updatedBy,
    }),
    [props.filters.address, props.filters.bank, props.filters.parent, props.filters.updatedBy]
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
    <div className='relative'>
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
    </StandardDataTablePanel>
  );
}
