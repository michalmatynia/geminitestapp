import React from 'react';

import { Button } from '@/shared/ui/primitives.public';
import { InsetPanel } from '@/shared/ui/navigation-and-layout.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import {
  useGenerationToolbarContext,
  type UpscaleMode,
  type UpscaleStrategy,
} from './GenerationToolbarContext';
import { useGenerationToolbarUpscaleSectionRuntime } from './GenerationToolbarSectionContexts';

import type { UpscaleSmoothingQuality } from './GenerationToolbarImageUtils';

export function GenerationToolbarUpscaleSection(): React.JSX.Element {
  const settings = useGenerationToolbarContext();
  const runtime = useGenerationToolbarUpscaleSectionRuntime();

  return (
    <InsetPanel radius='compact' padding='sm'>
      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Upscale</div>
      <div className='grid gap-2 sm:grid-cols-2'>
        <SelectSimple
          size='sm'
          className='w-full'
          value={settings.upscaleMode}
          onValueChange={(val) => settings.setUpscaleMode(val as UpscaleMode)}
          options={runtime.upscaleModeOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Upscale mode'
          title='Select option'
        />
        <SelectSimple
          size='sm'
          className='w-full'
          value={settings.upscaleStrategy}
          onValueChange={(val) => settings.setUpscaleStrategy(val as UpscaleStrategy)}
          options={runtime.upscaleStrategyOptions}
          triggerClassName='h-8 text-xs'
          ariaLabel='Upscale strategy'
          title='Select option'
        />
      </div>

      <div className='mt-2'>
        {settings.upscaleStrategy === 'scale' ? (
          <SelectSimple
            size='sm'
            className='w-full sm:w-[130px]'
            value={settings.upscaleScale}
            onValueChange={settings.setUpscaleScale}
            options={runtime.upscaleScaleOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Upscale multiplier'
            title='Select option'
          />
        ) : (
          <TargetDimensionInputs
            width={settings.upscaleTargetWidth}
            height={settings.upscaleTargetHeight}
            maxOutput={runtime.upscaleMaxOutputSide}
            onWidthChange={settings.setUpscaleTargetWidth}
            onHeightChange={settings.setUpscaleTargetHeight}
          />
        )}
      </div>

      {settings.upscaleMode === 'client_canvas' && (
        <div className='mt-2'>
          <SelectSimple
            size='sm'
            className='w-full sm:w-[180px]'
            value={settings.upscaleSmoothingQuality}
            onValueChange={(val) => settings.setUpscaleSmoothingQuality(val as UpscaleSmoothingQuality)}
            options={runtime.upscaleSmoothingOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Upscale smoothing quality'
            title='Select option'
          />
        </div>
      )}

      <UpscaleActions
        hasSourceImage={runtime.hasSourceImage}
        upscaleBusy={settings.upscaleBusy}
        busyLabel={runtime.upscaleBusyLabel}
        onUpscale={runtime.onUpscale}
        onCancelUpscale={runtime.onCancelUpscale}
      />
    </InsetPanel>
  );
}

function TargetDimensionInputs({
  width,
  height,
  maxOutput,
  onWidthChange,
  onHeightChange,
}: {
  width: string;
  height: string;
  maxOutput: number;
  onWidthChange: (v: string) => void;
  onHeightChange: (v: string) => void;
}) {
  return (
    <div className='flex h-8 w-full items-center gap-1 rounded border border-border/60 bg-card/40 px-2 sm:w-[180px]'>
      <input
        type='number'
        min={1}
        max={maxOutput}
        step={1}
        inputMode='numeric'
        value={width}
        onChange={(e) => onWidthChange(e.target.value)}
        placeholder='W'
        className='h-6 w-[68px] border-0 bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-500'
        aria-label='Target upscale width'
      />
      <span className='text-[11px] text-gray-500'>x</span>
      <input
        type='number'
        min={1}
        max={maxOutput}
        step={1}
        inputMode='numeric'
        value={height}
        onChange={(e) => onHeightChange(e.target.value)}
        placeholder='H'
        className='h-6 w-[68px] border-0 bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-500'
        aria-label='Target upscale height'
      />
    </div>
  );
}

function UpscaleActions({
  hasSourceImage,
  upscaleBusy,
  busyLabel,
  onUpscale,
  onCancelUpscale,
}: {
  hasSourceImage: boolean;
  upscaleBusy: boolean;
  busyLabel: string;
  onUpscale: () => void;
  onCancelUpscale: () => void;
}) {
  return (
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
        {busyLabel}
      </Button>
      {upscaleBusy && (
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={onCancelUpscale}
          title='Cancel upscale request'
        >
          Cancel Upscale
        </Button>
      )}
    </div>
  );
}
