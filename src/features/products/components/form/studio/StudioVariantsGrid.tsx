'use client';

import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import React, { useMemo } from 'react';

import { getImageStudioSlotImageSrc } from '@/features/ai/public';
import { useProductStudioContext } from '@/features/products/context/ProductStudioContext';
import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/form-section';
import { LoadingState } from '@/shared/ui/LoadingState';
import { StatusBadge } from '@/shared/ui/status-badge';
import { GenericGridPicker } from '@/shared/ui/templates/pickers/GenericGridPicker';

import { cn } from '@/shared/utils/ui-utils';
import type { GridPickerItem } from '@/shared/contracts/ui/pickers';
import type { ImageStudioSlotDto as ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

type StudioVariantGridItem = GridPickerItem<ImageStudioSlotRecord | null> & {
  metadata?: {
    isPending?: boolean;
    generationProgress?: { arrived: number; total: number };
  };
};

const buildStudioVariantGridItems = ({
  pendingExpectedOutputs,
  pendingVariantPlaceholderCount,
  variants,
}: {
  pendingExpectedOutputs: number;
  pendingVariantPlaceholderCount: number;
  variants: ImageStudioSlotRecord[];
}): StudioVariantGridItem[] => {
  const items: StudioVariantGridItem[] = variants.map((slot) => ({
    id: slot.id,
    label: slot.name ?? 'Variant',
    value: slot,
  }));
  const arrived = Math.max(0, pendingExpectedOutputs - pendingVariantPlaceholderCount);
  const pendingItems: StudioVariantGridItem[] = Array.from({
    length: pendingVariantPlaceholderCount,
  }).map((_, index) => ({
    id: `pending-${index}`,
    label: 'Generating...',
    disabled: true,
    metadata: {
      isPending: true,
      generationProgress: { arrived, total: pendingExpectedOutputs },
    },
  }));
  return [...items, ...pendingItems];
};

function PendingVariantCard({
  arrived,
  total,
}: {
  arrived: number;
  total: number;
}): React.JSX.Element {
  const progressLabel =
    total > 0 ? `${arrived} of ${total} generated` : 'Generating...';
  return (
    <div className='space-y-1 rounded border border-border/60 p-1'>
      <div className='flex h-24 w-full items-center justify-center rounded bg-black/20 text-xs text-gray-500'>
        <LoadingState message='Generating...' size='xs' />
      </div>
      <div className='px-0.5 text-[10px] text-gray-500'>{progressLabel}</div>
    </div>
  );
}

function VariantPreviewImage({
  slot,
  src,
}: {
  slot: ImageStudioSlotRecord;
  src: string | null;
}): React.JSX.Element {
  if (src === null || src === '') {
    return (
      <div className='flex h-24 w-full items-center justify-center rounded bg-black/20 text-xs text-gray-500'>
        No preview
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={slot.name ?? 'Variant'}
      fill
      className='rounded object-contain bg-black/20'
    />
  );
}

function VariantGridCard({
  accepting,
  deletingVariantId,
  handleDeleteVariant,
  isSelected,
  productImagesExternalBaseUrl,
  sending,
  slot,
}: {
  accepting: boolean;
  deletingVariantId: string | null;
  handleDeleteVariant: (slot: ImageStudioSlotRecord) => void | Promise<void>;
  isSelected: boolean;
  productImagesExternalBaseUrl: string | null;
  sending: boolean;
  slot: ImageStudioSlotRecord;
}): React.JSX.Element {
  const src = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl);
  const isDeleting = deletingVariantId === slot.id;

  return (
    <div className='space-y-1'>
      <div
        className={cn(
          'group relative w-full rounded border p-1 text-left transition h-32 hover:bg-transparent font-normal',
          isSelected ? 'border-blue-400/80 bg-blue-500/10' : 'border-border/60 hover:border-blue-400/40'
        )}
      >
        <VariantPreviewImage slot={slot} src={src} />
        <div className='absolute bottom-0 left-0 right-0 p-1 space-y-0.5 text-[11px] text-gray-300 z-10'>
          <div className='flex items-center justify-between'>
            <span className='truncate bg-black/50 px-1 rounded'>{slot.name ?? 'Variant'}</span>
            {isSelected ? <StatusBadge status='Selected' variant='info' size='sm' /> : null}
          </div>
        </div>
      </div>
      <Button
        size='xs'
        variant='outline'
        className='h-6 w-full border-red-500/40 text-[10px] text-red-200 hover:bg-red-500/10'
        onClick={(event) => {
          event.stopPropagation();
          void handleDeleteVariant(slot);
        }}
        disabled={deletingVariantId !== null || sending || accepting}
        loading={isDeleting}
      >
        <Trash2 className='mr-1 size-3' /> Delete
      </Button>
    </div>
  );
}

function StudioVariantsGridPicker({
  accepting,
  deletingVariantId,
  gridItems,
  handleDeleteVariant,
  productImagesExternalBaseUrl,
  selectedVariantId,
  sending,
  setSelectedVariantSlotId,
}: {
  accepting: boolean;
  deletingVariantId: string | null;
  gridItems: StudioVariantGridItem[];
  handleDeleteVariant: (slot: ImageStudioSlotRecord) => void | Promise<void>;
  productImagesExternalBaseUrl: string | null;
  selectedVariantId: string | undefined;
  sending: boolean;
  setSelectedVariantSlotId: (slotId: string) => void;
}): React.JSX.Element {
  return (
    <GenericGridPicker
      items={gridItems}
      selectedId={selectedVariantId}
      onSelect={(item) => {
        if (item.metadata?.isPending !== true) setSelectedVariantSlotId(item.id);
      }}
      gridClassName='grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
      gap='8px'
      renderItem={(item, isSelected) => {
        if (item.value === undefined) return null;
        if (item.metadata?.isPending === true)
          return (
            <PendingVariantCard
              arrived={item.metadata.generationProgress?.arrived ?? 0}
              total={item.metadata.generationProgress?.total ?? 0}
            />
          );
        if (item.value === null) return null;
        return (
          <VariantGridCard
            accepting={accepting}
            deletingVariantId={deletingVariantId}
            handleDeleteVariant={handleDeleteVariant}
            isSelected={isSelected}
            productImagesExternalBaseUrl={productImagesExternalBaseUrl}
            sending={sending}
            slot={item.value}
          />
        );
      }}
    />
  );
}

export function StudioVariantsGrid(): React.JSX.Element {
  const context = useProductStudioContext();
  const {
    variants,
    variantsLoading,
    selectedVariant,
    setSelectedVariantSlotId,
    deletingVariantId,
    handleDeleteVariant,
    pendingExpectedOutputs,
    pendingVariantPlaceholderCount,
    sending,
    accepting,
  } = context;

  const { imageExternalBaseUrl: productImagesExternalBaseUrl } = useProductSettings();

  const gridItems = useMemo(
    (): StudioVariantGridItem[] =>
      buildStudioVariantGridItems({ pendingExpectedOutputs, pendingVariantPlaceholderCount, variants }),
    [pendingExpectedOutputs, pendingVariantPlaceholderCount, variants]
  );

  let content: React.JSX.Element;
  if (variantsLoading && gridItems.length === 0) {
    content = <LoadingState message='Loading variants...' />;
  } else if (gridItems.length === 0) {
    content = <p className='text-sm text-gray-400'>No generations yet for the selected product image.</p>;
  } else {
    content = (
      <StudioVariantsGridPicker
        accepting={accepting}
        deletingVariantId={deletingVariantId}
        gridItems={gridItems}
        handleDeleteVariant={handleDeleteVariant}
        productImagesExternalBaseUrl={productImagesExternalBaseUrl}
        selectedVariantId={selectedVariant?.id}
        sending={sending}
        setSelectedVariantSlotId={setSelectedVariantSlotId}
      />
    );
  }

  return (
    <FormSection title='Generated Variants' description='Click a generated card to preview it.'>
      {content}
    </FormSection>
  );
}
