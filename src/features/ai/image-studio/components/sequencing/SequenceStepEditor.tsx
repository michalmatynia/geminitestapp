import React from 'react';

import { SelectSimple } from '@/shared/ui';

import {
  PROJECT_SEQUENCE_OPERATION_LABELS,
  STEP_ON_FAILURE_OPTIONS,
  STEP_RUNTIME_OPTIONS,
  UPSCALE_SCALE_OPTIONS,
  UPSCALE_STRATEGY_OPTIONS,
} from './sequencing-constants';

import type {
  ImageStudioSequenceCropStep,
  ImageStudioSequenceGenerateStep,
  ImageStudioSequenceMaskStep,
  ImageStudioSequenceOperation,
  ImageStudioSequenceStep,
  ImageStudioSequenceStepRuntime,
  ImageStudioSequenceUpscaleStep,
} from '../../utils/studio-settings';

type SequenceStepEditorProps = {
  stepId: string;
  operation: ImageStudioSequenceOperation;
  step: ImageStudioSequenceStep;
  updateStep: (
    stepId: string,
    updater: (step: ImageStudioSequenceStep) => ImageStudioSequenceStep,
  ) => void;
};

export function SequenceStepEditor({
  stepId,
  operation,
  step,
  updateStep,
}: SequenceStepEditorProps): React.JSX.Element {
  return (
    <div className='mt-2 space-y-2 rounded border border-border/40 bg-foreground/5 p-2'>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-4'>
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
          triggerClassName='h-8 text-xs'
          ariaLabel={`${operation} runtime`}
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
          triggerClassName='h-8 text-xs'
          ariaLabel={`${operation} on failure behavior`}
        />
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
          className='h-8 rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
          aria-label={`${operation} retries`}
          placeholder='Retries'
        />
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
          className='h-8 rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
          aria-label={`${operation} retry backoff ms`}
          placeholder='Retry Backoff (ms)'
        />
      </div>

      {step.type === 'crop_center' ? (
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
          <SelectSimple
            size='sm'
            value={step.config.kind}
            onValueChange={(value: string) => {
              if (
                value !== 'center_square' &&
                value !== 'center_fit' &&
                value !== 'bbox' &&
                value !== 'polygon' &&
                value !== 'alpha_object_bbox'
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
            ]}
            triggerClassName='h-8 text-xs'
            ariaLabel='Crop kind'
          />
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
            className='h-8 rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
            placeholder='Aspect ratio (e.g. 4:5)'
            aria-label='Crop aspect ratio'
          />
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
            className='h-8 rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
            placeholder='Padding %'
            aria-label='Crop padding percent'
          />
        </div>
      ) : null}

      {step.type === 'mask' ? (
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-4'>
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
            triggerClassName='h-8 text-xs'
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
            triggerClassName='h-8 text-xs'
            ariaLabel='Mask variant'
          />
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
            className='h-8 rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
            placeholder='Feather'
            aria-label='Mask feather'
          />
          <label className='flex items-center gap-2 rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-200'>
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
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-4'>
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
            triggerClassName='h-8 text-xs'
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
            className='h-8 rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
            placeholder='Model override'
            aria-label='Model override'
          />
          <input
            type='number'
            min={1}
            max={10}
            step={1}
            value={
              typeof step.config.outputCount === 'number'
                ? String(step.config.outputCount)
                : ''
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
            className='h-8 rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
            placeholder='Output count'
            aria-label='Output count override'
          />
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
            triggerClassName='h-8 text-xs'
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
              className='h-8 rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none sm:col-span-4'
              placeholder='Override prompt template'
              aria-label='Override prompt template'
            />
          ) : null}
        </div>
      ) : null}

      {step.type === 'upscale' ? (
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
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
            triggerClassName='h-8 text-xs'
            ariaLabel='Upscale strategy'
          />

          {step.config.strategy === 'scale' ? (
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
              triggerClassName='h-8 text-xs'
              ariaLabel='Upscale scale'
            />
          ) : (
            <div className='flex h-8 items-center gap-1 rounded border border-border/60 bg-card/40 px-2'>
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
                className='h-6 w-[68px] border-0 bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-500'
                aria-label='Target width'
              />
              <span className='text-[11px] text-gray-500'>x</span>
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
                className='h-6 w-[68px] border-0 bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-500'
                aria-label='Target height'
              />
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
            triggerClassName='h-8 text-xs'
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
