import React from 'react';

import { Button, SelectSimple, Tooltip } from '@/shared/ui';

type SelectOption = {
  value: string;
  label: string;
};

type AutoScaleTooltipContent = {
  apply: string;
  fillMissingCanvasWhite: string;
  mode: string;
  padding: string;
  paddingAxes: string;
  shadowPolicy: string;
};

type GenerationToolbarAutoScalerSectionProps = {
  autoScaleBusy: boolean;
  autoScaleBusyLabel: string;
  autoScaleLayoutPadding: string;
  autoScaleLayoutPaddingX: string;
  autoScaleLayoutPaddingY: string;
  autoScaleLayoutSplitAxes: boolean;
  autoScaleLayoutFillMissingCanvasWhite: boolean;
  autoScaleLayoutProjectCanvasSize: { width: number; height: number } | null;
  autoScaleShadowPolicy: string;
  autoScaleShadowPolicyOptions: SelectOption[];
  autoScaleTooltipContent: AutoScaleTooltipContent;
  autoScaleTooltipsEnabled: boolean;
  autoScaleMode: string;
  autoScaleModeOptions: SelectOption[];
  hasSourceImage: boolean;
  onAutoScale: () => void;
  onAutoScaleLayoutFillMissingCanvasWhiteChange: (checked: boolean) => void;
  onAutoScaleLayoutPaddingChange: (value: string) => void;
  onAutoScaleLayoutPaddingXChange: (value: string) => void;
  onAutoScaleLayoutPaddingYChange: (value: string) => void;
  onAutoScaleModeChange: (value: string) => void;
  onAutoScaleShadowPolicyChange: (value: string) => void;
  onCancelAutoScale: () => void;
  onToggleAutoScaleLayoutSplitAxes: () => void;
};

export function GenerationToolbarAutoScalerSection({
  autoScaleBusy,
  autoScaleBusyLabel,
  autoScaleLayoutPadding,
  autoScaleLayoutPaddingX,
  autoScaleLayoutPaddingY,
  autoScaleLayoutSplitAxes,
  autoScaleLayoutFillMissingCanvasWhite,
  autoScaleLayoutProjectCanvasSize,
  autoScaleShadowPolicy,
  autoScaleShadowPolicyOptions,
  autoScaleTooltipContent,
  autoScaleTooltipsEnabled,
  autoScaleMode,
  autoScaleModeOptions,
  hasSourceImage,
  onAutoScale,
  onAutoScaleLayoutFillMissingCanvasWhiteChange,
  onAutoScaleLayoutPaddingChange,
  onAutoScaleLayoutPaddingXChange,
  onAutoScaleLayoutPaddingYChange,
  onAutoScaleModeChange,
  onAutoScaleShadowPolicyChange,
  onCancelAutoScale,
  onToggleAutoScaleLayoutSplitAxes,
}: GenerationToolbarAutoScalerSectionProps): React.JSX.Element {
  const sliderValue = autoScaleLayoutPadding.trim() === '' ? '0' : autoScaleLayoutPadding;
  const maybeWrapTooltip = (
    content: string,
    child: React.JSX.Element,
    wrapperClassName = 'inline-flex'
  ): React.JSX.Element => {
    if (!autoScaleTooltipsEnabled) return child;
    return (
      <Tooltip content={content} maxWidth='440px'>
        <span className={wrapperClassName}>{child}</span>
      </Tooltip>
    );
  };

  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Auto Scaler</div>
      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
        {maybeWrapTooltip(
          autoScaleTooltipContent.mode,
          <SelectSimple
            size='sm'
            className='w-full'
            value={autoScaleMode}
            onValueChange={onAutoScaleModeChange}
            options={autoScaleModeOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Auto scaler mode'
          />,
          'inline-flex w-full'
        )}
        {maybeWrapTooltip(
          autoScaleTooltipContent.paddingAxes,
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onToggleAutoScaleLayoutSplitAxes}
            title={autoScaleTooltipsEnabled ? autoScaleTooltipContent.paddingAxes : 'Toggle separate horizontal and vertical padding'}
          >
            {autoScaleLayoutSplitAxes ? 'Linked X/Y' : 'Split X/Y'}
          </Button>
        )}
      </div>
      <div className='mt-2 grid gap-2'>
        {maybeWrapTooltip(
          autoScaleTooltipContent.shadowPolicy,
          <SelectSimple
            size='sm'
            className='w-full'
            value={autoScaleShadowPolicy}
            onValueChange={onAutoScaleShadowPolicyChange}
            options={autoScaleShadowPolicyOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Auto scaler shadow policy'
          />,
          'inline-flex w-full'
        )}
      </div>
      <div className='mt-2 space-y-2'>
        <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_72px] sm:items-center'>
          {maybeWrapTooltip(
            autoScaleTooltipContent.padding,
            <input
              type='range'
              min={0}
              max={40}
              step={0.5}
              value={sliderValue}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                onAutoScaleLayoutPaddingChange(event.target.value);
              }}
              className='w-full accent-gray-300'
              aria-label='Auto scaler padding percent slider'
            />,
            'inline-flex w-full'
          )}
          <input
            type='number'
            min={0}
            max={40}
            step={0.5}
            value={autoScaleLayoutPadding}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              onAutoScaleLayoutPaddingChange(event.target.value);
            }}
            className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
            placeholder='Padding %'
            aria-label='Auto scaler padding percent'
          />
        </div>
        {autoScaleLayoutSplitAxes ? (
          <div className='grid gap-1 sm:grid-cols-2'>
            <div className='grid grid-cols-[72px_auto] items-center gap-2'>
              <input
                type='number'
                min={0}
                max={40}
                step={0.5}
                value={autoScaleLayoutPaddingX}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  onAutoScaleLayoutPaddingXChange(event.target.value);
                }}
                className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                placeholder='X %'
                aria-label='Auto scaler horizontal padding percent'
              />
              <div className='text-[11px] text-gray-400'>Padding X %</div>
            </div>
            <div className='grid grid-cols-[72px_auto] items-center gap-2'>
              <input
                type='number'
                min={0}
                max={40}
                step={0.5}
                value={autoScaleLayoutPaddingY}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  onAutoScaleLayoutPaddingYChange(event.target.value);
                }}
                className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                placeholder='Y %'
                aria-label='Auto scaler vertical padding percent'
              />
              <div className='text-[11px] text-gray-400'>Padding Y %</div>
            </div>
          </div>
        ) : null}
        {maybeWrapTooltip(
          autoScaleTooltipContent.fillMissingCanvasWhite,
          <label className='flex items-center gap-2 text-[11px] text-gray-300'>
            <input
              type='checkbox'
              checked={autoScaleLayoutFillMissingCanvasWhite}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                onAutoScaleLayoutFillMissingCanvasWhiteChange(Boolean(event.target.checked));
              }}
              disabled={!autoScaleLayoutProjectCanvasSize}
              className='h-3.5 w-3.5 rounded border border-border/60 bg-card/40 accent-gray-200'
              aria-label='Fill missing canvas area with white background for auto scaler'
            />
            <span>
              Fill missing canvas with white
              {autoScaleLayoutProjectCanvasSize
                ? ` (${autoScaleLayoutProjectCanvasSize.width}x${autoScaleLayoutProjectCanvasSize.height})`
                : ' (project canvas size unavailable)'}
            </span>
          </label>
        )}
      </div>
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        {maybeWrapTooltip(
          autoScaleTooltipContent.apply,
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onAutoScale}
            disabled={!hasSourceImage || autoScaleBusy}
            loading={autoScaleBusy}
            title={autoScaleTooltipsEnabled ? autoScaleTooltipContent.apply : 'Create an auto-scaled linked variant'}
          >
            {autoScaleBusyLabel}
          </Button>
        )}
        {autoScaleBusy ? (
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onCancelAutoScale}
            title='Cancel auto scaler request'
          >
            Cancel Auto Scaler
          </Button>
        ) : null}
      </div>
    </div>
  );
}
