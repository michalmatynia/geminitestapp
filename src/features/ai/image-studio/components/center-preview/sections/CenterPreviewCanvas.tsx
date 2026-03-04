'use client';

import React from 'react';
import { Locate } from 'lucide-react';
import { VectorDrawingCanvas, VectorDrawingProvider } from '@/shared/lib/vector-drawing';
import { Viewer3D } from '@/features/viewer3d/components/Viewer3D';
import { Button, LoadingState } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { SplitVariantPreview } from '../SplitVariantPreview';
import { SplitViewControls } from '../SplitViewControls';
import { useUiState, useUiActions } from '../../../context/UiContext';
import { useSlotsState } from '../../../context/SlotsContext';
import { useVersionGraphState } from '../../../context/VersionGraphContext';
import { useMaskingState } from '../../../context/MaskingContext';
import type { VectorDrawingContextValue } from '@/shared/lib/vector-drawing';
import type { VectorShape } from '@/shared/contracts/vector';
import type {
  PreviewCanvasCropRect,
  PreviewCanvasImageContentFrame,
} from '../../../context/UiContext';

export interface CenterPreviewCanvasProps {
  vectorContextValue: VectorDrawingContextValue;
  projectCanvasSize: { width: number; height: number } | null;
  activeCanvasImageSrc: string | null;
  liveMaskShapes: VectorShape[];
  splitVariantView: boolean;
  canCompareSelectedVariants: boolean;
  compareVariantImageA: string | null;
  compareVariantImageB: string | null;
  canCompareWithSource: boolean;
  sourceSlotImageSrc: string | null;
  workingSlotImageSrc: string | null;
  isCompositeSlot: boolean;
  canNavigateToSource: boolean;
  canRevealLoadedCardInTree: boolean;
  handlePreviewCanvasCropRectChange: (rect: PreviewCanvasCropRect | null) => void;
  handlePreviewCanvasImageFrameChange: (frame: PreviewCanvasImageContentFrame | null) => void;
  handleGoToSourceSlot: () => void;
  handleToggleSourceVariantView: () => void;
  handleToggleSplitVariantView: () => void;
  handleRevealInTreeFromCanvas: () => void;
}

export function CenterPreviewCanvas({
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
  handlePreviewCanvasCropRectChange,
  handlePreviewCanvasImageFrameChange,
  handleGoToSourceSlot,
  handleToggleSourceVariantView,
  handleToggleSplitVariantView,
  handleRevealInTreeFromCanvas,
}: CenterPreviewCanvasProps): React.JSX.Element {
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

  const previewCanvasClassName = cn('h-full', 'bg-slate-900');

  return (
    <div className='sticky top-0 z-20 relative min-h-0 overflow-hidden bg-card/40'>
      <VectorDrawingProvider value={vectorContextValue}>
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
            <SplitVariantPreview
              sourceSlotImageSrc={compareVariantImageA}
              workingSlotImageSrc={compareVariantImageB}
            />
          ) : splitVariantView &&
          canCompareWithSource &&
          sourceSlotImageSrc &&
          workingSlotImageSrc ? (
              <SplitVariantPreview
                sourceSlotImageSrc={sourceSlotImageSrc}
                workingSlotImageSrc={workingSlotImageSrc}
              />
            ) : (
              <div className={previewCanvasClassName}>
                <VectorDrawingCanvas
                  shapes={liveMaskShapes}
                  src={activeCanvasImageSrc}
                  baseCanvasWidthPx={projectCanvasSize?.width ?? 1024}
                  baseCanvasHeightPx={projectCanvasSize?.height ?? 1024}
                  maskPreviewEnabled={maskPreviewEnabled}
                  maskPreviewInvert={maskInvert}
                  maskPreviewFeather={maskFeather}
                  showCenterGuides={centerGuidesEnabled}
                  selectionEnabled={canvasSelectionEnabled}
                  imageMoveEnabled={imageTransformMode === 'move'}
                  imageOffset={canvasImageOffset}
                  onImageOffsetChange={(offset) => {
                    setCanvasImageOffset(offset);
                  }}
                  backgroundLayerEnabled={canvasBackgroundLayerEnabled}
                  backgroundColor={canvasBackgroundColor}
                  onViewCropRectChange={handlePreviewCanvasCropRectChange}
                  onImageContentFrameChange={handlePreviewCanvasImageFrameChange}
                />
              </div>
            )}

        <div className='absolute bottom-4 left-4 z-30'>
          <SplitViewControls
            canCompare={canCompareSelectedVariants || canCompareWithSource}
            onGoToSourceSlot={handleGoToSourceSlot}
            onToggleSourceVariantView={handleToggleSourceVariantView}
            onToggleSplitVariantView={handleToggleSplitVariantView}
          />
        </div>

        <div className='absolute bottom-4 right-4 z-30 flex gap-2'>
          {canNavigateToSource && (
            <Button
              variant='secondary'
              size='sm'
              className='h-8 rounded-full bg-slate-900/60 backdrop-blur-md border-white/10'
              onClick={handleGoToSourceSlot}
            >
              Go to Source
            </Button>
          )}
          {canRevealLoadedCardInTree && (
            <Button
              variant='secondary'
              size='sm'
              className='h-8 w-8 p-0 rounded-full bg-slate-900/60 backdrop-blur-md border-white/10'
              onClick={handleRevealInTreeFromCanvas}
              title='Reveal in Tree'
            >
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
      </VectorDrawingProvider>
    </div>
  );
}
