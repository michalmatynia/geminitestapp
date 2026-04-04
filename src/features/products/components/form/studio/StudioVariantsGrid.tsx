'use client';

import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import React, { useMemo } from 'react';

import { getImageStudioSlotImageSrc } from '@/features/ai/image-studio/image-src';
import { useProductStudioContext } from '@/features/products/context/ProductStudioContext';
import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/form-section';
import { LoadingState } from '@/shared/ui/LoadingState';
import { StatusBadge } from '@/shared/ui/status-badge';
import { GenericGridPicker } from '@/shared/ui/templates/pickers/GenericGridPicker';

import { cn } from '@/shared/utils';
import type { GridPickerItem } from '@/shared/contracts/ui';
import type { ImageStudioSlotDto as ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

type StudioVariantGridItem = GridPickerItem<ImageStudioSlotRecord | null> & {
  metadata?: {
    isPending?: boolean;
  };
};

export function StudioVariantsGrid(): React.JSX.Element {
  const context = useProductStudioContext();
  const {
    variants,
    variantsLoading,
    selectedVariant,
    setSelectedVariantSlotId,
    deletingVariantId,
    handleDeleteVariant,
    pendingVariantPlaceholderCount,
    sending,
    accepting,
  } = context;

  const { imageExternalBaseUrl: productImagesExternalBaseUrl } = useProductSettings();

  const gridItems = useMemo((): StudioVariantGridItem[] => {
    const items: StudioVariantGridItem[] = variants.map((slot) => ({
      id: slot.id,
      label: slot.name ?? 'Variant',
      value: slot,
    }));

    // Add pending placeholders as items
    const pendingItems: StudioVariantGridItem[] = Array.from({
      length: pendingVariantPlaceholderCount,
    }).map((_, i) => ({
      id: `pending-${i}`,
      label: 'Syncing...',
      disabled: true,
      metadata: { isPending: true },
    }));

    return [...items, ...pendingItems];
  }, [variants, pendingVariantPlaceholderCount]);

  return (
    <FormSection title='Generated Variants' description='Click a generated card to preview it.'>
      {variantsLoading ? (
        <LoadingState message='Loading variants...' />
      ) : gridItems.length === 0 ? (
        <p className='text-sm text-gray-400'>No generations yet for the selected product image.</p>
      ) : (
        <GenericGridPicker
          items={gridItems}
          selectedId={selectedVariant?.id}
          onSelect={(item) => {
            if (item.id && !item.metadata?.isPending) {
              setSelectedVariantSlotId(item.id);
            }
          }}
          gridClassName='grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
          gap='8px'
          renderItem={(item, isSelected) => {
            if (item.metadata?.['isPending']) {
              return (
                <div className='space-y-1 rounded border border-border/60 p-1'>
                  <div className='flex h-24 w-full items-center justify-center rounded bg-black/20 text-xs text-gray-500'>
                    <LoadingState message='Syncing...' size='xs' />
                  </div>
                  <div className='px-0.5 text-[10px] text-gray-500'>Waiting for sequence output</div>
                </div>
              );
            }

            const slot = item.value;
            if (!slot) {
              return null;
            }
            const src = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl);
            const isDeleting = deletingVariantId === slot.id;

            return (
              <div className='space-y-1'>
                <div
                  className={cn(
                    'group relative w-full rounded border p-1 text-left transition h-32 hover:bg-transparent font-normal',
                    isSelected
                      ? 'border-blue-400/80 bg-blue-500/10'
                      : 'border-border/60 hover:border-blue-400/40'
                  )}
                >
                  {src ? (
                    <Image
                      src={src}
                      alt={slot.name ?? 'Variant'}
                      fill
                      className='rounded object-contain bg-black/20'
                    />
                  ) : (
                    <div className='flex h-24 w-full items-center justify-center rounded bg-black/20 text-xs text-gray-500'>
                      No preview
                    </div>
                  )}
                  <div className='absolute bottom-0 left-0 right-0 p-1 space-y-0.5 text-[11px] text-gray-300 z-10'>
                    <div className='flex items-center justify-between'>
                      <span className='truncate bg-black/50 px-1 rounded'>
                        {slot.name ?? 'Variant'}
                      </span>
                      {isSelected && <StatusBadge status='Selected' variant='info' size='sm' />}
                    </div>
                  </div>
                </div>
                <Button
                  size='xs'
                  variant='outline'
                  className='h-6 w-full border-red-500/40 text-[10px] text-red-200 hover:bg-red-500/10'
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDeleteVariant(slot);
                  }}
                  disabled={deletingVariantId !== null || sending || accepting}
                  loading={isDeleting}
                >
                  <Trash2 className='mr-1 size-3' /> Delete
                </Button>
              </div>
            );
          }}
        />
      )}
    </FormSection>
  );
}
