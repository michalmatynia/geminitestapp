'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { Label } from './label';
import { SelectSimple } from './select-simple';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  className?: string;
  showLabels?: boolean;
  variant?: 'default' | 'compact';
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSize = false,
  className,
  showLabels = true,
  variant = 'default',
}: PaginationProps): React.JSX.Element {
  const isCompact = variant === 'compact';

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <div className='flex items-center gap-3'>
        {showLabels && !isCompact && (
          <span className='text-sm font-medium text-muted-foreground'>Page</span>
        )}
        <Button
          type='button'
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          variant='outline'
          size='sm'
          className='h-8 w-8 p-0'
          aria-label='Previous page'
        >
          <ChevronLeft className='h-4 w-4' />
        </Button>
        <div className='flex items-center gap-2 px-2'>
          <span className='min-w-fit text-sm font-medium'>{page}</span>
          <span className='text-sm text-muted-foreground'>/</span>
          <span className='min-w-fit text-sm text-muted-foreground'>{totalPages}</span>
        </div>
        <Button
          type='button'
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          variant='outline'
          size='sm'
          className='h-8 w-8 p-0'
          aria-label='Next page'
        >
          <ChevronRight className='h-4 w-4' />
        </Button>
      </div>

      {showPageSize && onPageSizeChange && pageSize !== undefined && (
        <div className='flex items-center gap-2'>
          {showLabels && !isCompact && <Label className='text-xs text-muted-foreground whitespace-nowrap'>Rows per page</Label>}
          <SelectSimple size='sm'
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
              onPageChange(1);
            }}
            options={pageSizeOptions.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            triggerClassName='h-8 w-24 text-xs'
          />
        </div>
      )}
    </div>
  );
}
