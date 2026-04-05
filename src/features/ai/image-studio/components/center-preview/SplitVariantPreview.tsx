'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui/primitives.public';

import { useCenterPreviewContext } from './CenterPreviewContext';
import {
  SPLIT_WHEEL_MAX_DELTA,
  SPLIT_WHEEL_MIN_DELTA,
  SPLIT_WHEEL_ZOOM_SENSITIVITY,
  SPLIT_ZOOM_STEP,
} from './preview-utils';
import { useCenterPreviewCanvasContext } from './sections/CenterPreviewCanvasContext';

type Pane = 'left' | 'right';

export function SplitVariantPreview(): React.JSX.Element {
  const {
    compareVariantImageA,
    compareVariantImageB,
    sourceSlotImageSrc,
    workingSlotImageSrc,
    canCompareSelectedVariants,
  } = useCenterPreviewCanvasContext();

  const leftImageSrc =
    canCompareSelectedVariants && compareVariantImageA ? compareVariantImageA : sourceSlotImageSrc;
  const rightImageSrc =
    canCompareSelectedVariants && compareVariantImageB ? compareVariantImageB : workingSlotImageSrc;

  if (!leftImageSrc || !rightImageSrc) {
    return <div className='h-full w-full' />;
  }

  const {
    leftSplitZoom,
    rightSplitZoom,
    adjustSplitZoom: onAdjustSplitZoom,
    resetSplitZoom: onResetSplitZoom,
  } = useCenterPreviewContext();

  const leftPaneRef = useRef<HTMLDivElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);
  const [leftOffset, setLeftOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rightOffset, setRightOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDrag, setActiveDrag] = useState<{
    pane: Pane;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  const clampOffset = useCallback(
    (pane: Pane, zoom: number, next: { x: number; y: number }): { x: number; y: number } => {
      if (zoom <= 1) return { x: 0, y: 0 };
      const paneElement = pane === 'left' ? leftPaneRef.current : rightPaneRef.current;
      if (!paneElement) return next;
      const paneRect = paneElement.getBoundingClientRect();
      const maxOffsetX = Math.max(0, (paneRect.width * (zoom - 1)) / 2);
      const maxOffsetY = Math.max(0, (paneRect.height * (zoom - 1)) / 2);
      return {
        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, next.x)),
        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, next.y)),
      };
    },
    []
  );

  useEffect(() => {
    setLeftOffset((previous) => clampOffset('left', leftSplitZoom, previous));
  }, [clampOffset, leftSplitZoom]);

  useEffect(() => {
    setRightOffset((previous) => clampOffset('right', rightSplitZoom, previous));
  }, [clampOffset, rightSplitZoom]);

  useEffect(() => {
    setActiveDrag(null);
    setLeftOffset({ x: 0, y: 0 });
    setRightOffset({ x: 0, y: 0 });
  }, [leftImageSrc, rightImageSrc]);

  useEffect((): (() => void) => {
    if (!activeDrag) return () => {};

    const handlePointerMove = (event: PointerEvent): void => {
      if (event.pointerId !== activeDrag.pointerId) return;
      const zoom = activeDrag.pane === 'left' ? leftSplitZoom : rightSplitZoom;
      const nextOffset = clampOffset(activeDrag.pane, zoom, {
        x: activeDrag.startOffsetX + (event.clientX - activeDrag.startClientX),
        y: activeDrag.startOffsetY + (event.clientY - activeDrag.startClientY),
      });
      if (activeDrag.pane === 'left') {
        setLeftOffset(nextOffset);
      } else {
        setRightOffset(nextOffset);
      }
    };

    const handlePointerUp = (event: PointerEvent): void => {
      if (event.pointerId !== activeDrag.pointerId) return;
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return (): void => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeDrag, clampOffset, leftSplitZoom, rightSplitZoom]);

  const handlePanePointerDown = useCallback(
    (pane: Pane, event: React.PointerEvent<HTMLDivElement>): void => {
      if (event.button !== 0) return;
      if ((event.target as HTMLElement).closest('[data-split-preview-controls="true"]')) return;
      const zoom = pane === 'left' ? leftSplitZoom : rightSplitZoom;
      if (zoom <= 1) return;

      event.preventDefault();
      const currentOffset = pane === 'left' ? leftOffset : rightOffset;
      setActiveDrag({
        pane,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startOffsetX: currentOffset.x,
        startOffsetY: currentOffset.y,
      });
    },
    [leftOffset, leftSplitZoom, rightOffset, rightSplitZoom]
  );

  useEffect((): (() => void) => {
    const leftElement = leftPaneRef.current;
    const rightElement = rightPaneRef.current;
    if (!leftElement || !rightElement) return () => {};

    const normalizeWheelDelta = (event: WheelEvent): number => {
      if (event.deltaMode === 1) return event.deltaY * 16;
      if (event.deltaMode === 2) return event.deltaY * 240;
      return event.deltaY;
    };

    const buildWheelHandler =
      (pane: Pane) =>
        (event: WheelEvent): void => {
          event.preventDefault();
          event.stopPropagation();
          const normalizedDelta = normalizeWheelDelta(event);
          const zoomDelta = Math.max(
            -SPLIT_WHEEL_MAX_DELTA,
            Math.min(SPLIT_WHEEL_MAX_DELTA, -normalizedDelta * SPLIT_WHEEL_ZOOM_SENSITIVITY)
          );
          if (Math.abs(zoomDelta) < SPLIT_WHEEL_MIN_DELTA) return;
          onAdjustSplitZoom(pane, zoomDelta);
        };

    const handleLeftWheel = buildWheelHandler('left');
    const handleRightWheel = buildWheelHandler('right');

    leftElement.addEventListener('wheel', handleLeftWheel, { passive: false });
    rightElement.addEventListener('wheel', handleRightWheel, { passive: false });

    return (): void => {
      leftElement.removeEventListener('wheel', handleLeftWheel);
      rightElement.removeEventListener('wheel', handleRightWheel);
    };
  }, [onAdjustSplitZoom]);

  return (
    <div className='relative grid h-full grid-cols-2 gap-2 rounded border border-border/60 bg-background/20 p-2'>
      <div
        ref={leftPaneRef}
        className='relative min-h-0 overflow-hidden rounded border border-border/60 bg-card/30'
        style={{ touchAction: 'none' }}
        onPointerDown={(event): void => {
          handlePanePointerDown('left', event);
        }}
      >
        <div className='absolute left-1 top-1 z-10 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-gray-100'>
          Source
        </div>
        <div
          data-split-preview-controls='true'
          className='absolute right-1 top-1 z-10 flex items-center gap-1 rounded bg-black/65 p-1'
        >
          <Button
            size='xs'
            type='button'
            variant='outline'
            className='h-5 w-5 px-0 text-[10px]'
            onClick={(): void => {
              onAdjustSplitZoom('left', -SPLIT_ZOOM_STEP);
            }}
            title='Zoom out source'
          >
            -
          </Button>
          <span className='min-w-10 text-center text-[10px] text-gray-100'>
            {Math.round(leftSplitZoom * 100)}%
          </span>
          <Button
            size='xs'
            type='button'
            variant='outline'
            className='h-5 w-5 px-0 text-[10px]'
            onClick={(): void => {
              onAdjustSplitZoom('left', SPLIT_ZOOM_STEP);
            }}
            title='Zoom in source'
          >
            +
          </Button>
          <Button
            size='xs'
            type='button'
            variant='outline'
            className='h-5 px-1 text-[10px]'
            onClick={(): void => {
              setLeftOffset({ x: 0, y: 0 });
              onResetSplitZoom('left');
            }}
            title='Reset source zoom'
          >
            100%
          </Button>
        </div>
        <img
          src={leftImageSrc}
          alt='Source asset'
          className='h-full w-full object-contain transition-transform duration-150 ease-out'
          style={{
            transform: `translate(${leftOffset.x}px, ${leftOffset.y}px) scale(${leftSplitZoom})`,
            transformOrigin: 'center center',
            cursor:
              activeDrag?.pane === 'left' ? 'grabbing' : leftSplitZoom > 1 ? 'grab' : 'default',
          }}
          draggable={false}
        />
      </div>
      <div
        ref={rightPaneRef}
        className='relative min-h-0 overflow-hidden rounded border border-border/60 bg-card/30'
        style={{ touchAction: 'none' }}
        onPointerDown={(event): void => {
          handlePanePointerDown('right', event);
        }}
      >
        <div className='absolute left-1 top-1 z-10 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-gray-100'>
          Variant
        </div>
        <div
          data-split-preview-controls='true'
          className='absolute right-1 top-1 z-10 flex items-center gap-1 rounded bg-black/65 p-1'
        >
          <Button
            size='xs'
            type='button'
            variant='outline'
            className='h-5 w-5 px-0 text-[10px]'
            onClick={(): void => {
              onAdjustSplitZoom('right', -SPLIT_ZOOM_STEP);
            }}
            title='Zoom out variant'
          >
            -
          </Button>
          <span className='min-w-10 text-center text-[10px] text-gray-100'>
            {Math.round(rightSplitZoom * 100)}%
          </span>
          <Button
            size='xs'
            type='button'
            variant='outline'
            className='h-5 w-5 px-0 text-[10px]'
            onClick={(): void => {
              onAdjustSplitZoom('right', SPLIT_ZOOM_STEP);
            }}
            title='Zoom in variant'
          >
            +
          </Button>
          <Button
            size='xs'
            type='button'
            variant='outline'
            className='h-5 px-1 text-[10px]'
            onClick={(): void => {
              setRightOffset({ x: 0, y: 0 });
              onResetSplitZoom('right');
            }}
            title='Reset variant zoom'
          >
            100%
          </Button>
        </div>
        <img
          src={rightImageSrc}
          alt='Generated variant'
          className='h-full w-full object-contain transition-transform duration-150 ease-out'
          style={{
            transform: `translate(${rightOffset.x}px, ${rightOffset.y}px) scale(${rightSplitZoom})`,
            transformOrigin: 'center center',
            cursor:
              activeDrag?.pane === 'right' ? 'grabbing' : rightSplitZoom > 1 ? 'grab' : 'default',
          }}
          draggable={false}
        />
      </div>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute bottom-3 left-1/2 top-3 z-10 w-px -translate-x-1/2 bg-border/80'
      />
    </div>
  );
}
