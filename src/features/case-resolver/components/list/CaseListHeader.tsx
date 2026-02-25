'use client';

import { ArrowDown, ArrowUp, Lock, PlusIcon, Save, Unlock } from 'lucide-react';
import { memo, useCallback, useState, type ReactNode } from 'react';

import { useAdminCaseResolverCases } from '@/features/case-resolver/context/AdminCaseResolverCasesContext';
import { Breadcrumbs, Button, Pagination, SelectSimple } from '@/shared/ui';

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
  isHierarchyLocked: boolean;
  onToggleHierarchyLock: () => void;
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
  isHierarchyLocked,
  onToggleHierarchyLock,
}: CaseListHeaderProps): React.JSX.Element {
  const {
    caseSortBy,
    setCaseSortBy,
    caseSortOrder,
    setCaseSortOrder,
    handleSaveListViewDefaults,
  } = useAdminCaseResolverCases();
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);

  const handleSaveDefaults = useCallback(async (): Promise<void> => {
    setIsSavingDefaults(true);
    try {
      await handleSaveListViewDefaults();
    } finally {
      setIsSavingDefaults(false);
    }
  }, [handleSaveListViewDefaults]);

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

  const renderSortingControls = (): React.JSX.Element => (
    <>
      <SelectSimple
        size='sm'
        value={caseSortBy}
        onValueChange={(value: string): void => {
          if (value === 'updated' || value === 'created' || value === 'name') {
            setCaseSortBy(value);
          }
        }}
        options={[
          { value: 'updated', label: 'Date modified' },
          { value: 'created', label: 'Date created' },
          { value: 'name', label: 'Name' },
        ]}
        className='w-40 shrink-0'
        triggerClassName='h-8 text-xs'
        ariaLabel='Sort cases by'
      />
      <Button
        variant='outline'
        size='sm'
        className='h-8 shrink-0'
        onClick={(): void => {
          setCaseSortOrder(caseSortOrder === 'asc' ? 'desc' : 'asc');
        }}
      >
        {caseSortOrder === 'asc' ? (
          <ArrowUp className='mr-1 size-3.5' />
        ) : (
          <ArrowDown className='mr-1 size-3.5' />
        )}
        {caseSortOrder === 'asc' ? 'Ascending' : 'Descending'}
      </Button>
      <Button
        variant='outline'
        size='sm'
        className='h-8 shrink-0'
        onClick={onToggleHierarchyLock}
        title={
          isHierarchyLocked
            ? 'Hierarchy is locked. Unlock to reorder or nest cases.'
            : 'Hierarchy is unlocked. Lock to prevent accidental nesting.'
        }
      >
        {isHierarchyLocked ? (
          <Lock className='mr-1 size-3.5' />
        ) : (
          <Unlock className='mr-1 size-3.5' />
        )}
        {isHierarchyLocked ? 'Hierarchy Locked' : 'Hierarchy Unlocked'}
      </Button>
      <Button
        variant='outline'
        size='sm'
        className='h-8 shrink-0'
        onClick={() => {
          void handleSaveDefaults();
        }}
        disabled={isSavingDefaults}
      >
        <Save className='mr-1 size-3.5' />
        {isSavingDefaults ? 'Saving...' : 'Save View'}
      </Button>
    </>
  );

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
          <div className='flex w-full items-center justify-end gap-2 max-sm:flex-wrap'>
            {renderSortingControls()}
          </div>
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
          <div className='flex w-full items-center justify-end gap-2 lg:flex-nowrap'>
            {renderSortingControls()}
          </div>
          <div className='w-full'>
            {filtersContent}
          </div>
        </div>
      </div>
    </div>
  );
});
