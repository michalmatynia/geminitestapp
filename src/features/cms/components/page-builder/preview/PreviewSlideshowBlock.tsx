'use client';

import React, { useState, useCallback, useEffect } from 'react';

import type { PreviewBlockProps } from '@/shared/contracts/cms';
import type { BlockInstance } from '@/shared/contracts/cms';
import { safeSetInterval, safeClearInterval } from '@/shared/lib/timers';
import { Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { BlockContextProvider, useBlockContext } from './context/BlockContext';
import { usePreviewEditorActions, usePreviewEditorState } from './context/PreviewEditorContext';
import { resolveNodeLabel } from './InspectorOverlay';
import { normalizeSlideshowAnimationType, getSlideshowAlignment } from './preview-utils';
import { PreviewNodeSelectionButton } from './PreviewNodeSelectionButton';
import {
  PreviewBlockItemProxy,
  useParentBlockContextValueResolver,
  STRETCH_TRUE_BLOCK_CONTEXT_VALUE,
  STRETCH_FALSE_BLOCK_CONTEXT_VALUE
} from './PreviewCarouselShared';

interface SlideshowFrameProps {
  frame: BlockInstance;
  idx: number;
  currentActiveIndex: number;
  transition: string;
  transitionDuration: number;
  selectedNodeId: string | undefined;
  onSelect: ((nodeId: string) => void) | undefined;
  showEditorChrome: boolean;
  getParentBlockContextValue: (id: string) => { parentBlockId: string };
  elementAnimationType: string;
  elementAnimationDuration: number;
  elementAnimationDelay: number;
  elementAnimationEasing: string;
  elementAnimationStagger: number;
  setActiveIndex: (idx: number) => void;
}

const SlideshowFrame = ({
  frame,
  idx,
  currentActiveIndex,
  transition,
  transitionDuration,
  selectedNodeId,
  onSelect,
  showEditorChrome,
  getParentBlockContextValue,
  elementAnimationType,
  elementAnimationDuration,
  elementAnimationDelay,
  elementAnimationEasing,
  elementAnimationStagger,
  setActiveIndex,
}: SlideshowFrameProps): React.ReactNode => {
  const frameSettings = frame.settings ?? {};
  const frameLabel = resolveNodeLabel('Slideshow Frame', frameSettings['label']);
  const backgroundColor = (frameSettings['backgroundColor'] as string | undefined) ?? '';
  const contentAlignment = (frameSettings['contentAlignment'] as string | undefined) ?? 'center';
  const verticalAlignment = (frameSettings['verticalAlignment'] as string | undefined) ?? 'center';
  const fillContent =
    frameSettings['fillContent'] === true || frameSettings['fillContent'] === 'yes';
  const paddingTop = (frameSettings['paddingTop'] as number | undefined) ?? 0;
  const paddingBottom = (frameSettings['paddingBottom'] as number | undefined) ?? 0;
  const paddingLeft = (frameSettings['paddingLeft'] as number | undefined) ?? 0;
  const paddingRight = (frameSettings['paddingRight'] as number | undefined) ?? 0;

  const { alignItems, justifyContent } = getSlideshowAlignment(contentAlignment, verticalAlignment);

  const frameStyle: React.CSSProperties = {
    backgroundColor: backgroundColor !== '' ? backgroundColor : undefined,
    padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
    alignItems,
    justifyContent,
  };

  const frameAnimType = frameSettings['animationType'] as string | undefined;
  const animationType =
    frameAnimType === 'inherit' || frameAnimType === undefined || frameAnimType === ''
      ? elementAnimationType
      : frameAnimType;
  const resolvedAnimationType = normalizeSlideshowAnimationType(animationType);
  const animationDuration =
    (frameSettings['animationDuration'] as number | undefined) ?? elementAnimationDuration;
  const animationDelay =
    (frameSettings['animationDelay'] as number | undefined) ?? elementAnimationDelay;
  const frameAnimEasing = frameSettings['animationEasing'] as string | undefined;
  const animationEasing =
    frameAnimEasing === 'inherit' || frameAnimEasing === undefined || frameAnimEasing === ''
      ? elementAnimationEasing
      : frameAnimEasing;
  const stagger = elementAnimationStagger;
  const isActiveFrame = idx === currentActiveIndex;
  const isFrameSelected = selectedNodeId === frame.id;
  const frameChildren = frame.blocks ?? [];

  const containerStyle: React.CSSProperties = {
    transitionDuration: `${transitionDuration}ms`,
  };

  if (transition === 'fade') {
    containerStyle.opacity = isActiveFrame ? 1 : 0;
    containerStyle.pointerEvents = isActiveFrame ? 'auto' : 'none';
  } else {
    containerStyle.transform = `translateX(${(idx - currentActiveIndex) * 100}%)`;
  }

  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col',
        transition === 'fade' ? 'transition-opacity' : 'transition-transform'
      )}
      style={containerStyle}
    >
      <div className='relative group flex h-full w-full flex-col' style={frameStyle}>
        {showEditorChrome && (
          <PreviewNodeSelectionButton
            label={`Select block ${frameLabel}`}
            selected={isFrameSelected}
            onSelect={() => {
              setActiveIndex(idx);
              onSelect?.(frame.id);
            }}
            className='left-2 top-2 size-6'
          />
        )}
        <BlockContextProvider value={getParentBlockContextValue(frame.id)}>
          {frameChildren.length > 0 ? (
            frameChildren.map((child: BlockInstance, blockIdx: number) => {
              const blockDelay = animationDelay + blockIdx * stagger;
              const animationStyle: React.CSSProperties =
                isActiveFrame && resolvedAnimationType !== 'none'
                  ? {
                    animation: `cms-anim-${resolvedAnimationType} ${animationDuration}ms ${animationEasing} ${blockDelay}ms both`,
                  }
                  : {};
              const shouldFillBlock =
                fillContent &&
                (child.type === 'Image' || child.type === 'ImageElement');
              const wrapperStyle: React.CSSProperties = shouldFillBlock
                ? {
                  ...animationStyle,
                  width: '100%',
                  height: '100%',
                  alignSelf: 'stretch',
                }
                : animationStyle;
              const triggerKey = `${child.id}-${currentActiveIndex}-${blockIdx}`;
              const childBlockContextValue = shouldFillBlock
                ? STRETCH_TRUE_BLOCK_CONTEXT_VALUE
                : STRETCH_FALSE_BLOCK_CONTEXT_VALUE;
              return (
                <div key={triggerKey} style={wrapperStyle}>
                  <BlockContextProvider value={childBlockContextValue}>
                    <PreviewBlockItemProxy block={child} />
                  </BlockContextProvider>
                </div>
              );
            })
          ) : (
            <div className='flex h-full w-full items-center justify-center text-sm text-gray-500'>
              Empty slide
            </div>
          )}
        </BlockContextProvider>
      </div>
    </div>
  );
};

interface SlideshowNavigationProps {
  frames: BlockInstance[];
  currentActiveIndex: number;
  showArrows: boolean;
  showDots: boolean;
  goToPrev: () => void;
  goToNext: () => void;
  setActiveIndex: (idx: number) => void;
}

const SlideshowNavigation = ({
  frames,
  currentActiveIndex,
  showArrows,
  showDots,
  goToPrev,
  goToNext,
  setActiveIndex,
}: SlideshowNavigationProps): React.ReactNode => {
  if (frames.length <= 1 || (!showArrows && !showDots)) return null;

  return (
    <div className='mt-4 flex items-center justify-center gap-4'>
      {showArrows && (
        <Button
          variant='outline'
          size='icon'
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            goToPrev();
          }}
          className='size-8 rounded-full border-gray-600 bg-transparent p-0 text-gray-400 hover:bg-white/10 hover:text-white transition'
          aria-label='Previous slide'
          title={'Previous slide'}>
          <svg className='size-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 19l-7-7 7-7'
            />
          </svg>
        </Button>
      )}
      {showDots && (
        <div className='flex gap-2'>
          {frames.map((_: BlockInstance, idx: number) => (
            <Button
              key={idx}
              variant='ghost'
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                setActiveIndex(idx);
              }}
              className={cn(
                'size-2 min-w-0 rounded-full p-0 transition-all hover:bg-white/40',
                idx === currentActiveIndex ? 'bg-white' : 'bg-gray-600'
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
      {showArrows && (
        <Button
          variant='outline'
          size='icon'
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            goToNext();
          }}
          className='size-8 rounded-full border-gray-600 bg-transparent p-0 text-gray-400 hover:bg-white/10 hover:text-white transition'
          aria-label='Next slide'
          title={'Next slide'}>
          <svg className='size-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 5l7 7-7 7'
            />
          </svg>
        </Button>
      )}
    </div>
  );
};

export function PreviewSlideshowBlock({
  block,
  stretch,
}: PreviewBlockProps): React.ReactNode {
  const { stretch: contextStretch } = useBlockContext();
  const resolvedStretch = stretch ?? (contextStretch ?? false);
  const { selectedNodeId, inspectorSettings, pauseSlideshowOnHoverInEditor } = usePreviewEditorState();
  const { onSelect } = usePreviewEditorActions();
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;

  const transition = (block.settings['transition'] as string | undefined) ?? 'fade';
  const transitionDuration = (block.settings['transitionDuration'] as number | undefined) ?? 700;
  const autoplay = (block.settings['autoplay'] as string | undefined) !== 'no';
  const autoplaySpeed = (block.settings['autoplaySpeed'] as number | undefined) ?? 5000;
  const pauseOnHover = (block.settings['pauseOnHover'] as string | undefined) !== 'no';
  const allowPauseOnHover = pauseOnHover && (pauseSlideshowOnHoverInEditor ?? false);
  const loop = (block.settings['loop'] as string | undefined) !== 'no';

  const elementAnimationType = (block.settings['elementAnimationType'] as string | undefined) ?? 'fade-in';
  const elementAnimationDuration = (block.settings['elementAnimationDuration'] as number | undefined) ?? 400;
  const elementAnimationDelay = (block.settings['elementAnimationDelay'] as number | undefined) ?? 0;
  const elementAnimationEasing = (block.settings['elementAnimationEasing'] as string | undefined) ?? 'ease-out';
  const elementAnimationStagger = (block.settings['elementAnimationStagger'] as number | undefined) ?? 100;

  const showArrows = (block.settings['showArrows'] as string | undefined) !== 'no';
  const showDots = (block.settings['showDots'] as string | undefined) !== 'no';
  const heightMode = (block.settings['heightMode'] as string | undefined) ?? 'auto';
  const height = (block.settings['height'] as number | undefined) ?? 360;

  const frames = (block.blocks ?? []).filter((b: BlockInstance) => b.type === 'SlideshowFrame');
  const getParentBlockContextValue = useParentBlockContextValueResolver();
  const slideCount = frames.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentActiveIndex = activeIndex >= slideCount ? 0 : activeIndex;

  const goToNext = useCallback((): void => {
    if (slideCount <= 1) return;
    if (!loop && currentActiveIndex >= slideCount - 1) return;
    setActiveIndex((prev: number) => (prev + 1) % slideCount);
  }, [slideCount, loop, currentActiveIndex]);

  const goToPrev = useCallback((): void => {
    if (slideCount <= 1) return;
    if (!loop && currentActiveIndex <= 0) return;
    setActiveIndex((prev: number) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount, loop, currentActiveIndex]);

  useEffect((): void => {
    if (activeIndex >= slideCount && slideCount > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, slideCount]);

  useEffect((): void => {
    const selectedFrameIndex = frames.findIndex((frame) => frame.id === selectedNodeId);
    if (selectedFrameIndex >= 0 && selectedFrameIndex !== currentActiveIndex) {
      setActiveIndex(selectedFrameIndex);
    }
  }, [currentActiveIndex, frames, selectedNodeId]);

  useEffect((): (() => void) | undefined => {
    if (!autoplay || isPaused || slideCount <= 1 || autoplaySpeed <= 0) return undefined;
    const interval = safeSetInterval(goToNext, autoplaySpeed);
    return (): void => safeClearInterval(interval);
  }, [autoplay, autoplaySpeed, isPaused, slideCount, goToNext]);

  useEffect((): void => {
    if (!allowPauseOnHover && isPaused) {
      setIsPaused(false);
    }
  }, [allowPauseOnHover, isPaused]);

  const slideHeightStyle: React.CSSProperties | undefined =
    heightMode === 'fixed' && (height ?? 0) > 0 ? { height: `${height}px` } : undefined;

  if (frames.length === 0 && !showEditorChrome) {
    return null;
  }

  return (
    <div className={cn('relative w-full', resolvedStretch && 'h-full')}>
      {frames.length === 0 ? (
        showEditorChrome && (
          <div className='flex min-h-[80px] items-center justify-center rounded border border-dashed border-gray-700/50 bg-gray-900/20 text-[10px] uppercase tracking-wider text-gray-600'>
            Add frames to carousel
          </div>
        )
      ) : (
        <>
          <div
            className='relative overflow-hidden min-h-[200px]'
            style={slideHeightStyle}
            onMouseEnter={allowPauseOnHover ? (): void => setIsPaused(true) : undefined}
            onMouseLeave={allowPauseOnHover ? (): void => setIsPaused(false) : undefined}
          >
            {frames.map((frame: BlockInstance, idx: number) => (
              <SlideshowFrame
                key={frame.id}
                frame={frame}
                idx={idx}
                currentActiveIndex={currentActiveIndex}
                transition={transition}
                transitionDuration={transitionDuration}
                selectedNodeId={selectedNodeId ?? undefined}
                onSelect={onSelect}
                showEditorChrome={showEditorChrome}
                getParentBlockContextValue={getParentBlockContextValue}
                elementAnimationType={elementAnimationType}
                elementAnimationDuration={elementAnimationDuration}
                elementAnimationDelay={elementAnimationDelay}
                elementAnimationEasing={elementAnimationEasing}
                elementAnimationStagger={elementAnimationStagger}
                setActiveIndex={setActiveIndex}
              />
            ))}
          </div>
          <SlideshowNavigation
            frames={frames}
            currentActiveIndex={currentActiveIndex}
            showArrows={showArrows}
            showDots={showDots}
            goToPrev={goToPrev}
            goToNext={goToNext}
            setActiveIndex={setActiveIndex}
          />
        </>
      )}
    </div>
  );
}
