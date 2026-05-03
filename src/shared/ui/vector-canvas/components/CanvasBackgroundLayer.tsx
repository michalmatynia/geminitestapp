import React from 'react';

import { useVectorCanvasContext } from '../VectorCanvasContext';

export function CanvasBackgroundLayer(): React.JSX.Element | null {
  const { backgroundLayerEnabled, backgroundColor, canvasRenderSize } = useVectorCanvasContext();

  if (!backgroundLayerEnabled) return null;

  return (
    <div
      className='pointer-events-none absolute left-1/2 top-0 z-[1] -translate-x-1/2 border border-slate-700/70'
      style={{
        width: `${canvasRenderSize.width}px`,
        height: `${canvasRenderSize.height}px`,
        backgroundColor,
      }}
    />
  );
}
