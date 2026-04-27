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
  INVOICE_PAGE_SIZE_OPTIONS,
  type InvoiceListState,
} from '../../pages/AdminFilemakerInvoicesPage.types';

const FILEMAKER_INVOICE_TREE_INSTANCE: FolderTreeInstance = 'filemaker_invoices';

const INVOICE_FILTER_FIELDS: FilterField[] = [
  {
    key: 'payment',
    label: 'Payment',
    type: 'select',
    options: [
      { value: 'all', label: 'All payment states' },
      { value: 'paid', label: 'Paid' },
      { value: 'unpaid', label: 'Unpaid' },
    ],
    width: '190px',
  },
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
    key: 'year',
    label: 'Issue Year',
    type: 'text',
    placeholder: '2026',
    width: '140px',
  },
];

function InvoiceListBadges(
  props: Pick<InvoiceListState, 'error' | 'isLoading' | 'shownCount' | 'totalCount'>
): React.JSX.Element {
  const hasError = props.error !== null && props.error.length > 0;
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Invoices: {props.totalCount}
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

function InvoiceListHeader(props: InvoiceListState): React.JSX.Element {
  const filterValues = useMemo(
    () => ({
      organization: props.filters.organization,
      payment: props.filters.payment,
      year: props.filters.year,
    }),
    [props.filters.organization, props.filters.payment, props.filters.year]
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <InvoiceListBadges
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
          pageSizeOptions={INVOICE_PAGE_SIZE_OPTIONS}
          showPageSize
          showInfo
          showLabels={false}
          showPageJump
          isLoading={props.isLoading}
          variant='compact'
        />
      </div>
      <FilterPanel
        filters={INVOICE_FILTER_FIELDS}
        values={filterValues}
        search={props.query}
        searchPlaceholder='Search invoice number, signature, buyer, seller, service, amount, or UUID.'
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

function InvoiceListViewport(props: InvoiceListState): React.JSX.Element {
  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: FILEMAKER_INVOICE_TREE_INSTANCE,
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
        emptyLabel={hasQuery ? 'No invoices found' : 'No invoices found'}
        estimateRowHeight={82}
        renderNode={props.renderNode}
      />
      <MasterTreeSettingsButton instance={FILEMAKER_INVOICE_TREE_INSTANCE} />
    </div>
  );
}

export function FilemakerInvoicesListPanel(props: InvoiceListState): React.JSX.Element {
  return (
    <StandardDataTablePanel
      header={<InvoiceListHeader {...props} />}
      columns={[]}
      data={[]}
      isLoading={false}
      showTable={false}
      contentClassName='space-y-3'
    >
      <InvoiceListViewport {...props} />
    </StandardDataTablePanel>
  );
}
