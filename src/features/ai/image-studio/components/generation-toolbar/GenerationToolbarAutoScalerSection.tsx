import React from 'react';

import {
  ImageStudioAnalysisSummaryChip,
  type ImageStudioAnalysisSummaryChipData,
} from '@/features/ai/image-studio/components/ImageStudioAnalysisSummaryChip';
import { Button, SelectSimple, Tooltip } from '@/shared/ui';

import { useGenerationToolbarContext, type AutoScalerMode } from './GenerationToolbarContext';
import type { ImageStudioCenterShadowPolicy } from '../../contracts/center';

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
  analysisPlanAvailable: boolean;
  analysisPlanSourceMetadataMissing: boolean;
  analysisWorkingSourceMetadataMissing: boolean;
  analysisPlanIsStale: boolean;
  analysisPlanSlotMissing: boolean;
  analysisPlanWillSwitchSlot: boolean;
  analysisPlanSwitchSlotLabel: string;
  slotSelectionLocked: boolean;
  analysisSummaryData: ImageStudioAnalysisSummaryChipData | null;
  analysisSummaryIsStale: boolean;
  analysisConfigMismatchMessage: string | null;
  analysisBusy: boolean;
  analysisBusyLabel: string;
  autoScaleBusyLabel: string;
  autoScaleLayoutProjectCanvasSize: { width: number; height: number } | null;
  autoScaleShadowPolicyOptions: SelectOption[];
  autoScaleTooltipContent: AutoScaleTooltipContent;
  autoScaleTooltipsEnabled: boolean;
  autoScaleModeOptions: SelectOption[];
  hasSourceImage: boolean;
  onAutoScale: () => void;
  onRunAnalysis: () => void;
  onCancelAutoScale: () => void;
  onOpenSharedDetectionSettings: () => void;
  onToggleAutoScaleLayoutSplitAxes: () => void;
};

export function GenerationToolbarAutoScalerSection({
  analysisPlanAvailable,
  analysisPlanSourceMetadataMissing,
  analysisWorkingSourceMetadataMissing,
  analysisPlanIsStale,
  analysisPlanSlotMissing,
  analysisPlanWillSwitchSlot,
  analysisPlanSwitchSlotLabel,
  slotSelectionLocked,
  analysisSummaryData,
  analysisSummaryIsStale,
  analysisConfigMismatchMessage,
  analysisBusy,
  analysisBusyLabel,
  autoScaleBusyLabel,
  autoScaleLayoutProjectCanvasSize,
  autoScaleShadowPolicyOptions,
  autoScaleTooltipContent,
  autoScaleTooltipsEnabled,
  autoScaleModeOptions,
  hasSourceImage,
  onAutoScale,
  onRunAnalysis,
  onCancelAutoScale,
  onOpenSharedDetectionSettings,
  onToggleAutoScaleLayoutSplitAxes,
}: GenerationToolbarAutoScalerSectionProps): React.JSX.Element {
  const {
    autoScaleMode, setAutoScaleMode,
    autoScaleLayoutShadowPolicy, setAutoScaleLayoutShadowPolicy,
    autoScaleLayoutPadding, setAutoScaleLayoutPadding,
    autoScaleLayoutSplitAxes,
    autoScaleLayoutPaddingX, setAutoScaleLayoutPaddingX,
    autoScaleLayoutPaddingY, setAutoScaleLayoutPaddingY,
    autoScaleLayoutFillMissingCanvasWhite, setAutoScaleLayoutFillMissingCanvasWhite,
    autoScaleBusy,
  } = useGenerationToolbarContext();

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

  const runAnalysisDisabledReason = !hasSourceImage
    ? 'Select a slot image before analysis'
    : analysisBusy
      ? 'Analysis is already running'
      : autoScaleBusy
        ? 'Cannot run analysis while Auto Scaler is running'
        : null;

  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Auto Scaler</div>
      {analysisSummaryData ? (
        <ImageStudioAnalysisSummaryChip
          data={analysisSummaryData}
          stale={analysisSummaryIsStale}
          label='Auto Scaler Summary'
          className='mb-2'
        />
      ) : null}
      {analysisConfigMismatchMessage ? (
        <div className='mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100'>
          {analysisConfigMismatchMessage}
        </div>
      ) : null}
      {analysisPlanWillSwitchSlot ? (
        <div className='mb-2 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] text-sky-100'>
          Latest saved analysis plan targets a different slot{analysisPlanSwitchSlotLabel ? `: ${analysisPlanSwitchSlotLabel}` : ''}.
        </div>
      ) : null}
      {analysisPlanSourceMetadataMissing ? (
        <div className='mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100'>
          Analysis plan source metadata is missing. Run analysis again.
        </div>
      ) : null}
      {analysisWorkingSourceMetadataMissing ? (
        <div className='mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100'>
          Working slot source metadata is missing. Reselect slot image and retry.
        </div>
      ) : null}
      {slotSelectionLocked ? (
        <div className='mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100'>
          Slot selection is locked by sequencing. Existing saved plans cannot switch slots until unlocked.
        </div>
      ) : null}
      {analysisPlanSlotMissing ? (
        <div className='mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100'>
          Analyzed slot no longer exists. Run analysis again to create a fresh plan.
        </div>
      ) : null}
      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
        {maybeWrapTooltip(
          autoScaleTooltipContent.mode,
          <SelectSimple
            size='sm'
            className='w-full'
            value={autoScaleMode}
            onValueChange={(val) => setAutoScaleMode(val as AutoScalerMode)}
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
            value={autoScaleLayoutShadowPolicy}
            onValueChange={(val) => setAutoScaleLayoutShadowPolicy(val as ImageStudioCenterShadowPolicy)}
            options={autoScaleShadowPolicyOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Auto scaler shadow policy'
          />,
          'inline-flex w-full'
        )}
        <div className='text-[10px] text-gray-500'>
          Detection mode and thresholds follow Object Layout advanced settings.
        </div>
        <div>
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onOpenSharedDetectionSettings}
            title='Open Object Layout advanced settings used by Auto Scaler detection'
          >
            Edit Shared Detection Settings
          </Button>
        </div>
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
                setAutoScaleLayoutPadding(event.target.value);
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
              setAutoScaleLayoutPadding(event.target.value);
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
                  setAutoScaleLayoutPaddingX(event.target.value);
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
                  setAutoScaleLayoutPaddingY(event.target.value);
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
                setAutoScaleLayoutFillMissingCanvasWhite(Boolean(event.target.checked));
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
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={onRunAnalysis}
          disabled={Boolean(runAnalysisDisabledReason)}
          title={
            runAnalysisDisabledReason
              ? runAnalysisDisabledReason
              : 'Run server analysis and sync layout controls to Object Layouting + Auto Scaler'
          }
          loading={analysisBusy}
        >
          {analysisBusyLabel}
        </Button>
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
