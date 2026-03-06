import React from 'react';
import { useVectorCanvasContext } from '../VectorCanvasContext';

export function CanvasCenterGuides(): React.JSX.Element | null {
  const { showCenterGuides, canvasRenderSize } = useVectorCanvasContext();

  if (!showCenterGuides) return null;

  return (
    <div
      data-testid='vector-canvas-center-guides'
      className='pointer-events-none absolute left-1/2 top-0 z-[16] -translate-x-1/2'
      style={{ width: `${canvasRenderSize.width}px`, height: `${canvasRenderSize.height}px` }}
    >
      <div
        data-testid='vector-canvas-center-guides-vertical'
        className='absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-300/70'
      />
      <div
        data-testid='vector-canvas-center-guides-horizontal'
        className='absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cyan-300/70'
      />
    </div>
  );
}
