'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Play,
  Square,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { VectorShape } from '@/features/vector-drawing';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { Button, SelectSimple, Switch, useToast } from '@/shared/ui';

import { SequenceStackCard } from './sequencing/SequenceStackCard';
import {
  PRESET_NAME_MAX_LENGTH,
  PROJECT_SEQUENCE_OPERATION_LABELS,
} from './sequencing/sequencing-constants';
import { StudioCard } from './StudioCard';
import { useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsActions, useSettingsState } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { resolvePromptPlaceholders } from '../utils/run-request-preview';
import {
  normalizeImageStudioSequenceSteps,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSequenceOperation,
  type ImageStudioSequencePreset,
  type ImageStudioSequenceStep,
  type ImageStudioSequenceUpscaleStep,
} from '../utils/studio-settings';

type SequenceRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

type SequenceRunHistoryEvent = {
  id: string;
  type: string;
  source: 'api' | 'queue' | 'worker' | 'stream' | 'client';
  message: string;
  at: string;
  payload?: Record<string, unknown>;
};

type SequenceRunRecord = {
  id: string;
  status: SequenceRunStatus;
  currentSlotId: string;
  activeStepIndex: number | null;
  activeStepId: string | null;
  outputSlotIds: string[];
  errorMessage: string | null;
  cancelRequested: boolean;
  request: {
    steps?: ImageStudioSequenceStep[];
  };
  historyEvents: SequenceRunHistoryEvent[];
};

type SequenceRunsListResponse = {
  runs: SequenceRunRecord[];
  total: number;
};

type SequenceRunDetailResponse = {
  run: SequenceRunRecord;
};

type SequenceRunStartResponse = {
  runId: string;
  status: SequenceRunStatus;
  dispatchMode: 'queued' | 'inline';
  currentSlotId: string;
  stepCount: number;
};

const POLL_INTERVAL_MS = 1500;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const deriveLegacySequencingFields = (steps: ImageStudioSequenceStep[]): {
  operations: ImageStudioSequenceOperation[];
  upscaleStrategy: 'scale' | 'target_resolution';
  upscaleScale: number;
  upscaleTargetWidth: number;
  upscaleTargetHeight: number;
} => {
  const operations: ImageStudioSequenceOperation[] = [];
  for (const step of steps) {
    if (!step.enabled) continue;
    if (operations.includes(step.type)) continue;
    operations.push(step.type);
  }

  const firstUpscale = steps.find(
    (step): step is ImageStudioSequenceUpscaleStep =>
      step.type === 'upscale' && step.enabled,
  );

  return {
    operations,
    upscaleStrategy: firstUpscale?.config.strategy ?? 'scale',
    upscaleScale: firstUpscale?.config.scale ?? 2,
    upscaleTargetWidth: firstUpscale?.config.targetWidth ?? 2048,
    upscaleTargetHeight: firstUpscale?.config.targetHeight ?? 2048,
  };
};

const normalizePresetIdFragment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

const buildPresetId = (
  name: string,
  existingIds: Set<string>,
): string => {
  const baseFragment = normalizePresetIdFragment(name) || 'sequence_preset';
  const base = `preset_${baseFragment}`;
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  let next = `${base}_${suffix}`;
  while (existingIds.has(next)) {
    suffix += 1;
    next = `${base}_${suffix}`;
  }
  return next;
};

const normalizeShapeToPolygons = (
  shape: VectorShape,
): Array<Array<{ x: number; y: number }>> => {
  if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
    if (!shape.closed || shape.points.length < 3) return [];
    return [
      shape.points.map((point: { x: number; y: number }) => ({
        x: clamp01(point.x),
        y: clamp01(point.y),
      })),
    ];
  }

  if (shape.type === 'rect') {
    if (shape.points.length < 2) return [];
    const xs = shape.points.map((point: { x: number; y: number }) => point.x);
    const ys = shape.points.map((point: { x: number; y: number }) => point.y);
    const minX = clamp01(Math.min(...xs));
    const maxX = clamp01(Math.max(...xs));
    const minY = clamp01(Math.min(...ys));
    const maxY = clamp01(Math.max(...ys));
    if (maxX <= minX || maxY <= minY) return [];
    return [[
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ]];
  }

  if (shape.type === 'ellipse') {
    if (shape.points.length < 2) return [];
    const xs = shape.points.map((point: { x: number; y: number }) => point.x);
    const ys = shape.points.map((point: { x: number; y: number }) => point.y);
    const minX = clamp01(Math.min(...xs));
    const maxX = clamp01(Math.max(...xs));
    const minY = clamp01(Math.min(...ys));
    const maxY = clamp01(Math.max(...ys));
    if (maxX <= minX || maxY <= minY) return [];

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    const steps = 24;

    return [
      Array.from({ length: steps }, (_value, index) => {
        const theta = (index / steps) * Math.PI * 2;
        return {
          x: clamp01(cx + rx * Math.cos(theta)),
          y: clamp01(cy + ry * Math.sin(theta)),
        };
      }),
    ];
  }

  return [];
};

const collectMaskPolygons = (
  maskShapes: VectorShape[],
): Array<Array<{ x: number; y: number }>> => {
  const eligibleShapes = maskShapes.filter((shape) => {
    if (!shape.visible) return false;
    if (shape.type === 'rect' || shape.type === 'ellipse') {
      return shape.points.length >= 2;
    }
    return shape.closed && shape.points.length >= 3;
  });

  return eligibleShapes.flatMap((shape) => normalizeShapeToPolygons(shape));
};

const toStepLogLine = (event: SequenceRunHistoryEvent): string => {
  const timestamp = new Date(event.at).toLocaleTimeString();
  return `${timestamp} ${event.message}`;
};

export function SequencingPanel(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { projectId } = useProjectsState();
  const { workingSlot, compositeAssetIds } = useSlotsState();
  const { setWorkingSlotId, setSelectedSlotId } = useSlotsActions();
  const { promptText, paramsState } = usePromptState();
  const { maskShapes, maskInvert, maskFeather } = useMaskingState();
  const { studioSettings } = useSettingsState();
  const { setStudioSettings, saveStudioSettings } = useSettingsActions();

  const [activeSequenceRunId, setActiveSequenceRunId] = useState<string | null>(null);
  const [activeSequenceStatus, setActiveSequenceStatus] = useState<SequenceRunStatus | null>(null);
  const [activeStepLabel, setActiveStepLabel] = useState<string | null>(null);
  const [sequenceLog, setSequenceLog] = useState<string[]>([]);
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [presetNameDraft, setPresetNameDraft] = useState<string>('');

  const editableSequenceSteps = useMemo(
    () => normalizeImageStudioSequenceSteps(studioSettings.projectSequencing.steps, {
      fallbackOperations: studioSettings.projectSequencing.operations,
      upscaleStrategy: studioSettings.projectSequencing.upscaleStrategy,
      upscaleScale: studioSettings.projectSequencing.upscaleScale,
      upscaleTargetWidth: studioSettings.projectSequencing.upscaleTargetWidth,
      upscaleTargetHeight: studioSettings.projectSequencing.upscaleTargetHeight,
    }),
    [
      studioSettings.projectSequencing.steps,
      studioSettings.projectSequencing.operations,
      studioSettings.projectSequencing.upscaleStrategy,
      studioSettings.projectSequencing.upscaleScale,
      studioSettings.projectSequencing.upscaleTargetWidth,
      studioSettings.projectSequencing.upscaleTargetHeight,
    ],
  );

  const runtimeSequenceSteps = useMemo(
    () => resolveImageStudioSequenceActiveSteps(studioSettings.projectSequencing),
    [studioSettings.projectSequencing],
  );
  const sequencePresets = useMemo(
    () => studioSettings.projectSequencing.presets,
    [studioSettings.projectSequencing.presets],
  );
  const sequencePresetOptions = useMemo(
    () => sequencePresets.map((preset) => ({ value: preset.id, label: preset.name })),
    [sequencePresets],
  );
  const selectedPreset = useMemo(
    () => sequencePresets.find((preset) => preset.id === selectedPresetId) ?? null,
    [sequencePresets, selectedPresetId],
  );

  const enabledRuntimeSteps = useMemo(
    () => runtimeSequenceSteps.filter((step) => step.enabled),
    [runtimeSequenceSteps],
  );
  const normalizeStepsWithCurrentFallback = useCallback(
    (input: unknown): ImageStudioSequenceStep[] =>
      normalizeImageStudioSequenceSteps(input, {
        fallbackOperations: studioSettings.projectSequencing.operations,
        upscaleStrategy: studioSettings.projectSequencing.upscaleStrategy,
        upscaleScale: studioSettings.projectSequencing.upscaleScale,
        upscaleTargetWidth: studioSettings.projectSequencing.upscaleTargetWidth,
        upscaleTargetHeight: studioSettings.projectSequencing.upscaleTargetHeight,
      }),
    [
      studioSettings.projectSequencing.operations,
      studioSettings.projectSequencing.upscaleStrategy,
      studioSettings.projectSequencing.upscaleScale,
      studioSettings.projectSequencing.upscaleTargetWidth,
      studioSettings.projectSequencing.upscaleTargetHeight,
    ],
  );

  const isSequenceRunning =
    activeSequenceStatus === 'queued' || activeSequenceStatus === 'running';

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const applyRunSnapshot = useCallback(
    async (run: SequenceRunRecord): Promise<void> => {
      setActiveSequenceRunId(run.id);
      setActiveSequenceStatus(run.status);
      setSequenceError(run.errorMessage ?? null);

      const historyEvents = Array.isArray(run.historyEvents) ? run.historyEvents : [];
      const nextLogs = historyEvents
        .slice(-24)
        .reverse()
        .map((event) => toStepLogLine(event));
      setSequenceLog(nextLogs);

      const stepList = Array.isArray(run.request?.steps)
        ? run.request.steps
        : [];
      const activeStep =
        run.activeStepIndex !== null && run.activeStepIndex >= 0
          ? stepList[run.activeStepIndex] ?? null
          : stepList.find((step) => step.id === run.activeStepId) ?? null;
      setActiveStepLabel(
        activeStep
          ? `${PROJECT_SEQUENCE_OPERATION_LABELS[activeStep.type]} (${activeStep.id})`
          : null,
      );

      if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
        stopPolling();
        await invalidateImageStudioSlots(queryClient, projectId);
        if (run.currentSlotId) {
          setWorkingSlotId(run.currentSlotId);
          setSelectedSlotId(run.currentSlotId);
        }

        if (run.status === 'completed') {
          toast('Sequence completed.', { variant: 'success' });
        } else if (run.status === 'cancelled') {
          toast('Sequence cancelled.', { variant: 'info' });
        } else if (run.errorMessage) {
          toast(run.errorMessage, { variant: 'error' });
        }
      }
    },
    [projectId, queryClient, setSelectedSlotId, setWorkingSlotId, stopPolling, toast],
  );

  const pollRun = useCallback(
    (runId: string): void => {
      stopPolling();

      const tick = async (): Promise<void> => {
        try {
          const response = await api.get<SequenceRunDetailResponse>(
            `/api/image-studio/sequences/${encodeURIComponent(runId)}`,
            { cache: 'no-store', logError: false },
          );
          if (!response.run) return;
          await applyRunSnapshot(response.run);
        } catch (error) {
          setActiveSequenceStatus('failed');
          setSequenceError(error instanceof Error ? error.message : 'Sequence polling failed.');
          stopPolling();
        }
      };

      void tick();
      pollTimerRef.current = setInterval(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    },
    [applyRunSnapshot, stopPolling],
  );

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  useEffect(() => {
    if (sequencePresets.length === 0) {
      setSelectedPresetId('');
      return;
    }
    const hasCurrent = sequencePresets.some((preset) => preset.id === selectedPresetId);
    if (hasCurrent) return;
    const activePresetId = studioSettings.projectSequencing.activePresetId;
    if (activePresetId && sequencePresets.some((preset) => preset.id === activePresetId)) {
      setSelectedPresetId(activePresetId);
      return;
    }
    setSelectedPresetId(sequencePresets[0]?.id ?? '');
  }, [selectedPresetId, sequencePresets, studioSettings.projectSequencing.activePresetId]);

  useEffect(() => {
    if (selectedPreset) {
      setPresetNameDraft(selectedPreset.name);
    }
  }, [selectedPreset]);

  useEffect(() => {
    if (!projectId) {
      stopPolling();
      setActiveSequenceRunId(null);
      setActiveSequenceStatus(null);
      setActiveStepLabel(null);
      setSequenceLog([]);
      setSequenceError(null);
      return;
    }

    let cancelled = false;

    const hydrate = async (): Promise<void> => {
      try {
        const response = await api.get<SequenceRunsListResponse>(
          '/api/image-studio/sequences',
          {
            params: {
              projectId,
              limit: 20,
            },
            cache: 'no-store',
            logError: false,
          },
        );
        if (cancelled) return;

        const runs = Array.isArray(response.runs) ? response.runs : [];
        const active =
          runs.find((run) => run.status === 'queued' || run.status === 'running') ??
          null;

        if (!active) return;

        await applyRunSnapshot(active);
        if (active.status === 'queued' || active.status === 'running') {
          pollRun(active.id);
        }
      } catch {
        // Keep current UI state if hydration fails.
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [applyRunSnapshot, pollRun, projectId, stopPolling]);

  const mutateSteps = useCallback(
    (updater: (steps: ImageStudioSequenceStep[]) => ImageStudioSequenceStep[]) => {
      setStudioSettings((prev) => {
        const currentSteps = normalizeImageStudioSequenceSteps(prev.projectSequencing.steps, {
          fallbackOperations: prev.projectSequencing.operations,
          upscaleStrategy: prev.projectSequencing.upscaleStrategy,
          upscaleScale: prev.projectSequencing.upscaleScale,
          upscaleTargetWidth: prev.projectSequencing.upscaleTargetWidth,
          upscaleTargetHeight: prev.projectSequencing.upscaleTargetHeight,
        });
        const updatedSteps = normalizeImageStudioSequenceSteps(updater(currentSteps), {
          fallbackOperations: prev.projectSequencing.operations,
          upscaleStrategy: prev.projectSequencing.upscaleStrategy,
          upscaleScale: prev.projectSequencing.upscaleScale,
          upscaleTargetWidth: prev.projectSequencing.upscaleTargetWidth,
          upscaleTargetHeight: prev.projectSequencing.upscaleTargetHeight,
        });

        const legacy = deriveLegacySequencingFields(updatedSteps);

        return {
          ...prev,
          projectSequencing: {
            ...prev.projectSequencing,
            activePresetId: null,
            steps: updatedSteps,
            operations: legacy.operations,
            upscaleStrategy: legacy.upscaleStrategy,
            upscaleScale: legacy.upscaleScale,
            upscaleTargetWidth: legacy.upscaleTargetWidth,
            upscaleTargetHeight: legacy.upscaleTargetHeight,
          },
        };
      });
    },
    [setStudioSettings],
  );

  const handleSavePreset = useCallback((): void => {
    const name = presetNameDraft.trim();
    if (!name) {
      toast('Enter a preset name first.', { variant: 'info' });
      return;
    }

    const nextSteps = normalizeStepsWithCurrentFallback(editableSequenceSteps);
    const legacy = deriveLegacySequencingFields(nextSteps);
    const normalizedName = name.slice(0, PRESET_NAME_MAX_LENGTH);
    const timestamp = new Date().toISOString();
    let nextPresetId = '';

    setStudioSettings((prev) => {
      const existingPresets = Array.isArray(prev.projectSequencing.presets)
        ? prev.projectSequencing.presets
        : [];

      const byIdIndex = selectedPresetId
        ? existingPresets.findIndex((preset) => preset.id === selectedPresetId)
        : -1;
      const byNameIndex =
        byIdIndex >= 0
          ? -1
          : existingPresets.findIndex(
            (preset) =>
              preset.name.trim().toLowerCase() === normalizedName.toLowerCase(),
          );
      const targetIndex = byIdIndex >= 0 ? byIdIndex : byNameIndex;
      const existingIds = new Set(existingPresets.map((preset) => preset.id));
      nextPresetId =
        targetIndex >= 0
          ? existingPresets[targetIndex]!.id
          : buildPresetId(normalizedName, existingIds);

      const nextPreset: ImageStudioSequencePreset = {
        id: nextPresetId,
        name: normalizedName,
        description: null,
        steps: nextSteps,
        updatedAt: timestamp,
      };

      const nextPresets =
        targetIndex >= 0
          ? existingPresets.map((preset, index) =>
            index === targetIndex ? nextPreset : preset,
          )
          : [nextPreset, ...existingPresets];

      return {
        ...prev,
        projectSequencing: {
          ...prev.projectSequencing,
          activePresetId: nextPresetId,
          steps: nextSteps,
          operations: legacy.operations,
          upscaleStrategy: legacy.upscaleStrategy,
          upscaleScale: legacy.upscaleScale,
          upscaleTargetWidth: legacy.upscaleTargetWidth,
          upscaleTargetHeight: legacy.upscaleTargetHeight,
          presets: nextPresets,
        },
      };
    });

    if (nextPresetId) {
      setSelectedPresetId(nextPresetId);
    }
    toast(`Saved preset "${normalizedName}".`, { variant: 'success' });
  }, [
    editableSequenceSteps,
    normalizeStepsWithCurrentFallback,
    presetNameDraft,
    selectedPresetId,
    setStudioSettings,
    toast,
  ]);

  const handleLoadPreset = useCallback((): void => {
    if (!selectedPreset) {
      toast('Select a preset to load.', { variant: 'info' });
      return;
    }

    const nextSteps = normalizeStepsWithCurrentFallback(selectedPreset.steps);
    const legacy = deriveLegacySequencingFields(nextSteps);

    setStudioSettings((prev) => ({
      ...prev,
      projectSequencing: {
        ...prev.projectSequencing,
        activePresetId: selectedPreset.id,
        steps: nextSteps,
        operations: legacy.operations,
        upscaleStrategy: legacy.upscaleStrategy,
        upscaleScale: legacy.upscaleScale,
        upscaleTargetWidth: legacy.upscaleTargetWidth,
        upscaleTargetHeight: legacy.upscaleTargetHeight,
      },
    }));
    setSelectedPresetId(selectedPreset.id);
    toast(`Loaded preset "${selectedPreset.name}".`, { variant: 'success' });
  }, [normalizeStepsWithCurrentFallback, selectedPreset, setStudioSettings, toast]);

  const handleStartSequence = useCallback(async (): Promise<void> => {
    if (!projectId) {
      toast('Select a project first.', { variant: 'info' });
      return;
    }
    if (!workingSlot) {
      toast('Select a working card first.', { variant: 'info' });
      return;
    }
    if (!studioSettings.projectSequencing.enabled) {
      toast('Enable sequencing first.', { variant: 'info' });
      return;
    }

    const enabledSteps = enabledRuntimeSteps;
    if (enabledSteps.length === 0) {
      toast('Select at least one enabled sequence step.', { variant: 'info' });
      return;
    }

    const requiresPrompt = enabledSteps.some(
      (step) => step.type === 'generate' || step.type === 'regenerate',
    );

    const resolvedPrompt = resolvePromptPlaceholders(promptText, paramsState).trim();
    if (requiresPrompt && !resolvedPrompt) {
      toast('Enter a prompt before running generation steps.', { variant: 'info' });
      return;
    }

    try {
      setSequenceLog([]);
      setSequenceError(null);
      setActiveStepLabel(null);

      const polygons = collectMaskPolygons(maskShapes);

      const result = await api.post<SequenceRunStartResponse>(
        '/api/image-studio/sequences/run',
        {
          projectId,
          sourceSlotId: workingSlot.id,
          prompt: resolvedPrompt || promptText.trim(),
          paramsState,
          referenceSlotIds: compositeAssetIds,
          mask:
            polygons.length > 0
              ? {
                polygons,
                invert: maskInvert,
                feather: maskFeather,
              }
              : null,
          studioSettings: studioSettings as unknown as Record<string, unknown>,
          steps: enabledSteps,
          metadata: {
            source: 'sequencing-panel',
          },
        },
      );

      setActiveSequenceRunId(result.runId);
      setActiveSequenceStatus(result.status);
      if (result.dispatchMode === 'inline') {
        toast('Redis queue unavailable, sequence is running inline.', {
          variant: 'info',
        });
      }
      pollRun(result.runId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start sequence.';
      setSequenceError(message);
      toast(message, { variant: 'error' });
    }
  }, [
    compositeAssetIds,
    enabledRuntimeSteps,
    maskFeather,
    maskInvert,
    maskShapes,
    paramsState,
    pollRun,
    projectId,
    promptText,
    studioSettings,
    toast,
    workingSlot,
  ]);

  const handleCancelSequence = useCallback(async (): Promise<void> => {
    if (!activeSequenceRunId) return;
    try {
      await api.post(
        `/api/image-studio/sequences/${encodeURIComponent(activeSequenceRunId)}/cancel`,
        {},
      );
      toast('Cancellation requested.', { variant: 'info' });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to cancel sequence run.';
      toast(message, { variant: 'error' });
    }
  }, [activeSequenceRunId, toast]);

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-2'>
      <StudioCard label='Sequencing Runtime' className='shrink-0'>
        <div className='space-y-3'>
          <div className='flex flex-wrap items-center gap-3'>
            <label className='flex items-center gap-2 text-[11px] text-gray-200'>
              <Switch
                checked={studioSettings.projectSequencing.enabled}
                onCheckedChange={(checked: boolean) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    projectSequencing: {
                      ...prev.projectSequencing,
                      enabled: Boolean(checked),
                    },
                  }))
                }
                aria-label='Enable sequencing'
              />
              <span>Enable Sequencing</span>
            </label>
            <div className='text-[11px] text-gray-500'>
              Trigger: {studioSettings.projectSequencing.trigger}
            </div>
            <div className='text-[11px] text-gray-500'>
              Runtime: {studioSettings.projectSequencing.runtime}
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button
              size='xs'
              type='button'
              onClick={() => {
                void saveStudioSettings({ silent: true })
                  .then(() => {
                    toast('Sequencing defaults saved.', { variant: 'success' });
                  })
                  .catch((error: unknown) => {
                    toast(
                      error instanceof Error
                        ? error.message
                        : 'Failed to save sequencing defaults.',
                      { variant: 'error' },
                    );
                  });
              }}
            >
              Save Defaults
            </Button>
          </div>
        </div>
      </StudioCard>

      <StudioCard label='Presets' className='shrink-0'>
        <div className='space-y-2'>
          <input
            type='text'
            value={presetNameDraft}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setPresetNameDraft(event.target.value.slice(0, PRESET_NAME_MAX_LENGTH))
            }
            className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
            placeholder='Preset name'
            aria-label='Sequence preset name'
          />
          <div className='grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]'>
            <SelectSimple
              size='sm'
              value={selectedPresetId}
              onValueChange={(value: string) => setSelectedPresetId(value)}
              options={sequencePresetOptions}
              placeholder='Select sequence preset'
              triggerClassName='h-8 text-xs'
              ariaLabel='Sequence preset'
            />
            <Button
              size='xs'
              type='button'
              variant='outline'
              onClick={handleLoadPreset}
              disabled={!selectedPresetId}
            >
              Load Preset
            </Button>
            <Button
              size='xs'
              type='button'
              onClick={handleSavePreset}
              disabled={!presetNameDraft.trim()}
            >
              Save Preset
            </Button>
          </div>
          <div className='text-[11px] text-gray-500'>
            Presets can be loaded into the stack and updated by name.
          </div>
        </div>
      </StudioCard>

      <SequenceStackCard
        editableSequenceSteps={editableSequenceSteps}
        enabledRuntimeSteps={enabledRuntimeSteps}
        mutateSteps={mutateSteps}
      />

      <StudioCard label='Run' className='shrink-0'>
        <div className='space-y-2'>
          <div className='flex gap-2'>
            <Button
              size='xs'
              type='button'
              className='flex-1'
              onClick={() => {
                void handleStartSequence();
              }}
              disabled={
                isSequenceRunning ||
                !projectId ||
                !workingSlot ||
                !studioSettings.projectSequencing.enabled ||
                enabledRuntimeSteps.length === 0
              }
            >
              {isSequenceRunning ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <Play className='mr-2 size-4' />
              )}
              {isSequenceRunning ? 'Running Sequence...' : 'Start Sequence'}
            </Button>
            <Button
              size='xs'
              type='button'
              variant='outline'
              onClick={() => {
                void handleCancelSequence();
              }}
              disabled={!isSequenceRunning || !activeSequenceRunId}
            >
              <Square className='mr-2 size-4' />
              Cancel
            </Button>
          </div>

          {activeSequenceRunId ? (
            <div className='text-[11px] text-gray-400'>
              Run: {activeSequenceRunId} ({activeSequenceStatus ?? 'unknown'})
            </div>
          ) : null}
          {activeStepLabel ? (
            <div className='text-[11px] text-gray-400'>
              Active step: {activeStepLabel}
            </div>
          ) : null}
          {sequenceError ? (
            <div className='text-[11px] text-red-300'>
              {sequenceError}
            </div>
          ) : null}

          <div className='max-h-44 overflow-y-auto rounded border border-border/50 bg-card/40 p-2 text-[11px] text-gray-300'>
            {sequenceLog.length > 0 ? (
              sequenceLog.map((entry) => (
                <div key={entry} className='leading-5'>
                  {entry}
                </div>
              ))
            ) : (
              <div className='text-gray-500'>Sequence logs will appear here.</div>
            )}
          </div>
        </div>
      </StudioCard>
    </div>
  );
}
