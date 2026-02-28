'use client';

import React from 'react';
import { Button, FormSection } from '@/shared/ui';
import { SplitVariantPreview } from '@/features/ai/image-studio/components/center-preview/SplitVariantPreview';
import { SplitViewControls } from '@/features/ai/image-studio/components/center-preview/SplitViewControls';
import {
  CenterPreviewProvider,
  useCenterPreviewContext,
} from '@/features/ai/image-studio/components/center-preview/CenterPreviewContext';
import { useProductStudioContext } from '../../../context/ProductStudioContext';

function StudioPreviewCanvasInner(): React.JSX.Element {
  const { variantImageSrc, sourceImageSrc, canCompareWithSource } = useProductStudioContext();

  const {
    singleVariantView,
    setSingleVariantView,
    splitVariantView,
    setSplitVariantView,
    setLeftSplitZoom,
    setRightSplitZoom,
  } = useCenterPreviewContext();

  const SPLIT_ZOOM_RESET = 1;
  const SPLIT_ZOOM_STEP = 0.1;

  const clampSplitZoom = (val: number) => Math.max(0.1, Math.min(10, val));

  return (
    <div className='relative h-[420px] overflow-hidden rounded border border-border/60 bg-card/30'>
      {canCompareWithSource && splitVariantView ? (
        <SplitVariantPreview
          sourceSlotImageSrc={sourceImageSrc as string}
          workingSlotImageSrc={variantImageSrc as string}
        />
      ) : (
        <div className='relative h-full w-full overflow-hidden'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              canCompareWithSource && singleVariantView === 'source'
                ? (sourceImageSrc as string)
                : (variantImageSrc as string)
            }
            alt='Studio variant preview'
            className='h-full w-full object-contain'
          />
        </div>
      )}

      {canCompareWithSource && (
        <SplitViewControls
          canCompare={canCompareWithSource}
          onGoToSourceSlot={() => {
            setSplitVariantView(false);
            setSingleVariantView('source');
          }}
          onToggleSourceVariantView={() =>
            setSingleVariantView((prev) => (prev === 'variant' ? 'source' : 'variant'))
          }
          onToggleSplitVariantView={() => setSplitVariantView(!splitVariantView)}
        />
      )}

      {!splitVariantView && canCompareWithSource && (
        <div className='absolute right-2 top-2 z-20 flex items-center gap-1 rounded bg-black/65 px-2 py-1 text-[10px] text-gray-100'>
          <Button
            size='xs'
            variant='outline'
            className='h-5 w-5 px-0 text-[10px]'
            onClick={() => {
              setLeftSplitZoom((prev) => clampSplitZoom(prev - SPLIT_ZOOM_STEP));
              setRightSplitZoom((prev) => clampSplitZoom(prev - SPLIT_ZOOM_STEP));
            }}
          >
            -
          </Button>
          <Button
            size='xs'
            variant='outline'
            className='h-5 w-5 px-0 text-[10px]'
            onClick={() => {
              setLeftSplitZoom((prev) => clampSplitZoom(prev + SPLIT_ZOOM_STEP));
              setRightSplitZoom((prev) => clampSplitZoom(prev + SPLIT_ZOOM_STEP));
            }}
          >
            +
          </Button>
          <Button
            size='xs'
            variant='outline'
            className='h-5 px-1 text-[10px]'
            onClick={() => {
              setLeftSplitZoom(SPLIT_ZOOM_RESET);
              setRightSplitZoom(SPLIT_ZOOM_RESET);
            }}
          >
            100%
          </Button>
        </div>
      )}
    </div>
  );
}

export function StudioPreviewCanvas(): React.JSX.Element {
  const { selectedVariant, variantImageSrc } = useProductStudioContext();

  if (!selectedVariant || !variantImageSrc) {
    return (
      <FormSection
        title='Studio Preview'
        description='Use split mode to compare source and generated output.'
      >
        <p className='text-sm text-gray-400'>
          Select a generated variant to open the preview canvas.
        </p>
      </FormSection>
    );
  }

  return (
    <FormSection
      title='Studio Preview'
      description='Use split mode to compare source and generated output.'
    >
      <CenterPreviewProvider>
        <StudioPreviewCanvasInner />
      </CenterPreviewProvider>
    </FormSection>
  );
}
