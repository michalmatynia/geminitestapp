'use client';

import React from 'react';

import { UnifiedButton } from '@/shared/ui';

import { useVersionGraphCompareContext } from './VersionGraphCompareContext';
import { readMeta } from '../utils/metadata';

// ── Component ────────────────────────────────────────────────────────────────

export function VersionGraphComparePanel(): React.JSX.Element {
  const { compareNodes, getSlotImageSrc, onSwap, onExit } = useVersionGraphCompareContext();
  return (
    <div className='border-t border-border/40 p-3'>
      <div className='flex gap-2'>
        {compareNodes.map((cNode) => (
          <div key={cNode.id} className='flex-1 space-y-1'>
            <div className='truncate text-[10px] font-medium text-gray-300'>{cNode.label}</div>
            <div className='aspect-square overflow-hidden rounded border border-border/60 bg-card/30'>
              {getSlotImageSrc(cNode.slot) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getSlotImageSrc(cNode.slot)!}
                  alt={cNode.label}
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>No image</div>
              )}
            </div>
            <div className='text-[9px] text-gray-500'>
              {cNode.type === 'composite' ? 'Composite' : cNode.type === 'merge' ? 'Merge' : cNode.type === 'generation' ? 'Generation' : 'Base'}
              {cNode.hasMask ? ' · Mask' : ''}
            </div>
            {(() => {
              const meta = readMeta(cNode.slot);
              return meta.generationParams?.prompt ? (
                <div className='truncate text-[9px] text-gray-500' title={meta.generationParams.prompt}>
                  {meta.generationParams.prompt.slice(0, 40)}{meta.generationParams.prompt.length > 40 ? '...' : ''}
                </div>
              ) : null;
            })()}
          </div>
        ))}
      </div>

      <div className='mt-2 flex gap-2'>
        <UnifiedButton
          variant='outline'
          size='sm'
          className='flex-1 text-[10px]'
          onClick={onSwap}
        >
          Swap
        </UnifiedButton>
        <UnifiedButton
          variant='outline'
          size='sm'
          className='flex-1 text-[10px]'
          onClick={onExit}
        >
          Exit Compare
        </UnifiedButton>
      </div>
    </div>
  );
}
