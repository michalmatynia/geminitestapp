import React, { forwardRef } from 'react';

interface CanvasImageLayerProps {
  src: string | null | undefined;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  onLoad: () => void;
}

export const CanvasImageLayer = forwardRef<HTMLImageElement, CanvasImageLayerProps>(
  ({ src, width, height, offsetX, offsetY, onLoad }, ref): React.JSX.Element | null => {
    if (!src) return null;

    return (
      /* eslint-disable @next/next/no-img-element */
      <img
        ref={ref}
        src={src}
        alt='Canvas Source'
        className='pointer-events-none absolute z-[2] select-none object-contain object-top'
        style={{
          width: `${width}px`,
          height: `${height}px`,
          left: `calc(50% + ${offsetX}px)`,
          top: `${offsetY}px`,
          transform: 'translateX(-50%)',
        }}
        onLoad={onLoad}
        draggable={false}
      />
    );
  }
);

CanvasImageLayer.displayName = 'CanvasImageLayer';
