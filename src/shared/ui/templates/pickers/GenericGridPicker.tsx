'use client';

import { memo, useState, useCallback } from 'react';

import type { GenericGridPickerProps, GridPickerItem } from '@/shared/contracts/ui';
import { cn } from '@/shared/utils';

import { usePickerSearch } from './usePickerSearch';

/**
 * GenericGridPicker - Reusable grid-based picker component
 *
 * Features:
 * - Typed generics for type safety
 * - Configurable grid columns
 * - Custom item rendering
 * - Optional search/filter
 * - Custom matcher function
 * - Accessible keyboard navigation
 *
 * @example
 * const items = [
 *   { id: 'preset1', label: 'Fade In' },
 *   { id: 'preset2', label: 'Slide Up' }
 * ];
 *
 * <GenericGridPicker
 *   items={items}
 *   onSelect={(item) => {
 *     // handle selection
 *   }}
 *   renderItem={(item, selected) => (
 *     <div className={selected ? 'bg-blue-500' : ''}>
 *       {item.label}
 *     </div>
 *   )}
 *   searchable
 * />
 */
export const GenericGridPicker = memo(function GenericGridPicker<
  T extends GridPickerItem = GridPickerItem,
>({
  items,
  selectedId,
  onSelect,
  renderItem,
  columns = 4,
  gap = '8px',
  searchable = false,
  searchPlaceholder = 'Search...',
  searchMatcher,
  emptyState,
  className,
  gridClassName,
  disabled = false,
}: GenericGridPickerProps<T>): React.JSX.Element {
  const [localFocused, setLocalFocused] = useState<string | null>(null);

  // Use search hook with custom matcher if provided
  const { query, setQuery, filtered, clearSearch } = usePickerSearch(items, {
    ...(searchMatcher !== undefined ? { matcher: searchMatcher } : {}),
  });

  const handleSelect = useCallback(
    (item: T) => {
      if (!item.disabled && !disabled) {
        onSelect(item);
      }
    },
    [onSelect, disabled]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, item: T) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(item);
      } else if (e.key === 'Escape') {
        clearSearch();
      }
    },
    [handleSelect, clearSearch]
  );

  const hasItems = filtered.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Input (if enabled) */}
      {searchable && (
        <div className='flex items-center gap-2'>
          <input
            type='text'
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
            className={cn(
              'flex-1 rounded px-3 py-2 text-sm bg-background/80 border border-border/40 placeholder-gray-500 text-gray-200',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
          {query && (
            <button
              type='button'
              onClick={clearSearch}
              disabled={disabled}
              className='px-2 py-2 text-xs text-gray-400 hover:text-gray-200 transition'
              aria-label='Clear search'
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Grid Items */}
      {hasItems ? (
        <div
          className={cn('grid gap-2 auto-rows-max', gridClassName)}
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap,
          }}
          role='listbox'
          aria-disabled={disabled}
        >
          {filtered.map((item: T) => {
            const isSelected = selectedId === item.id;
            const isFocused = localFocused === item.id;
            const isDisabledItem = item.disabled || disabled;

            return (
              <button
                key={item.id}
                type='button'
                role='option'
                aria-selected={isSelected}
                aria-label={item.label}
                title={item.label}
                disabled={isDisabledItem}
                onClick={() => handleSelect(item)}
                onKeyDown={(e) => handleKeyDown(e, item)}
                onFocus={() => setLocalFocused(item.id)}
                onBlur={() => setLocalFocused(null)}
                className={cn(
                  'w-full rounded border-0 bg-transparent p-0 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                  !isDisabledItem && 'cursor-pointer',
                  isSelected && 'ring-2 ring-blue-500',
                  isFocused && 'ring-2 ring-blue-400',
                  isDisabledItem && 'cursor-not-allowed opacity-50',
                  !isDisabledItem && 'hover:ring-1 hover:ring-blue-300'
                )}
              >
                {renderItem(item, isSelected)}
              </button>
            );
          })}
        </div>
      ) : (
        <div className='rounded border border-dashed border-border/40 p-6 text-center'>
          {emptyState || (
            <div className='text-sm text-gray-500'>
              {searchable && query ? 'No items found' : 'No items available'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}) as (<T extends GridPickerItem = GridPickerItem>(
  props: GenericGridPickerProps<T>
) => React.ReactElement) & { displayName?: string };

GenericGridPicker.displayName = 'GenericGridPicker';
