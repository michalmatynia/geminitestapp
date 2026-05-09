'use client';

import React from 'react';

import type { BlockInstance } from '@/shared/contracts/cms';
import { cn } from '@/shared/utils/ui-utils';

import { BlockContextProvider } from './context/BlockContext';
import { resolveNodeLabel } from './InspectorOverlay';
import { normalizeSlideshowAnimationType, getSlideshowAlignment, getSlideshowFrameData } from './preview-utils';
import { PreviewNodeSelectionButton } from './PreviewNodeSelectionButton';
import {
  PreviewBlockItemProxy,
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

export const SlideshowFrame = ({
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
  const {
    backgroundColor,
    contentAlignment,
    verticalAlignment,
    fillContent,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    animationType,
    animationDuration,
    animationDelay,
    animationEasing,
  } = getSlideshowFrameData(
    frameSettings,
    elementAnimationType,
    elementAnimationDuration,
    elementAnimationDelay,
    elementAnimationEasing
  );

  const { alignItems, justifyContent } = getSlideshowAlignment(contentAlignment, verticalAlignment);

  const frameStyle: React.CSSProperties = {
    backgroundColor: backgroundColor !== '' ? backgroundColor : undefined,
    padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
    alignItems,
    justifyContent,
  };

  const resolvedAnimationType = normalizeSlideshowAnimationType(animationType);
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
              const blockDelay = animationDelay + blockIdx * elementAnimationStagger;
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
