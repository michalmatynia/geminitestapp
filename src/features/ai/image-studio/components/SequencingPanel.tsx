'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  GripVertical,
  Loader2,
  Play,
  Square,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { VectorShape } from '@/features/vector-drawing';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { Button, SelectSimple, Switch, useToast } from '@/shared/ui';

import { StudioCard } from './StudioCard';
import { useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsActions, useSettingsState } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { resolvePromptPlaceholders } from '../utils/run-request-preview';
import {
  IMAGE_STUDIO_SEQUENCE_OPERATIONS,
  normalizeImageStudioSequenceSteps,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSequenceCropStep,
  type ImageStudioSequenceGenerateStep,
  type ImageStudioSequenceMaskStep,
  type ImageStudioSequenceOperation,
  type ImageStudioSequencePreset,
  type ImageStudioSequenceStep,
  type ImageStudioSequenceStepRuntime,
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
const UPSCALE_SCALE_OPTIONS = ['1.25', '1.5', '2', '3', '4'].map((value) => ({
  value,
  label: `${value}x`,
}));
const UPSCALE_STRATEGY_OPTIONS = [
  { value: 'scale', label: 'By Multiplier' },
  { value: 'target_resolution', label: 'By Resolution' },
];
const STEP_ON_FAILURE_OPTIONS = [
  { value: 'stop', label: 'Stop Sequence' },
  { value: 'continue', label: 'Continue (Mark Failed)' },
  { value: 'skip', label: 'Skip Step' },
];
const STEP_RUNTIME_OPTIONS = [
  { value: 'server', label: 'Server' },
  { value: 'client', label: 'Client' },
];
const PRESET_NAME_MAX_LENGTH = 72;

const PROJECT_SEQUENCE_OPERATION_LABELS: Record<ImageStudioSequenceOperation, string> = {
  crop_center: 'Crop',
  mask: 'Mask',
  generate: 'Generate',
  regenerate: 'Regenerate',
  upscale: 'Upscale',
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const createStepForOperation = (
  operation: ImageStudioSequenceOperation,
  index: number,
): ImageStudioSequenceStep => {
  const id = `step_${index + 1}_${operation}`;

  if (operation === 'crop_center') {
    return {
      id,
      type: 'crop_center',
      runtime: 'server',
      enabled: false,
      label: null,
      onFailure: 'stop',
      retries: 0,
      retryBackoffMs: 1000,
      timeoutMs: null,
      config: {
        kind: 'center_square',
        aspectRatio: null,
        paddingPercent: 0,
        bbox: null,
        polygon: null,
      },
    };
  }

  if (operation === 'mask') {
    return {
      id,
      type: 'mask',
      runtime: 'server',
      enabled: false,
      label: null,
      onFailure: 'stop',
      retries: 0,
      retryBackoffMs: 1000,
      timeoutMs: null,
      config: {
        source: 'current_shapes',
        polygons: [],
        invert: false,
        feather: 0,
        variant: 'white',
        persistMaskSlot: false,
      },
    };
  }

  if (operation === 'upscale') {
    return {
      id,
      type: 'upscale',
      runtime: 'server',
      enabled: false,
      label: null,
      onFailure: 'stop',
      retries: 0,
      retryBackoffMs: 1000,
      timeoutMs: null,
      config: {
        strategy: 'scale',
        scale: 2,
        targetWidth: 2048,
        targetHeight: 2048,
        smoothingQuality: 'high',
      },
    };
  }

  return {
    id,
    type: operation,
    runtime: 'server',
    enabled: false,
    label: null,
    onFailure: 'stop',
    retries: 0,
    retryBackoffMs: 1000,
    timeoutMs: null,
    config: {
      promptMode: 'inherit',
      promptTemplate: null,
      modelOverride: null,
      outputCount: null,
      referencePolicy: 'inherit',
    },
  };
};

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
  const [draggingOperation, setDraggingOperation] = useState<ImageStudioSequenceOperation | null>(null);
  const [dragSource, setDragSource] = useState<'stack' | 'catalog' | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    operation: ImageStudioSequenceOperation;
    position: 'before' | 'after';
  } | null>(null);

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

  const toggleSequenceOperation = useCallback(
    (operation: ImageStudioSequenceOperation, checked: boolean): void => {
      mutateSteps((steps) => {
        const next = [...steps];
        const index = next.findIndex((step) => step.type === operation);
        if (index < 0) {
          if (!checked) return next;
          return [...next, { ...createStepForOperation(operation, next.length), enabled: true }];
        }
        next[index] = {
          ...next[index]!,
          enabled: checked,
        };
        return next;
      });
    },
    [mutateSteps],
  );

  const appendSequenceOperationToEnd = useCallback(
    (
      operation: ImageStudioSequenceOperation,
      options?: { enableStep?: boolean },
    ): void => {
      const enableStep = options?.enableStep ?? true;
      mutateSteps((steps) => {
        const next = [...steps];
        const index = next.findIndex((step) => step.type === operation);
        if (index < 0) {
          const created = createStepForOperation(operation, next.length);
          return [
            ...next,
            enableStep ? { ...created, enabled: true } : created,
          ];
        }
        const [moved] = next.splice(index, 1);
        if (!moved) return next;
        next.push({
          ...moved,
          ...(enableStep ? { enabled: true } : {}),
        });
        return next;
      });
    },
    [mutateSteps],
  );

  const moveSequenceOperation = useCallback(
    (
      operation: ImageStudioSequenceOperation,
      targetOperation: ImageStudioSequenceOperation,
      position: 'before' | 'after',
    ): void => {
      if (operation === targetOperation) return;
      mutateSteps((steps) => {
        const next = [...steps];
        const sourceIndex = next.findIndex((step) => step.type === operation);
        const pivotIndex = next.findIndex((step) => step.type === targetOperation);
        if (pivotIndex < 0) return next;

        if (sourceIndex < 0) {
          const created = createStepForOperation(operation, next.length);
          const insertIndex = position === 'before' ? pivotIndex : pivotIndex + 1;
          next.splice(insertIndex, 0, created);
          return next;
        }

        const [moved] = next.splice(sourceIndex, 1);
        if (!moved) return next;

        const resolvedPivotIndex = next.findIndex((step) => step.type === targetOperation);
        if (resolvedPivotIndex < 0) {
          next.splice(sourceIndex, 0, moved);
          return next;
        }

        const insertIndex = position === 'before'
          ? resolvedPivotIndex
          : resolvedPivotIndex + 1;
        next.splice(insertIndex, 0, moved);
        return next;
      });
    },
    [mutateSteps],
  );

  const removeSequenceOperationFromStack = useCallback(
    (operation: ImageStudioSequenceOperation): void => {
      mutateSteps((steps) => steps.filter((step) => step.type !== operation));
    },
    [mutateSteps],
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

  const updateStep = useCallback(
    (
      operation: ImageStudioSequenceOperation,
      updater: (step: ImageStudioSequenceStep) => ImageStudioSequenceStep,
    ): void => {
      mutateSteps((steps) => {
        const next = [...steps];
        const index = next.findIndex((step) => step.type === operation);
        if (index < 0) return next;
        next[index] = updater(next[index]!);
        return next;
      });
    },
    [mutateSteps],
  );

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

  const orderedRows = useMemo(() => {
    return editableSequenceSteps.map((step, index) => {
      const operation = step.type;
      return {
        operation,
        step,
        index,
      };
    });
  }, [editableSequenceSteps]);

  const clearDragState = useCallback((): void => {
    setDraggingOperation(null);
    setDragSource(null);
    setDropIndicator(null);
  }, []);

  const resolveDropPosition = useCallback(
    (event: React.DragEvent<HTMLDivElement>): 'before' | 'after' => {
      const rect = event.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (event.clientY <= midpoint) return 'before';
      return 'after';
    },
    [],
  );

  const handleStackItemDragStart = useCallback(
    (
      event: React.DragEvent<HTMLButtonElement>,
      operation: ImageStudioSequenceOperation,
    ): void => {
      setDraggingOperation(operation);
      setDragSource('stack');
      setDropIndicator(null);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', operation);
    },
    [],
  );

  const handleCatalogItemDragStart = useCallback(
    (
      event: React.DragEvent<HTMLButtonElement>,
      operation: ImageStudioSequenceOperation,
    ): void => {
      setDraggingOperation(operation);
      setDragSource('catalog');
      setDropIndicator(null);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', operation);
    },
    [],
  );

  const handleStackItemDragOver = useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      operation: ImageStudioSequenceOperation,
    ): void => {
      if (!draggingOperation) return;
      if (draggingOperation === operation && dragSource !== 'catalog') return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const position = resolveDropPosition(event);
      setDropIndicator((current) => {
        if (current?.operation === operation && current.position === position) {
          return current;
        }
        return { operation, position };
      });
    },
    [dragSource, draggingOperation, resolveDropPosition],
  );

  const handleStackItemDrop = useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      operation: ImageStudioSequenceOperation,
    ): void => {
      if (!draggingOperation) return;
      event.preventDefault();
      if (dragSource === 'catalog') {
        if (draggingOperation === operation) {
          toggleSequenceOperation(operation, true);
          clearDragState();
          return;
        }
        const position = resolveDropPosition(event);
        moveSequenceOperation(draggingOperation, operation, position);
        toggleSequenceOperation(draggingOperation, true);
        clearDragState();
        return;
      }
      if (draggingOperation === operation) {
        clearDragState();
        return;
      }
      const position = resolveDropPosition(event);
      moveSequenceOperation(draggingOperation, operation, position);
      clearDragState();
    },
    [
      clearDragState,
      dragSource,
      draggingOperation,
      moveSequenceOperation,
      resolveDropPosition,
      toggleSequenceOperation,
    ],
  );

  const handleStackAppendDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    if (!draggingOperation) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropIndicator(null);
  }, [draggingOperation]);

  const handleStackAppendDrop = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    if (!draggingOperation) return;
    event.preventDefault();
    appendSequenceOperationToEnd(draggingOperation, {
      enableStep: dragSource === 'catalog',
    });
    clearDragState();
  }, [appendSequenceOperationToEnd, clearDragState, dragSource, draggingOperation]);

  const activeStackLabel = useMemo(() => {
    return enabledRuntimeSteps
      .map((step) => PROJECT_SEQUENCE_OPERATION_LABELS[step.type])
      .join(' -> ');
  }, [enabledRuntimeSteps]);
  const enabledOperationSet = useMemo(
    () => new Set(editableSequenceSteps.filter((step) => step.enabled).map((step) => step.type)),
    [editableSequenceSteps],
  );

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

      <StudioCard label='Stack' className='shrink-0'>
        <div className='space-y-2'>
          <div className='rounded border border-border/50 bg-card/30 p-2'>
            <div className='mb-2 text-[11px] text-gray-400'>
              Step Catalog (drag or click to add at stack end)
            </div>
            <div className='flex flex-wrap gap-2'>
              {IMAGE_STUDIO_SEQUENCE_OPERATIONS.map((operation) => {
                const enabled = enabledOperationSet.has(operation);
                return (
                  <button
                    key={`catalog_${operation}`}
                    type='button'
                    draggable
                    onClick={() => {
                      appendSequenceOperationToEnd(operation);
                    }}
                    onDragStart={(event: React.DragEvent<HTMLButtonElement>) => {
                      handleCatalogItemDragStart(event, operation);
                    }}
                    onDragEnd={clearDragState}
                    className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] transition-colors ${
                      enabled
                        ? 'border-blue-400/60 bg-blue-500/10 text-blue-200'
                        : 'border-border/60 bg-card/40 text-gray-200 hover:text-gray-100'
                    }`}
                    title={`Add ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} to stack`}
                    aria-label={`Add ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} to stack`}
                  >
                    <GripVertical className='size-3' />
                    {PROJECT_SEQUENCE_OPERATION_LABELS[operation]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className='text-[11px] text-gray-500'>
            Drag step handles to reorder the stack.
          </div>
          {orderedRows.map(({ operation, step, index }) => {
            const enabled = step.enabled;
            const isDragSource = draggingOperation === operation;
            const showDropBefore =
              dropIndicator?.operation === operation && dropIndicator.position === 'before';
            const showDropAfter =
              dropIndicator?.operation === operation && dropIndicator.position === 'after';
            return (
              <div
                key={operation}
                className='rounded border border-border/50 bg-card/40 px-2 py-2'
                onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                  handleStackItemDragOver(event, operation);
                }}
                onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                  handleStackItemDrop(event, operation);
                }}
                onDragLeave={(event: React.DragEvent<HTMLDivElement>) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  setDropIndicator((current) =>
                    current?.operation === operation ? null : current,
                  );
                }}
              >
                {showDropBefore ? (
                  <div className='mb-2 h-0.5 rounded bg-blue-400/80' aria-hidden='true' />
                ) : null}
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-2 text-[11px] text-gray-200'>
                    <button
                      type='button'
                      draggable
                      className='inline-flex h-6 w-6 cursor-grab items-center justify-center rounded border border-border/60 bg-card/50 text-gray-300 hover:text-gray-100 active:cursor-grabbing'
                      onDragStart={(event: React.DragEvent<HTMLButtonElement>) => {
                        handleStackItemDragStart(event, operation);
                      }}
                      onDragEnd={clearDragState}
                      aria-label={`Drag to reorder ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]}`}
                      title={`Drag to reorder ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]}`}
                    >
                      <GripVertical className='size-3.5' />
                    </button>
                    <label className='flex items-center gap-2 text-[11px] text-gray-200'>
                      <input
                        type='checkbox'
                        className='h-3.5 w-3.5'
                        checked={enabled}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          toggleSequenceOperation(operation, event.target.checked)
                        }
                      />
                      <span>{PROJECT_SEQUENCE_OPERATION_LABELS[operation]}</span>
                      <span className='text-gray-500'>#{index + 1}</span>
                    </label>
                  </div>
                  <div className='flex items-center gap-2'>
                    {isDragSource ? (
                      <span className='text-[10px] uppercase tracking-wide text-blue-300'>
                        Dragging
                      </span>
                    ) : null}
                    <button
                      type='button'
                      onClick={(): void => removeSequenceOperationFromStack(operation)}
                      className='inline-flex h-6 w-6 items-center justify-center rounded border border-red-400/40 bg-red-500/10 text-red-200 transition-colors hover:bg-red-500/20 hover:text-red-100'
                      aria-label={`Remove ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} from stack`}
                      title={`Remove ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} from stack`}
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  </div>
                </div>

                {enabled ? (
                  <div className='mt-2 space-y-2 rounded border border-border/40 bg-foreground/5 p-2'>
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-4'>
                      <SelectSimple
                        size='sm'
                        value={step.runtime}
                        onValueChange={(value: string) => {
                          if (value !== 'server' && value !== 'client') return;
                          const runtime: ImageStudioSequenceStepRuntime = value;
                          updateStep(operation, (current) => ({
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
                          updateStep(operation, (current) => ({
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
                          updateStep(operation, (current) => ({
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
                          updateStep(operation, (current) => ({
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
                            updateStep(operation, (current) => {
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
                            updateStep(operation, (current) => {
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
                            updateStep(operation, (current) => {
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
                            updateStep(operation, (current) => {
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
                            updateStep(operation, (current) => {
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
                            updateStep(operation, (current) => {
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
                              updateStep(operation, (current) => {
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
                            updateStep(operation, (current) => {
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
                            updateStep(operation, (current) => {
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
                              updateStep(operation, (current) => {
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
                            updateStep(operation, (current) => {
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
                            updateStep(operation, (current) => {
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
                              updateStep(operation, (current) => {
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
                            updateStep(operation, (current) => {
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
                              updateStep(operation, (current) => {
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
                                updateStep(operation, (current) => {
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
                                updateStep(operation, (current) => {
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
                            updateStep(operation, (current) => {
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
                  </div>
                ) : null}
                {showDropAfter ? (
                  <div className='mt-2 h-0.5 rounded bg-blue-400/80' aria-hidden='true' />
                ) : null}
              </div>
            );
          })}
          <div
            className={`rounded border border-dashed px-2 py-2 text-center text-[11px] ${
              draggingOperation
                ? 'border-blue-400/70 bg-blue-500/10 text-blue-200'
                : 'border-border/60 bg-card/20 text-gray-500'
            }`}
            onDragOver={handleStackAppendDragOver}
            onDrop={handleStackAppendDrop}
          >
            Drop step here to append it to the end of stack.
          </div>
          <div className='text-[11px] text-gray-500'>
            {enabledRuntimeSteps.length > 0
              ? `Current stack: ${activeStackLabel}`
              : 'No enabled operations.'}
          </div>
        </div>
      </StudioCard>

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
