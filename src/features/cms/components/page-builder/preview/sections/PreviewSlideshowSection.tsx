'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { useCmsPageContext } from '@/features/cms/components/frontend/CmsPageContext';
import { BlockContextProvider } from '@/features/cms/components/page-builder/preview/context/BlockContext';
import {
  usePreviewEditorActions,
  usePreviewEditorState,
} from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import { usePreviewSectionContext } from '@/features/cms/components/page-builder/preview/context/PreviewSectionContext';
import { resolveNodeLabel } from '@/features/cms/components/page-builder/preview/InspectorOverlay';
import {
  getSelectableSurfaceProps,
  normalizeSlideshowAnimationType,
} from '@/features/cms/components/page-builder/preview/preview-utils';
import { PreviewNodeSelectionButton } from '@/features/cms/components/page-builder/preview/PreviewNodeSelectionButton';
import { getSectionContainerClass, getSectionStyles } from '@/features/cms/public';
import type { BlockInstance } from '@/shared/contracts/cms';
import { CompactEmptyState, Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

export function PreviewSlideshowSection() {
  const { colorSchemes } = useCmsPageContext();
  const {
    section,
    selectedRing,
    renderSectionActions,
    renderSelectionButton,
    divider,
    wrapInspector,
    handleSelect,
    PreviewBlockItem,
  } = usePreviewSectionContext();

  const { selectedNodeId, inspectorSettings, pauseSlideshowOnHoverInEditor } = usePreviewEditorState();
  const { onSelect } = usePreviewEditorActions();

  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const sectionStyles = getSectionStyles(section.settings, colorSchemes);

  const slideshowTransition = (section.settings['transition'] as string) || 'fade';
  const slideshowTransitionDuration = (section.settings['transitionDuration'] as number) || 700;
  const slideshowAutoplay = (section.settings['autoplay'] as string) !== 'no';
  const slideshowAutoplaySpeed = (section.settings['autoplaySpeed'] as number) || 5000;
  const slideshowPauseOnHover = (section.settings['pauseOnHover'] as string) !== 'no';
  const slideshowAllowPauseOnHover = slideshowPauseOnHover && pauseSlideshowOnHoverInEditor;
  const slideshowLoop = (section.settings['loop'] as string) !== 'no';

  const slideshowElementAnimationType =
    (section.settings['elementAnimationType'] as string) || 'fade-in';
  const slideshowElementAnimationDuration =
    (section.settings['elementAnimationDuration'] as number) || 400;
  const slideshowElementAnimationDelay = (section.settings['elementAnimationDelay'] as number) || 0;
  const slideshowElementAnimationEasing =
    (section.settings['elementAnimationEasing'] as string) || 'ease-out';
  const slideshowElementAnimationStagger =
    (section.settings['elementAnimationStagger'] as number) || 100;

  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [slideshowPaused, setSlideshowPaused] = useState(false);

  const slideshowFrames = useMemo((): BlockInstance[] => {
    return section.blocks.filter((block: BlockInstance) => block.type === 'SlideshowFrame');
  }, [section.blocks]);

  const slideCount = slideshowFrames.length;
  const currentSlideshowIndex = slideshowIndex >= slideCount ? 0 : slideshowIndex;

  const goToNextSlideshow = useCallback((): void => {
    if (slideCount <= 1) return;
    if (!slideshowLoop && currentSlideshowIndex >= slideCount - 1) return;
    setSlideshowIndex((prev: number) => (prev + 1) % slideCount);
  }, [slideCount, slideshowLoop, currentSlideshowIndex]);

  const goToPrevSlideshow = useCallback((): void => {
    if (slideCount <= 1) return;
    if (!slideshowLoop && currentSlideshowIndex <= 0) return;
    setSlideshowIndex((prev: number) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount, slideshowLoop, currentSlideshowIndex]);

  useEffect((): void => {
    if (slideshowIndex >= slideCount) {
      setSlideshowIndex(0);
    }
  }, [slideCount, slideshowIndex]);

  useEffect((): void => {
    const selectedFrameIndex = slideshowFrames.findIndex((frame) => frame.id === selectedNodeId);
    if (selectedFrameIndex >= 0 && selectedFrameIndex !== currentSlideshowIndex) {
      setSlideshowIndex(selectedFrameIndex);
    }
  }, [currentSlideshowIndex, selectedNodeId, slideshowFrames]);

  useEffect((): (() => void) | undefined => {
    if (!slideshowAutoplay || slideshowPaused || slideCount <= 1 || slideshowAutoplaySpeed <= 0) {
      return undefined;
    }
    const interval = window.setInterval(goToNextSlideshow, slideshowAutoplaySpeed);
    return (): void => window.clearInterval(interval);
  }, [slideshowAutoplay, slideshowPaused, slideCount, slideshowAutoplaySpeed, goToNextSlideshow]);

  useEffect((): void => {
    if (!slideshowAllowPauseOnHover && slideshowPaused) {
      setSlideshowPaused(false);
    }
  }, [slideshowAllowPauseOnHover, slideshowPaused]);

  const showArrows = (section.settings['showArrows'] as string) !== 'no';
  const showDots = (section.settings['showDots'] as string) !== 'no';
  const heightMode = (section.settings['heightMode'] as string) || 'auto';
  const height = (section.settings['height'] as number) || 360;
  const slideHeightStyle: React.CSSProperties | undefined =
    heightMode === 'fixed' && height > 0 ? { height: `${height}px` } : undefined;
  const selectableSectionProps = getSelectableSurfaceProps((event) => {
    event.stopPropagation();
    handleSelect();
  });

  return wrapInspector(
    <div
      {...selectableSectionProps}
      style={sectionStyles}
      className={`relative group w-full text-left transition cursor-pointer ${selectedRing} cms-node-${section.id}`}
    >
      {renderSelectionButton()}
      {renderSectionActions()}
      {divider}
      {slideCount === 0 ? (
        showEditorChrome ? (
          <div className='container mx-auto px-4 md:px-6 py-12'>
            <CompactEmptyState
              title='No slides'
              description='Add blocks to create slideshow slides.'
              className='bg-card/20'
             />
          </div>
        ) : null
      ) : (
        <div
          className={getSectionContainerClass({
            fullWidth: true,
            paddingClass: 'px-0',
          })}
        >
          <div
            className='relative overflow-hidden min-h-[300px]'
            style={slideHeightStyle}
            onMouseEnter={
              slideshowAllowPauseOnHover ? (): void => setSlideshowPaused(true) : undefined
            }
            onMouseLeave={
              slideshowAllowPauseOnHover ? (): void => setSlideshowPaused(false) : undefined
            }
          >
            {slideshowFrames.map((frame: BlockInstance, idx: number) => {
              const frameSettings = frame.settings ?? {};
              const frameLabel = resolveNodeLabel('Slideshow Frame', frameSettings['label']);
              const backgroundColor = (frameSettings['backgroundColor'] as string) || '';
              const contentAlignment = (frameSettings['contentAlignment'] as string) || 'center';
              const verticalAlignment = (frameSettings['verticalAlignment'] as string) || 'center';
              const fillContent =
                frameSettings['fillContent'] === true || frameSettings['fillContent'] === 'yes';
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
                  ? slideshowElementAnimationType
                  : frameAnimType;
              const resolvedAnimationType = normalizeSlideshowAnimationType(animationType);
              const animationDuration =
                (frameSettings['animationDuration'] as number) ?? slideshowElementAnimationDuration;
              const animationDelay =
                (frameSettings['animationDelay'] as number) ?? slideshowElementAnimationDelay;
              const frameAnimEasing = frameSettings['animationEasing'] as string | undefined;
              const animationEasing =
                frameAnimEasing === 'inherit' || !frameAnimEasing
                  ? slideshowElementAnimationEasing
                  : frameAnimEasing;
              const stagger = slideshowElementAnimationStagger;
              const isActiveFrame = idx === currentSlideshowIndex;
              const isFrameSelected = selectedNodeId === frame.id;
              const frameBlocks = frame.blocks ?? [];

              return (
                <div
                  key={frame.id}
                  className={`${slideshowTransition === 'fade' ? 'absolute inset-0 transition-opacity' : 'absolute inset-0 transition-transform'} flex flex-col`}
                  style={
                    slideshowTransition === 'fade'
                      ? {
                        opacity: isActiveFrame ? 1 : 0,
                        pointerEvents: isActiveFrame ? 'auto' : 'none',
                        transitionDuration: `${slideshowTransitionDuration}ms`,
                      }
                      : {
                        transform: `translateX(${(idx - currentSlideshowIndex) * 100}%)`,
                        transitionDuration: `${slideshowTransitionDuration}ms`,
                      }
                  }
                >
                  <div className='relative group flex h-full w-full flex-col' style={frameStyle}>
                    {showEditorChrome ? (
                      <PreviewNodeSelectionButton
                        label={`Select block ${frameLabel}`}
                        selected={isFrameSelected}
                        onSelect={() => {
                          setSlideshowIndex(idx);
                          onSelect?.(frame.id);
                        }}
                        className='left-2 top-2 size-6'
                      />
                    ) : null}
                    {frameBlocks.length > 0 ? (
                      frameBlocks.map((child: BlockInstance, blockIdx: number) => {
                        const blockDelay = animationDelay + blockIdx * stagger;
                        const animationStyle: React.CSSProperties =
                          isActiveFrame && resolvedAnimationType !== 'none'
                            ? {
                              animation: `cms-anim-${resolvedAnimationType} ${animationDuration}ms ${animationEasing} ${blockDelay}ms both`,
                            }
                            : {};
                        const shouldFillBlock =
                          fillContent && (child.type === 'Image' || child.type === 'ImageElement');
                        const wrapperStyle: React.CSSProperties = shouldFillBlock
                          ? {
                            ...animationStyle,
                            width: '100%',
                            height: '100%',
                            alignSelf: 'stretch',
                          }
                          : animationStyle;

                        return (
                          <div
                            key={`${child.id}-${currentSlideshowIndex}-${blockIdx}`}
                            style={wrapperStyle}
                          >
                            <BlockContextProvider
                              value={{ contained: true, stretch: shouldFillBlock }}
                            >
                              <PreviewBlockItem block={child} />
                            </BlockContextProvider>
                          </div>
                        );
                      })
                    ) : (
                      <CompactEmptyState
                        title='Empty slide'
                        description='Add content to this slide.'
                        className='bg-transparent border-none'
                       />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {slideCount > 1 && (showArrows || showDots) && (
            <div className='mt-4 flex items-center justify-center gap-4'>
              {showArrows && (
                <Button
                  variant='outline'
                  size='icon'
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    goToPrevSlideshow();
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
                  {slideshowFrames.map((_: BlockInstance, idx: number) => (
                    <Button
                      key={idx}
                      variant='ghost'
                      onClick={(e: React.MouseEvent): void => {
                        e.stopPropagation();
                        setSlideshowIndex(idx);
                      }}
                      className={cn(
                        'size-2 min-w-0 rounded-full p-0 transition-all hover:bg-white/40',
                        idx === currentSlideshowIndex ? 'bg-white' : 'bg-gray-600'
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
                    goToNextSlideshow();
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
          )}
        </div>
      )}
    </div>
  );
}
