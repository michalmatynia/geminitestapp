import React from 'react';

interface CanvasCenterGuidesProps {
  show: boolean;
  width: number;
  height: number;
}

export function CanvasCenterGuides({
  show,
  width,
  height,
}: CanvasCenterGuidesProps): React.JSX.Element | null {
  if (!show) return null;

  return (
    <div
      data-testid='vector-canvas-center-guides'
      className='pointer-events-none absolute left-1/2 top-0 z-[16] -translate-x-1/2'
      style={{ width: `${width}px`, height: `${height}px` }}
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
