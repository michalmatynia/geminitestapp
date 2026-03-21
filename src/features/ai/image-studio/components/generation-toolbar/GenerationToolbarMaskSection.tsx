import { Play } from 'lucide-react';
import React from 'react';

import { Button, InsetPanel, SelectSimple, ToggleRow } from '@/shared/ui';

import { useGenerationToolbarContext, type MaskAttachMode } from './GenerationToolbarContext';
import { useGenerationToolbarMaskSectionRuntime } from './GenerationToolbarSectionContexts';

export function GenerationToolbarMaskSection(): React.JSX.Element {
  const { maskAttachMode, setMaskAttachMode } = useGenerationToolbarContext();
  const {
    exportMaskCount,
    maskAttachModeOptions,
    maskGenerationBusy,
    maskGenerationLabel,
    maskGenLoading,
    maskGenMode,
    maskInvert,
    maskModeOptions,
    maskPreviewEnabled,
    onAttachMasks,
    onGenerateMask,
    onMaskGenModeChange,
    onMaskInvertChange,
    onMaskPreviewEnabledChange,
    workingSlotPresent,
  } = useGenerationToolbarMaskSectionRuntime();

  return (
    <InsetPanel radius='compact' padding='sm'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>Mask</div>
        <span className='text-[11px] text-gray-400 whitespace-nowrap'>
          {exportMaskCount > 0
            ? `${exportMaskCount} mask shape${exportMaskCount > 1 ? 's' : ''}`
            : 'No mask'}
        </span>
      </div>

      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
        <SelectSimple
          size='sm'
          className='w-full'
          value={maskGenMode}
          onValueChange={onMaskGenModeChange}
          options={maskModeOptions}
          placeholder={maskGenLoading ? 'Detecting...' : 'Smart Mask'}
          triggerClassName='h-8 text-xs'
          disabled={maskGenLoading || !workingSlotPresent}
          ariaLabel='Smart mask mode'
         title={maskGenLoading ? 'Detecting...' : 'Smart Mask'}/>
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={onGenerateMask}
          disabled={!workingSlotPresent || maskGenerationBusy}
          className='sm:min-w-[160px]'
          loading={maskGenerationBusy}
        >
          {!maskGenerationBusy && <Play className='mr-2 size-4' />}
          {maskGenerationLabel}
        </Button>
      </div>

      <div className='mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
        <SelectSimple
          size='sm'
          className='w-full'
          value={maskAttachMode}
          onValueChange={(val) => setMaskAttachMode(val as MaskAttachMode)}
          options={maskAttachModeOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Mask attach mode'
         title='Select option'/>
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={onAttachMasks}
          disabled={!workingSlotPresent || exportMaskCount === 0}
          title='Create and attach white/black masks and their inverted variants'
          className='sm:min-w-[140px]'
        >
          Attach Masks
        </Button>
      </div>

      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <ToggleRow
          label='Mask Preview'
          checked={maskPreviewEnabled}
          onCheckedChange={onMaskPreviewEnabledChange}
          disabled={!workingSlotPresent || exportMaskCount === 0}
          className='bg-card/40 border-border/60 px-2 py-1'
          labelClassName='text-[11px] text-gray-300'
        />
        <ToggleRow
          label='Invert'
          checked={maskInvert}
          onCheckedChange={onMaskInvertChange}
          disabled={!maskPreviewEnabled || exportMaskCount === 0}
          className='bg-card/40 border-border/60 px-2 py-1'
          labelClassName='text-[11px] text-gray-300'
        />
      </div>
    </InsetPanel>
  );
}
