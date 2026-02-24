'use client';

import React from 'react';
import { FormSection, StatusBadge } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useProductStudioContext } from '../../../context/ProductStudioContext';

export function StudioSourceImageSelector(): React.JSX.Element {
  const { imageSlotPreviews, selectedImageIndex, setSelectedImageIndex } = useProductStudioContext();

  return (
    <FormSection title='Product Images' description='Select which product image slot should be generated.'>
      {imageSlotPreviews.length === 0 ? (
        <p className='text-sm text-gray-400'>No uploaded product images found.</p>
      ) : (
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5'>
          {imageSlotPreviews.map((preview) => {
            const isSelected = preview.index === selectedImageIndex;
            return (
              <button
                key={preview.index}
                type='button'
                onClick={() => setSelectedImageIndex(preview.index)}
                className={cn(
                  'group relative overflow-hidden rounded border p-1 text-left transition',
                  isSelected ? 'border-emerald-400/80 bg-emerald-500/10' : 'border-border/60 hover:border-emerald-400/40'
                )}
              >
                <img src={preview.src} alt={preview.label} className='h-24 w-full rounded object-contain bg-black/20' />
                <div className='mt-1 flex items-center justify-between text-[11px] text-gray-300'>
                  <span>{preview.label}</span>
                  {isSelected && <StatusBadge status='Selected' variant='active' size='sm' />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}
