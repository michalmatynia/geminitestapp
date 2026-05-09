'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useCallback } from 'react';

import type { PreviewBlockProps } from '@/shared/contracts/cms';
import type { BlockInstance } from '@/shared/contracts/cms';
import { Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { useBlockContext } from './context/BlockContext';
import { usePreviewEditorState } from './context/PreviewEditorContext';
import { CarouselFrame } from './CarouselFrame';
import { useParentBlockContextValueResolver, parseCarouselBoolSetting } from './PreviewCarouselShared';

interface CarouselContainerStyleProps {
  resolvedStretch: boolean;
  heightMode: string;
  fixedHeight: number;
}

const getCarouselContainerStyle = ({
  resolvedStretch,
  heightMode,
  fixedHeight,
}: CarouselContainerStyleProps): React.CSSProperties => {
  const style: React.CSSProperties = resolvedStretch ? { height: '100%' } : {};
  if (heightMode === 'fixed') {
    style.height = `${fixedHeight}px`;
  }
  return style;
};

interface CarouselNavigationProps {
  loop: boolean;
  currentIndex: number;
  frameCount: number;
  goToPrev: () => void;
  goToNext: () => void;
}

const CarouselNavigation = ({
  loop,
  currentIndex,
  frameCount,
  goToPrev,
  goToNext,
}: CarouselNavigationProps): React.ReactNode => (
  <>
    <Button
      variant='ghost'
      size='icon'
      onClick={goToPrev}
      disabled={!loop && currentIndex === 0}
      className='absolute left-2 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-none'
      aria-label='Previous slide'
      title='Previous slide'>
      <ChevronLeft className='w-6 h-6' />
    </Button>
    <Button
      variant='ghost'
      size='icon'
      onClick={goToNext}
      disabled={!loop && currentIndex === frameCount - 1}
      className='absolute right-2 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-none'
      aria-label='Next slide'
      title='Next slide'>
      <ChevronRight className='w-6 h-6' />
    </Button>
  </>
);

interface CarouselIndicatorsProps {
  frames: BlockInstance[];
  currentIndex: number;
  goToIndex: (index: number) => void;
}

const CarouselIndicators = ({
  frames,
  currentIndex,
  goToIndex,
}: CarouselIndicatorsProps): React.ReactNode => (
  <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2'>
    {frames.map((_: BlockInstance, index: number) => (
      <Button
        key={index}
        variant='ghost'
        onClick={(): void => goToIndex(index)}
        className={cn(
          'size-2.5 min-w-0 rounded-full p-0 transition-all hover:bg-white/60',
          index === currentIndex ? 'bg-white' : 'bg-white/40'
        )}
        aria-label={`Go to slide ${index + 1}`}
      />
    ))}
  </div>
);

export function PreviewCarouselBlock({
  block,
  stretch,
}: PreviewBlockProps): React.ReactNode {
  const { stretch: contextStretch } = useBlockContext();
  const resolvedStretch = stretch ?? (contextStretch ?? false);
  const { inspectorSettings } = usePreviewEditorState();
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const frames = (block.blocks ?? []).filter((b: BlockInstance) => b.type === 'CarouselFrame');
  const [currentIndex, setCurrentIndex] = useState(0);

  const transitionType = (block.settings['transitionType'] as string | undefined) ?? 'slide';
  const transitionDuration = (block.settings['transitionDuration'] as number | undefined) ?? 500;
  const heightMode = (block.settings['heightMode'] as string | undefined) ?? 'auto';
  const fixedHeight = (block.settings['height'] as number | undefined) ?? 400;
  const showNavigation = parseCarouselBoolSetting(block.settings['showNavigation'], true);
  const showIndicators = parseCarouselBoolSetting(block.settings['showIndicators'], true);
  const loop = parseCarouselBoolSetting(block.settings['loop'], true);

  const frameCount = frames.length;
  const getParentBlockContextValue = useParentBlockContextValueResolver();

  const goToNext = useCallback((): void => {
    if (frameCount === 0) return;
    if (!loop && currentIndex >= frameCount - 1) return;
    setCurrentIndex((prev: number) => (prev + 1) % frameCount);
  }, [frameCount, loop, currentIndex]);

  const goToPrev = useCallback((): void => {
    if (frameCount === 0) return;
    if (!loop && currentIndex <= 0) return;
    setCurrentIndex((prev: number) => (prev - 1 + frameCount) % frameCount);
  }, [frameCount, loop, currentIndex]);

  const goToIndex = useCallback(
    (index: number): void => {
      if (index === currentIndex) return;
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  const containerStyle = getCarouselContainerStyle({ resolvedStretch, heightMode, fixedHeight });

  if (frameCount === 0) {
    if (!showEditorChrome) return null;
    return (
      <div
        className='flex min-h-[80px] items-center justify-center rounded border border-dashed border-gray-700/50 bg-gray-900/20 text-[10px] uppercase tracking-wider text-gray-600'
        style={containerStyle}
      >
        Add frames to carousel
      </div>
    );
  }

  const framesContainerStyle: React.CSSProperties = transitionType === 'slide' ? {
    display: 'flex',
    transform: `translateX(-${currentIndex * 100}%)`,
    transition: `transform ${transitionDuration}ms ease-in-out`,
  } : {};

  return (
    <div className='relative w-full overflow-hidden' style={containerStyle}>
      <div className='relative w-full h-full' style={framesContainerStyle}>
        {frames.map((frame: BlockInstance, index: number) => (
          <CarouselFrame
            key={frame.id}
            frame={frame}
            index={index}
            currentIndex={currentIndex}
            transitionType={transitionType}
            transitionDuration={transitionDuration}
            getParentBlockContextValue={getParentBlockContextValue}
          />
        ))}
      </div>

      {showNavigation && frameCount > 1 && (
        <CarouselNavigation
          loop={loop}
          currentIndex={currentIndex}
          frameCount={frameCount}
          goToPrev={goToPrev}
          goToNext={goToNext}
        />
      )}

      {showIndicators && frameCount > 1 && (
        <CarouselIndicators frames={frames} currentIndex={currentIndex} goToIndex={goToIndex} />
      )}
    </div>
  );
}
