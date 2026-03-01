'use client';

import React from 'react';

export interface CanvasSelectionMarqueeProps {
  rect: { left: number; top: number; width: number; height: number };
}

export function CanvasSelectionMarquee({ rect }: CanvasSelectionMarqueeProps): React.JSX.Element {
  return (
    <div
      className='absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-[60]'
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}
