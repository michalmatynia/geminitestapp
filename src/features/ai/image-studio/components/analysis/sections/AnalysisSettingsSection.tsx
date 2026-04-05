'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Button, Card } from '@/shared/ui/primitives.public';
import { SelectSimple, FormActions } from '@/shared/ui/forms-and-actions.public';

import { type AnalysisMode, type ShadowPolicy, type DetectionMode } from '../analysis-types';
import {
  PADDING_MIN,
  PADDING_MAX,
  WHITE_THRESHOLD_MIN,
  WHITE_THRESHOLD_MAX,
  CHROMA_THRESHOLD_MIN,
  CHROMA_THRESHOLD_MAX,
} from '../analysis-types';
import {
  type AnalysisSettingsSectionConfig,
  useOptionalImageStudioAnalysisRuntime,
} from './ImageStudioAnalysisRuntimeContext';

export type { AnalysisSettingsSectionConfig } from './ImageStudioAnalysisRuntimeContext';

interface AnalysisSettingsSectionProps {
  config?: AnalysisSettingsSectionConfig;
}

export function AnalysisSettingsSection({
  config,
}: AnalysisSettingsSectionProps): React.JSX.Element {
  const analysisRuntime = useOptionalImageStudioAnalysisRuntime();
  const resolvedConfig = config ?? analysisRuntime?.settingsConfig;

  if (!resolvedConfig) {
    throw new Error(
      'AnalysisSettingsSection must be used within ImageStudioAnalysisRuntimeProvider or receive explicit config'
    );
  }

  const {
    mode,
    setMode,
    layoutPadding,
    setLayoutPadding,
    layoutPaddingX,
    setLayoutPaddingX,
    layoutPaddingY,
    setLayoutPaddingY,
    layoutSplitAxes,
    setLayoutSplitAxes,
    layoutAdvancedEnabled,
    setLayoutAdvancedEnabled,
    layoutDetection,
    setLayoutDetection,
    layoutWhiteThreshold,
    setLayoutWhiteThreshold,
    layoutChromaThreshold,
    setLayoutChromaThreshold,
    layoutFillMissingCanvasWhite,
    setLayoutFillMissingCanvasWhite,
    layoutShadowPolicy,
    setLayoutShadowPolicy,
    layoutPresetOptionValue,
    layoutPresetOptions,
    layoutPresetDraftName,
    setLayoutPresetDraftName,
    onCenterLayoutPresetChange,
    onCenterLayoutSavePreset,
    onCenterLayoutDeletePreset,
    layoutCanSavePreset,
    layoutCanDeletePreset,
    layoutSavePresetLabel,
    projectCanvasSize,
    busy,
    busyLabel,
    handleAnalyze,
    handleCancel,
    workingSlotId,
    workingSlotImageSrc,
    sanitizePaddingInput,
    sanitizeThresholdInput,
  } = resolvedConfig;

  const modeOptions: Array<LabeledOptionDto<AnalysisMode>> = [
    { value: 'server_analysis', label: 'Analysis Server: Sharp' },
    { value: 'client_analysis', label: 'Analysis Client: Canvas' },
  ];
  const shadowPolicyOptions: Array<LabeledOptionDto<ShadowPolicy>> = [
    { value: 'auto', label: 'Shadow: Auto' },
    { value: 'include_shadow', label: 'Shadow: Include' },
    { value: 'exclude_shadow', label: 'Shadow: Exclude' },
  ];
  const detectionOptions: Array<LabeledOptionDto<DetectionMode>> = [
    { value: 'auto', label: 'Detection: Auto' },
    { value: 'white_bg_first_colored_pixel', label: 'Detection: White FG' },
    { value: 'alpha_bbox', label: 'Detection: Alpha BBox' },
  ];

  return (
    <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/30'>
      <div className='grid gap-3 lg:grid-cols-3'>
        <div className='space-y-2'>
          <div className='text-[11px] text-gray-400'>Mode</div>
          <SelectSimple
            size='sm'
            value={mode}
            onValueChange={(value: string) => setMode(value as AnalysisMode)}
            options={modeOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Analysis mode'
           title='Select option'/>
        </div>
        <div className='space-y-2'>
          <div className='text-[11px] text-gray-400'>Padding %</div>
          <div className='grid grid-cols-[minmax(0,1fr)_72px] gap-2'>
            <input
              type='range'
              min={PADDING_MIN}
              max={PADDING_MAX}
              step={0.5}
              value={layoutPadding.trim() === '' ? '0' : layoutPadding}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const normalized = sanitizePaddingInput(event.target.value);
                setLayoutPadding(normalized);
                if (!layoutSplitAxes) {
                  setLayoutPaddingX(normalized);
                  setLayoutPaddingY(normalized);
                }
              }}
              className='w-full accent-gray-300'
              aria-label='Analysis padding slider'
            />
            <input
              type='number'
              min={PADDING_MIN}
              max={PADDING_MAX}
              step={0.5}
              value={layoutPadding}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const normalized = sanitizePaddingInput(event.target.value);
                setLayoutPadding(normalized);
                if (!layoutSplitAxes) {
                  setLayoutPaddingX(normalized);
                  setLayoutPaddingY(normalized);
                }
              }}
              className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
              placeholder='Padding %'
              aria-label='Analysis padding percent'
            />
          </div>
        </div>
        <div className='space-y-2'>
          <div className='text-[11px] text-gray-400'>Shadow Policy</div>
          <SelectSimple
            size='sm'
            value={layoutShadowPolicy}
            onValueChange={(value: string) => {
              setLayoutShadowPolicy(value as ShadowPolicy);
            }}
            options={shadowPolicyOptions}
            triggerClassName='h-8 text-xs'
            ariaLabel='Analysis shadow policy'
           title='Select option'/>
        </div>
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          size='xs'
          variant='outline'
          onClick={() => {
            setLayoutAdvancedEnabled((previous) => !previous);
          }}
        >
          {layoutAdvancedEnabled ? 'Hide Advanced' : 'Show Advanced'}
        </Button>
      </div>

      {layoutAdvancedEnabled ? (
        <Card
          variant='subtle-compact'
          padding='sm'
          className='mt-3 space-y-2 border-border/50 bg-card/30'
        >
          <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
            <SelectSimple
              size='sm'
              value={layoutPresetOptionValue}
              onValueChange={onCenterLayoutPresetChange}
              options={layoutPresetOptions}
              triggerClassName='h-8 text-xs'
              ariaLabel='Analysis object layout preset'
             title='Select option'/>
            <SelectSimple
              size='sm'
              value={layoutDetection}
              onValueChange={(value: string) => {
                setLayoutDetection(value as DetectionMode);
              }}
              options={detectionOptions}
              triggerClassName='h-8 text-xs'
              ariaLabel='Analysis detection mode'
             title='Select option'/>
            <input
              type='number'
              min={WHITE_THRESHOLD_MIN}
              max={WHITE_THRESHOLD_MAX}
              step={1}
              value={layoutWhiteThreshold}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setLayoutWhiteThreshold(sanitizeThresholdInput(event.target.value));
              }}
              className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
              placeholder='White threshold (1-80)'
              aria-label='Analysis white threshold'
            />
            <input
              type='number'
              min={CHROMA_THRESHOLD_MIN}
              max={CHROMA_THRESHOLD_MAX}
              step={1}
              value={layoutChromaThreshold}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setLayoutChromaThreshold(sanitizeThresholdInput(event.target.value));
              }}
              className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
              placeholder='Chroma threshold (0-80)'
              aria-label='Analysis chroma threshold'
            />
          </div>
          <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center'>
            <input
              type='text'
              value={layoutPresetDraftName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setLayoutPresetDraftName(event.target.value);
              }}
              className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
              placeholder='Custom preset name'
              aria-label='Analysis custom preset name'
            />
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={onCenterLayoutSavePreset}
              disabled={!layoutCanSavePreset}
            >
              {layoutSavePresetLabel}
            </Button>
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={onCenterLayoutDeletePreset}
              disabled={!layoutCanDeletePreset}
            >
              Delete Preset
            </Button>
          </div>
        </Card>
      ) : null}

      <div className='mt-3 space-y-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            size='xs'
            variant='outline'
            onClick={() => {
              setLayoutSplitAxes((previous) => !previous);
            }}
          >
            {layoutSplitAxes ? 'Linked X/Y' : 'Split X/Y'}
          </Button>
          <label className='flex items-center gap-2 text-[11px] text-gray-300'>
            <input
              type='checkbox'
              checked={layoutFillMissingCanvasWhite}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setLayoutFillMissingCanvasWhite(Boolean(event.target.checked));
              }}
              disabled={!projectCanvasSize}
              className='h-3.5 w-3.5 rounded border border-border/60 bg-card/40 accent-gray-200'
              aria-label='Fill missing canvas with white for analysis plan'
            />
            <span>
              Fill missing canvas with white
              {projectCanvasSize
                ? ` (${projectCanvasSize.width}x${projectCanvasSize.height})`
                : ' (project canvas size unavailable)'}
            </span>
          </label>
        </div>

        {layoutSplitAxes ? (
          <div className='grid gap-2 sm:grid-cols-2'>
            <input
              type='number'
              min={PADDING_MIN}
              max={PADDING_MAX}
              step={0.5}
              value={layoutPaddingX}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setLayoutPaddingX(sanitizePaddingInput(event.target.value));
              }}
              className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
              placeholder='Padding X %'
              aria-label='Analysis horizontal padding percent'
            />
            <input
              type='number'
              min={PADDING_MIN}
              max={PADDING_MAX}
              step={0.5}
              value={layoutPaddingY}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setLayoutPaddingY(sanitizePaddingInput(event.target.value));
              }}
              className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
              placeholder='Padding Y %'
              aria-label='Analysis vertical padding percent'
            />
          </div>
        ) : null}
      </div>

      <FormActions
        onSave={handleAnalyze}
        onCancel={busy ? handleCancel : undefined}
        saveText={busyLabel}
        cancelText='Cancel Analysis'
        isSaving={busy}
        isDisabled={!workingSlotId || !workingSlotImageSrc}
        className='mt-3 !justify-start'
        saveVariant='outline'
      />
    </Card>
  );
}
