'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';


import { BlockContextProvider, useBlockContext } from './context/BlockContext';
import { usePreviewEditor } from './context/PreviewEditorContext';
import { normalizeSlideshowAnimationType } from './preview-utils';

import type { PreviewSectionBlockProps, PreviewBlockItemProps } from '@/shared/contracts/cms';
import type { BlockInstance } from '../../../types/page-builder';

// ---------------------------------------------------------------------------
// PreviewBlockItem is needed as a dependency - import it lazily to avoid circular deps
// We use a forward reference pattern: the parent file passes it through module scope
// ---------------------------------------------------------------------------

let _PreviewBlockItem: React.ComponentType<PreviewBlockItemProps> | null = null;

export function registerCarouselPreviewBlockItem(component: React.ComponentType<PreviewBlockItemProps>): void {
  _PreviewBlockItem = component;
}



function PreviewBlockItemProxy(props: PreviewBlockItemProps): React.ReactNode {
  if (!_PreviewBlockItem) {
    throw new Error('PreviewBlockItem has not been registered. Call registerCarouselPreviewBlockItem first.');
  }

  return (
    <_PreviewBlockItem {...props} />
  );
}



// ---------------------------------------------------------------------------
// Carousel preview (inside columns)
// ---------------------------------------------------------------------------

// Helper to parse boolean settings that may be boolean or string "true"/"false"
export const parseCarouselBoolSetting = (value: unknown, defaultValue: boolean = true): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
};

export function PreviewCarouselBlock({
  block,
  stretch = false,
}: PreviewSectionBlockProps): React.ReactNode {
  const { stretch: contextStretch } = useBlockContext();
  const resolvedStretch = stretch ?? contextStretch ?? false;
  const {
    inspectorSettings,
  } = usePreviewEditor();
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const frames = (block.blocks ?? []).filter((b: BlockInstance) => b.type === 'CarouselFrame');
  const [currentIndex, setCurrentIndex] = useState(0);

  const transitionType = (block.settings['transitionType'] as string) || 'slide';
  const transitionDuration = (block.settings['transitionDuration'] as number) || 500;
  const heightMode = (block.settings['heightMode'] as string) || 'auto';
  const fixedHeight = (block.settings['height'] as number) || 400;
  const showNavigation = parseCarouselBoolSetting(block.settings['showNavigation'], true);
  const showIndicators = parseCarouselBoolSetting(block.settings['showIndicators'], true);
  const loop = parseCarouselBoolSetting(block.settings['loop'], true);

  const frameCount = frames.length;

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

  const goToIndex = useCallback((index: number): void => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
  }, [currentIndex]);

  const stretchStyle = resolvedStretch ? { height: '100%' } : undefined;
  const containerStyle: React.CSSProperties = {
    ...(stretchStyle ?? {}),
    ...(heightMode === 'fixed' ? { height: `${fixedHeight}px` } : {}),
  };

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

  return (
    <div className='relative w-full overflow-hidden' style={containerStyle}>
      {/* Frames container */}
      <div
        className='relative w-full h-full'
        style={{
          ...(transitionType === 'slide'
            ? {
              display: 'flex',
              transform: `translateX(-${currentIndex * 100}%)`,
              transition: `transform ${transitionDuration}ms ease-in-out`,
            }
            : {}),
        }}
      >
        {frames.map((frame: BlockInstance, index: number) => {
          const isActive = index === currentIndex;
          const frameSettings = frame.settings ?? {};
          const backgroundColor = (frameSettings['backgroundColor'] as string) || '';
          const contentAlignment = (frameSettings['contentAlignment'] as string) || 'center';
          const verticalAlignment = (frameSettings['verticalAlignment'] as string) || 'center';
          const paddingTop = (frameSettings['paddingTop'] as number) || 0;
          const paddingBottom = (frameSettings['paddingBottom'] as number) || 0;
          const paddingLeft = (frameSettings['paddingLeft'] as number) || 0;
          const paddingRight = (frameSettings['paddingRight'] as number) || 0;

          const frameStyle: React.CSSProperties = {
            backgroundColor: backgroundColor || undefined,
            padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
            ...(transitionType === 'slide'
              ? { minWidth: '100%', flexShrink: 0 }
              : {
                position: index === 0 ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: transitionType === 'fade' ? (isActive ? 1 : 0) : isActive ? 1 : 0,
                visibility: isActive ? 'visible' : 'hidden',
                transition: transitionType === 'fade' ? `opacity ${transitionDuration}ms ease-in-out` : undefined,
              }),
          };

          const alignmentClass =
            contentAlignment === 'center'
              ? 'items-center justify-center'
              : contentAlignment === 'right'
                ? 'items-end justify-end'
                : 'items-start justify-start';

          const verticalAlignmentClass =
            verticalAlignment === 'center'
              ? 'justify-center'
              : verticalAlignment === 'bottom'
                ? 'justify-end'
                : 'justify-start';

          const frameChildren = frame.blocks ?? [];

          return (
            <div
              key={frame.id}
              className={`flex flex-col ${alignmentClass} ${verticalAlignmentClass}`}
              style={frameStyle}
            >
              <BlockContextProvider value={{ parentBlockId: frame.id }}>
                {frameChildren.map((child: BlockInstance) => (
                  <PreviewBlockItemProxy
                    key={child.id}
                    block={child}
                  />
                ))}
              </BlockContextProvider>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      {showNavigation && frameCount > 1 && (
        <>
          <button
            type='button'
            onClick={goToPrev}
            disabled={!loop && currentIndex === 0}
            className='absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed'
            aria-label='Previous slide'
          >
            <ChevronLeft className='w-6 h-6' />
          </button>
          <button
            type='button'
            onClick={goToNext}
            disabled={!loop && currentIndex === frameCount - 1}
            className='absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed'
            aria-label='Next slide'
          >
            <ChevronRight className='w-6 h-6' />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && frameCount > 1 && (
        <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2'>
          {frames.map((_: BlockInstance, index: number) => (
            <button
              key={index}
              type='button'
              onClick={(): void => goToIndex(index)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slideshow preview (inside columns)
// ---------------------------------------------------------------------------

export function PreviewSlideshowBlock({
  block,
  stretch = false,
}: PreviewSectionBlockProps): React.ReactNode {
  const { stretch: contextStretch } = useBlockContext();
  const resolvedStretch = stretch ?? contextStretch ?? false;
  const {
    inspectorSettings,
    pauseSlideshowOnHoverInEditor,
  } = usePreviewEditor();
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const transition = (block.settings['transition'] as string) || 'fade';
  const transitionDuration = (block.settings['transitionDuration'] as number) || 700;
  const autoplay = (block.settings['autoplay'] as string) !== 'no';
  const autoplaySpeed = (block.settings['autoplaySpeed'] as number) || 5000;
  const pauseOnHover = (block.settings['pauseOnHover'] as string) !== 'no';
  const allowPauseOnHover = pauseOnHover && pauseSlideshowOnHoverInEditor;
  const loop = (block.settings['loop'] as string) !== 'no';
  const elementAnimationType = (block.settings['elementAnimationType'] as string) || 'fade-in';
  const elementAnimationDuration = (block.settings['elementAnimationDuration'] as number) || 400;
  const elementAnimationDelay = (block.settings['elementAnimationDelay'] as number) || 0;
  const elementAnimationEasing = (block.settings['elementAnimationEasing'] as string) || 'ease-out';
  const elementAnimationStagger = (block.settings['elementAnimationStagger'] as number) || 100;
  const showArrows = (block.settings['showArrows'] as string) !== 'no';
  const showDots = (block.settings['showDots'] as string) !== 'no';
  const heightMode = (block.settings['heightMode'] as string) || 'auto';
  const height = (block.settings['height'] as number) || 360;
  const frames = (block.blocks ?? []).filter((b: BlockInstance) => b.type === 'SlideshowFrame');
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

  useEffect((): (() => void) | undefined => {
    if (!autoplay || isPaused || slideCount <= 1 || autoplaySpeed <= 0) return undefined;
    const interval = window.setInterval(goToNext, autoplaySpeed);
    return (): void => window.clearInterval(interval);
  }, [autoplay, autoplaySpeed, isPaused, slideCount, goToNext]);
  useEffect((): void => {
    if (!allowPauseOnHover && isPaused) {
      setIsPaused(false);
    }
  }, [allowPauseOnHover, isPaused]);
  const slideHeightStyle: React.CSSProperties | undefined =
    heightMode === 'fixed' && height > 0 ? { height: `${height}px` } : undefined;

  if (frames.length === 0 && !showEditorChrome) {
    return null;
  }

  return (
    <div className={`relative w-full ${resolvedStretch ? 'h-full' : ''}`}>
      {frames.length === 0 ? (
        showEditorChrome ? (
          <div className='flex min-h-[80px] items-center justify-center rounded border border-dashed border-gray-700/50 bg-gray-900/20 text-[10px] uppercase tracking-wider text-gray-600'>
            Add frames to carousel
          </div>
        ) : null
      ) : (
        <>
          <div
            className='relative overflow-hidden min-h-[200px]'
            style={slideHeightStyle}
            onMouseEnter={allowPauseOnHover ? (): void => setIsPaused(true) : undefined}
            onMouseLeave={allowPauseOnHover ? (): void => setIsPaused(false) : undefined}
          >
            {frames.map((frame: BlockInstance, idx: number) => {
              const frameSettings = (frame.settings ?? {});
              const backgroundColor = (frameSettings['backgroundColor'] as string) || '';
              const contentAlignment = (frameSettings['contentAlignment'] as string) || 'center';
              const verticalAlignment = (frameSettings['verticalAlignment'] as string) || 'center';
              const fillContent = frameSettings['fillContent'] === true || frameSettings['fillContent'] === 'yes';
              const paddingTop = (frameSettings['paddingTop'] as number) || 0;
              const paddingBottom = (frameSettings['paddingBottom'] as number) || 0;
              const paddingLeft = (frameSettings['paddingLeft'] as number) || 0;
              const paddingRight = (frameSettings['paddingRight'] as number) || 0;
              const frameStyle: React.CSSProperties = {
                backgroundColor: backgroundColor || undefined,
                padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
                alignItems:
                  contentAlignment === 'center'
                    ? 'center'
                    : contentAlignment === 'right'
                      ? 'flex-end'
                      : 'flex-start',
                justifyContent:
                  verticalAlignment === 'center'
                    ? 'center'
                    : verticalAlignment === 'bottom'
                      ? 'flex-end'
                      : 'flex-start',
              };
              const frameAnimType = frameSettings['animationType'] as string | undefined;
              const animationType =
                frameAnimType === 'inherit' || !frameAnimType
                  ? elementAnimationType
                  : frameAnimType;
              const resolvedAnimationType = normalizeSlideshowAnimationType(animationType);
              const animationDuration =
                (frameSettings['animationDuration'] as number) ?? elementAnimationDuration;
              const animationDelay =
                (frameSettings['animationDelay'] as number) ?? elementAnimationDelay;
              const frameAnimEasing = frameSettings['animationEasing'] as string | undefined;
              const animationEasing =
                frameAnimEasing === 'inherit' || !frameAnimEasing
                  ? elementAnimationEasing
                  : frameAnimEasing;
              const stagger = elementAnimationStagger;
              const isActiveFrame = idx === currentActiveIndex;
              const frameChildren = frame.blocks ?? [];

              return (
                <div
                  key={frame.id}
                  className={`${transition === 'fade' ? 'absolute inset-0 transition-opacity' : 'absolute inset-0 transition-transform'} flex flex-col`}
                  style={
                    transition === 'fade'
                      ? {
                        opacity: isActiveFrame ? 1 : 0,
                        pointerEvents: isActiveFrame ? 'auto' : 'none',
                        transitionDuration: `${transitionDuration}ms`,
                      }
                      : {
                        transform: `translateX(${(idx - currentActiveIndex) * 100}%)`,
                        transitionDuration: `${transitionDuration}ms`,
                      }
                  }
                >
                  <div className='flex h-full w-full flex-col' style={frameStyle}>
                    <BlockContextProvider value={{ parentBlockId: frame.id }}>
                      {frameChildren.length > 0 ? (
                        frameChildren.map((child: BlockInstance, blockIdx: number) => {
                          const blockDelay = animationDelay + blockIdx * stagger;
                          const animationStyle: React.CSSProperties =
                            isActiveFrame && resolvedAnimationType !== 'none'
                              ? {
                                animation: `cms-anim-${resolvedAnimationType} ${animationDuration}ms ${animationEasing} ${blockDelay}ms both`,
                              }
                              : {};
                          const shouldFillBlock = fillContent && (child.type === 'Image' || child.type === 'ImageElement');
                          const wrapperStyle: React.CSSProperties = shouldFillBlock
                            ? { ...animationStyle, width: '100%', height: '100%', alignSelf: 'stretch' }
                            : animationStyle;
                          const triggerKey = `${child.id}-${currentActiveIndex}-${blockIdx}`;
                          return (
                            <div key={triggerKey} style={wrapperStyle}>
                              <BlockContextProvider value={{ stretch: shouldFillBlock }}>
                                <PreviewBlockItemProxy
                                  block={child}
                                />
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
            })}
          </div>
          {frames.length > 1 && (showArrows || showDots) && (
            <div className='mt-4 flex items-center justify-center gap-4'>
              {showArrows && (
                <button
                  type='button'
                  onClick={goToPrev}
                  className='rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition'
                >
                  <svg className='size-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' /></svg>
                </button>
              )}
              {showDots && (
                <div className='flex gap-2'>
                  {frames.map((_: BlockInstance, idx: number) => (
                    <button
                      key={idx}
                      type='button'
                      onClick={(): void => setActiveIndex(idx)}
                      className={`size-2 rounded-full transition ${idx === currentActiveIndex ? 'bg-white' : 'bg-gray-600'}`}
                    />
                  ))}
                </div>
              )}
              {showArrows && (
                <button
                  type='button'
                  onClick={goToNext}
                  className='rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition'
                >
                  <svg className='size-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' /></svg>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
