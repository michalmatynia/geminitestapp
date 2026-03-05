'use client';

import React from 'react';

import { cn } from '@/shared/utils';
import { Checkbox, Hint, Label } from '@/shared/ui';

type SelectionChecklistItem = {
  id: string;
  label: React.ReactNode;
  disabled?: boolean | undefined;
};

type RenderSelectionChecklistGridParams = {
  items: SelectionChecklistItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyMessage: string;
  className?: string | undefined;
};

export function renderSelectionChecklistGrid({
  items,
  selectedIds,
  onToggle,
  emptyMessage,
  className,
}: RenderSelectionChecklistGridParams): React.ReactNode {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-border bg-card/50 p-3',
        className
      )}
    >
      {items.length === 0 ? (
        <Hint size='xs' italic className='col-span-2 py-4 text-center'>
          {emptyMessage}
        </Hint>
      ) : (
        items.map((item) => {
          const isChecked = selectedIds.includes(item.id);
          const handleCheckedChange = (): void => {
            onToggle(item.id);
          };

          return (
            <Label
              key={item.id}
              className='flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors'
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={handleCheckedChange}
                disabled={item.disabled}
              />
              <span className='text-xs text-gray-200'>{item.label}</span>
            </Label>
          );
        })
      )}
    </div>
  );
}
