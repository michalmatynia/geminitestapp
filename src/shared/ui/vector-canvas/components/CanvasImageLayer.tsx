import React, { forwardRef } from 'react';

import { useVectorCanvasContext } from '../VectorCanvasContext';

export const CanvasImageLayer = forwardRef<HTMLImageElement>(
  (_props, ref): React.JSX.Element | null => {
    const { src, canvasRenderSize, resolvedImageOffset, syncCanvasSize } = useVectorCanvasContext();

    if (src === undefined || src === null || src.length === 0) return null;

    return (
      <img
        ref={ref}
        src={src}
        alt='Canvas Source'
        className='pointer-events-none absolute z-[2] select-none object-contain object-top'
        style={{
          width: `${canvasRenderSize.width}px`,
          height: `${canvasRenderSize.height}px`,
          left: `calc(50% + ${resolvedImageOffset.x}px)`,
          top: `${resolvedImageOffset.y}px`,
          transform: 'translateX(-50%)',
        }}
        onLoad={syncCanvasSize}
        draggable={false}
      />
    );
  }
);

CanvasImageLayer.displayName = 'CanvasImageLayer';
