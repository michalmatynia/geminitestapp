'use client';

import { Package, PlusIcon } from 'lucide-react';
import {
  cloneElement,
  isValidElement,
  type JSX,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import { PRODUCT_PAGE_SIZE_OPTIONS } from '@/shared/lib/products/constants';
import { AdminProductsBreadcrumbs } from '@/shared/ui/admin-products-breadcrumbs';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { Button } from '@/shared/ui/button';
import { FocusModeTogglePortal } from '@/shared/ui/FocusModeTogglePortal';
import { Pagination } from '@/shared/ui/pagination';

export const ALL_CATALOGS_OPTION: LabeledOptionDto<string> = {
  value: 'all',
  label: 'All catalogs',
};

export const UNASSIGNED_CATALOG_OPTION: LabeledOptionDto<string> = {
  value: 'unassigned',
  label: 'Unassigned',
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

interface ProductListCreateActionsProps {
  activeDrafts: ProductDraft[];
  onCreateFromDraft: (draftId: string) => void;
  onCreateProduct: () => void;
}

interface ProductListPaginationControlProps {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  totalPages: number;
}

export const resolveFiltersContent = (filtersContent: ReactNode | undefined): ReactNode => {
  if (filtersContent === null || filtersContent === undefined) return null;
  if (isValidElement(filtersContent) && typeof filtersContent.type !== 'string') {
    return cloneElement(filtersContent as ReactElement<Record<string, unknown>>, {
      instanceId: 'header',
    });
  }
  return filtersContent;
};

const resolveDraftIconColor = (draft: ProductDraft): string | undefined => {
  if (draft.iconColorMode !== 'custom') return undefined;
  if (typeof draft.iconColor !== 'string') return undefined;
  const normalized = draft.iconColor.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) return undefined;
  return normalized;
};

function ProductListDraftCreateButton({
  draft,
  onCreateFromDraft,
}: {
  draft: ProductDraft;
  onCreateFromDraft: (draftId: string) => void;
}): JSX.Element {
  const IconComponent =
    typeof draft.icon === 'string' && draft.icon !== '' ? ICON_LIBRARY_MAP[draft.icon] : null;
  const iconColor = resolveDraftIconColor(draft);
  const iconStyle = iconColor === undefined ? undefined : { color: iconColor };
  const DraftIcon = IconComponent ?? Package;

  return (
    <Button
      onClick={() => {
        onCreateFromDraft(draft.id);
      }}
      className='h-7 w-7 rounded-full border border-white/20 bg-transparent p-0 text-white transition-colors hover:border-white/40 hover:bg-white/10'
      aria-label={`Create product from ${draft.name}`}
      title={draft.name}
    >
      <DraftIcon className='h-3 w-3' style={iconStyle} />
    </Button>
  );
}

export function ProductListCreateActions({
  activeDrafts,
  onCreateFromDraft,
  onCreateProduct,
}: ProductListCreateActionsProps): JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-1'>
      <Button
        onClick={onCreateProduct}
        variant='outline'
        aria-label='Create new product'
        title='Create new product'
        className='h-7 w-7 rounded-full border border-white/20 bg-transparent p-0 text-white transition-colors hover:border-white/40 hover:bg-white/10'
      >
        <PlusIcon className='h-3 w-3' />
      </Button>
      <div className='flex flex-wrap items-center gap-1'>
        {activeDrafts.map((draft: ProductDraft) => (
          <ProductListDraftCreateButton
            key={draft.id}
            draft={draft}
            onCreateFromDraft={onCreateFromDraft}
          />
        ))}
      </div>
    </div>
  );
}

function ProductListTitleBreadcrumbHeader({
  actions,
  actionsClassName,
  titleStackClassName,
}: {
  actions?: ReactNode;
  actionsClassName?: string;
  titleStackClassName?: string;
}): JSX.Element {
  return (
    <AdminTitleBreadcrumbHeader
      title={<h1 className='text-3xl font-bold tracking-tight text-white'>Products</h1>}
      breadcrumb={<AdminProductsBreadcrumbs current='Product List' />}
      titleStackClassName={titleStackClassName}
      actions={actions}
      actionsClassName={actionsClassName}
    />
  );
}

export function ProductListPaginationControl({
  page,
  pageSize,
  setPage,
  setPageSize,
  totalPages,
}: ProductListPaginationControlProps): JSX.Element {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[...PRODUCT_PAGE_SIZE_OPTIONS]}
      showPageSize
      showPageJump
      showLabels={false}
      variant='compact'
    />
  );
}

function ProductListMobileHeader({
  createActions,
  pagination,
  selectorsAndTriggers,
}: {
  createActions: ReactNode;
  pagination: ReactNode;
  selectorsAndTriggers: ReactNode;
}): JSX.Element {
  return (
    <div className='space-y-3 lg:hidden'>
      <ProductListTitleBreadcrumbHeader actions={createActions} actionsClassName='pt-0' />
      <div className='space-y-3'>
        <div className='relative z-10 flex justify-center'>{pagination}</div>
        <div className='flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end'>
          {selectorsAndTriggers}
        </div>
      </div>
    </div>
  );
}

function ProductListDesktopHeader({
  createActions,
  pagination,
  selectorsAndTriggers,
}: {
  createActions: ReactNode;
  pagination: ReactNode;
  selectorsAndTriggers: ReactNode;
}): JSX.Element {
  return (
    <div className='hidden space-y-3 lg:block'>
      <ProductListTitleBreadcrumbHeader
        titleStackClassName='shrink-0 min-w-max'
        actions={
          <>
            {createActions}
            {pagination}
            {selectorsAndTriggers}
          </>
        }
        actionsClassName='relative z-0 min-w-0 flex-1 justify-end'
      />
    </div>
  );
}

function ProductListHeaderBody({
  createActions,
  filtersContent,
  pagination,
  selectorsAndTriggers,
}: {
  createActions: ReactNode;
  filtersContent: ReactNode;
  pagination: ReactNode;
  selectorsAndTriggers: ReactNode;
}): JSX.Element {
  return (
    <div className='space-y-3'>
      <ProductListMobileHeader
        createActions={createActions}
        pagination={pagination}
        selectorsAndTriggers={selectorsAndTriggers}
      />
      <ProductListDesktopHeader
        createActions={createActions}
        pagination={pagination}
        selectorsAndTriggers={selectorsAndTriggers}
      />
      {filtersContent !== null ? <div className='w-full'>{filtersContent}</div> : null}
    </div>
  );
}

export function ProductListHeaderLayout({
  createActions,
  filtersContent,
  isMenuHidden,
  pagination,
  selectorsAndTriggers,
  setIsMenuHidden,
  showHeader,
}: {
  createActions: ReactNode;
  filtersContent: ReactNode;
  isMenuHidden: boolean;
  pagination: ReactNode;
  selectorsAndTriggers: ReactNode;
  setIsMenuHidden: (isHidden: boolean) => void;
  showHeader: boolean;
}): JSX.Element {
  return (
    <div className='space-y-4'>
      {showHeader ? (
        <>
          <FocusModeTogglePortal
            isFocusMode={isMenuHidden === false}
            onToggleFocusMode={() => {
              setIsMenuHidden(isMenuHidden === false);
            }}
          />
          <ProductListHeaderBody
            createActions={createActions}
            filtersContent={filtersContent}
            pagination={pagination}
            selectorsAndTriggers={selectorsAndTriggers}
          />
        </>
      ) : null}
    </div>
  );
}
