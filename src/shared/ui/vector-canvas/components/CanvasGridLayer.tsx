import React from 'react';
import { useVectorCanvasContext } from '../VectorCanvasContext';

export function CanvasGridLayer(): React.JSX.Element | null {
  const { showCanvasGrid, canvasRenderSize } = useVectorCanvasContext();

  if (!showCanvasGrid) return null;

  return (
    <div
      className='pointer-events-none absolute left-1/2 top-0 z-[5] -translate-x-1/2 border border-slate-700/70 bg-transparent [background-size:24px_24px] [background-image:linear-gradient(to_right,rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.22)_1px,transparent_1px)]'
      style={{ width: `${canvasRenderSize.width}px`, height: `${canvasRenderSize.height}px` }}
    />
  );
}
