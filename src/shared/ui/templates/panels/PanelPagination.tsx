'use client';

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { cn } from '@/shared/utils/ui-utils';

interface PanelPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  showInfo?: boolean;
  className?: string;
}

/**
 * PanelPagination - Renders pagination controls with page size selector
 */
export const PanelPagination: React.FC<PanelPaginationProps> = ({
  page,
  pageSize,
  totalCount,
  pageSizeOptions = [5, 10, 20, 50],
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  showInfo = true,
  className,
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  if (totalCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3',
        className
      )}
    >
      {/* Info Section */}
      {showInfo && (
        <div className='text-sm text-gray-600'>
          {isLoading ? (
            <div className='flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>Loading...</span>
            </div>
          ) : (
            <>
              Showing{' '}
              <span className='font-medium'>
                {startItem}-{endItem}
              </span>{' '}
              of <span className='font-medium'>{totalCount}</span> results
            </>
          )}
        </div>
      )}

      {/* Controls Section */}
      <div className='flex flex-wrap items-center gap-4'>
        {/* Page Size Selector */}
        <div className='flex items-center gap-2'>
          <label htmlFor='pageSize' className='text-xs font-medium text-gray-600'>
            Items per page:
          </label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className='h-8 w-16'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Navigation Buttons */}
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoPrev || isLoading}
            className='h-8 w-8 p-0'
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>

          <div className='text-xs font-medium text-gray-600 min-w-[80px] text-center'>
            Page <span className='font-bold'>{page}</span> of{' '}
            <span className='font-bold'>{totalPages}</span>
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext || isLoading}
            className='h-8 w-8 p-0'
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  );
};

PanelPagination.displayName = 'PanelPagination';
