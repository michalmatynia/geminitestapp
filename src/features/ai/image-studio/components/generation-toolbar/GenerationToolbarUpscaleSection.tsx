import { Loader2 } from 'lucide-react';
import React from 'react';

import { Button, SelectSimple } from '@/shared/ui';

type SelectOption = {
  value: string;
  label: string;
};

type GenerationToolbarUpscaleSectionProps = {
  hasSourceImage: boolean;
  onCancelUpscale: () => void;
  onUpscale: () => void;
  onUpscaleModeChange: (value: string) => void;
  onUpscaleScaleChange: (value: string) => void;
  onUpscaleSmoothingQualityChange: (value: string) => void;
  onUpscaleStrategyChange: (value: string) => void;
  onUpscaleTargetHeightChange: (value: string) => void;
  onUpscaleTargetWidthChange: (value: string) => void;
  upscaleBusy: boolean;
  upscaleBusyLabel: string;
  upscaleMaxOutputSide: number;
  upscaleMode: string;
  upscaleModeOptions: SelectOption[];
  upscaleScale: string;
  upscaleScaleOptions: SelectOption[];
  upscaleSmoothingOptions: SelectOption[];
  upscaleSmoothingQuality: string;
  upscaleStrategy: string;
  upscaleStrategyOptions: SelectOption[];
  upscaleTargetHeight: string;
  upscaleTargetWidth: string;
};

export function GenerationToolbarUpscaleSection({
  hasSourceImage,
  onCancelUpscale,
  onUpscale,
  onUpscaleModeChange,
  onUpscaleScaleChange,
  onUpscaleSmoothingQualityChange,
  onUpscaleStrategyChange,
  onUpscaleTargetHeightChange,
  onUpscaleTargetWidthChange,
  upscaleBusy,
  upscaleBusyLabel,
  upscaleMaxOutputSide,
  upscaleMode,
  upscaleModeOptions,
  upscaleScale,
  upscaleScaleOptions,
  upscaleSmoothingOptions,
  upscaleSmoothingQuality,
  upscaleStrategy,
  upscaleStrategyOptions,
  upscaleTargetHeight,
  upscaleTargetWidth,
}: GenerationToolbarUpscaleSectionProps): React.JSX.Element {
  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Upscale</div>
      <div className='grid gap-2 sm:grid-cols-2'>
        <SelectSimple size='sm'
          className='w-full'
          value={upscaleMode}
          onValueChange={onUpscaleModeChange}
          options={upscaleModeOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Upscale mode'
        />
        <SelectSimple size='sm'
          className='w-full'
          value={upscaleStrategy}
          onValueChange={onUpscaleStrategyChange}
          options={upscaleStrategyOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Upscale strategy'
        />
      </div>
      <div className='mt-2'>
        {upscaleStrategy === 'scale' ? (
          <SelectSimple size='sm'
            className='w-full sm:w-[130px]'
            value={upscaleScale}
            onValueChange={onUpscaleScaleChange}
            options={upscaleScaleOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Upscale multiplier'
          />
        ) : (
          <div className='flex h-8 w-full items-center gap-1 rounded border border-border/60 bg-card/40 px-2 sm:w-[180px]'>
            <input
              type='number'
              min={1}
              max={upscaleMaxOutputSide}
              step={1}
              inputMode='numeric'
              value={upscaleTargetWidth}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                onUpscaleTargetWidthChange(event.target.value);
              }}
              placeholder='W'
              className='h-6 w-[68px] border-0 bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-500'
              aria-label='Target upscale width'
            />
            <span className='text-[11px] text-gray-500'>x</span>
            <input
              type='number'
              min={1}
              max={upscaleMaxOutputSide}
              step={1}
              inputMode='numeric'
              value={upscaleTargetHeight}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                onUpscaleTargetHeightChange(event.target.value);
              }}
              placeholder='H'
              className='h-6 w-[68px] border-0 bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-500'
              aria-label='Target upscale height'
            />
          </div>
        )}
      </div>
      {upscaleMode === 'client_canvas' ? (
        <div className='mt-2'>
          <SelectSimple size='sm'
            className='w-full sm:w-[180px]'
            value={upscaleSmoothingQuality}
            onValueChange={onUpscaleSmoothingQualityChange}
            options={upscaleSmoothingOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Upscale smoothing quality'
          />
        </div>
      ) : null}
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onUpscale}
          disabled={!hasSourceImage || upscaleBusy}
          title='Create an upscaled linked variant from the active slot'
        >
          {upscaleBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
          {upscaleBusyLabel}
        </Button>
        {upscaleBusy ? (
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onCancelUpscale}
            title='Cancel upscale request'
          >
            Cancel Upscale
          </Button>
        ) : null}
      </div>
    </div>
  );
}
