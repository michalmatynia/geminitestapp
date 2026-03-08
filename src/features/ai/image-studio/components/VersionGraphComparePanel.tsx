'use client';

import { Info } from 'lucide-react';
import React, { useMemo } from 'react';

import { Button } from '@/shared/ui';

import { useVersionGraphCompareContext } from './VersionGraphCompareContext';
import { useSettingsState } from '../context/SettingsContext';
import { getImageStudioDocTooltip } from '@/features/ai/image-studio/utils/studio-docs';
import { compareGenerationParams } from '@/features/ai/image-studio/utils/version-graph-compare';

// ── Component ────────────────────────────────────────────────────────────────

export function VersionGraphComparePanel(): React.JSX.Element {
  const { studioSettings } = useSettingsState();
  const { compareNodes, getSlotImageSrc, onOpenDetails, onSwap, onExit } =
    useVersionGraphCompareContext();
  const versionGraphTooltipsEnabled = studioSettings.helpTooltips.versionGraphButtonsEnabled;
  const tooltipContent = useMemo(
    () => ({
      openDetails: getImageStudioDocTooltip('version_graph_compare_open_details'),
      swap: getImageStudioDocTooltip('version_graph_compare_swap'),
      exit: getImageStudioDocTooltip('version_graph_compare_exit'),
    }),
    []
  );

  const paramRows = useMemo(
    () => compareGenerationParams(compareNodes[0].slot, compareNodes[1].slot),
    [compareNodes]
  );

  return (
    <div className='border-t border-border/40 p-3'>
      {/* Image thumbnails */}
      <div className='flex gap-2'>
        {compareNodes.map((cNode) => (
          <div key={cNode.id} className='flex-1 space-y-1'>
            <div className='truncate text-[10px] font-medium text-gray-300'>{cNode.label}</div>
            {onOpenDetails ? (
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='size-5 p-0 rounded border border-blue-400/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200'
                  title={versionGraphTooltipsEnabled ? tooltipContent.openDetails : undefined}
                  aria-label='Open full node/file details'
                  onClick={() => onOpenDetails(cNode.id)}
                >
                  <Info className='size-3' />
                </Button>
              </div>
            ) : (
              <div className='h-5' />
            )}
            <div className='aspect-square w-full overflow-hidden rounded border border-border/60 bg-card/30'>
              {getSlotImageSrc(cNode.slot) ? (
                <img
                  src={getSlotImageSrc(cNode.slot)!}
                  alt={cNode.label}
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>
                  No image
                </div>
              )}
            </div>
            <div className='text-[9px] text-gray-500'>
              {cNode.type === 'composite'
                ? 'Composite'
                : cNode.type === 'merge'
                  ? 'Merge'
                  : cNode.type === 'generation'
                    ? 'Generation'
                    : 'Base'}
              {cNode.hasMask ? ' · Mask' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Parameter diff table */}
      {paramRows.length > 0 ? (
        <div className='mt-2 space-y-0.5'>
          <div className='text-[9px] font-medium uppercase tracking-wide text-gray-500'>
            Parameters
          </div>
          {paramRows.map((row) => (
            <div key={row.field} className='grid grid-cols-[60px_1fr_1fr] gap-1 text-[9px]'>
              <span className='truncate text-gray-500'>{row.field}</span>
              <span
                className={`truncate ${row.isDifferent ? 'text-amber-400' : 'text-gray-400'}`}
                title={row.valueA ?? undefined}
              >
                {row.valueA ?? '—'}
              </span>
              <span
                className={`truncate ${row.isDifferent ? 'text-amber-400' : 'text-gray-400'}`}
                title={row.valueB ?? undefined}
              >
                {row.valueB ?? '—'}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Actions */}
      <div className='mt-2 flex gap-2'>
        <Button
          size='xs'
          variant='outline'
          className='flex-1 text-[10px]'
          title={versionGraphTooltipsEnabled ? tooltipContent.swap : undefined}
          onClick={onSwap}
        >
          Swap
        </Button>
        <Button
          size='xs'
          variant='outline'
          className='flex-1 text-[10px]'
          title={versionGraphTooltipsEnabled ? tooltipContent.exit : undefined}
          onClick={onExit}
        >
          Exit Compare
        </Button>
      </div>
    </div>
  );
}
