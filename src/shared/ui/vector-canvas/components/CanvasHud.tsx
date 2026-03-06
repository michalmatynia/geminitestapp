import React from 'react';
import { Button } from '../../button';
import { useVectorCanvasContext } from '../VectorCanvasContext';

interface CanvasHudProps {
  show: boolean;
}

export function CanvasHud(props: CanvasHudProps): React.JSX.Element | null {
  const { show } = props;
  const { viewTransform, handleZoomIn, handleZoomOut, handleFitToScreen } = useVectorCanvasContext();

  if (!show) return null;

  return (
    <div className='absolute bottom-2 right-2 z-10 flex items-center gap-1'>
      <Button
        variant='outline'
        size='sm'
        className='h-6 bg-black/60 px-2 text-[11px] text-white/90'
        onClick={handleZoomOut}
        title='Zoom out'
        aria-label='Zoom out'
      >
        -
      </Button>
      <div className='rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white/90'>
        {Math.round(viewTransform.scale * 100)}%
      </div>
      <Button
        variant='outline'
        size='sm'
        className='h-6 bg-black/60 px-2 text-[11px] text-white/90'
        onClick={handleZoomIn}
        title='Zoom in'
        aria-label='Zoom in'
      >
        +
      </Button>
      <Button
        variant='outline'
        size='sm'
        className='h-6 bg-black/60 px-2 text-[11px] text-white/90'
        onClick={handleFitToScreen}
      >
        Fit
      </Button>
    </div>
  );
}
