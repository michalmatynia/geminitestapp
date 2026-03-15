'use client';

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import React, { createContext, useContext, useMemo } from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { Label } from './label';
import { SelectSimple } from './select-simple';

export interface PaginationProps {
  page: number;
  totalPages?: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  showInfo?: boolean;
  isLoading?: boolean;
  className?: string;
  showLabels?: boolean;
  variant?: 'default' | 'compact' | 'panel';
}

export interface PaginationContextValue {
  page: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions: number[];
  showPageSize: boolean;
  showInfo: boolean;
  isLoading: boolean;
  showLabels: boolean;
  variant: 'default' | 'compact' | 'panel';
  startItem: number;
  endItem: number;
}

const PaginationContext = createContext<PaginationContextValue | null>(null);

function usePaginationContext(): PaginationContextValue {
  const context = useContext(PaginationContext);
  if (!context) throw new Error('Pagination components must be used within Pagination');
  return context;
}

function PaginationInfo(): React.JSX.Element | null {
  const { showInfo, variant, totalCount, isLoading, startItem, endItem } = usePaginationContext();
  const isPanel = variant === 'panel';

  if (!(showInfo || isPanel) || totalCount === undefined) return null;

  return (
    <div className='text-sm text-gray-400'>
      {isLoading ? (
        <div className='flex items-center gap-2'>
          <Loader2 className='h-4 w-4 animate-spin text-blue-500' aria-hidden='true' />
          <span>Loading...</span>
        </div>
      ) : (
        <>
          Showing{' '}
          <span className='font-medium text-white'>
            {startItem}-{endItem}
          </span>{' '}
          of <span className='font-medium text-white'>{totalCount}</span> results
        </>
      )}
    </div>
  );
}

function PaginationPageSize(): React.JSX.Element | null {
  const {
    showPageSize,
    variant,
    onPageSizeChange,
    pageSize,
    pageSizeOptions,
    showLabels,
    onPageChange,
  } = usePaginationContext();
  const isPanel = variant === 'panel';
  const isCompact = variant === 'compact';

  if (!(showPageSize || isPanel) || !onPageSizeChange || pageSize === undefined) return null;

  return (
    <div className='flex items-center gap-2'>
      <Label className='text-xs font-medium text-gray-400 whitespace-nowrap'>
        {showLabels && !isCompact ? 'Items per page:' : ''}
      </Label>
      <SelectSimple
        size='sm'
        value={String(pageSize)}
        onValueChange={(value) => {
          onPageSizeChange(Number(value));
          onPageChange(1);
        }}
        options={pageSizeOptions.map((size) => ({
          value: String(size),
          label: String(size),
        }))}
        triggerClassName='h-8 w-20 text-xs'
       ariaLabel='Select option' title='Select option'/>
    </div>
  );
}

function PaginationControls(): React.JSX.Element {
  const { page, onPageChange, isLoading, totalPages, variant } = usePaginationContext();
  const isCompact = variant === 'compact';

  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='outline'
        size='sm'
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1 || isLoading}
        className='h-8 w-8 p-0'
        aria-label='Previous page'
        title={'Previous page'}>
        <ChevronLeft className='h-4 w-4' aria-hidden='true' />
      </Button>

      <div className='text-xs font-medium text-gray-400 min-w-[80px] text-center'>
        {isCompact ? (
          <span>
            {page} / {totalPages}
          </span>
        ) : (
          <>
            Page <span className='font-bold text-white'>{page}</span> of{' '}
            <span className='font-bold text-white'>{totalPages}</span>
          </>
        )}
      </div>

      <Button
        variant='outline'
        size='sm'
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages || isLoading}
        className='h-8 w-8 p-0'
        aria-label='Next page'
        title={'Next page'}>
        <ChevronRight className='h-4 w-4' aria-hidden='true' />
      </Button>
    </div>
  );
}

/**
 * Pagination - A unified component for navigating paginated data.
 * Merges functionality from basic Pagination and PanelPagination.
 */
export function Pagination(props: PaginationProps): React.JSX.Element | null {
  const {
    page,
    totalPages: propTotalPages,
    totalCount,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
    showPageSize = false,
    showInfo = false,
    isLoading = false,
    className,
    showLabels = true,
    variant = 'default',
  } = props;

  const calculatedTotalPages = totalCount && pageSize ? Math.ceil(totalCount / pageSize) : 0;
  const totalPages = propTotalPages ?? calculatedTotalPages;

  const startItem = totalCount && pageSize ? (page - 1) * pageSize + 1 : 0;
  const endItem = totalCount && pageSize ? Math.min(page * pageSize, totalCount) : 0;

  const contextValue = useMemo<PaginationContextValue>(
    () => ({
      page,
      totalPages,
      totalCount,
      pageSize,
      onPageChange,
      onPageSizeChange,
      pageSizeOptions,
      showPageSize,
      showInfo,
      isLoading,
      showLabels,
      variant,
      startItem,
      endItem,
    }),
    [
      page,
      totalPages,
      totalCount,
      pageSize,
      onPageChange,
      onPageSizeChange,
      pageSizeOptions,
      showPageSize,
      showInfo,
      isLoading,
      showLabels,
      variant,
      startItem,
      endItem,
    ]
  );

  if (totalCount === 0 || (totalPages <= 1 && !showPageSize)) {
    return null;
  }

  const isPanel = variant === 'panel';

  return (
    <PaginationContext.Provider value={contextValue}>
      <div
        className={cn(
          'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
          isPanel && 'rounded-lg border border-border/60 bg-card/40 px-4 py-3',
          className
        )}
      >
        <PaginationInfo />
        <div
          className={cn(
            'flex flex-wrap items-center gap-4',
            !showInfo && !isPanel && 'w-full justify-between'
          )}
        >
          <PaginationPageSize />
          <PaginationControls />
        </div>
      </div>
    </PaginationContext.Provider>
  );
}
