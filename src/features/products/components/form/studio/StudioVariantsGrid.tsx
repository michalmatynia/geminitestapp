'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { Button, FormSection, LoadingState, StatusBadge } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useProductStudioContext } from '../../../context/ProductStudioContext';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { getImageStudioSlotImageSrc } from '@/features/ai/image-studio/image-src';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/shared/lib/products/constants';

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

  const settingsStore = useSettingsStore();
  const settingsStoreRef = useRef(settingsStore);
  settingsStoreRef.current = settingsStore;
  const productImagesExternalBaseUrl =
    settingsStoreRef.current.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  return (
    <FormSection title='Generated Variants' description='Click a generated card to preview it.'>
      {variantsLoading ? (
        <LoadingState message='Loading variants...' />
      ) : variants.length === 0 && pendingVariantPlaceholderCount === 0 ? (
        <p className='text-sm text-gray-400'>No generations yet for the selected product image.</p>
      ) : (
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5'>
          {variants.map((slot) => {
            const src = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl);
            const isSelected = slot.id === selectedVariant?.id;
            const isDeleting = deletingVariantId === slot.id;

            return (
              <div key={slot.id} className='space-y-1'>
                <Button
                  variant='ghost'
                  onClick={() => {
                    if (slot.id) setSelectedVariantSlotId(slot.id);
                  }}
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
                </Button>
                <Button
                  size='xs'
                  variant='outline'
                  className='h-6 w-full border-red-500/40 text-[10px] text-red-200 hover:bg-red-500/10'
                  onClick={() => void handleDeleteVariant(slot)}
                  disabled={deletingVariantId !== null || sending || accepting}
                  loading={isDeleting}
                >
                  <Trash2 className='mr-1 size-3' /> Delete
                </Button>
              </div>
            );
          })}
          {Array.from({ length: pendingVariantPlaceholderCount }).map((_, i) => (
            <div key={`pending-${i}`} className='space-y-1 rounded border border-border/60 p-1'>
              <div className='flex h-24 w-full items-center justify-center rounded bg-black/20 text-xs text-gray-500'>
                <LoadingState message='Syncing...' size='xs' />
              </div>
              <div className='px-0.5 text-[10px] text-gray-500'>Waiting for sequence output</div>
            </div>
          ))}
        </div>
      )}
    </FormSection>
  );
}
