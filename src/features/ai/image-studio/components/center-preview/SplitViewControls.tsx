'use client';

import { ArrowLeftRight, Eye, EyeOff, Undo2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui';

import { useCenterPreviewContext } from './CenterPreviewContext';

type SplitViewControlsProps = {
  canCompare: boolean;
  onGoToSourceSlot: () => void;
  onToggleSourceVariantView: () => void;
  onToggleSplitVariantView: () => void;
};

export function SplitViewControls({
  canCompare,
  onGoToSourceSlot,
  onToggleSourceVariantView,
  onToggleSplitVariantView,
}: SplitViewControlsProps): React.JSX.Element {
  const { singleVariantView, splitVariantView } = useCenterPreviewContext();

  return (
    <div className='absolute bottom-2 left-2 z-20 flex items-center gap-2'>
      <Button
        size='xs'
        type='button'
        variant='outline'
        onClick={onGoToSourceSlot}
        className='h-7 w-7 bg-background/90 px-0 backdrop-blur'
        title='Go to source slot'
        aria-label='Go to source slot'
      >
        <Undo2 className='size-3.5' />
      </Button>
      <Button
        size='xs'
        type='button'
        variant='outline'
        onClick={onToggleSourceVariantView}
        disabled={splitVariantView || !canCompare}
        className='h-7 w-7 bg-background/90 px-0 backdrop-blur'
        title={
          canCompare
            ? singleVariantView === 'variant'
              ? 'View source'
              : 'View variant'
            : 'Source/variant toggle unavailable'
        }
        aria-label={singleVariantView === 'variant' ? 'View source' : 'View variant'}
      >
        {singleVariantView === 'variant' ? (
          <Eye className='size-3.5' />
        ) : (
          <EyeOff className='size-3.5' />
        )}
      </Button>
      <Button
        size='xs'
        type='button'
        variant='outline'
        onClick={onToggleSplitVariantView}
        disabled={!canCompare}
        className='h-7 w-7 bg-background/90 px-0 backdrop-blur'
        title={
          canCompare
            ? splitVariantView
              ? 'Exit split view'
              : 'Split view'
            : 'Split compare unavailable'
        }
        aria-label={splitVariantView ? 'Exit split view' : 'Split view'}
      >
        <ArrowLeftRight className='size-3.5' />
      </Button>
    </div>
  );
}
