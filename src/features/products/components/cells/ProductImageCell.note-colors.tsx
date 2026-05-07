'use client';

import type React from 'react';

import { cn } from '@/shared/utils/ui-utils';

import { DEFAULT_NOTE_COLOR } from './ProductImageCell.helpers';
import type { ProductImageCellController } from './ProductImageCell.controller';

const NOTE_COLOR_SWATCHES = [
  { label: 'Sand', value: DEFAULT_NOTE_COLOR },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Rose', value: '#fecdd3' },
  { label: 'Violet', value: '#ddd6fe' },
  { label: 'Orange', value: '#fed7aa' },
] as const;

type ProductNoteColorPickerProps = {
  controller: Pick<
    ProductImageCellController,
    'draftNoteColor' | 'isSavingNote' | 'setDraftNoteColor'
  >;
};

export function ProductNoteColorPicker({
  controller,
}: ProductNoteColorPickerProps): React.JSX.Element {
  return (
    <div className='flex items-center gap-3 border-t border-black/10 px-6 py-3'>
      <span className='text-xs font-medium text-slate-700'>Color</span>
      <div className='flex flex-wrap items-center gap-1.5'>
        {NOTE_COLOR_SWATCHES.map((swatch) => {
          const isSelected = controller.draftNoteColor === swatch.value;
          return (
            <button
              key={swatch.value}
              type='button'
              aria-label={`Set note color ${swatch.label}`}
              aria-pressed={isSelected}
              title={swatch.label}
              disabled={controller.isSavingNote}
              className={cn(
                'h-6 w-6 rounded-full border border-black/20 shadow-sm transition-transform duration-150 ease-out hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60',
                isSelected && 'ring-2 ring-slate-900/50 ring-offset-2 ring-offset-transparent'
              )}
              style={{ backgroundColor: swatch.value }}
              onClick={() => controller.setDraftNoteColor(swatch.value)}
            />
          );
        })}
      </div>
    </div>
  );
}
