'use client';

import React from 'react';

import type { BlockInstance } from '@/shared/contracts/cms';

import { BlockContextProvider } from './context/BlockContext';
import { getCarouselAlignmentClasses, getCarouselFrameStyle } from './preview-utils';
import { PreviewBlockItemProxy } from './PreviewCarouselShared';

interface CarouselFrameProps {
  frame: BlockInstance;
  index: number;
  currentIndex: number;
  transitionType: string;
  transitionDuration: number;
  getParentBlockContextValue: (id: string) => { parentBlockId: string };
}

export const CarouselFrame = ({
  frame,
  index,
  currentIndex,
  transitionType,
  transitionDuration,
  getParentBlockContextValue,
}: CarouselFrameProps): React.ReactNode => {
  const isActive = index === currentIndex;
  const frameSettings = frame.settings ?? {};
  const contentAlignment = (frameSettings['contentAlignment'] as string | undefined) ?? 'center';
  const verticalAlignment = (frameSettings['verticalAlignment'] as string | undefined) ?? 'center';

  const frameStyle = getCarouselFrameStyle({
    frameSettings,
    transitionType,
    transitionDuration,
    isActive,
    index,
  });

  const { alignmentClass, verticalAlignmentClass } = getCarouselAlignmentClasses(contentAlignment, verticalAlignment);
  const frameChildren = frame.blocks ?? [];

  return (
    <div
      className={`flex flex-col ${alignmentClass} ${verticalAlignmentClass}`}
      style={frameStyle}
    >
      <BlockContextProvider value={getParentBlockContextValue(frame.id)}>
        {frameChildren.map((child: BlockInstance) => (
          <PreviewBlockItemProxy key={child.id} block={child} />
        ))}
      </BlockContextProvider>
    </div>
  );
};
