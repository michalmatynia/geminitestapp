import { Loader2 } from 'lucide-react';
import React from 'react';

import { Button, SelectSimple } from '@/shared/ui';

type SelectOption = {
  value: string;
  label: string;
};

type GenerationToolbarCropSectionProps = {
  cropBusy: boolean;
  cropBusyLabel: string;
  cropMode: string;
  cropModeOptions: SelectOption[];
  hasCropBoundary: boolean;
  hasSourceImage: boolean;
  onCancelCrop: () => void;
  onCreateCropBox: () => void;
  onCrop: () => void;
  onCropModeChange: (value: string) => void;
  onSquareCrop: () => void;
  onViewCrop: () => void;
};

export function GenerationToolbarCropSection({
  cropBusy,
  cropBusyLabel,
  cropMode,
  cropModeOptions,
  hasCropBoundary,
  hasSourceImage,
  onCancelCrop,
  onCreateCropBox,
  onCrop,
  onCropModeChange,
  onSquareCrop,
  onViewCrop,
}: GenerationToolbarCropSectionProps): React.JSX.Element {
  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>Crop</div>
        <span className='text-[11px] text-gray-500'>
          {hasCropBoundary ? 'Boundary ready' : 'Set a boundary first'}
        </span>
      </div>
      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
        <SelectSimple size='sm'
          className='w-full'
          value={cropMode}
          onValueChange={onCropModeChange}
          options={cropModeOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Crop mode'
        />
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onCreateCropBox}
          disabled={!hasSourceImage}
          title='Create a dedicated crop rectangle that always works with Crop'
        >
          Crop Box Tool
        </Button>
      </div>
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onCrop}
          disabled={!hasSourceImage || cropBusy || !hasCropBoundary}
          title='Create cropped linked variant from selected boundary'
        >
          {cropBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
          {cropBusyLabel}
        </Button>
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onSquareCrop}
          disabled={!hasSourceImage || cropBusy}
          title='Quick centered square crop (1:1) from the active slot'
        >
          Square Crop
        </Button>
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onViewCrop}
          disabled={!hasSourceImage || cropBusy}
          title='Crop using the currently visible area in Preview Canvas'
        >
          View Crop
        </Button>
        {cropBusy ? (
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onCancelCrop}
            title='Cancel crop request'
          >
            Cancel Crop
          </Button>
        ) : null}
      </div>
    </div>
  );
}
