'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { ActionMenu } from '../ActionMenu';
import { DropdownMenuItem } from '../dropdown-menu';
import { EmptyState } from '../empty-state';
import { LoadingState } from '../LoadingState';


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
export function SimpleSettingsList<T extends SimpleSettingsListItem>(
  props: SimpleSettingsListProps<T>
): React.JSX.Element {
  const {
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
  } = props;

  if (isLoading) {
    return <LoadingState className='py-8' />;
  }

  if (items.length === 0) {
    return <EmptyState title={emptyMessage} variant='compact' className='py-8' />;
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
        const isClickable = typeof onSelect === 'function';
        return (
          <div
            key={item.id}
            onClick={() => onSelect?.(item)}
            onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
              if (!isClickable || event.target !== event.currentTarget) {
                return;
              }
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(item);
              }
            }}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-pressed={isClickable ? isSelected : undefined}
            className={cn(
              'group flex flex-col justify-between rounded-lg border border-border bg-card/40 transition-colors',
              onSelect && 'cursor-pointer hover:border-blue-500/50',
              isSelected ? 'border-blue-500/50 bg-blue-500/5' : 'hover:bg-card/60',
              isClickable &&
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              paddingClasses,
              itemClassName
            )}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='flex items-start gap-3 min-w-0'>
                {item.icon && <div className='mt-0.5 shrink-0'>{item.icon}</div>}
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <span className='font-semibold text-white truncate'>{item.title}</span>
                    {item.subtitle && (
                      <span className='text-xs text-gray-400 truncate'>{item.subtitle}</span>
                    )}
                  </div>
                  {item.description && (
                    <div className='mt-1 text-xs text-gray-400 line-clamp-2'>
                      {item.description}
                    </div>
                  )}
                </div>
              </div>

              <div className='flex items-center gap-2 shrink-0'>
                {renderActions?.(item)}

                {(onEdit || onDelete || renderExtraActions) && (
                  <ActionMenu triggerClassName='-mr-2 size-8 text-gray-400 hover:text-white'>
                    {renderExtraActions?.(item)}
                    {onEdit && (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                      >
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
                  </ActionMenu>
                )}
              </div>
            </div>

            {renderCustomContent && <div className='mt-4'>{renderCustomContent(item)}</div>}
          </div>
        );
      })}
    </div>
  );
}
