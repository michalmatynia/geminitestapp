'use client';

import { PlusIcon } from 'lucide-react';
import { memo, useMemo, type ReactNode } from 'react';

import { FolderTreeSearchBar } from '@/features/foldertree';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Breadcrumbs, Button, Pagination } from '@/shared/ui';

import { useOptionalCaseListPanelControlsContext } from './CaseListPanelControlsContext';

type CaseListHeaderProps = {
  filtersContent: ReactNode;
  onCreateCase?: (() => void) | undefined;
  totalCount?: number | undefined;
  filteredCount?: number | undefined;
  page?: number | undefined;
  totalPages?: number | undefined;
  onPageChange?: ((page: number) => void) | undefined;
  pageSize?: number | undefined;
  onPageSizeChange?: ((pageSize: number) => void) | undefined;
  searchQuery?: string | undefined;
  onSearchChange?: ((q: string) => void) | undefined;
};

type CaseListHeaderRuntimeValue = {
  onCreateCase: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  searchQuery: string;
  onSearchChange?: (q: string) => void;
};

const { Context: CaseListHeaderRuntimeContext, useStrictContext: useCaseListHeaderRuntime } =
  createStrictContext<CaseListHeaderRuntimeValue>({
    hookName: 'useCaseListHeaderRuntime',
    providerName: 'CaseListHeaderRuntimeProvider',
    displayName: 'CaseListHeaderRuntimeContext',
  });

function CaseListHeaderPaginationControl(): React.JSX.Element {
  const { page, totalPages, onPageChange, pageSize, onPageSizeChange } = useCaseListHeaderRuntime();
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      pageSize={pageSize}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={[12, 24, 48, 96]}
      showPageSize
      showLabels={false}
      variant='compact'
    />
  );
}

function CaseListHeaderSearchBar(): React.JSX.Element | null {
  const { onSearchChange, searchQuery } = useCaseListHeaderRuntime();
  if (!onSearchChange) return null;
  return (
    <FolderTreeSearchBar
      value={searchQuery}
      onChange={onSearchChange}
      placeholder='Search cases & files…'
    />
  );
}

function CaseListHeaderCreateButton(): React.JSX.Element {
  const { onCreateCase } = useCaseListHeaderRuntime();
  return (
    <Button onClick={onCreateCase} size='icon-lg' variant='outline' aria-label='Create new case'>
      <PlusIcon className='h-6 w-6' />
    </Button>
  );
}

export const CaseListHeader = memo(function CaseListHeader({
  filtersContent,
  onCreateCase,
  totalCount,
  filteredCount,
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  searchQuery,
  onSearchChange,
}: CaseListHeaderProps): React.JSX.Element {
  const panelControls = useOptionalCaseListPanelControlsContext();
  const resolvedOnCreateCase = onCreateCase ?? panelControls?.onCreateCase;
  const resolvedTotalCount = totalCount ?? panelControls?.totalCount;
  const resolvedFilteredCount = filteredCount ?? panelControls?.filteredCount;
  const resolvedPage = page ?? panelControls?.page;
  const resolvedTotalPages = totalPages ?? panelControls?.totalPages;
  const resolvedOnPageChange = onPageChange ?? panelControls?.onPageChange;
  const resolvedPageSize = pageSize ?? panelControls?.pageSize;
  const resolvedOnPageSizeChange = onPageSizeChange ?? panelControls?.onPageSizeChange;
  const resolvedSearchQuery = searchQuery ?? panelControls?.searchQuery ?? '';
  const resolvedOnSearchChange = onSearchChange ?? panelControls?.onSearchChange;

  if (
    !resolvedOnCreateCase ||
    typeof resolvedTotalCount !== 'number' ||
    typeof resolvedFilteredCount !== 'number' ||
    typeof resolvedPage !== 'number' ||
    typeof resolvedTotalPages !== 'number' ||
    !resolvedOnPageChange ||
    typeof resolvedPageSize !== 'number' ||
    !resolvedOnPageSizeChange
  ) {
    throw new Error(
      'CaseListHeader must be used within CaseListPanelControlsProvider or receive explicit props'
    );
  }

  const runtimeValue = useMemo(
    () => ({
      onCreateCase: resolvedOnCreateCase,
      page: resolvedPage,
      totalPages: resolvedTotalPages,
      onPageChange: resolvedOnPageChange,
      pageSize: resolvedPageSize,
      onPageSizeChange: resolvedOnPageSizeChange,
      searchQuery: resolvedSearchQuery,
      onSearchChange: resolvedOnSearchChange,
    }),
    [
      resolvedOnCreateCase,
      resolvedOnPageChange,
      resolvedOnPageSizeChange,
      resolvedOnSearchChange,
      resolvedPage,
      resolvedPageSize,
      resolvedSearchQuery,
      resolvedTotalPages,
    ]
  );

  const renderCreateActions = (): React.JSX.Element => (
    <div className='flex flex-wrap items-center gap-2'>
      <CaseListHeaderCreateButton />
      <span className='text-xs text-muted-foreground'>
        {resolvedFilteredCount} matches / {resolvedTotalCount} total
      </span>
    </div>
  );

  return (
    <CaseListHeaderRuntimeContext.Provider value={runtimeValue}>
      <div className='space-y-4'>
        <div className='space-y-3 lg:hidden'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight text-white'>Cases</h1>
            <Breadcrumbs
              items={[
                { label: 'Admin', href: '/admin' },
                { label: 'Case Resolver', href: '/admin/case-resolver' },
                { label: 'Cases' },
              ]}
              className='mt-1'
            />
            <div className='mt-3'>{renderCreateActions()}</div>
          </div>
          <div className='space-y-3'>
            <div className='flex justify-center'>
              <CaseListHeaderPaginationControl />
            </div>
            <CaseListHeaderSearchBar />
            <div className='w-full'>{filtersContent}</div>
          </div>
        </div>

        <div className='hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1.5fr)] items-start gap-3 lg:grid'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight text-white'>Cases</h1>
            <Breadcrumbs
              items={[
                { label: 'Admin', href: '/admin' },
                { label: 'Case Resolver', href: '/admin/case-resolver' },
                { label: 'Cases' },
              ]}
              className='mt-1'
            />
            <div className='mt-3'>{renderCreateActions()}</div>
          </div>
          <div className='flex justify-center pt-1'>
            <CaseListHeaderPaginationControl />
          </div>
          <div className='flex w-full flex-col gap-3 pt-1'>
            <CaseListHeaderSearchBar />
            <div className='w-full'>{filtersContent}</div>
          </div>
        </div>
      </div>
    </CaseListHeaderRuntimeContext.Provider>
  );
});
