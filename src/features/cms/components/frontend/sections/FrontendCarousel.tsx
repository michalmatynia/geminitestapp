'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';

import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';
import { SectionDataProvider } from './SectionDataContext';

import type { BlockInstance } from '@/features/cms/types/page-builder';

const getAlignmentClass = (alignment: string): string => {
  if (alignment === 'center') return 'items-center justify-center';
  if (alignment === 'right') return 'items-end justify-end';
  return 'items-start justify-start';
};

const getVerticalAlignmentClass = (alignment: string): string => {
  if (alignment === 'center') return 'justify-center';
  if (alignment === 'bottom') return 'justify-end';
  return 'justify-start';
};

const getAnimationStyles = (
  animationType: string,
  isActive: boolean,
  duration: number,
  delay: number,
  easing: string
): React.CSSProperties => {
  const baseTransition = `all ${duration}ms ${easing} ${delay}ms`;

  if (!isActive) {
    // Initial/hidden state
    switch (animationType) {
      case 'fade-in':
        return { opacity: 0, transition: baseTransition };
      case 'slide-up':
        return { opacity: 0, transform: 'translateY(30px)', transition: baseTransition };
      case 'slide-down':
        return { opacity: 0, transform: 'translateY(-30px)', transition: baseTransition };
      case 'slide-left':
        return { opacity: 0, transform: 'translateX(30px)', transition: baseTransition };
      case 'slide-right':
        return { opacity: 0, transform: 'translateX(-30px)', transition: baseTransition };
      case 'zoom-in':
        return { opacity: 0, transform: 'scale(0.9)', transition: baseTransition };
      case 'zoom-out':
        return { opacity: 0, transform: 'scale(1.1)', transition: baseTransition };
      default:
        return {};
    }
  }

  // Active/visible state
  return {
    opacity: 1,
    transform: 'translateY(0) translateX(0) scale(1)',
    transition: baseTransition,
  };
};

// Helper to parse boolean settings that may be boolean or string "true"/"false"
const parseBoolSetting = (value: unknown, defaultValue: boolean = true): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
};

export function FrontendCarousel(): React.ReactNode {
  const { settings, blocks } = useSectionBlockData();
  const frames = blocks.filter((b: BlockInstance) => b.type === 'CarouselFrame');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const autoPlay = parseBoolSetting(settings['autoPlay'], true);
  const autoPlaySpeed = (settings['autoPlaySpeed'] as number) || 5000;
  const loop = parseBoolSetting(settings['loop'], true);
  const showNavigation = parseBoolSetting(settings['showNavigation'], true);
  const showIndicators = parseBoolSetting(settings['showIndicators'], true);
  const transitionType = (settings['transitionType'] as string) || 'slide';
  const transitionDuration = (settings['transitionDuration'] as number) || 500;
  const pauseOnHover = parseBoolSetting(settings['pauseOnHover'], true);
  const heightMode = (settings['heightMode'] as string) || 'auto';
  const fixedHeight = (settings['height'] as number) || 400;

  const frameCount = frames.length;

  const goToNext = useCallback((): void => {
    if (frameCount === 0) return;
    if (!loop && currentIndex >= frameCount - 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev: number) => (prev + 1) % frameCount);
    setTimeout(() => setIsTransitioning(false), transitionDuration);
  }, [frameCount, loop, currentIndex, transitionDuration]);

  const goToPrev = useCallback((): void => {
    if (frameCount === 0) return;
    if (!loop && currentIndex <= 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev: number) => (prev - 1 + frameCount) % frameCount);
    setTimeout(() => setIsTransitioning(false), transitionDuration);
  }, [frameCount, loop, currentIndex, transitionDuration]);

  const goToIndex = useCallback(
    (index: number) => {
      if (index === currentIndex) return;
      setIsTransitioning(true);
      setCurrentIndex(index);
      setTimeout(() => setIsTransitioning(false), transitionDuration);
    },
    [currentIndex, transitionDuration]
  );

  // Auto play
  useEffect(() => {
    if (!autoPlay || isPaused || frameCount <= 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(goToNext, autoPlaySpeed);
    return (): void => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoPlay, autoPlaySpeed, isPaused, frameCount, goToNext]);

  if (frameCount === 0) {
    return (
      <div className='flex items-center justify-center p-8 text-gray-400 border border-dashed border-gray-300 rounded'>
        No carousel frames
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    ...(heightMode === 'fixed' ? { height: `${fixedHeight}px` } : {}),
  };

  return (
    <SectionDataProvider settings={settings}>
      <div
        className='relative w-full overflow-hidden'
        style={containerStyle}
        onMouseEnter={() => pauseOnHover && setIsPaused(true)}
        onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      >
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
            const animationType = (frameSettings['animationType'] as string) || 'fade-in';
            const animationDuration = (frameSettings['animationDuration'] as number) || 500;
            const animationDelay = (frameSettings['animationDelay'] as number) || 0;
            const animationEasing = (frameSettings['animationEasing'] as string) || 'ease-out';

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
                  transition:
                      transitionType === 'fade'
                        ? `opacity ${transitionDuration}ms ease-in-out`
                        : undefined,
                }),
            };

            const contentAnimationStyles = getAnimationStyles(
              animationType,
              isActive && !isTransitioning,
              animationDuration,
              animationDelay,
              animationEasing
            );

            return (
              <div
                key={frame.id}
                className={`flex flex-col ${getAlignmentClass(contentAlignment)} ${getVerticalAlignmentClass(verticalAlignment)}`}
                style={frameStyle}
              >
                <div style={contentAnimationStyles}>
                  {(frame.blocks ?? []).map((block: BlockInstance) => (
                    <FrontendBlockRenderer key={block.id} block={block} />
                  ))}
                </div>
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
                onClick={() => goToIndex(index)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </SectionDataProvider>
  );
}
