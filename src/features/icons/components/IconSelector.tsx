'use client';

import React from 'react';

import { Button, Input, Tooltip } from '@/shared/ui';
import { usePickerSearch } from '@/shared/ui/templates/pickers/usePickerSearch';
import { cn } from '@/shared/utils';

import { ICON_LIBRARY, type IconLibraryItem } from '../lib/icon-library';

const normalize = (value: string): string =>
  value.toLowerCase().replace(/[_/\\-]+/g, ' ').replace(/\s+/g, ' ').trim();

const matchIcon = (query: string, icon: IconLibraryItem): boolean => {
  const trimmed = normalize(query);
  if (!trimmed) return true;
  const haystack = `${icon.label} ${icon.id}`;
  return normalize(haystack).includes(trimmed);
};

export type IconSelectorProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  items?: ReadonlyArray<IconLibraryItem>;
  columns?: number;
  showSearch?: boolean;
  searchPlaceholder?: string;
  allowClear?: boolean;
  className?: string;
  gridClassName?: string;
  buttonClassName?: string;
  iconClassName?: string;
  emptyLabel?: string;
  helperText?: string;
};

export function IconSelector({
  value,
  onChange,
  items = ICON_LIBRARY,
  columns = 6,
  showSearch = true,
  searchPlaceholder = 'Search icons...',
  allowClear = true,
  className,
  gridClassName,
  buttonClassName,
  iconClassName,
  emptyLabel = 'No icons found.',
  helperText,
}: IconSelectorProps): React.JSX.Element {
  const { query, setQuery, filtered } = usePickerSearch(items, { matcher: matchIcon });

  const displayItems = showSearch ? (query ? filtered : items) : items;

  return (
    <div className={cn('space-y-2', className)}>
      {showSearch && (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className='h-8 text-xs'
        />
      )}
      <div className={cn('grid gap-2', gridClassName)} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {displayItems.length === 0 ? (
          <div className='col-span-full rounded border border-dashed border-border p-3 text-[11px] text-gray-500'>
            {emptyLabel}
          </div>
        ) : (
          displayItems.map((item: IconLibraryItem) => {
            const IconComponent = item.icon;
            const selected = value === item.id;
            return (
              <Tooltip key={item.id} content={item.label} side='top'>
                <Button
                  type='button'
                  onClick={() => {
                    if (selected && allowClear) {
                      onChange(null);
                    } else {
                      onChange(item.id);
                    }
                  }}
                  aria-pressed={selected}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-md border transition',
                    selected ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border bg-gray-800 text-gray-400 hover:border-border/60 hover:text-gray-300',
                    buttonClassName
                  )}
                >
                  <IconComponent className={cn('h-5 w-5', iconClassName)} />
                </Button>
              </Tooltip>
            );
          })
        )}
      </div>
      {helperText && <div className='text-[11px] text-gray-400'>{helperText}</div>}
    </div>
  );
}
