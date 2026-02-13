'use client';

import React, { useMemo } from 'react';

import { UnifiedButton } from '@/shared/ui';

import { useVersionGraphCompareContext } from './VersionGraphCompareContext';
import { compareGenerationParams } from '../utils/version-graph-compare';

// ── Component ────────────────────────────────────────────────────────────────

export function VersionGraphComparePanel(): React.JSX.Element {
  const { compareNodes, getSlotImageSrc, onSwap, onExit } = useVersionGraphCompareContext();

  const paramRows = useMemo(
    () => compareGenerationParams(compareNodes[0].slot, compareNodes[1].slot),
    [compareNodes],
  );

  return (
    <div className='border-t border-border/40 p-3'>
      {/* Image thumbnails */}
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
          </div>
        ))}
      </div>

      {/* Parameter diff table */}
      {paramRows.length > 0 ? (
        <div className='mt-2 space-y-0.5'>
          <div className='text-[9px] font-medium uppercase tracking-wide text-gray-500'>Parameters</div>
          {paramRows.map((row) => (
            <div key={row.field} className='grid grid-cols-[60px_1fr_1fr] gap-1 text-[9px]'>
              <span className='truncate text-gray-500'>{row.field}</span>
              <span className={`truncate ${row.isDifferent ? 'text-amber-400' : 'text-gray-400'}`} title={row.valueA ?? undefined}>
                {row.valueA ?? '—'}
              </span>
              <span className={`truncate ${row.isDifferent ? 'text-amber-400' : 'text-gray-400'}`} title={row.valueB ?? undefined}>
                {row.valueB ?? '—'}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Actions */}
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
