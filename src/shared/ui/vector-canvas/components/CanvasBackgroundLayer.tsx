import React from 'react';

interface CanvasBackgroundLayerProps {
  enabled: boolean;
  color?: string;
  width: number;
  height: number;
}

export function CanvasBackgroundLayer({
  enabled,
  color,
  width,
  height,
}: CanvasBackgroundLayerProps): React.JSX.Element | null {
  if (!enabled) return null;

  return (
    <div
      className='pointer-events-none absolute left-1/2 top-0 z-[1] -translate-x-1/2 border border-slate-700/70'
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: color,
      }}
    />
  );
}
