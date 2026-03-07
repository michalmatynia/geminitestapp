import { CheckSquare, Settings2, Trash2 } from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils';

import { ActionMenu } from './ActionMenu';
import { Badge } from './badge';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from './dropdown-menu';

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
  rightActions?: React.ReactNode | undefined;
  onDeleteSelected?: () => Promise<void> | undefined;
  className?: string | undefined;
  label?: string | undefined;
}

export function SelectionBar<T>(props: SelectionBarProps<T>): React.JSX.Element {
  const {
    selectedCount,
    onSelectPage,
    onDeselectPage,
    onDeselectAll,
    onSelectAllGlobal,
    loadingGlobal,
    actions,
    rightActions,
    onDeleteSelected,
    className,
    label = 'Selection',
  } = props;

  const hasSelection = selectedCount > 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-2 sm:gap-3', className)}>
      <ActionMenu
        align='start'
        className='w-56'
        trigger={
          <div className='flex items-center gap-2'>
            <CheckSquare className='h-3.5 w-3.5' />
            <span className='text-xs font-medium'>{label}</span>
            {selectedCount > 0 && (
              <Badge variant='secondary' className='px-1.5 py-0 h-4 text-[9px] font-bold'>
                {selectedCount}
              </Badge>
            )}
          </div>
        }
        triggerClassName='h-8 px-3 border border-border/60 bg-card/30 hover:bg-card/50 text-gray-300 hover:text-white'
        variant='outline'
        size='sm'
      >
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
      </ActionMenu>

      {(actions || onDeleteSelected) && (
        <ActionMenu
          align='start'
          className='w-56'
          disabled={!hasSelection}
          trigger={
            <div className='flex items-center gap-2'>
              <Settings2 className='h-3.5 w-3.5' />
              <span className='text-xs font-medium'>Batch Actions</span>
            </div>
          }
          triggerClassName='h-8 px-3 border border-border/60 bg-card/30 hover:bg-card/50 text-gray-300 hover:text-white'
          variant='outline'
          size='sm'
        >
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
        </ActionMenu>
      )}

      {rightActions ? <div className='ml-auto flex items-center gap-2'>{rightActions}</div> : null}
    </div>
  );
}
