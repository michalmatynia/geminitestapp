import React from 'react';

import { Button, SelectSimple } from '@/shared/ui';

import {
  useGenerationToolbarContext,
  type UpscaleMode,
  type UpscaleStrategy,
} from './GenerationToolbarContext';
import { useGenerationToolbarUpscaleSectionRuntime } from './GenerationToolbarSectionContexts';

import type { UpscaleSmoothingQuality } from './GenerationToolbarImageUtils';

export function GenerationToolbarUpscaleSection(): React.JSX.Element {
  const {
    upscaleMode,
    setUpscaleMode,
    upscaleStrategy,
    setUpscaleStrategy,
    upscaleScale,
    setUpscaleScale,
    upscaleTargetWidth,
    setUpscaleTargetWidth,
    upscaleTargetHeight,
    setUpscaleTargetHeight,
    upscaleSmoothingQuality,
    setUpscaleSmoothingQuality,
    upscaleBusy,
  } = useGenerationToolbarContext();
  const {
    hasSourceImage,
    onCancelUpscale,
    onUpscale,
    upscaleBusyLabel,
    upscaleMaxOutputSide,
    upscaleModeOptions,
    upscaleScaleOptions,
    upscaleSmoothingOptions,
    upscaleStrategyOptions,
  } = useGenerationToolbarUpscaleSectionRuntime();

  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Upscale</div>
      <div className='grid gap-2 sm:grid-cols-2'>
        <SelectSimple
          size='sm'
          className='w-full'
          value={upscaleMode}
          onValueChange={(val) => setUpscaleMode(val as UpscaleMode)}
          options={upscaleModeOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Upscale mode'
        />
        <SelectSimple
          size='sm'
          className='w-full'
          value={upscaleStrategy}
          onValueChange={(val) => setUpscaleStrategy(val as UpscaleStrategy)}
          options={upscaleStrategyOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Upscale strategy'
        />
      </div>
      <div className='mt-2'>
        {upscaleStrategy === 'scale' ? (
          <SelectSimple
            size='sm'
            className='w-full sm:w-[130px]'
            value={upscaleScale}
            onValueChange={setUpscaleScale}
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
                setUpscaleTargetWidth(event.target.value);
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
                setUpscaleTargetHeight(event.target.value);
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
          <SelectSimple
            size='sm'
            className='w-full sm:w-[180px]'
            value={upscaleSmoothingQuality}
            onValueChange={(val) => setUpscaleSmoothingQuality(val as UpscaleSmoothingQuality)}
            options={upscaleSmoothingOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Upscale smoothing quality'
          />
        </div>
      ) : null}
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={onUpscale}
          disabled={!hasSourceImage || upscaleBusy}
          title='Create an upscaled linked variant from the active slot'
          loading={upscaleBusy}
        >
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
