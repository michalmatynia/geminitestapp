'use client';

import React from 'react';

import { useProductStudioContext } from '@/features/products/context/ProductStudioContext';
import type { ProductImageSlotPreview } from '@/features/products/context/ProductStudioContext.types';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/form-section';
import { StatusBadge } from '@/shared/ui/status-badge';

import { cn } from '@/shared/utils/ui-utils';

type StudioSourceImageCardProps = {
  convertingLinkImageIndex: number | null;
  isSelected: boolean;
  onConvertLink: (event: React.MouseEvent<HTMLButtonElement>, index: number) => void;
  onSelect: (index: number) => void;
  preview: ProductImageSlotPreview;
};

function StudioLinkBadge(): React.JSX.Element {
  return (
    <div className='absolute left-1 top-1 z-20'>
      <StatusBadge
        status='Link'
        variant='warning'
        size='sm'
        title='Remote link image. Convert it to a product file before Studio operations.'
      />
    </div>
  );
}

function StudioSourceImageCard({
  convertingLinkImageIndex,
  isSelected,
  onConvertLink,
  onSelect,
  preview,
}: StudioSourceImageCardProps): React.JSX.Element {
  const isLink = preview.sourceType === 'link';
  return (
    <div
      className={cn(
        'group relative h-32 overflow-hidden rounded border p-1 transition',
        isSelected
          ? 'border-emerald-400/80 bg-emerald-500/10'
          : 'border-border/60 hover:border-emerald-400/40'
      )}>
      <button
        type='button'
        onClick={() => onSelect(preview.index)}
        className='relative h-full w-full rounded text-left'
        aria-label={preview.label}
        title={preview.label}>
        <img
          src={preview.src}
          alt={preview.label}
          className='h-full w-full rounded object-contain bg-black/20'
        />
      </button>
      {isLink ? <StudioLinkBadge /> : null}
      {isLink ? (
        <Button
          type='button'
          size='xs'
          variant='outline'
          onClick={(event) => onConvertLink(event, preview.index)}
          disabled={convertingLinkImageIndex !== null}
          loading={convertingLinkImageIndex === preview.index}
          className='absolute right-1 top-1 z-20 h-6 px-1.5 text-[10px] border-amber-500/40 bg-black/70 text-amber-100 hover:bg-amber-500/20'>
          Convert
        </Button>
      ) : null}
      <div className='absolute bottom-0 left-0 right-0 p-1 flex items-center justify-between text-[11px] text-gray-300 z-10'>
        <span className='bg-black/50 px-1 rounded'>{preview.label}</span>
        {isSelected && <StatusBadge status='Selected' variant='active' size='sm' />}
      </div>
    </div>
  );
}

export function StudioSourceImageSelector(): React.JSX.Element {
  const context = useProductStudioContext();
  const handleConvertLinkClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    index: number
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    context.handleConvertLinkImageToFile(index).catch((): undefined => undefined);
  };

  return (
    <FormSection title='Product Images' description='Select which product image slot should be generated.'>
      {context.imageSlotPreviews.length === 0 ? (
        <p className='text-sm text-gray-400'>No product images found.</p>
      ) : (
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5'>
          {context.imageSlotPreviews.map((preview) => (
            <StudioSourceImageCard
              key={preview.index}
              convertingLinkImageIndex={context.convertingLinkImageIndex}
              isSelected={preview.index === context.selectedImageIndex}
              onConvertLink={handleConvertLinkClick}
              onSelect={context.setSelectedImageIndex}
              preview={preview}
            />
          ))}
        </div>
      )}
    </FormSection>
  );
}
