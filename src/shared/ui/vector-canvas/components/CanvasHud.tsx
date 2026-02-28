import React from 'react';
import { Button } from '../../button';

interface CanvasHudProps {
  show: boolean;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function CanvasHud({
  show,
  scale,
  onZoomIn,
  onZoomOut,
  onFit,
}: CanvasHudProps): React.JSX.Element | null {
  if (!show) return null;

  return (
    <div className='absolute bottom-2 right-2 z-10 flex items-center gap-1'>
      <Button
        variant='outline'
        size='sm'
        className='h-6 bg-black/60 px-2 text-[11px] text-white/90'
        onClick={onZoomOut}
        title='Zoom out'
        aria-label='Zoom out'
      >
        -
      </Button>
      <div className='rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white/90'>
        {Math.round(scale * 100)}%
      </div>
      <Button
        variant='outline'
        size='sm'
        className='h-6 bg-black/60 px-2 text-[11px] text-white/90'
        onClick={onZoomIn}
        title='Zoom in'
        aria-label='Zoom in'
      >
        +
      </Button>
      <Button
        variant='outline'
        size='sm'
        className='h-6 bg-black/60 px-2 text-[11px] text-white/90'
        onClick={onFit}
      >
        Fit
      </Button>
    </div>
  );
}
