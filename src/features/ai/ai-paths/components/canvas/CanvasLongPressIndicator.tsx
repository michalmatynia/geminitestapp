'use client';

import React from 'react';

export interface CanvasLongPressIndicatorProps {
  indicator: { clientX: number; clientY: number; progress: number };
}

export function CanvasLongPressIndicator({
  indicator,
}: CanvasLongPressIndicatorProps): React.JSX.Element {
  return (
    <div
      className='absolute z-[70] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40 bg-white/10 pointer-events-none'
      style={{
        left: indicator.clientX,
        top: indicator.clientY,
        transform: `translate(-50%, -50%) scale(${indicator.progress})`,
        opacity: 1 - indicator.progress,
      }}
    />
  );
}
