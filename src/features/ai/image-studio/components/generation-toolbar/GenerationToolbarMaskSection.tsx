import { Play } from 'lucide-react';
import React from 'react';

import { Button, SelectSimple, Switch } from '@/shared/ui';

type SelectOption = {
  value: string;
  label: string;
};

type GenerationToolbarMaskSectionProps = {
  exportMaskCount: number;
  maskAttachMode: string;
  maskAttachModeOptions: SelectOption[];
  maskGenerationBusy: boolean;
  maskGenerationLabel: string;
  maskGenLoading: boolean;
  maskGenMode: string;
  maskInvert: boolean;
  maskModeOptions: SelectOption[];
  maskPreviewEnabled: boolean;
  onAttachMasks: () => void;
  onGenerateMask: () => void;
  onMaskAttachModeChange: (value: string) => void;
  onMaskGenModeChange: (value: string) => void;
  onMaskInvertChange: (checked: boolean) => void;
  onMaskPreviewEnabledChange: (checked: boolean) => void;
  workingSlotPresent: boolean;
};

export function GenerationToolbarMaskSection({
  exportMaskCount,
  maskAttachMode,
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
  onMaskAttachModeChange,
  onMaskGenModeChange,
  onMaskInvertChange,
  onMaskPreviewEnabledChange,
  workingSlotPresent,
}: GenerationToolbarMaskSectionProps): React.JSX.Element {
  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>Mask</div>
        <span className='text-[11px] text-gray-400 whitespace-nowrap'>
          {exportMaskCount > 0
            ? `${exportMaskCount} mask shape${exportMaskCount > 1 ? 's' : ''}`
            : 'No mask'}
        </span>
      </div>

      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
        <SelectSimple size='sm'
          className='w-full'
          value={maskGenMode}
          onValueChange={onMaskGenModeChange}
          options={maskModeOptions}
          placeholder={maskGenLoading ? 'Detecting...' : 'Smart Mask'}
          triggerClassName='h-8 text-xs'
          disabled={maskGenLoading || !workingSlotPresent}
          ariaLabel='Smart mask mode'
        />
        <Button size='xs'
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
        <SelectSimple size='sm'
          className='w-full'
          value={maskAttachMode}
          onValueChange={onMaskAttachModeChange}
          options={maskAttachModeOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Mask attach mode'
        />
        <Button size='xs'
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
        <label className='flex items-center gap-2 rounded border border-border/60 bg-card/40 px-2 py-1 text-[11px] text-gray-300'>
          <span>Mask Preview</span>
          <Switch
            checked={maskPreviewEnabled}
            onCheckedChange={onMaskPreviewEnabledChange}
            disabled={!workingSlotPresent || exportMaskCount === 0}
            aria-label='Toggle mask preview'
          />
        </label>
        <label className='flex items-center gap-2 rounded border border-border/60 bg-card/40 px-2 py-1 text-[11px] text-gray-300'>
          <span>Invert</span>
          <Switch
            checked={maskInvert}
            onCheckedChange={onMaskInvertChange}
            disabled={!maskPreviewEnabled || exportMaskCount === 0}
            aria-label='Toggle mask inversion'
          />
        </label>
      </div>
    </div>
  );
}
