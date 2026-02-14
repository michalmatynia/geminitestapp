'use client';

import React, { useEffect, useRef } from 'react';

import { Button } from '@/shared/ui';

import {
  SPLIT_WHEEL_MAX_DELTA,
  SPLIT_WHEEL_MIN_DELTA,
  SPLIT_WHEEL_ZOOM_SENSITIVITY,
  SPLIT_ZOOM_STEP,
} from './preview-utils';

type Pane = 'left' | 'right';

type SplitVariantPreviewProps = {
  sourceSlotImageSrc: string;
  workingSlotImageSrc: string;
  leftSplitZoom: number;
  rightSplitZoom: number;
  onAdjustSplitZoom: (pane: Pane, delta: number) => void;
  onResetSplitZoom: (pane: Pane) => void;
};

export function SplitVariantPreview({
  sourceSlotImageSrc,
  workingSlotImageSrc,
  leftSplitZoom,
  rightSplitZoom,
  onAdjustSplitZoom,
  onResetSplitZoom,
}: SplitVariantPreviewProps): React.JSX.Element {
  const leftPaneRef = useRef<HTMLDivElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);

  useEffect((): (() => void) => {
    const leftElement = leftPaneRef.current;
    const rightElement = rightPaneRef.current;
    if (!leftElement || !rightElement) return () => {};

    const normalizeWheelDelta = (event: WheelEvent): number => {
      if (event.deltaMode === 1) return event.deltaY * 16;
      if (event.deltaMode === 2) return event.deltaY * 240;
      return event.deltaY;
    };

    const buildWheelHandler = (pane: Pane) => (event: WheelEvent): void => {
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
      >
        <div className='absolute left-1 top-1 z-10 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-gray-100'>
          Source
        </div>
        <div className='absolute right-1 top-1 z-10 flex items-center gap-1 rounded bg-black/65 p-1'>
          <Button size='xs'
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
          <Button size='xs'
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
          <Button size='xs'
            type='button'
            variant='outline'
            className='h-5 px-1 text-[10px]'
            onClick={(): void => {
              onResetSplitZoom('left');
            }}
            title='Reset source zoom'
          >
            100%
          </Button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sourceSlotImageSrc}
          alt='Source image'
          className='h-full w-full object-contain transition-transform duration-150 ease-out'
          style={{ transform: `scale(${leftSplitZoom})`, transformOrigin: 'center center' }}
        />
      </div>
      <div
        ref={rightPaneRef}
        className='relative min-h-0 overflow-hidden rounded border border-border/60 bg-card/30'
      >
        <div className='absolute left-1 top-1 z-10 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-gray-100'>
          Variant
        </div>
        <div className='absolute right-1 top-1 z-10 flex items-center gap-1 rounded bg-black/65 p-1'>
          <Button size='xs'
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
          <Button size='xs'
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
          <Button size='xs'
            type='button'
            variant='outline'
            className='h-5 px-1 text-[10px]'
            onClick={(): void => {
              onResetSplitZoom('right');
            }}
            title='Reset variant zoom'
          >
            100%
          </Button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={workingSlotImageSrc}
          alt='Generated variant'
          className='h-full w-full object-contain transition-transform duration-150 ease-out'
          style={{ transform: `scale(${rightSplitZoom})`, transformOrigin: 'center center' }}
        />
      </div>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute bottom-3 left-1/2 top-3 z-10 w-px -translate-x-1/2 bg-border/80'
      />
    </div>
  );
}
