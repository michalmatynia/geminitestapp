'use client';

import { CheckSquare, Settings2, Trash2 } from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface SelectionBarProps<T> {
  data: T[];
  getRowId: (item: T) => string;
  selectedCount: number;
  onSelectPage: () => void;
  onDeselectPage: () => void;
  onDeselectAll: () => void;
  onSelectAllGlobal?: () => Promise<void>;
  loadingGlobal?: boolean | undefined;
  actions?: React.ReactNode | undefined;
  onDeleteSelected?: () => Promise<void> | undefined;
  className?: string | undefined;
  label?: string | undefined;
}

export function SelectionBar<T>({
  selectedCount,
  onSelectPage,
  onDeselectPage,
  onDeselectAll,
  onSelectAllGlobal,
  loadingGlobal,
  actions,
  onDeleteSelected,
  className,
  label = 'Selection',
}: SelectionBarProps<T>): React.JSX.Element {
  const hasSelection = selectedCount > 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-2 sm:gap-3', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' size='sm' className='h-8 gap-2 px-3'>
            <CheckSquare className='h-3.5 w-3.5' />
            <span className='text-xs font-medium'>{label}</span>
            {selectedCount > 0 && (
              <span className='rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20'>
                {selectedCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-56'>
          <DropdownMenuLabel>On this Page</DropdownMenuLabel>
          <DropdownMenuItem onClick={onSelectPage} className='cursor-pointer'>
            Select All on Page
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDeselectPage} className='cursor-pointer'>
            Deselect All on Page
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Across All Pages</DropdownMenuLabel>
          {onSelectAllGlobal && (
            <DropdownMenuItem
              onClick={() => void onSelectAllGlobal()}
              className='cursor-pointer'
              disabled={!!loadingGlobal}
            >
              {loadingGlobal ? 'Loading...' : 'Select All Resultset'}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onDeselectAll} className='cursor-pointer'>
            Deselect All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {(actions || onDeleteSelected) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='h-8 gap-2 px-3' disabled={!hasSelection}>
              <Settings2 className='h-3.5 w-3.5' />
              <span className='text-xs font-medium'>Batch Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start' className='w-56'>
            {actions}
            {actions && onDeleteSelected && <DropdownMenuSeparator />}
            {onDeleteSelected && (
              <DropdownMenuItem
                onClick={() => void onDeleteSelected()}
                className='cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive'
              >
                <Trash2 className='h-4 w-4' />
                Delete Selected
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
