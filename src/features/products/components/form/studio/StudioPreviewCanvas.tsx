'use client';

import { ArrowLeftRight, Eye, EyeOff, Undo2 } from 'lucide-react';
import React from 'react';

import { CenterPreviewProvider, useCenterPreviewContext, SplitVariantPreview } from '@/features/ai/public';
import { useProductStudioContext } from '@/features/products/context/ProductStudioContext';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/form-section';

const SPLIT_ZOOM_RESET = 1;
const SPLIT_ZOOM_STEP = 0.1;

const clampSplitZoom = (value: number): number => Math.max(0.1, Math.min(10, value));

const hasStudioPreviewSelection = (
  selectedVariant: unknown,
  variantImageSrc: string | null | undefined
): boolean => selectedVariant !== null && selectedVariant !== undefined && variantImageSrc !== null && variantImageSrc !== undefined && variantImageSrc !== '';

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

  return (
    <div className='relative h-[420px] overflow-hidden rounded border border-border/60 bg-card/30'>
      <StudioPreviewImage
        canCompareWithSource={canCompareWithSource}
        splitVariantView={splitVariantView}
        singleVariantView={singleVariantView}
        sourceImageSrc={sourceImageSrc}
        variantImageSrc={variantImageSrc}
      />

      <StudioPreviewComparisonControls
        canCompareWithSource={canCompareWithSource}
        splitVariantView={splitVariantView}
        singleVariantView={singleVariantView}
        setSingleVariantView={setSingleVariantView}
        setSplitVariantView={setSplitVariantView}
      />

      <StudioPreviewZoomControls
        visible={!splitVariantView && canCompareWithSource}
        setLeftSplitZoom={setLeftSplitZoom}
        setRightSplitZoom={setRightSplitZoom}
      />
    </div>
  );
}

export function StudioPreviewCanvas(): React.JSX.Element {
  const { selectedVariant, variantImageSrc } = useProductStudioContext();

  if (!hasStudioPreviewSelection(selectedVariant, variantImageSrc)) {
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

function StudioPreviewImage({
  canCompareWithSource,
  splitVariantView,
  singleVariantView,
  sourceImageSrc,
  variantImageSrc,
}: {
  canCompareWithSource: boolean;
  splitVariantView: boolean;
  singleVariantView: 'source' | 'variant';
  sourceImageSrc: string | null | undefined;
  variantImageSrc: string | null | undefined;
}): React.JSX.Element {
  if (canCompareWithSource && splitVariantView) return <SplitVariantPreview />;
  const imageSrc =
    canCompareWithSource && singleVariantView === 'source'
      ? sourceImageSrc ?? ''
      : variantImageSrc ?? '';

  return (
    <div className='relative h-full w-full overflow-hidden'>
      <img src={imageSrc} alt='Studio variant preview' className='h-full w-full object-contain' />
    </div>
  );
}

function StudioPreviewComparisonControls({
  canCompareWithSource,
  splitVariantView,
  singleVariantView,
  setSingleVariantView,
  setSplitVariantView,
}: {
  canCompareWithSource: boolean;
  splitVariantView: boolean;
  singleVariantView: 'source' | 'variant';
  setSingleVariantView: React.Dispatch<React.SetStateAction<'source' | 'variant'>>;
  setSplitVariantView: React.Dispatch<React.SetStateAction<boolean>>;
}): React.JSX.Element | null {
  if (!canCompareWithSource) return null;

  return (
    <div className='absolute bottom-2 left-2 z-20 flex items-center gap-2'>
      <Button
        size='xs'
        type='button'
        variant='outline'
        onClick={() => {
          setSplitVariantView(false);
          setSingleVariantView('source');
        }}
        className='h-7 w-7 bg-background/90 px-0 backdrop-blur'
        title='Go to source slot'
        aria-label='Go to source slot'
      >
        <Undo2 className='size-3.5' />
      </Button>
      <StudioPreviewToggleButton
        splitVariantView={splitVariantView}
        singleVariantView={singleVariantView}
        setSingleVariantView={setSingleVariantView}
      />
      <Button
        size='xs'
        type='button'
        variant='outline'
        onClick={() => setSplitVariantView(!splitVariantView)}
        className='h-7 w-7 bg-background/90 px-0 backdrop-blur'
        title={splitVariantView ? 'Exit split view' : 'Split view'}
        aria-label={splitVariantView ? 'Exit split view' : 'Split view'}
      >
        <ArrowLeftRight className='size-3.5' />
      </Button>
    </div>
  );
}

function StudioPreviewToggleButton({
  splitVariantView,
  singleVariantView,
  setSingleVariantView,
}: {
  splitVariantView: boolean;
  singleVariantView: 'source' | 'variant';
  setSingleVariantView: React.Dispatch<React.SetStateAction<'source' | 'variant'>>;
}): React.JSX.Element {
  const label = singleVariantView === 'variant' ? 'View source' : 'View variant';

  return (
    <Button
      size='xs'
      type='button'
      variant='outline'
      onClick={() => setSingleVariantView((prev) => (prev === 'variant' ? 'source' : 'variant'))}
      disabled={splitVariantView}
      className='h-7 w-7 bg-background/90 px-0 backdrop-blur'
      title={label}
      aria-label={label}
    >
      {singleVariantView === 'variant' ? <Eye className='size-3.5' /> : <EyeOff className='size-3.5' />}
    </Button>
  );
}

function StudioPreviewZoomControls({
  visible,
  setLeftSplitZoom,
  setRightSplitZoom,
}: {
  visible: boolean;
  setLeftSplitZoom: React.Dispatch<React.SetStateAction<number>>;
  setRightSplitZoom: React.Dispatch<React.SetStateAction<number>>;
}): React.JSX.Element | null {
  if (!visible) return null;

  return (
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
  );
}
