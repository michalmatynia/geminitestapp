'use client';

import { MoreVertical, Loader2 } from 'lucide-react';
import React from 'react';

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  Button,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

export interface SimpleSettingsListItem {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
}

interface SimpleSettingsListProps<T extends SimpleSettingsListItem> {
  items: T[];
  isLoading?: boolean | undefined;
  selectedId?: string | undefined;
  onSelect?: ((item: T) => void) | undefined;
  onEdit?: ((item: T) => void) | undefined;
  onDelete?: ((item: T) => void | Promise<void>) | undefined;
  emptyMessage?: string | undefined;
  renderActions?: ((item: T) => React.ReactNode) | undefined;
  renderExtraActions?: ((item: T) => React.ReactNode) | undefined;
  renderCustomContent?: ((item: T) => React.ReactNode) | undefined;
  className?: string | undefined;
  itemClassName?: string | undefined;
  columns?: 1 | 2 | 3 | undefined;
  padding?: 'none' | 'sm' | 'md' | 'lg' | undefined;
}

/**
 * SimpleSettingsList - A unified component for rendering simple lists in settings panels.
 * Optimized for lists of currencies, countries, languages, etc.
 */
export function SimpleSettingsList<T extends SimpleSettingsListItem>({
  items,
  isLoading,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  emptyMessage = 'No items found.',
  renderActions,
  renderExtraActions,
  renderCustomContent,
  className,
  itemClassName,
  columns = 1,
  padding = 'md',
}: SimpleSettingsListProps<T>): React.JSX.Element {
  if (isLoading) {
    return (
      <div className='py-8 flex flex-col items-center justify-center gap-2 text-sm text-gray-400'>
        <Loader2 className='size-5 animate-spin text-blue-500' />
        <span>Loading...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className='py-8 text-center text-sm text-gray-500'>
        {emptyMessage}
      </div>
    );
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }[columns];

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  }[padding];

  return (
    <div className={cn('grid gap-4', gridCols, className)}>
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        return (
          <div
            key={item.id}
            onClick={() => onSelect?.(item)}
            className={cn(
              'group flex flex-col justify-between rounded-lg border border-border bg-card/40 transition-colors',
              onSelect && 'cursor-pointer hover:border-blue-500/50',
              isSelected ? 'border-blue-500/50 bg-blue-500/5' : 'hover:bg-card/60',
              paddingClasses,
              itemClassName
            )}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='flex items-start gap-3 min-w-0'>
                {item.icon && (
                  <div className='mt-0.5 shrink-0'>
                    {item.icon}
                  </div>
                )}
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <span className='font-semibold text-white truncate'>
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className='text-xs text-gray-400 truncate'>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className='mt-1 text-xs text-gray-400 line-clamp-2'>
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              <div className='flex items-center gap-2 shrink-0'>
                {renderActions?.(item)}
                
                {(onEdit || onDelete || renderExtraActions) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='-mr-2 size-8 text-gray-400 hover:text-white'
                        type='button'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className='size-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      {renderExtraActions?.(item)}
                      {onEdit && (
                        <DropdownMenuItem onSelect={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}>
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          className='text-red-300 focus:text-red-300'
                          onSelect={(e) => {
                            e.stopPropagation();
                            void onDelete(item);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {renderCustomContent && (
              <div className='mt-4'>
                {renderCustomContent(item)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
