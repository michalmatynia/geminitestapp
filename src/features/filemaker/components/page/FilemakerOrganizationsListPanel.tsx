'use client';

import React, { useMemo } from 'react';

import type { FilterField, PanelAction } from '@/shared/contracts/ui/panels';
import {
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
} from '@/shared/lib/foldertree/public';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { MasterTreeSettingsButton, Pagination } from '@/shared/ui/navigation-and-layout.public';
import { Badge } from '@/shared/ui/primitives.public';
import { Button } from '@/shared/ui/button';
import { FilterPanel, StandardDataTablePanel } from '@/shared/ui/templates.public';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import {
  ORGANIZATION_PAGE_SIZE_OPTIONS,
  type OrganizationListState,
} from '../../pages/AdminFilemakerOrganizationsPage.types';

const FILEMAKER_ORGANIZATION_TREE_INSTANCE: FolderTreeInstance = 'filemaker_organizations';

const ORGANIZATION_FILTER_FIELDS: FilterField[] = [
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
    key: 'parent',
    label: 'Hierarchy',
    type: 'select',
    options: [
      { value: 'all', label: 'All organisations' },
      { value: 'root', label: 'Root organisations' },
      { value: 'child', label: 'Child organisations' },
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

function OrganizationHeaderActions(props: {
  actions: PanelAction[];
  customActions: React.ReactNode;
  isLoading: boolean;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      {props.customActions}
      {props.actions.map((action: PanelAction): React.JSX.Element => (
        <Button
          key={action.key}
          variant={action.variant || 'outline'}
          size='sm'
          onClick={(): void => {
            void action.onClick();
          }}
          disabled={action.disabled || props.isLoading}
          title={action.tooltip}
          className='h-8'
        >
          {action.icon ? <span className='mr-1'>{action.icon}</span> : null}
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

function OrganizationListHeader(props: OrganizationListState): React.JSX.Element {
  const filterValues = useMemo(
    () => ({
      address: props.filters.address,
      bank: props.filters.bank,
      parent: props.filters.parent,
      updatedBy: props.filters.updatedBy,
    }),
    [props.filters.address, props.filters.bank, props.filters.parent, props.filters.updatedBy]
  );

  return (
    <div className='space-y-4'>
      <div className='space-y-3'>
        <div className='space-y-3 lg:hidden'>
          <AdminTitleBreadcrumbHeader
            title={renderOrganizationTitle()}
            breadcrumb={renderOrganizationBreadcrumb()}
            actions={
              <OrganizationHeaderActions
                actions={props.actions}
                customActions={props.customActions}
                isLoading={props.isLoading}
              />
            }
            actionsClassName='pt-0'
          />
          <div className='space-y-3'>
            <OrganizationListBadges
              error={props.error}
              isLoading={props.isLoading}
              shownCount={props.shownCount}
              totalCount={props.totalCount}
              totalCountIsExact={props.totalCountIsExact}
            />
            <div className='relative z-10 flex justify-center'>
              <Pagination
                page={props.page}
                totalPages={props.totalPages}
                totalCount={props.totalCount}
                pageSize={props.pageSize}
                onPageChange={props.onPageChange}
                onPageSizeChange={props.onPageSizeChange}
                pageSizeOptions={ORGANIZATION_PAGE_SIZE_OPTIONS}
                showPageSize
                showInfo
                showLabels={false}
                showPageJump
                isLoading={props.isLoading}
                variant='compact'
              />
            </div>
          </div>
        </div>

        <div className='hidden space-y-3 lg:block'>
          <AdminTitleBreadcrumbHeader
            title={renderOrganizationTitle()}
            breadcrumb={renderOrganizationBreadcrumb()}
            titleStackClassName='shrink-0 min-w-max'
            actions={
              <>
                <OrganizationHeaderActions
                  actions={props.actions}
                  customActions={props.customActions}
                  isLoading={props.isLoading}
                />
                <OrganizationListBadges
                  error={props.error}
                  isLoading={props.isLoading}
                  shownCount={props.shownCount}
                  totalCount={props.totalCount}
                  totalCountIsExact={props.totalCountIsExact}
                />
                <Pagination
                  page={props.page}
                  totalPages={props.totalPages}
                  totalCount={props.totalCount}
                  pageSize={props.pageSize}
                  onPageChange={props.onPageChange}
                  onPageSizeChange={props.onPageSizeChange}
                  pageSizeOptions={ORGANIZATION_PAGE_SIZE_OPTIONS}
                  showPageSize
                  showInfo
                  showLabels={false}
                  showPageJump
                  isLoading={props.isLoading}
                  variant='compact'
                />
              </>
            }
            actionsClassName='relative z-0 min-w-0 flex-1 justify-end'
          />
        </div>
      </div>
      <FilterPanel
        filters={ORGANIZATION_FILTER_FIELDS}
        values={filterValues}
        search={props.query}
        searchPlaceholder='Search name, address, tax ID, bank UUID, or legacy UUID.'
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
