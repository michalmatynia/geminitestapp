'use client';

import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

type InlineImagePreviewCanvasProps = {
  imageSrc: string | null;
  imageAlt: string;
  onImageDimensionsChange: (dimensions: { width: number; height: number } | null) => void;
  className?: string;
};

const INLINE_PREVIEW_ZOOM_MIN = 0.35;
const INLINE_PREVIEW_ZOOM_MAX = 8;
const INLINE_PREVIEW_ZOOM_STEP = 0.15;

const clampInlinePreviewZoom = (value: number): number =>
  Math.min(INLINE_PREVIEW_ZOOM_MAX, Math.max(INLINE_PREVIEW_ZOOM_MIN, Number(value.toFixed(3))));

type InlinePreviewControlsRuntimeValue = {
  hasImage: boolean;
  zoom: number;
  applyZoomDelta: (delta: number) => void;
  resetViewport: () => void;
};

const InlinePreviewControlsRuntimeContext =
  React.createContext<InlinePreviewControlsRuntimeValue | null>(null);

function useInlinePreviewControlsRuntime(): InlinePreviewControlsRuntimeValue {
  const runtime = React.useContext(InlinePreviewControlsRuntimeContext);
  if (!runtime) {
    throw new Error(
      'useInlinePreviewControlsRuntime must be used within InlinePreviewControlsRuntimeContext.Provider'
    );
  }
  return runtime;
}

function InlineImagePreviewControls(): React.JSX.Element {
  const { hasImage, zoom, applyZoomDelta, resetViewport } = useInlinePreviewControlsRuntime();

  return (
    <div
      data-inline-preview-controls='true'
      className='absolute right-2 top-2 z-10 flex items-center gap-1 rounded border border-border/60 bg-black/65 px-1 py-1 backdrop-blur'
      onPointerDown={(event): void => {
        event.stopPropagation();
      }}
    >
      <Button
        size='xs'
        type='button'
        variant='outline'
        className='h-6 w-6 px-0'
        onClick={() => applyZoomDelta(-INLINE_PREVIEW_ZOOM_STEP)}
        disabled={!hasImage}
        title='Zoom out'
        aria-label='Zoom out image preview'
      >
        -
      </Button>
      <div className='min-w-10 text-center text-[10px] text-gray-200'>
        {Math.round(zoom * 100)}%
      </div>
      <Button
        size='xs'
        type='button'
        variant='outline'
        className='h-6 w-6 px-0'
        onClick={() => applyZoomDelta(INLINE_PREVIEW_ZOOM_STEP)}
        disabled={!hasImage}
        title='Zoom in'
        aria-label='Zoom in image preview'
      >
        +
      </Button>
      <Button
        size='xs'
        type='button'
        variant='outline'
        className='h-6 px-2 text-[10px]'
        onClick={resetViewport}
        disabled={!hasImage}
        title='Reset viewport'
        aria-label='Reset image viewport'
      >
        Reset
      </Button>
    </div>
  );
}

export function InlineImagePreviewCanvas({
  imageSrc,
  imageAlt,
  onImageDimensionsChange,
  className,
}: InlineImagePreviewCanvasProps): React.JSX.Element {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragRef.current = null;
    onImageDimensionsChange(null);
  }, [imageSrc, onImageDimensionsChange]);

  const applyZoomDelta = (delta: number): void => {
    setZoom((currentZoom) => clampInlinePreviewZoom(currentZoom + delta));
  };

  const resetViewport = (): void => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    dragRef.current = null;
    setIsDragging(false);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!imageSrc || event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-inline-preview-controls="true"]')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const activeDrag = dragRef.current;
    if (activeDrag?.pointerId !== event.pointerId) return;
    const dx = event.clientX - activeDrag.startClientX;
    const dy = event.clientY - activeDrag.startClientY;
    setOffset({
      x: activeDrag.startOffsetX + dx,
      y: activeDrag.startOffsetY + dy,
    });
  };

  const handlePointerRelease = (event: React.PointerEvent<HTMLDivElement>): void => {
    const activeDrag = dragRef.current;
    if (activeDrag?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  const controlsRuntimeValue = React.useMemo<InlinePreviewControlsRuntimeValue>(
    () => ({
      hasImage: Boolean(imageSrc),
      zoom,
      applyZoomDelta,
      resetViewport,
    }),
    [imageSrc, zoom, applyZoomDelta, resetViewport]
  );

  return (
    <div
      className={cn(
        'relative h-72 overflow-hidden rounded-lg border border-border/60 bg-black/35 touch-none',
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      style={{ cursor: imageSrc ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      <InlinePreviewControlsRuntimeContext.Provider value={controlsRuntimeValue}>
        <InlineImagePreviewControls />
      </InlinePreviewControlsRuntimeContext.Provider>

      {imageSrc ? (
        <>
          <div className='absolute inset-0 flex items-center justify-center overflow-hidden'>
            <img
              src={imageSrc}
              alt={imageAlt}
              draggable={false}
              onLoad={(event): void => {
                onImageDimensionsChange({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
              }}
              onError={() => onImageDimensionsChange(null)}
              className='pointer-events-none max-h-full max-w-full select-none object-contain'
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 80ms ease-out',
              }}
            />
          </div>
          <div className='pointer-events-none absolute bottom-2 left-2 rounded border border-border/60 bg-black/60 px-2 py-1 text-[10px] text-gray-200'>
            Drag to pan, use controls to zoom, scroll to move modal
          </div>
        </>
      ) : (
        <div className='flex h-full items-center justify-center text-xs text-gray-500'>
          No source image available for this card.
        </div>
      )}
    </div>
  );
}
