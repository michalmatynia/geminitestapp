'use client';

import React, { useState, useMemo } from 'react';

import { cn } from '@/shared/utils';

import { Badge } from './badge';
import { Card } from './card';
import { Checkbox } from './checkbox';
import { Hint } from './Hint';
import { Input } from './input';

export interface SearchableListProps<T> {
  items: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  renderItem?: (item: T) => React.ReactNode;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  maxHeight?: string;
  className?: string;
  listClassName?: string;
  showCount?: boolean;
  countLabel?: string;
  extraActions?: React.ReactNode;
}

export function SearchableList<T>({
  items,
  selectedIds,
  onToggle,
  renderItem,
  getId,
  getLabel,
  searchPlaceholder = 'Filter items...',
  emptyMessage = 'No items found matching your criteria.',
  maxHeight = 'max-h-64',
  className,
  listClassName,
  showCount = true,
  countLabel = 'selected',
  extraActions,
}: SearchableListProps<T>): React.JSX.Element {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => getLabel(item).toLowerCase().includes(term));
  }, [items, search, getLabel]);

  return (
    <div className={cn('space-y-4', className)}>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className='h-8 text-xs'
      />

      <div className='space-y-2'>
        <div className='flex justify-between items-center px-1'>
          <div className='flex items-center gap-2'>
            <Hint uppercase variant='muted' className='font-semibold'>
              {search ? 'Results' : 'Available Items'}
            </Hint>
            {showCount && (
              <Badge variant='secondary' className='text-[9px]'>
                {selectedIds.length} {countLabel}
              </Badge>
            )}
          </div>
          {extraActions}
        </div>

        <Card
          variant='glass'
          padding='none'
          className={cn(
            'overflow-y-auto p-2 divide-y divide-white/5',
            maxHeight,
            listClassName
          )}
        >
          {filteredItems.length === 0 ? (
            <div className='py-8 text-center text-xs text-gray-600 italic'>
              {emptyMessage}
            </div>
          ) : (
            filteredItems.map((item) => {
              const id = getId(item);
              const checked = selectedIds.includes(id);
              return (
                <label
                  key={id}
                  className='flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer transition-colors group'
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(id)}
                  />
                  <div className='flex flex-1 items-center justify-between'>
                    {renderItem ? (
                      renderItem(item)
                    ) : (
                      <span className='text-sm text-gray-300 group-hover:text-white transition-colors'>
                        {getLabel(item)}
                      </span>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}
