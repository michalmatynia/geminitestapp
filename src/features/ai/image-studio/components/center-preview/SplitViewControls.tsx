'use client';

import { ArrowLeftRight, Eye, EyeOff } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui';

type SplitViewControlsProps = {
  singleVariantView: 'variant' | 'source';
  splitVariantView: boolean;
  onToggleSourceVariantView: () => void;
  onToggleSplitVariantView: () => void;
};

export function SplitViewControls({
  singleVariantView,
  splitVariantView,
  onToggleSourceVariantView,
  onToggleSplitVariantView,
}: SplitViewControlsProps): React.JSX.Element {
  return (
    <div className='absolute bottom-2 left-2 z-20 flex items-center gap-2'>
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={onToggleSourceVariantView}
        disabled={splitVariantView}
        className='h-7 w-7 bg-background/90 px-0 backdrop-blur'
        title={singleVariantView === 'variant' ? 'View source' : 'View variant'}
        aria-label={singleVariantView === 'variant' ? 'View source' : 'View variant'}
      >
        {singleVariantView === 'variant' ? (
          <Eye className='size-3.5' />
        ) : (
          <EyeOff className='size-3.5' />
        )}
      </Button>
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={onToggleSplitVariantView}
        className='h-7 w-7 bg-background/90 px-0 backdrop-blur'
        title={splitVariantView ? 'Exit split view' : 'Split view'}
        aria-label={splitVariantView ? 'Exit split view' : 'Split view'}
      >
        <ArrowLeftRight className='size-3.5' />
      </Button>
    </div>
  );
}
