import React from 'react';

import { ImageStudioAnalysisSummaryChip } from '@/features/ai/image-studio/components/ImageStudioAnalysisSummaryChip';
import { Button, SelectSimple, Tooltip } from '@/shared/ui';

import { useGenerationToolbarContext, type CenterMode } from './GenerationToolbarContext';
import { useGenerationToolbarCenterSectionRuntime } from './GenerationToolbarSectionContexts';

import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterShadowPolicy,
} from '../../contracts/center';
export function GenerationToolbarCenterSection(): React.JSX.Element {
  const {
    centerMode,
    setCenterMode,
    centerLayoutShadowPolicy,
    setCenterLayoutShadowPolicy,
    centerLayoutPadding,
    setCenterLayoutPadding,
    centerLayoutSplitAxes,
    centerLayoutAdvancedEnabled,
    centerLayoutDetection,
    setCenterLayoutDetection,
    centerLayoutWhiteThreshold,
    setCenterLayoutWhiteThreshold,
    centerLayoutChromaThreshold,
    setCenterLayoutChromaThreshold,
    centerLayoutPresetDraftName,
    setCenterLayoutPresetDraftName,
    centerLayoutPaddingX,
    setCenterLayoutPaddingX,
    centerLayoutPaddingY,
    setCenterLayoutPaddingY,
    centerLayoutFillMissingCanvasWhite,
    setCenterLayoutFillMissingCanvasWhite,
    centerBusy,
  } = useGenerationToolbarContext();
  const {
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
    centerBusyLabel,
    centerGuidesEnabled,
    centerLayoutEnabled,
    centerLayoutPreset,
    centerLayoutPresetOptions,
    centerLayoutCanDeletePreset,
    centerLayoutCanSavePreset,
    centerLayoutSavePresetLabel,
    centerLayoutDetectionOptions,
    centerLayoutProjectCanvasSize,
    centerLayoutShadowPolicyOptions,
    centerTooltipContent,
    centerTooltipsEnabled,
    centerModeOptions,
    hasSourceImage,
    onCancelCenter,
    onCenterLayoutPresetChange,
    onCenterLayoutSavePreset,
    onCenterLayoutDeletePreset,
    onRunAnalysis,
    onCenterObject,
    onToggleCenterLayoutAdvanced,
    onToggleCenterLayoutSplitAxes,
    onToggleCenterGuides,
  } = useGenerationToolbarCenterSectionRuntime();

  const sliderValue = centerLayoutPadding.trim() === '' ? '0' : centerLayoutPadding;
  const maybeWrapTooltip = (
    content: string,
    child: React.JSX.Element,
    wrapperClassName = 'inline-flex'
  ): React.JSX.Element => {
    if (!centerTooltipsEnabled) return child;
    return (
      <Tooltip content={content} maxWidth='440px' className={wrapperClassName}>
        {child}
      </Tooltip>
    );
  };

  const runAnalysisDisabledReason = !hasSourceImage
    ? 'Select a slot image before analysis'
    : analysisBusy
      ? 'Analysis is already running'
      : centerBusy
        ? 'Cannot run analysis while Object Layouting is running'
        : null;

  return (
    <div className='rounded border border-border/60 bg-card/40 p-3'>
      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Center</div>
      {analysisSummaryData ? (
        <ImageStudioAnalysisSummaryChip
          data={analysisSummaryData}
          stale={analysisSummaryIsStale}
          label='Object Layout Summary'
          className='mb-2'
        />
      ) : null}
      {analysisConfigMismatchMessage ? (
        <div className='mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100'>
          {analysisConfigMismatchMessage}
        </div>
      ) : null}
      {!analysisPlanAvailable ? (
        <div className='mb-2 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] text-sky-100'>
          No saved analysis plan yet. Run analysis to create a shared snapshot for both tools.
        </div>
      ) : null}
      {analysisPlanWillSwitchSlot ? (
        <div className='mb-2 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] text-sky-100'>
          Latest saved analysis plan targets a different slot
          {analysisPlanSwitchSlotLabel ? `: ${analysisPlanSwitchSlotLabel}` : ''}.
        </div>
      ) : null}
      {analysisPlanIsStale ? (
        <div className='mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100'>
          Latest analysis plan is stale for the current slot image.
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
          Slot selection is locked by sequencing. Existing saved plans cannot switch slots until
          unlocked.
        </div>
      ) : null}
      {analysisPlanSlotMissing ? (
        <div className='mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100'>
          Analyzed slot no longer exists. Run analysis again to create a fresh plan.
        </div>
      ) : null}
      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
        {maybeWrapTooltip(
          centerTooltipContent.mode,
          <SelectSimple
            size='sm'
            className='w-full'
            value={centerMode}
            onValueChange={(val) => setCenterMode(val as CenterMode)}
            options={centerModeOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Center object mode'
           title='Select option'/>,
          'inline-flex w-full'
        )}
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={onToggleCenterGuides}
          title='Toggle center guides overlay'
        >
          {centerGuidesEnabled ? 'Hide Guides' : 'Show Guides'}
        </Button>
      </div>
      {centerMode === 'client_white_bg_bbox' ? (
        <div className='mt-2'>
          <input
            type='number'
            min={1}
            max={80}
            step={1}
            value={centerLayoutWhiteThreshold}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setCenterLayoutWhiteThreshold(event.target.value);
            }}
            className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
            placeholder='White threshold (1-80)'
            aria-label='White background threshold'
            title='Pixels with all channels above (255 - threshold) are treated as white background. Higher value is more permissive.'
          />
          <div className='mt-1 text-[10px] text-gray-500'>
            White threshold — pixels darker than this are treated as object
          </div>
        </div>
      ) : null}
      {centerLayoutEnabled ? (
        <div className='mt-2 space-y-2'>
          {maybeWrapTooltip(
            centerTooltipContent.shadowPolicy,
            <SelectSimple
              size='sm'
              className='w-full'
              value={centerLayoutShadowPolicy}
              onValueChange={(val) =>
                setCenterLayoutShadowPolicy(val as ImageStudioCenterShadowPolicy)
              }
              options={centerLayoutShadowPolicyOptions}
              triggerClassName='h-8 text-xs'
              ariaLabel='Object layout shadow policy'
             title='Select option'/>,
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
                    setCenterLayoutPadding(event.target.value);
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
                    setCenterLayoutPadding(event.target.value);
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='Padding %'
                  aria-label='Object layout padding percent'
                  title={
                    centerTooltipsEnabled
                      ? centerTooltipContent.padding
                      : 'Padding around detected object after centering/scaling'
                  }
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
                title={
                  centerTooltipsEnabled
                    ? centerTooltipContent.paddingAxes
                    : 'Toggle separate horizontal and vertical padding'
                }
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
                title={
                  centerTooltipsEnabled
                    ? centerTooltipContent.detection
                    : 'Show detection and threshold controls'
                }
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
                 title='Select option'/>,
                'inline-flex w-full'
              )}
              {maybeWrapTooltip(
                centerTooltipContent.detection,
                <SelectSimple
                  size='sm'
                  className='w-full'
                  value={centerLayoutDetection}
                  onValueChange={(val) =>
                    setCenterLayoutDetection(val as ImageStudioCenterDetectionMode)
                  }
                  options={centerLayoutDetectionOptions}
                  triggerClassName='h-8 text-xs'
                  ariaLabel='Object layout detection mode'
                 title='Select option'/>,
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
                      setCenterLayoutWhiteThreshold(event.target.value);
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
                      setCenterLayoutChromaThreshold(event.target.value);
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
                    setCenterLayoutPresetDraftName(event.target.value);
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
                    setCenterLayoutPaddingX(event.target.value);
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
                    setCenterLayoutPaddingY(event.target.value);
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
                  setCenterLayoutFillMissingCanvasWhite(Boolean(event.target.checked));
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
          centerTooltipContent.apply,
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onCenterObject}
            disabled={!hasSourceImage || centerBusy}
            title={
              centerTooltipsEnabled
                ? centerTooltipContent.apply
                : 'Create a centered linked variant from the active slot'
            }
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
