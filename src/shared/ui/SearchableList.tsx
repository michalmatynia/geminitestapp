'use client';

import React, { useState, useMemo } from 'react';

import type { SearchableListProps } from '@/shared/contracts/ui/controls';
import { cn } from '@/shared/utils/ui-utils';

import { Badge } from './badge';
import { Card } from './card';
import { Checkbox } from './checkbox';
import { Hint } from './Hint';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from './layout';
import { SearchInput } from './search-input';

export type { SearchableListProps };

export function SearchableList<T>(props: SearchableListProps<T>): React.JSX.Element {
  const {
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
  } = props;

  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => getLabel(item).toLowerCase().includes(term));
  }, [items, search, getLabel]);

  const liveSummary = useMemo(() => {
    const baseLabel = search
      ? `${filteredItems.length} result${filteredItems.length === 1 ? '' : 's'} for "${search}".`
      : `${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'} available.`;
    const selectionLabel = showCount
      ? `${selectedIds.length} ${countLabel} selected.`
      : '';
    return `${baseLabel} ${selectionLabel}`.trim();
  }, [filteredItems.length, search, selectedIds.length, showCount, countLabel]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className='sr-only' role='status' aria-live='polite' aria-atomic='true'>
        {liveSummary}
      </div>
      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch('')}
        placeholder={searchPlaceholder}
        size='sm'
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
          className={cn('overflow-y-auto p-2 divide-y divide-white/5', maxHeight, listClassName)}
        >
          {filteredItems.length === 0 ? (
            <div className='py-8 text-center text-xs text-gray-600 italic'>{emptyMessage}</div>
          ) : (
            filteredItems.map((item: any) => {
              const id = getId(item);
              const checked = selectedIds.includes(id);
              return (
                <label
                  key={id}
                  className={`${UI_CENTER_ROW_SPACED_CLASSNAME} p-2 hover:bg-white/5 cursor-pointer transition-colors group`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => onToggle(id)} />
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
