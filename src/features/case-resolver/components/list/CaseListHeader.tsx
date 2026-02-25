'use client';

import { PlusIcon } from 'lucide-react';
import { memo, type ReactNode } from 'react';

import { Breadcrumbs, Button, Pagination } from '@/shared/ui';
import { FolderTreeSearchBar } from '@/features/foldertree/v2/search';

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
  const renderCreateActions = (): React.JSX.Element => (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        onClick={onCreateCase}
        size='icon-lg'
        variant='outline'
        aria-label='Create new case'
      >
        <PlusIcon className='h-6 w-6' />
      </Button>
      <span className='text-xs text-muted-foreground'>
        {filteredCount} matches / {totalCount} total
      </span>
    </div>
  );

  const renderPaginationControl = (): React.JSX.Element => (
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

  const renderSearchBar = (): React.JSX.Element | null => {
    if (!onSearchChange) return null;
    return (
      <FolderTreeSearchBar
        value={searchQuery ?? ''}
        onChange={onSearchChange}
        placeholder='Search cases & files…'
      />
    );
  };

  return (
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
            {renderPaginationControl()}
          </div>
          {renderSearchBar()}
          <div className='w-full'>
            {filtersContent}
          </div>
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
          {renderPaginationControl()}
        </div>
        <div className='flex w-full flex-col gap-3 pt-1'>
          {renderSearchBar()}
          <div className='w-full'>
            {filtersContent}
          </div>
        </div>
      </div>
    </div>
  );
});
