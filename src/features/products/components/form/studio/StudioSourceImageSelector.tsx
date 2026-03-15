'use client';

import Image from 'next/image';
import React from 'react';

import { useProductStudioContext } from '@/features/products/context/ProductStudioContext';
import { FormSection, StatusBadge, Button } from '@/features/products/ui';
import { cn } from '@/shared/utils';

export function StudioSourceImageSelector(): React.JSX.Element {
  const { imageSlotPreviews, selectedImageIndex, setSelectedImageIndex } =
    useProductStudioContext();

  return (
    <FormSection
      title='Product Images'
      description='Select which product image slot should be generated.'
    >
      {imageSlotPreviews.length === 0 ? (
        <p className='text-sm text-gray-400'>No uploaded product images found.</p>
      ) : (
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5'>
          {imageSlotPreviews.map((preview) => {
            const isSelected = preview.index === selectedImageIndex;
            return (
              <Button
                key={preview.index}
                variant='ghost'
                onClick={() => setSelectedImageIndex(preview.index)}
                className={cn(
                  'group relative overflow-hidden rounded border p-1 text-left transition h-32 hover:bg-transparent font-normal',
                  isSelected
                    ? 'border-emerald-400/80 bg-emerald-500/10'
                    : 'border-border/60 hover:border-emerald-400/40'
                )}
                aria-label={preview.label}
                title={preview.label}>
                <Image
                  src={preview.src}
                  alt={preview.label}
                  fill
                  className='rounded object-contain bg-black/20'
                />
                <div className='absolute bottom-0 left-0 right-0 p-1 flex items-center justify-between text-[11px] text-gray-300 z-10'>
                  <span className='bg-black/50 px-1 rounded'>{preview.label}</span>
                  {isSelected && <StatusBadge status='Selected' variant='active' size='sm' />}
                </div>
              </Button>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}
