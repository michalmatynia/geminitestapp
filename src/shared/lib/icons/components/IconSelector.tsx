'use client';

import React, { useMemo } from 'react';

import type { GridPickerItem } from '@/shared/contracts/ui';
import { Tooltip } from '@/shared/ui/primitives.public';
import { GenericGridPicker } from '@/shared/ui/templates/pickers';
import { cn } from '@/shared/utils/ui-utils';

import { ICON_LIBRARY, type IconLibraryItem } from '../lib/icon-library';

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

type IconGridItem = GridPickerItem<string> & {
  item: IconLibraryItem;
};

export function IconSelector(props: IconSelectorProps): React.JSX.Element {
  const {
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
  } = props;

  const gridItems = useMemo<IconGridItem[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        label: item.label,
        item,
      })),
    [items]
  );

  return (
    <div className={cn('space-y-2', className)}>
      <GenericGridPicker<IconGridItem>
        items={gridItems}
        selectedId={value ?? undefined}
        onSelect={(item) => {
          if (value === item.id && allowClear) {
            onChange(null);
          } else {
            onChange(item.id);
          }
        }}
        columns={columns}
        searchable={showSearch}
        searchPlaceholder={searchPlaceholder}
        emptyState={<div className='text-sm text-gray-500'>{emptyLabel}</div>}
        className={gridClassName}
        renderItem={(item, selected) => {
          const IconComponent = item.item.icon;
          return (
            <Tooltip content={item.label} side='top'>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-md border transition cursor-pointer',
                  selected
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                    : 'border-border bg-gray-800 text-gray-400 hover:border-border/60 hover:text-gray-300',
                  buttonClassName
                )}
              >
                <IconComponent className={cn('h-5 w-5', iconClassName)} />
              </div>
            </Tooltip>
          );
        }}
      />
      {helperText && <div className='text-[11px] text-gray-400'>{helperText}</div>}
    </div>
  );
}
