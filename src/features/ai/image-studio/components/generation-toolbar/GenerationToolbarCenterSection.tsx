import React from 'react';

import { Button, SelectSimple, Tooltip } from '@/shared/ui';

type SelectOption = {
  value: string;
  label: string;
};

type CenterTooltipContent = {
  apply: string;
  detection: string;
  fillMissingCanvasWhite: string;
  mode: string;
  padding: string;
  paddingAxes: string;
  shadowPolicy: string;
  thresholds: string;
};

type GenerationToolbarCenterSectionProps = {
  centerBusy: boolean;
  centerBusyLabel: string;
  centerGuidesEnabled: boolean;
  centerLayoutEnabled: boolean;
  centerLayoutPadding: string;
  centerLayoutPaddingX: string;
  centerLayoutPaddingY: string;
  centerLayoutSplitAxes: boolean;
  centerLayoutAdvancedEnabled: boolean;
  centerLayoutPreset: string;
  centerLayoutPresetOptions: SelectOption[];
  centerLayoutPresetDraftName: string;
  centerLayoutCanDeletePreset: boolean;
  centerLayoutCanSavePreset: boolean;
  centerLayoutSavePresetLabel: string;
  centerLayoutDetection: string;
  centerLayoutDetectionOptions: SelectOption[];
  centerLayoutWhiteThreshold: string;
  centerLayoutChromaThreshold: string;
  centerLayoutFillMissingCanvasWhite: boolean;
  centerLayoutProjectCanvasSize: { width: number; height: number } | null;
  centerLayoutShadowPolicy: string;
  centerLayoutShadowPolicyOptions: SelectOption[];
  centerTooltipContent: CenterTooltipContent;
  centerTooltipsEnabled: boolean;
  centerMode: string;
  centerModeOptions: SelectOption[];
  hasSourceImage: boolean;
  onCancelCenter: () => void;
  onCenterLayoutFillMissingCanvasWhiteChange: (checked: boolean) => void;
  onCenterLayoutPaddingChange: (value: string) => void;
  onCenterLayoutPaddingXChange: (value: string) => void;
  onCenterLayoutPaddingYChange: (value: string) => void;
  onCenterLayoutDetectionChange: (value: string) => void;
  onCenterLayoutPresetChange: (value: string) => void;
  onCenterLayoutPresetDraftNameChange: (value: string) => void;
  onCenterLayoutSavePreset: () => void;
  onCenterLayoutDeletePreset: () => void;
  onCenterLayoutWhiteThresholdChange: (value: string) => void;
  onCenterLayoutChromaThresholdChange: (value: string) => void;
  onCenterLayoutShadowPolicyChange: (value: string) => void;
  onCenterObject: () => void;
  onCenterModeChange: (value: string) => void;
  onToggleCenterLayoutAdvanced: () => void;
  onToggleCenterLayoutSplitAxes: () => void;
  onToggleCenterGuides: () => void;
};

export function GenerationToolbarCenterSection({
  centerBusy,
  centerBusyLabel,
  centerGuidesEnabled,
  centerLayoutEnabled,
  centerLayoutPadding,
  centerLayoutPaddingX,
  centerLayoutPaddingY,
  centerLayoutSplitAxes,
  centerLayoutAdvancedEnabled,
  centerLayoutPreset,
  centerLayoutPresetOptions,
  centerLayoutPresetDraftName,
  centerLayoutCanDeletePreset,
  centerLayoutCanSavePreset,
  centerLayoutSavePresetLabel,
  centerLayoutDetection,
  centerLayoutDetectionOptions,
  centerLayoutWhiteThreshold,
  centerLayoutChromaThreshold,
  centerLayoutFillMissingCanvasWhite,
  centerLayoutProjectCanvasSize,
  centerLayoutShadowPolicy,
  centerLayoutShadowPolicyOptions,
  centerTooltipContent,
  centerTooltipsEnabled,
  centerMode,
  centerModeOptions,
  hasSourceImage,
  onCancelCenter,
  onCenterLayoutFillMissingCanvasWhiteChange,
  onCenterLayoutPaddingChange,
  onCenterLayoutPaddingXChange,
  onCenterLayoutPaddingYChange,
  onCenterLayoutDetectionChange,
  onCenterLayoutPresetChange,
  onCenterLayoutPresetDraftNameChange,
  onCenterLayoutSavePreset,
  onCenterLayoutDeletePreset,
  onCenterLayoutWhiteThresholdChange,
  onCenterLayoutChromaThresholdChange,
  onCenterLayoutShadowPolicyChange,
  onCenterObject,
  onCenterModeChange,
  onToggleCenterLayoutAdvanced,
  onToggleCenterLayoutSplitAxes,
  onToggleCenterGuides,
}: GenerationToolbarCenterSectionProps): React.JSX.Element {
  const sliderValue = centerLayoutPadding.trim() === '' ? '0' : centerLayoutPadding;
  const maybeWrapTooltip = (
    content: string,
    child: React.JSX.Element,
    wrapperClassName = 'inline-flex'
  ): React.JSX.Element => {
    if (!centerTooltipsEnabled) return child;
    return (
      <Tooltip content={content} maxWidth='440px'>
        <span className={wrapperClassName}>{child}</span>
      </Tooltip>
    );
  };

  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Center</div>
      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
        {maybeWrapTooltip(
          centerTooltipContent.mode,
          <SelectSimple size='sm'
            className='w-full'
            value={centerMode}
            onValueChange={onCenterModeChange}
            options={centerModeOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Center object mode'
          />,
          'inline-flex w-full'
        )}
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onToggleCenterGuides}
          title='Toggle center guides overlay'
        >
          {centerGuidesEnabled ? 'Hide Guides' : 'Show Guides'}
        </Button>
      </div>
      {centerLayoutEnabled ? (
        <div className='mt-2 space-y-2'>
          {maybeWrapTooltip(
            centerTooltipContent.shadowPolicy,
            <SelectSimple
              size='sm'
              className='w-full'
              value={centerLayoutShadowPolicy}
              onValueChange={onCenterLayoutShadowPolicyChange}
              options={centerLayoutShadowPolicyOptions}
              triggerClassName='h-8 text-xs'
              ariaLabel='Object layout shadow policy'
            />,
            'inline-flex w-full'
          )}
          <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
            {maybeWrapTooltip(
              centerTooltipContent.padding,
              <div className='grid grid-cols-[minmax(0,1fr)_72px] items-center gap-2'>
                <input
                  type='range'
                  min={0}
                  max={40}
                  step={0.5}
                  value={sliderValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onCenterLayoutPaddingChange(event.target.value);
                  }}
                  className='w-full accent-gray-300'
                  aria-label='Object layout padding percent slider'
                />
                <input
                  type='number'
                  min={0}
                  max={40}
                  step={0.5}
                  value={centerLayoutPadding}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onCenterLayoutPaddingChange(event.target.value);
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='Padding %'
                  aria-label='Object layout padding percent'
                  title={centerTooltipsEnabled ? centerTooltipContent.padding : 'Padding around detected object after centering/scaling'}
                />
              </div>,
              'inline-flex w-full'
            )}
            {maybeWrapTooltip(
              centerTooltipContent.paddingAxes,
              <Button
                size='xs'
                type='button'
                variant='outline'
                onClick={onToggleCenterLayoutSplitAxes}
                title={centerTooltipsEnabled ? centerTooltipContent.paddingAxes : 'Toggle separate horizontal and vertical padding'}
              >
                {centerLayoutSplitAxes ? 'Linked X/Y' : 'Split X/Y'}
              </Button>
            )}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {maybeWrapTooltip(
              centerTooltipContent.detection,
              <Button
                size='xs'
                type='button'
                variant='outline'
                onClick={onToggleCenterLayoutAdvanced}
                title={centerTooltipsEnabled ? centerTooltipContent.detection : 'Show detection and threshold controls'}
              >
                {centerLayoutAdvancedEnabled ? 'Hide Advanced' : 'Show Advanced'}
              </Button>
            )}
          </div>
          {centerLayoutAdvancedEnabled ? (
            <div className='grid gap-2 rounded border border-border/50 bg-card/30 p-2'>
              {maybeWrapTooltip(
                centerTooltipContent.detection,
                <SelectSimple
                  size='sm'
                  className='w-full'
                  value={centerLayoutPreset}
                  onValueChange={onCenterLayoutPresetChange}
                  options={centerLayoutPresetOptions}
                  triggerClassName='h-8 text-xs'
                  ariaLabel='Object layout preset'
                />,
                'inline-flex w-full'
              )}
              {maybeWrapTooltip(
                centerTooltipContent.detection,
                <SelectSimple
                  size='sm'
                  className='w-full'
                  value={centerLayoutDetection}
                  onValueChange={onCenterLayoutDetectionChange}
                  options={centerLayoutDetectionOptions}
                  triggerClassName='h-8 text-xs'
                  ariaLabel='Object layout detection mode'
                />,
                'inline-flex w-full'
              )}
              <div className='grid gap-2 sm:grid-cols-2'>
                {maybeWrapTooltip(
                  centerTooltipContent.thresholds,
                  <input
                    type='number'
                    min={1}
                    max={80}
                    step={1}
                    value={centerLayoutWhiteThreshold}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      onCenterLayoutWhiteThresholdChange(event.target.value);
                    }}
                    className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                    placeholder='White threshold (1-80)'
                    aria-label='Object layout white threshold'
                  />,
                  'inline-flex w-full'
                )}
                {maybeWrapTooltip(
                  centerTooltipContent.thresholds,
                  <input
                    type='number'
                    min={0}
                    max={80}
                    step={1}
                    value={centerLayoutChromaThreshold}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      onCenterLayoutChromaThresholdChange(event.target.value);
                    }}
                    className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                    placeholder='Chroma threshold (0-80)'
                    aria-label='Object layout chroma threshold'
                  />,
                  'inline-flex w-full'
                )}
              </div>
              <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center'>
                <input
                  type='text'
                  value={centerLayoutPresetDraftName}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onCenterLayoutPresetDraftNameChange(event.target.value);
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='Custom preset name'
                  aria-label='Object layout custom preset name'
                />
                <Button
                  size='xs'
                  type='button'
                  variant='outline'
                  onClick={onCenterLayoutSavePreset}
                  disabled={!centerLayoutCanSavePreset}
                  title='Save current advanced settings as a custom preset'
                >
                  {centerLayoutSavePresetLabel}
                </Button>
                <Button
                  size='xs'
                  type='button'
                  variant='outline'
                  onClick={onCenterLayoutDeletePreset}
                  disabled={!centerLayoutCanDeletePreset}
                  title='Delete selected custom preset'
                >
                  Delete Preset
                </Button>
              </div>
            </div>
          ) : null}
          {centerLayoutSplitAxes ? (
            <div className='grid gap-1 sm:grid-cols-2'>
              <div className='grid grid-cols-[72px_auto] items-center gap-2'>
                <input
                  type='number'
                  min={0}
                  max={40}
                  step={0.5}
                  value={centerLayoutPaddingX}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onCenterLayoutPaddingXChange(event.target.value);
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='X %'
                  aria-label='Object layout horizontal padding percent'
                  title='Horizontal padding around detected object'
                />
                <div className='text-[11px] text-gray-400'>Padding X %</div>
              </div>
              <div className='grid grid-cols-[72px_auto] items-center gap-2'>
                <input
                  type='number'
                  min={0}
                  max={40}
                  step={0.5}
                  value={centerLayoutPaddingY}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onCenterLayoutPaddingYChange(event.target.value);
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='Y %'
                  aria-label='Object layout vertical padding percent'
                  title='Vertical padding around detected object'
                />
                <div className='text-[11px] text-gray-400'>Padding Y %</div>
              </div>
            </div>
          ) : null}
          {maybeWrapTooltip(
            centerTooltipContent.fillMissingCanvasWhite,
            <label className='flex items-center gap-2 text-[11px] text-gray-300'>
              <input
                type='checkbox'
                checked={centerLayoutFillMissingCanvasWhite}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  onCenterLayoutFillMissingCanvasWhiteChange(Boolean(event.target.checked));
                }}
                disabled={!centerLayoutProjectCanvasSize}
                className='h-3.5 w-3.5 rounded border border-border/60 bg-card/40 accent-gray-200'
                aria-label='Fill missing canvas area with white background'
              />
              <span>
                Fill missing canvas with white
                {centerLayoutProjectCanvasSize
                  ? ` (${centerLayoutProjectCanvasSize.width}x${centerLayoutProjectCanvasSize.height})`
                  : ' (project canvas size unavailable)'}
              </span>
            </label>
          )}
        </div>
      ) : null}
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        {maybeWrapTooltip(
          centerTooltipContent.apply,
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={onCenterObject}
            disabled={!hasSourceImage || centerBusy}
            title={centerTooltipsEnabled ? centerTooltipContent.apply : 'Create a centered linked variant from the active slot'}
            loading={centerBusy}
          >
            {centerBusyLabel}
          </Button>
        )}
        {centerBusy ? (
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onCancelCenter}
            title='Cancel centering request'
          >
            Cancel Center
          </Button>
        ) : null}
      </div>
    </div>
  );
}
