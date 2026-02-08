'use client';

import React, { useMemo, useState } from 'react';

import { Button, Input, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { ICON_LIBRARY, type IconLibraryItem } from '../lib/icon-library';

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
  const [query, setQuery] = useState<string>('');

  const filteredItems = useMemo((): IconLibraryItem[] => {
    const trimmed = normalize(query);
    if (!trimmed) return [...items];
    return items.filter((item: IconLibraryItem) => {
      const haystack = `${item.label} ${item.id}`;
      return normalize(haystack).includes(trimmed);
    });
  }, [items, query]);

  return (
    <div className={cn('space-y-2', className)}>
      {showSearch ? (
        <Input
          value={query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className='h-8 text-xs'
        />
      ) : null}
      <div
        className={cn('grid gap-2', gridClassName)}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {filteredItems.length === 0 ? (
          <div className='col-span-full rounded border border-dashed border-border p-3 text-[11px] text-gray-500'>
            {emptyLabel}
          </div>
        ) : (
          filteredItems.map((item: IconLibraryItem) => {
            const IconComponent = item.icon;
            const selected = value === item.id;
            return (
              <Tooltip key={item.id} content={item.label} side='top'>
                <Button
                  type='button'
                  onClick={(): void => {
                    if (selected && allowClear) {
                      onChange(null);
                      return;
                    }
                    onChange(item.id);
                  }}
                  aria-pressed={selected}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-md border transition',
                    selected
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : 'border bg-gray-800 text-gray-400 hover:border-border/60 hover:text-gray-300',
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
      {helperText ? <div className='text-[11px] text-gray-400'>{helperText}</div> : null}
    </div>
  );
}
