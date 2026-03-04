'use client';

import { PlusIcon } from 'lucide-react';
import { memo, useMemo, type ReactNode } from 'react';

import { Breadcrumbs, Button, Pagination } from '@/shared/ui';
import { FolderTreeSearchBar } from '@/features/foldertree/v2/search';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

type CaseListHeaderProps = {
  filtersContent: ReactNode;
  onCreateCase: () => void;
  totalCount: number;
  filteredCount: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  searchQuery?: string | undefined;
  onSearchChange?: ((q: string) => void) | undefined;
};

type CaseListHeaderRuntimeValue = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  searchQuery: string;
  onSearchChange?: (q: string) => void;
};

const {
  Context: CaseListHeaderRuntimeContext,
  useStrictContext: useCaseListHeaderRuntime,
} = createStrictContext<CaseListHeaderRuntimeValue>({
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
  const runtimeValue = useMemo(
    () => ({
      page,
      totalPages,
      onPageChange,
      pageSize,
      onPageSizeChange,
      searchQuery: searchQuery ?? '',
      onSearchChange,
    }),
    [onPageChange, onPageSizeChange, onSearchChange, page, pageSize, searchQuery, totalPages]
  );

  const renderCreateActions = (): React.JSX.Element => (
    <div className='flex flex-wrap items-center gap-2'>
      <Button onClick={onCreateCase} size='icon-lg' variant='outline' aria-label='Create new case'>
        <PlusIcon className='h-6 w-6' />
      </Button>
      <span className='text-xs text-muted-foreground'>
        {filteredCount} matches / {totalCount} total
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
