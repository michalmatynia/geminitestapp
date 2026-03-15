'use client';

import { Locate } from 'lucide-react';
import React from 'react';

import { useMaskingState } from '@/features/ai/image-studio/context/MaskingContext';
import { useSlotsState } from '@/features/ai/image-studio/context/SlotsContext';
import { useUiState, useUiActions } from '@/features/ai/image-studio/context/UiContext';
import { useVersionGraphState } from '@/features/ai/image-studio/context/VersionGraphContext';
import { Viewer3D } from '@/features/viewer3d';
import { VectorDrawingCanvas, VectorDrawingProvider } from '@/shared/lib/vector-drawing';
import { Button, LoadingState } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { SplitVariantPreview } from '../SplitVariantPreview';
import { SplitViewControls } from '../SplitViewControls';
import { useCenterPreviewCanvasContext } from './CenterPreviewCanvasContext';

export function CenterPreviewCanvas(): React.JSX.Element {
  const {
    vectorContextValue,
    projectCanvasSize,
    activeCanvasImageSrc,
    liveMaskShapes,
    splitVariantView,
    canCompareSelectedVariants,
    compareVariantImageA,
    compareVariantImageB,
    canCompareWithSource,
    sourceSlotImageSrc,
    workingSlotImageSrc,
    isCompositeSlot,
    canNavigateToSource,
    canRevealLoadedCardInTree,
    onPreviewCanvasCropRectChange,
    onPreviewCanvasImageFrameChange,
    onGoToSourceSlot,
    onRevealInTreeFromCanvas,
  } = useCenterPreviewCanvasContext();

  const {
    maskPreviewEnabled,
    centerGuidesEnabled,
    canvasSelectionEnabled,
    imageTransformMode,
    canvasImageOffset,
    canvasBackgroundLayerEnabled,
    canvasBackgroundColor,
  } = useUiState();
  const { setCanvasImageOffset } = useUiActions();
  const { workingSlot, previewMode, captureRef } = useSlotsState();
  const { maskInvert, maskFeather } = useMaskingState();
  const { compositeLoading } = useVersionGraphState();

  const previewCanvasClassName = cn('h-full', 'bg-slate-900', 'overscroll-contain');
  const baseCanvasWidthPx = projectCanvasSize?.width ?? 1024;
  const baseCanvasHeightPx = projectCanvasSize?.height ?? 1024;
  const imageMoveEnabled = imageTransformMode === 'move';
  const previewCanvasVectorContextValue = React.useMemo(
    () => ({
      ...vectorContextValue,
      shapes: liveMaskShapes,
      imageSrc: activeCanvasImageSrc,
    }),
    [activeCanvasImageSrc, liveMaskShapes, vectorContextValue]
  );

  return (
    <div className='sticky top-0 z-20 relative min-h-0 overflow-hidden bg-card/40'>
      {previewMode === '3d' && workingSlot?.asset3dId ? (
        <Viewer3D
          modelUrl={`/api/assets3d/${workingSlot.asset3dId}/file`}
          allowUserControls
          captureRef={captureRef}
          className='h-full w-full'
        />
      ) : splitVariantView &&
        canCompareSelectedVariants &&
        compareVariantImageA &&
        compareVariantImageB ? (
          <SplitVariantPreview />
        ) : splitVariantView &&
          canCompareWithSource &&
          sourceSlotImageSrc &&
          workingSlotImageSrc ? (
            <SplitVariantPreview />
          ) : (
            <div className={previewCanvasClassName}>
              <VectorDrawingProvider value={previewCanvasVectorContextValue}>
                <VectorDrawingCanvas
                  baseCanvasWidthPx={baseCanvasWidthPx}
                  baseCanvasHeightPx={baseCanvasHeightPx}
                  maskPreviewEnabled={maskPreviewEnabled}
                  maskPreviewInvert={maskInvert}
                  maskPreviewFeather={maskFeather}
                  showCenterGuides={centerGuidesEnabled}
                  selectionEnabled={canvasSelectionEnabled}
                  imageMoveEnabled={imageMoveEnabled}
                  imageOffset={canvasImageOffset}
                  onImageOffsetChange={(offset) => {
                    setCanvasImageOffset(offset);
                  }}
                  backgroundLayerEnabled={canvasBackgroundLayerEnabled}
                  backgroundColor={canvasBackgroundColor}
                  onViewCropRectChange={onPreviewCanvasCropRectChange}
                  onImageContentFrameChange={onPreviewCanvasImageFrameChange}
                />
              </VectorDrawingProvider>
            </div>
          )}

      <div className='absolute bottom-4 left-4 z-30'>
        <SplitViewControls />
      </div>

      <div className='absolute bottom-4 right-4 z-30 flex gap-2'>
        {canNavigateToSource && (
          <Button
            variant='secondary'
            size='sm'
            className='h-8 rounded-full bg-slate-900/60 backdrop-blur-md border-white/10'
            onClick={onGoToSourceSlot}
          >
            Go to Source
          </Button>
        )}
        {canRevealLoadedCardInTree && (
          <Button
            variant='secondary'
            size='sm'
            className='h-8 w-8 p-0 rounded-full bg-slate-900/60 backdrop-blur-md border-white/10'
            onClick={onRevealInTreeFromCanvas}
            title='Reveal in Tree'
            aria-label={'Reveal in Tree'}>
            <Locate className='size-4' />
          </Button>
        )}
      </div>

      {isCompositeSlot && compositeLoading && (
        <div className='absolute inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[2px]'>
          <div className='flex flex-col items-center gap-3 rounded-lg bg-slate-900/80 p-6 border border-white/10 shadow-2xl'>
            <LoadingState size='md' message='' className='p-0' />
            <div className='text-xs font-medium text-emerald-200 uppercase tracking-widest'>
              Compositing...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
