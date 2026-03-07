import React from 'react';

import { SelectSimple, Tooltip } from '@/shared/ui';

import {
  PROJECT_SEQUENCE_OPERATION_LABELS,
  STEP_INPUT_SOURCE_OPTIONS,
  STEP_ON_FAILURE_OPTIONS,
  STEP_RUNTIME_OPTIONS,
  UPSCALE_SCALE_OPTIONS,
  UPSCALE_STRATEGY_OPTIONS,
} from './sequencing-constants';
import { getImageStudioDocTooltip } from '@/features/ai/image-studio/utils/studio-docs';

import type {
  ImageStudioSequenceCropStep,
  ImageStudioSequenceGenerateStep,
  ImageStudioSequenceMaskStep,
  ImageStudioSequenceOperation,
  ImageStudioSequenceStep,
  ImageStudioSequenceStepInputSource,
  ImageStudioSequenceStepRuntime,
  ImageStudioSequenceUpscaleStep,
} from '@/features/ai/image-studio/utils/studio-settings';
import { useSequenceStepEditorRuntime } from './SequenceStepEditorRuntimeContext';

type SequenceStepEditorProps = {
  stepId: string;
  operation: ImageStudioSequenceOperation;
  step: ImageStudioSequenceStep;
};

export function SequenceStepEditor(props: SequenceStepEditorProps): React.JSX.Element {
  const { stepId, operation, step } = props;

  const {
    activeGenerationModel,
    cropShapeOptions,
    cropShapeGeometryById,
    sequencerFieldTooltipsEnabled,
    updateStep,
  } = useSequenceStepEditorRuntime();
  const isGenerationStep = step.type === 'generate' || step.type === 'regenerate';
  const projectGenerationModel = activeGenerationModel.trim();
  const generateStep = isGenerationStep ? step : null;
  const modelOverride = generateStep?.config.modelOverride?.trim() ?? '';
  const effectiveGenerationModel = modelOverride || projectGenerationModel || 'Not configured';
  const modelSourceDescription = modelOverride
    ? 'Using step override model. Clear Model override to use the project model.'
    : projectGenerationModel
      ? 'Using project generation model.'
      : 'Set project model or Model override.';
  const sequencerTooltipContent = {
    retries: getImageStudioDocTooltip('sequence_retries'),
    retryBackoffMs: getImageStudioDocTooltip('sequence_retry_backoff_ms'),
    cropPaddingPercent: getImageStudioDocTooltip('sequence_crop_padding_percent'),
    maskFeather: getImageStudioDocTooltip('sequence_mask_feather'),
    generateOutputCount: getImageStudioDocTooltip('sequence_generate_output_count'),
    upscaleScale: getImageStudioDocTooltip('sequence_upscale_scale'),
    upscaleTargetWidth: getImageStudioDocTooltip('sequence_upscale_target_width'),
    upscaleTargetHeight: getImageStudioDocTooltip('sequence_upscale_target_height'),
  } as const;
  const maybeWrapTooltip = (
    content: string,
    child: React.JSX.Element,
    wrapperClassName = 'w-full'
  ): React.JSX.Element => {
    if (!sequencerFieldTooltipsEnabled) return child;
    return (
      <Tooltip content={content} className={wrapperClassName} maxWidth='440px'>
        {child}
      </Tooltip>
    );
  };

  return (
    <div className='mt-1.5 space-y-1.5 rounded border border-border/40 bg-foreground/5 p-[7px]'>
      <div className='grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-1.5'>
        {isGenerationStep ? (
          <div
            className='flex h-7 min-w-0 items-center rounded border border-border/60 bg-card/30 px-2 text-[11px] text-gray-300'
            aria-label={`${operation} runtime fixed`}
          >
            Runtime: Server (AI)
          </div>
        ) : (
          <SelectSimple
            size='sm'
            value={step.runtime}
            onValueChange={(value: string) => {
              if (value !== 'server' && value !== 'client') return;
              const runtime: ImageStudioSequenceStepRuntime = value;
              updateStep(stepId, (current) => ({
                ...current,
                runtime,
              }));
            }}
            options={STEP_RUNTIME_OPTIONS}
            triggerClassName='h-7 text-[11px]'
            ariaLabel={`${operation} runtime`}
          />
        )}
        <SelectSimple
          size='sm'
          value={step.inputSource}
          onValueChange={(value: string) => {
            if (value !== 'previous' && value !== 'source') return;
            const inputSource: ImageStudioSequenceStepInputSource = value;
            updateStep(stepId, (current) => ({
              ...current,
              inputSource,
            }));
          }}
          options={STEP_INPUT_SOURCE_OPTIONS}
          triggerClassName='h-7 text-[11px]'
          ariaLabel={`${operation} input source`}
        />
        <SelectSimple
          size='sm'
          value={step.onFailure}
          onValueChange={(value: string) => {
            if (value !== 'stop' && value !== 'continue' && value !== 'skip') return;
            updateStep(stepId, (current) => ({
              ...current,
              onFailure: value,
            }));
          }}
          options={STEP_ON_FAILURE_OPTIONS}
          triggerClassName='h-7 text-[11px]'
          ariaLabel={`${operation} on failure behavior`}
        />
        {maybeWrapTooltip(
          sequencerTooltipContent.retries,
          <input
            type='number'
            min={0}
            max={5}
            step={1}
            value={String(step.retries)}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              const numeric = Math.floor(Number(event.target.value));
              if (!Number.isFinite(numeric) || numeric < 0 || numeric > 5) return;
              updateStep(stepId, (current) => ({
                ...current,
                retries: numeric,
              }));
            }}
            className='h-7 w-full min-w-0 rounded border border-border/60 bg-card/40 px-2 text-[11px] text-gray-100 outline-none'
            aria-label={`${operation} retries`}
            placeholder='Retries (0-5)'
            title={sequencerFieldTooltipsEnabled ? sequencerTooltipContent.retries : undefined}
          />
        )}
        {maybeWrapTooltip(
          sequencerTooltipContent.retryBackoffMs,
          <input
            type='number'
            min={0}
            max={60000}
            step={100}
            value={String(step.retryBackoffMs)}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              const numeric = Math.floor(Number(event.target.value));
              if (!Number.isFinite(numeric) || numeric < 0 || numeric > 60000) return;
              updateStep(stepId, (current) => ({
                ...current,
                retryBackoffMs: numeric,
              }));
            }}
            className='h-7 w-full min-w-0 rounded border border-border/60 bg-card/40 px-2 text-[11px] text-gray-100 outline-none'
            aria-label={`${operation} retry backoff ms`}
            placeholder='Retry Backoff (ms)'
            title={
              sequencerFieldTooltipsEnabled ? sequencerTooltipContent.retryBackoffMs : undefined
            }
          />
        )}
      </div>

      {step.type === 'crop_center' ? (
        <div className='grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-1.5'>
          <SelectSimple
            size='sm'
            value={step.config.kind}
            onValueChange={(value: string) => {
              if (
                value !== 'center_square' &&
                value !== 'center_fit' &&
                value !== 'bbox' &&
                value !== 'polygon' &&
                value !== 'alpha_object_bbox' &&
                value !== 'selected_shape'
              ) {
                return;
              }
              updateStep(stepId, (current) => {
                const typed = current as ImageStudioSequenceCropStep;
                return {
                  ...typed,
                  config: {
                    ...typed.config,
                    kind: value,
                  },
                };
              });
            }}
            options={[
              { value: 'center_square', label: 'Center Square' },
              { value: 'center_fit', label: 'Center Fit Ratio' },
              { value: 'bbox', label: 'BBox' },
              { value: 'polygon', label: 'Polygon Bounds' },
              { value: 'alpha_object_bbox', label: 'Alpha Object Bounds' },
              { value: 'selected_shape', label: 'Selected Shape' },
            ]}
            triggerClassName='h-7 text-[11px]'
            ariaLabel='Crop kind'
          />
          {step.config.kind === 'selected_shape' ? (
            <SelectSimple
              size='sm'
              value={step.config.selectedShapeId ?? undefined}
              onValueChange={(value: string) => {
                updateStep(stepId, (current) => {
                  const typed = current as ImageStudioSequenceCropStep;
                  const selectedShapeId = value.trim() ? value : null;
                  const geometry = selectedShapeId
                    ? (cropShapeGeometryById[selectedShapeId] ?? null)
                    : null;
                  return {
                    ...typed,
                    config: {
                      ...typed.config,
                      selectedShapeId,
                      bbox: geometry?.bbox ?? null,
                      polygon: geometry?.polygon ?? null,
                    },
                  };
                });
              }}
              options={cropShapeOptions}
              placeholder='Select shape'
              triggerClassName='h-7 text-[11px]'
              ariaLabel='Crop selected shape'
              disabled={cropShapeOptions.length === 0}
            />
          ) : (
            <div className='h-7 rounded border border-transparent bg-transparent' />
          )}
          <input
            type='text'
            value={step.config.aspectRatio ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              updateStep(stepId, (current) => {
                const typed = current as ImageStudioSequenceCropStep;
                return {
                  ...typed,
                  config: {
                    ...typed.config,
                    aspectRatio: event.target.value.trim() || null,
                  },
                };
              });
            }}
            className='h-7 w-full min-w-0 rounded border border-border/60 bg-card/40 px-2 text-[11px] text-gray-100 outline-none'
            placeholder='Aspect ratio (e.g. 4:5)'
            aria-label='Crop aspect ratio'
          />
          {maybeWrapTooltip(
            sequencerTooltipContent.cropPaddingPercent,
            <input
              type='number'
              min={0}
              max={100}
              step={0.5}
              value={String(step.config.paddingPercent)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const numeric = Number(event.target.value);
                if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) return;
                updateStep(stepId, (current) => {
                  const typed = current as ImageStudioSequenceCropStep;
                  return {
                    ...typed,
                    config: {
                      ...typed.config,
                      paddingPercent: Number(numeric.toFixed(2)),
                    },
                  };
                });
              }}
              className='h-7 w-full min-w-0 rounded border border-border/60 bg-card/40 px-2 text-[11px] text-gray-100 outline-none'
              placeholder='Padding %'
              aria-label='Crop padding percent'
              title={
                sequencerFieldTooltipsEnabled
                  ? sequencerTooltipContent.cropPaddingPercent
                  : undefined
              }
            />
          )}
        </div>
      ) : null}

      {step.type === 'mask' ? (
        <div className='grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-1.5'>
          <SelectSimple
            size='sm'
            value={step.config.source}
            onValueChange={(value: string) => {
              if (value !== 'current_shapes' && value !== 'preset_polygons') return;
              updateStep(stepId, (current) => {
                const typed = current as ImageStudioSequenceMaskStep;
                return {
                  ...typed,
                  config: {
                    ...typed.config,
                    source: value,
                  },
                };
              });
            }}
            options={[
              { value: 'current_shapes', label: 'Current Shapes' },
              { value: 'preset_polygons', label: 'Preset Polygons' },
            ]}
            triggerClassName='h-7 text-[11px]'
            ariaLabel='Mask source'
          />
          <SelectSimple
            size='sm'
            value={step.config.variant}
            onValueChange={(value: string) => {
              if (value !== 'white' && value !== 'black') return;
              updateStep(stepId, (current) => {
                const typed = current as ImageStudioSequenceMaskStep;
                return {
                  ...typed,
                  config: {
                    ...typed.config,
                    variant: value,
                  },
                };
              });
            }}
            options={[
              { value: 'white', label: 'White Mask' },
              { value: 'black', label: 'Black Mask' },
            ]}
            triggerClassName='h-7 text-[11px]'
            ariaLabel='Mask variant'
          />
          {maybeWrapTooltip(
            sequencerTooltipContent.maskFeather,
            <input
              type='number'
              min={0}
              max={50}
              step={0.5}
              value={String(step.config.feather)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const numeric = Number(event.target.value);
                if (!Number.isFinite(numeric) || numeric < 0 || numeric > 50) return;
                updateStep(stepId, (current) => {
                  const typed = current as ImageStudioSequenceMaskStep;
                  return {
                    ...typed,
                    config: {
                      ...typed.config,
                      feather: Number(numeric.toFixed(2)),
                    },
                  };
                });
              }}
              className='h-7 w-full min-w-0 rounded border border-border/60 bg-card/40 px-2 text-[11px] text-gray-100 outline-none'
              placeholder='Feather'
              aria-label='Mask feather'
              title={
                sequencerFieldTooltipsEnabled ? sequencerTooltipContent.maskFeather : undefined
              }
            />
          )}
          <label className='flex h-7 items-center gap-2 rounded border border-border/60 bg-card/40 px-2 text-[11px] text-gray-200'>
            <input
              type='checkbox'
              checked={step.config.invert}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const checked = event.target.checked;
                updateStep(stepId, (current) => {
                  const typed = current as ImageStudioSequenceMaskStep;
                  return {
                    ...typed,
                    config: {
                      ...typed.config,
                      invert: checked,
                    },
                  };
                });
              }}
            />
            Invert
          </label>
        </div>
      ) : null}

      {step.type === 'generate' || step.type === 'regenerate' ? (
        <div className='grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-1.5'>
          <div className='col-span-full rounded border border-border/60 bg-card/30 px-2 py-2'>
            <div className='text-[10px] uppercase tracking-wide text-gray-500'>
              Generation model in use
            </div>
            <div className='break-all text-[11px] text-gray-100'>{effectiveGenerationModel}</div>
            <div className='text-[10px] text-gray-500'>{modelSourceDescription}</div>
          </div>
          <SelectSimple
            size='sm'
            value={step.config.promptMode}
            onValueChange={(value: string) => {
              if (value !== 'inherit' && value !== 'override') return;
              updateStep(stepId, (current) => {
                const typed = current as ImageStudioSequenceGenerateStep;
                return {
                  ...typed,
                  config: {
                    ...typed.config,
                    promptMode: value,
                  },
                };
              });
            }}
            options={[
              { value: 'inherit', label: 'Prompt Inherit' },
              { value: 'override', label: 'Prompt Override' },
            ]}
            triggerClassName='h-7 text-[11px]'
            ariaLabel='Prompt mode'
          />
          <input
            type='text'
            value={step.config.modelOverride ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              updateStep(stepId, (current) => {
                const typed = current as ImageStudioSequenceGenerateStep;
                return {
                  ...typed,
                  config: {
                    ...typed.config,
                    modelOverride: event.target.value.trim() || null,
                  },
                };
              });
            }}
            className='h-7 w-full min-w-0 rounded border border-border/60 bg-card/40 px-2 text-[11px] text-gray-100 outline-none'
            placeholder='Model override'
            aria-label='Model override'
          />
          {maybeWrapTooltip(
            sequencerTooltipContent.generateOutputCount,
            <input
              type='number'
              min={1}
              max={10}
              step={1}
              value={
                typeof step.config.outputCount === 'number' ? String(step.config.outputCount) : ''
              }
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value.trim();
                if (!value) {
                  updateStep(stepId, (current) => {
                    const typed = current as ImageStudioSequenceGenerateStep;
                    return {
                      ...typed,
                      config: {
                        ...typed.config,
                        outputCount: null,
                      },
                    };
                  });
                  return;
                }
                const numeric = Math.floor(Number(value));
                if (!Number.isFinite(numeric) || numeric < 1 || numeric > 10) return;
                updateStep(stepId, (current) => {
                  const typed = current as ImageStudioSequenceGenerateStep;
                  return {
                    ...typed,
                    config: {
                      ...typed.config,
                      outputCount: numeric,
                    },
                  };
                });
              }}
              className='h-7 w-full min-w-0 rounded border border-border/60 bg-card/40 px-2 text-[11px] text-gray-100 outline-none'
              placeholder='Output count'
              aria-label='Output count override'
              title={
                sequencerFieldTooltipsEnabled
                  ? sequencerTooltipContent.generateOutputCount
                  : undefined
              }
            />
          )}
          <SelectSimple
            size='sm'
            value={step.config.referencePolicy}
            onValueChange={(value: string) => {
              if (value !== 'inherit' && value !== 'none') return;
              updateStep(stepId, (current) => {
                const typed = current as ImageStudioSequenceGenerateStep;
                return {
                  ...typed,
                  config: {
                    ...typed.config,
                    referencePolicy: value,
                  },
                };
              });
            }}
            options={[
              { value: 'inherit', label: 'Use References' },
              { value: 'none', label: 'No References' },
            ]}
            triggerClassName='h-7 text-[11px]'
            ariaLabel='Reference policy'
          />
          {step.config.promptMode === 'override' ? (
            <input
              type='text'
              value={step.config.promptTemplate ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                updateStep(stepId, (current) => {
                  const typed = current as ImageStudioSequenceGenerateStep;
                  return {
                    ...typed,
                    config: {
                      ...typed.config,
                      promptTemplate: event.target.value,
                    },
                  };
                });
              }}
              className='col-span-full h-7 w-full min-w-0 rounded border border-border/60 bg-card/40 px-2 text-[11px] text-gray-100 outline-none'
              placeholder='Override prompt template'
              aria-label='Override prompt template'
            />
          ) : null}
        </div>
      ) : null}

      {step.type === 'upscale' ? (
        <div className='grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-1.5'>
          <SelectSimple
            size='sm'
            value={step.config.strategy}
            onValueChange={(value: string) => {
              const strategy = value === 'target_resolution' ? 'target_resolution' : 'scale';
              updateStep(stepId, (current) => {
                const typed = current as ImageStudioSequenceUpscaleStep;
                return {
                  ...typed,
                  config: {
                    ...typed.config,
                    strategy,
                  },
                };
              });
            }}
            options={UPSCALE_STRATEGY_OPTIONS}
            triggerClassName='h-7 text-[11px]'
            ariaLabel='Upscale strategy'
          />

          {step.config.strategy === 'scale' ? (
            maybeWrapTooltip(
              sequencerTooltipContent.upscaleScale,
              <SelectSimple
                size='sm'
                value={String(step.config.scale)}
                onValueChange={(value: string) => {
                  const numeric = Number(value);
                  if (!Number.isFinite(numeric)) return;
                  updateStep(stepId, (current) => {
                    const typed = current as ImageStudioSequenceUpscaleStep;
                    return {
                      ...typed,
                      config: {
                        ...typed.config,
                        scale: numeric,
                      },
                    };
                  });
                }}
                options={UPSCALE_SCALE_OPTIONS}
                triggerClassName='h-7 text-[11px]'
                ariaLabel='Upscale scale'
              />
            )
          ) : (
            <div className='grid h-7 min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 rounded border border-border/60 bg-card/40 px-2'>
              {maybeWrapTooltip(
                sequencerTooltipContent.upscaleTargetWidth,
                <input
                  type='number'
                  min={1}
                  max={32768}
                  step={1}
                  inputMode='numeric'
                  value={String(step.config.targetWidth)}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    const numeric = Math.floor(Number(event.target.value));
                    if (!Number.isFinite(numeric) || numeric < 1 || numeric > 32768) return;
                    updateStep(stepId, (current) => {
                      const typed = current as ImageStudioSequenceUpscaleStep;
                      return {
                        ...typed,
                        config: {
                          ...typed.config,
                          targetWidth: numeric,
                        },
                      };
                    });
                  }}
                  className='h-6 w-full min-w-0 border-0 bg-transparent text-[11px] text-gray-100 outline-none placeholder:text-gray-500'
                  aria-label='Target width'
                  title={
                    sequencerFieldTooltipsEnabled
                      ? sequencerTooltipContent.upscaleTargetWidth
                      : undefined
                  }
                />,
                'inline-flex'
              )}
              <span className='text-[11px] text-gray-500'>x</span>
              {maybeWrapTooltip(
                sequencerTooltipContent.upscaleTargetHeight,
                <input
                  type='number'
                  min={1}
                  max={32768}
                  step={1}
                  inputMode='numeric'
                  value={String(step.config.targetHeight)}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    const numeric = Math.floor(Number(event.target.value));
                    if (!Number.isFinite(numeric) || numeric < 1 || numeric > 32768) return;
                    updateStep(stepId, (current) => {
                      const typed = current as ImageStudioSequenceUpscaleStep;
                      return {
                        ...typed,
                        config: {
                          ...typed.config,
                          targetHeight: numeric,
                        },
                      };
                    });
                  }}
                  className='h-6 w-full min-w-0 border-0 bg-transparent text-[11px] text-gray-100 outline-none placeholder:text-gray-500'
                  aria-label='Target height'
                  title={
                    sequencerFieldTooltipsEnabled
                      ? sequencerTooltipContent.upscaleTargetHeight
                      : undefined
                  }
                />,
                'inline-flex'
              )}
            </div>
          )}

          <SelectSimple
            size='sm'
            value={step.config.smoothingQuality}
            onValueChange={(value: string) => {
              if (value !== 'low' && value !== 'medium' && value !== 'high') return;
              updateStep(stepId, (current) => {
                const typed = current as ImageStudioSequenceUpscaleStep;
                return {
                  ...typed,
                  config: {
                    ...typed.config,
                    smoothingQuality: value,
                  },
                };
              });
            }}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            triggerClassName='h-7 text-[11px]'
            ariaLabel='Smoothing quality'
          />
        </div>
      ) : null}

      <div className='text-[10px] text-gray-500'>
        Editing {PROJECT_SEQUENCE_OPERATION_LABELS[operation]} step settings
      </div>
    </div>
  );
}
