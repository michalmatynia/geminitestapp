'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Play,
  Square,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { Button, SelectSimple, ToggleRow, useToast } from '@/shared/ui';

import {
  normalizeShapeToPolygons,
  type MaskShapeForExport,
} from './generation-toolbar/GenerationToolbarImageUtils';
import {
  collectSequenceMaskPolygons,
  resolveSequenceStepsForRun,
} from './right-sidebar/right-sidebar-utils';
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
import { useUiActions } from '../context/UiContext';
import { studioKeys } from '../hooks/useImageStudioQueries';
import { resolvePromptPlaceholders } from '../utils/run-request-preview';
import {
  resolveRenderableSlotById,
  slotHasRenderableImage,
} from '../utils/sequence-slot-resolution';
import {
  normalizeImageStudioSequenceSteps,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSequencePreset,
  type ImageStudioSequenceStep,
} from '../utils/studio-settings';

import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

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
  sourceSlotId: string;
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
  currentSlot?: {
    id: string | null;
    imagePath: string | null;
    renderable: boolean;
  };
};

type SequenceRunStartResponse = {
  runId: string;
  status: SequenceRunStatus;
  dispatchMode: 'queued' | 'inline';
  currentSlotId: string;
  stepCount: number;
};

const POLL_INTERVAL_MS = 1500;
const SLOT_RESOLUTION_RETRY_MS = 220;
const SLOT_RESOLUTION_ATTEMPTS = 10;
const AUTO_SLOT_SYNC_RETRY_MS = 900;
const ENABLE_SEQUENCE_SSE = process.env['NEXT_PUBLIC_IMAGE_STUDIO_SEQUENCE_SSE'] !== 'false';
const ENABLE_ROBUST_SEQUENCE_SYNC =
  process.env['NEXT_PUBLIC_IMAGE_STUDIO_SEQUENCE_ROBUST_SYNC'] !== 'false';

type SequencerDisplayState =
  | 'idle'
  | 'running'
  | 'resolving_terminal_slot'
  | 'terminal';

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const serializeGeometryValue = (value: unknown): string =>
  JSON.stringify(value ?? null);

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

const toStepLogLine = (event: SequenceRunHistoryEvent): string => {
  const timestamp = new Date(event.at).toLocaleTimeString();
  return `${timestamp} ${event.message}`;
};

export function SequencingPanel(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<EventSource | null>(null);
  const sourceSlotIdRef = useRef<string | null>(null);
  const lastTerminalSnapshotRef = useRef<string | null>(null);

  const { projectId } = useProjectsState();
  const { slots, workingSlot, compositeAssetIds } = useSlotsState();
  const {
    setWorkingSlotId,
    setSelectedSlotId,
    setSlotSelectionLocked,
  } = useSlotsActions();
  const { promptText, paramsState } = usePromptState();
  const { maskShapes, maskInvert, maskFeather } = useMaskingState();
  const { studioSettings } = useSettingsState();
  const { setStudioSettings } = useSettingsActions();
  const { getPreviewCanvasImageFrame, setPendingSequenceThumbnail } = useUiActions();

  const [activeSequenceRunId, setActiveSequenceRunId] = useState<string | null>(null);
  const [activeSequenceStatus, setActiveSequenceStatus] = useState<SequenceRunStatus | null>(null);
  const [activeStepLabel, setActiveStepLabel] = useState<string | null>(null);
  const [sequenceLog, setSequenceLog] = useState<string[]>([]);
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [presetNameDraft, setPresetNameDraft] = useState<string>('');
  const [displayState, setDisplayState] = useState<SequencerDisplayState>('idle');
  const [pendingTerminalSlotId, setPendingTerminalSlotId] = useState<string | null>(null);
  const [slotSyncWarning, setSlotSyncWarning] = useState<string | null>(null);

  const editableSequenceSteps = useMemo(
    () => normalizeImageStudioSequenceSteps(studioSettings.projectSequencing.steps),
    [studioSettings.projectSequencing.steps],
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
  const activeGenerationModel =
    studioSettings.targetAi.openai.model.trim() || 'Not configured';
  const workingSlotImageWidth = useMemo((): number | null => {
    const width = workingSlot?.imageFile?.width ?? null;
    return typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : null;
  }, [workingSlot?.imageFile?.width]);
  const workingSlotImageHeight = useMemo((): number | null => {
    const height = workingSlot?.imageFile?.height ?? null;
    return typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : null;
  }, [workingSlot?.imageFile?.height]);
  const sequenceImageContentFrame = useMemo((): { x: number; y: number; width: number; height: number } | null => {
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    if (!normalizedWorkingSlotId) return null;
    const frameBinding = getPreviewCanvasImageFrame();
    if (frameBinding?.slotId !== normalizedWorkingSlotId) return null;
    return frameBinding.frame;
  }, [getPreviewCanvasImageFrame, workingSlot?.id, workingSlot?.imageFileId, workingSlot?.updatedAt]);
  const cropShapeOptions = useMemo(
    () =>
      maskShapes.map((shape, index) => {
        const label = shape.label?.trim() || shape.name.trim() || `Shape ${index + 1}`;
        return {
          value: shape.id,
          label: shape.visible ? label : `${label} (hidden)`,
        };
      }),
    [maskShapes],
  );
  const cropShapeGeometryById = useMemo((): Record<string, {
    bbox: { x: number; y: number; width: number; height: number } | null;
    polygon: Array<{ x: number; y: number }> | null;
  }> => {
    const sourceWidth = workingSlotImageWidth ?? 1;
    const sourceHeight = workingSlotImageHeight ?? 1;
    const next: Record<string, {
      bbox: { x: number; y: number; width: number; height: number } | null;
      polygon: Array<{ x: number; y: number }> | null;
    }> = {};
    maskShapes.forEach((shape) => {
      const polygons = normalizeShapeToPolygons(
        shape as MaskShapeForExport,
        sourceWidth,
        sourceHeight,
        { imageContentFrame: sequenceImageContentFrame },
      );
      const polygon = polygons[0] ?? null;
      if (!polygon || polygon.length < 3) {
        next[shape.id] = { bbox: null, polygon: null };
        return;
      }
      const xs = polygon.map((point) => clamp01(point.x));
      const ys = polygon.map((point) => clamp01(point.y));
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      if (!(maxX > minX && maxY > minY)) {
        next[shape.id] = { bbox: null, polygon: null };
        return;
      }
      next[shape.id] = {
        polygon: polygon.map((point) => ({
          x: Number(clamp01(point.x).toFixed(6)),
          y: Number(clamp01(point.y).toFixed(6)),
        })),
        bbox: {
          x: Number(minX.toFixed(6)),
          y: Number(minY.toFixed(6)),
          width: Number((maxX - minX).toFixed(6)),
          height: Number((maxY - minY).toFixed(6)),
        },
      };
    });
    return next;
  }, [
    maskShapes,
    sequenceImageContentFrame,
    workingSlotImageHeight,
    workingSlotImageWidth,
  ]);
  const normalizeStepsWithCurrentFallback = useCallback(
    (input: unknown): ImageStudioSequenceStep[] =>
      normalizeImageStudioSequenceSteps(input),
    [],
  );

  const isSequenceRunning =
    activeSequenceStatus === 'queued' || activeSequenceStatus === 'running';

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
  }, []);

  const resolveTerminalSlotSelection = useCallback(
    async (input: {
      run: SequenceRunRecord;
      hintedSlot: SequenceRunDetailResponse['currentSlot'] | null;
    }): Promise<boolean> => {
      const normalizedProjectId = projectId.trim();
      if (!normalizedProjectId) return false;

      const resolveSequenceRenderableCandidate = (
        candidateSlots: StudioSlotsResponse['slots'] | ImageStudioSlotRecord[],
      ): ImageStudioSlotRecord | null => {
        const slotsList = Array.isArray(candidateSlots) ? candidateSlots : [];
        const explicitCandidates = [
          input.run.currentSlotId,
          input.hintedSlot?.id ?? null,
          ...(Array.isArray(input.run.outputSlotIds) ? input.run.outputSlotIds : []),
        ];
        for (const candidateId of explicitCandidates) {
          const resolved = resolveRenderableSlotById(slotsList, candidateId);
          if (resolved) return resolved;
        }

        const byRunId = slotsList.find((slot) => {
          if (!slotHasRenderableImage(slot)) return false;
          if (!slot.metadata || typeof slot.metadata !== 'object' || Array.isArray(slot.metadata)) {
            return false;
          }
          const sequence = slot.metadata['sequence'];
          if (!sequence || typeof sequence !== 'object' || Array.isArray(sequence)) return false;
          const runId = typeof (sequence as Record<string, unknown>)['runId'] === 'string'
            ? ((sequence as Record<string, unknown>)['runId'] as string).trim()
            : '';
          return runId === input.run.id;
        });
        return byRunId ?? null;
      };

      setSlotSelectionLocked(true);
      try {
        for (let attempt = 0; attempt < SLOT_RESOLUTION_ATTEMPTS; attempt += 1) {
          let cachedSlots: ImageStudioSlotRecord[] = [];
          try {
            const fresh = await api.get<StudioSlotsResponse>(
              `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots`,
              { cache: 'no-store', logError: false },
            );
            queryClient.setQueryData(studioKeys.slots(normalizedProjectId), fresh);
            cachedSlots = Array.isArray(fresh?.slots) ? fresh.slots : [];
          } catch {
            await invalidateImageStudioSlots(queryClient, normalizedProjectId);
            await queryClient.refetchQueries({
              queryKey: studioKeys.slots(normalizedProjectId),
              type: 'all',
            });
            const cached = queryClient.getQueryData<StudioSlotsResponse>(
              studioKeys.slots(normalizedProjectId),
            );
            cachedSlots = Array.isArray(cached?.slots) ? cached.slots : [];
          }

          const resolvedSlot = resolveSequenceRenderableCandidate(cachedSlots);

          if (resolvedSlot) {
            setWorkingSlotId(resolvedSlot.id);
            setSelectedSlotId(resolvedSlot.id);
            return true;
          }

          if (attempt < SLOT_RESOLUTION_ATTEMPTS - 1) {
            await wait(SLOT_RESOLUTION_RETRY_MS);
          }
        }
      } finally {
        setSlotSelectionLocked(false);
      }

      return false;
    },
    [
      projectId,
      queryClient,
      setSelectedSlotId,
      setSlotSelectionLocked,
      setWorkingSlotId,
    ],
  );

  const applyRunSnapshot = useCallback(
    async (snapshot: SequenceRunDetailResponse): Promise<void> => {
      const run = snapshot.run;
      setActiveSequenceRunId(run.id);
      setActiveSequenceStatus(run.status);
      setSequenceError(run.errorMessage ?? null);

      const normalizedSourceSlotId = run.sourceSlotId?.trim() ?? '';
      if (normalizedSourceSlotId) {
        sourceSlotIdRef.current = normalizedSourceSlotId;
      }

      if (run.status === 'queued' || run.status === 'running') {
        setDisplayState('running');
        setPendingTerminalSlotId(null);
        setSlotSyncWarning(null);
        setPendingSequenceThumbnail(null);
      }

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

      if (run.status !== 'completed' && run.status !== 'failed' && run.status !== 'cancelled') {
        return;
      }

      const terminalKey = `${run.id}:${run.status}:${run.currentSlotId}`;
      if (lastTerminalSnapshotRef.current === terminalKey) {
        return;
      }
      lastTerminalSnapshotRef.current = terminalKey;

      stopPolling();
      stopStreaming();
      setDisplayState('resolving_terminal_slot');

      if (!ENABLE_ROBUST_SEQUENCE_SYNC) {
        const normalizedProjectId = projectId.trim();
        if (normalizedProjectId) {
          await invalidateImageStudioSlots(queryClient, normalizedProjectId);
        }
        const directSlotId = run.currentSlotId?.trim() ?? '';
        if (directSlotId) {
          setWorkingSlotId(directSlotId);
          setSelectedSlotId(directSlotId);
        }
      } else {
        const resolved = await resolveTerminalSlotSelection({
          run,
          hintedSlot: snapshot.currentSlot ?? null,
        });

        if (!resolved) {
          const fallbackSourceSlotId = sourceSlotIdRef.current;
          if (fallbackSourceSlotId) {
            setWorkingSlotId(fallbackSourceSlotId);
            setSelectedSlotId(fallbackSourceSlotId);
          }
          setPendingTerminalSlotId(run.currentSlotId ?? null);
          setSlotSyncWarning(
            'Sequence finished. Output thumbnail is syncing.',
          );
          setPendingSequenceThumbnail({
            runId: run.id,
            sourceSlotId: fallbackSourceSlotId || run.sourceSlotId || null,
            status: 'syncing',
            startedAt: new Date().toISOString(),
          });
        } else {
          setPendingTerminalSlotId(null);
          setSlotSyncWarning(null);
          setPendingSequenceThumbnail(null);
        }
      }

      setDisplayState('terminal');
      if (run.status === 'completed') {
        toast('Sequence completed.', { variant: 'success' });
      } else if (run.status === 'cancelled') {
        toast('Sequence cancelled.', { variant: 'info' });
      } else if (run.errorMessage) {
        toast(run.errorMessage, { variant: 'error' });
      }
      if (run.status === 'failed' || run.status === 'cancelled') {
        setPendingSequenceThumbnail(null);
      }
    },
    [
      projectId,
      queryClient,
      resolveTerminalSlotSelection,
      setSelectedSlotId,
      setWorkingSlotId,
      stopPolling,
      stopStreaming,
      setPendingSequenceThumbnail,
      toast,
    ],
  );

  const fetchRunSnapshot = useCallback(
    async (runId: string): Promise<SequenceRunDetailResponse | null> => {
      try {
        const response = await api.get<SequenceRunDetailResponse>(
          `/api/image-studio/sequences/${encodeURIComponent(runId)}`,
          { cache: 'no-store', logError: false },
        );
        if (!response.run) return null;
        return response;
      } catch (error) {
        setActiveSequenceStatus('failed');
        setSequenceError(error instanceof Error ? error.message : 'Sequence polling failed.');
        return null;
      }
    },
    [],
  );

  const pollRun = useCallback(
    (runId: string): void => {
      stopPolling();
      stopStreaming();

      const tick = async (): Promise<void> => {
        const snapshot = await fetchRunSnapshot(runId);
        if (!snapshot) {
          stopPolling();
          return;
        }
        await applyRunSnapshot(snapshot);
      };

      void tick();
      pollTimerRef.current = setInterval(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    },
    [applyRunSnapshot, fetchRunSnapshot, stopPolling, stopStreaming],
  );

  const monitorRun = useCallback(
    (runId: string): void => {
      if (!ENABLE_SEQUENCE_SSE || typeof EventSource === 'undefined') {
        pollRun(runId);
        return;
      }

      stopPolling();
      stopStreaming();

      let source: EventSource;
      try {
        source = new EventSource(
          `/api/image-studio/sequences/${encodeURIComponent(runId)}/stream`,
        );
      } catch {
        pollRun(runId);
        return;
      }
      streamRef.current = source;

      const fallbackToPolling = (): void => {
        if (streamRef.current !== source) return;
        source.close();
        streamRef.current = null;
        pollRun(runId);
      };

      const refresh = (): void => {
        void fetchRunSnapshot(runId).then((snapshot) => {
          if (!snapshot) return;
          void applyRunSnapshot(snapshot);
        });
      };

      source.onopen = () => {
        refresh();
      };
      source.onmessage = (event: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload.type === 'heartbeat') return;
          if (payload.type === 'fallback') {
            fallbackToPolling();
            return;
          }
        } catch {
          // Treat non-json data as a signal to refresh run snapshot.
        }
        refresh();
      };
      source.onerror = () => {
        fallbackToPolling();
      };
    },
    [applyRunSnapshot, fetchRunSnapshot, pollRun, stopPolling, stopStreaming],
  );

  useEffect(() => {
    return () => {
      stopPolling();
      stopStreaming();
      setSlotSelectionLocked(false);
    };
  }, [setSlotSelectionLocked, stopPolling, stopStreaming]);

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
      stopStreaming();
      setSlotSelectionLocked(false);
      sourceSlotIdRef.current = null;
      lastTerminalSnapshotRef.current = null;
      setActiveSequenceRunId(null);
      setActiveSequenceStatus(null);
      setActiveStepLabel(null);
      setSequenceLog([]);
      setSequenceError(null);
      setDisplayState('idle');
      setPendingTerminalSlotId(null);
      setSlotSyncWarning(null);
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

        await applyRunSnapshot({ run: active });
        if (active.status === 'queued' || active.status === 'running') {
          monitorRun(active.id);
        }
      } catch {
        // Keep current UI state if hydration fails.
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [applyRunSnapshot, monitorRun, projectId, setSlotSelectionLocked, stopPolling, stopStreaming]);

  const mutateSteps = useCallback(
    (updater: (steps: ImageStudioSequenceStep[]) => ImageStudioSequenceStep[]) => {
      setStudioSettings((prev) => {
        const currentSteps = normalizeImageStudioSequenceSteps(prev.projectSequencing.steps);
        const updatedSteps = normalizeImageStudioSequenceSteps(updater(currentSteps));

        return {
          ...prev,
          projectSequencing: {
            ...prev.projectSequencing,
            activePresetId: null,
            steps: updatedSteps,
          },
        };
      });
    },
    [setStudioSettings],
  );

  useEffect(() => {
    setStudioSettings((prev) => {
      const currentSteps = normalizeImageStudioSequenceSteps(prev.projectSequencing.steps);
      let changed = false;
      const updatedSteps = currentSteps.map((step) => {
        if (step.type !== 'crop_center') return step;
        if (step.config.kind !== 'selected_shape') return step;
        const selectedShapeId = step.config.selectedShapeId?.trim() ?? '';
        if (!selectedShapeId) return step;
        const geometry = cropShapeGeometryById[selectedShapeId] ?? null;
        const nextBbox = geometry?.bbox ?? null;
        const nextPolygon = geometry?.polygon ?? null;
        const bboxChanged =
          serializeGeometryValue(step.config.bbox) !== serializeGeometryValue(nextBbox);
        const polygonChanged =
          serializeGeometryValue(step.config.polygon) !== serializeGeometryValue(nextPolygon);
        if (!bboxChanged && !polygonChanged) return step;
        changed = true;
        return {
          ...step,
          config: {
            ...step.config,
            bbox: nextBbox,
            polygon: nextPolygon,
          },
        };
      });
      if (!changed) return prev;

      const normalizedUpdatedSteps = normalizeImageStudioSequenceSteps(updatedSteps);

      return {
        ...prev,
        projectSequencing: {
          ...prev.projectSequencing,
          activePresetId: null,
          steps: normalizedUpdatedSteps,
        },
      };
    });
  }, [cropShapeGeometryById, setStudioSettings]);

  const handleSavePreset = useCallback((): void => {
    const name = presetNameDraft.trim();
    if (!name) {
      toast('Enter a preset name first.', { variant: 'info' });
      return;
    }

    const nextSteps = normalizeStepsWithCurrentFallback(editableSequenceSteps);
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
    setStudioSettings((prev) => ({
      ...prev,
      projectSequencing: {
        ...prev.projectSequencing,
        activePresetId: selectedPreset.id,
        steps: nextSteps,
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

    const polygons = collectSequenceMaskPolygons(
      maskShapes,
      workingSlotImageWidth ?? 1,
      workingSlotImageHeight ?? 1,
      sequenceImageContentFrame
    );
    const { resolvedSteps, errors: stepResolutionErrors } = resolveSequenceStepsForRun(
      enabledSteps,
      {
        maskShapes,
        sourceWidth: workingSlotImageWidth ?? 1,
        sourceHeight: workingSlotImageHeight ?? 1,
        imageContentFrame: sequenceImageContentFrame,
      },
    );
    if (stepResolutionErrors.length > 0) {
      toast(stepResolutionErrors[0] ?? 'Selected-shape crop step is not fully configured.', {
        variant: 'info',
      });
      return;
    }

    try {
      setSequenceLog([]);
      setSequenceError(null);
      setActiveStepLabel(null);
      setDisplayState('running');
      setPendingTerminalSlotId(null);
      setSlotSyncWarning(null);
      setPendingSequenceThumbnail(null);
      lastTerminalSnapshotRef.current = null;
      sourceSlotIdRef.current = workingSlot.id;

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
          steps: resolvedSteps,
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
      monitorRun(result.runId);
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
    workingSlotImageHeight,
    workingSlotImageWidth,
    sequenceImageContentFrame,
    paramsState,
    monitorRun,
    projectId,
    promptText,
    studioSettings,
    toast,
    workingSlot,
    setPendingSequenceThumbnail,
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

  useEffect(() => {
    if (!activeSequenceRunId || !pendingTerminalSlotId) return;
    let cancelled = false;

    const tick = async (): Promise<void> => {
      if (cancelled) return;
      const snapshot = await fetchRunSnapshot(activeSequenceRunId);
      if (!snapshot?.run || cancelled) return;
      const normalizedProjectId = projectId.trim();
      if (normalizedProjectId) {
        try {
          const fresh = await api.get<StudioSlotsResponse>(
            `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots`,
            { cache: 'no-store', logError: false },
          );
          if (!cancelled) {
            queryClient.setQueryData(studioKeys.slots(normalizedProjectId), fresh);
          }
        } catch {
          // Best effort; resolveTerminalSlotSelection has its own fallback refresh path.
        }
      }
      const resolved = await resolveTerminalSlotSelection({
        run: snapshot.run,
        hintedSlot: snapshot.currentSlot ?? null,
      });
      if (resolved && !cancelled) {
        setPendingTerminalSlotId(null);
        setSlotSyncWarning(null);
        setDisplayState('terminal');
        setPendingSequenceThumbnail(null);
      }
    };

    const timer = setInterval(() => {
      void tick();
    }, AUTO_SLOT_SYNC_RETRY_MS);
    void tick();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    activeSequenceRunId,
    fetchRunSnapshot,
    projectId,
    pendingTerminalSlotId,
    queryClient,
    resolveTerminalSlotSelection,
    setPendingSequenceThumbnail,
  ]);

  useEffect(() => {
    const pendingRunId = activeSequenceRunId?.trim() ?? '';
    if (!pendingTerminalSlotId || !pendingRunId) return;
    const hasSyncedSlot = slots.some((slot) => {
      if (!slot.metadata || typeof slot.metadata !== 'object' || Array.isArray(slot.metadata)) return false;
      const sequence = slot.metadata['sequence'];
      if (!sequence || typeof sequence !== 'object' || Array.isArray(sequence)) return false;
      const runId = typeof (sequence as Record<string, unknown>)['runId'] === 'string'
        ? ((sequence as Record<string, unknown>)['runId'] as string).trim()
        : '';
      return runId === pendingRunId;
    });
    if (!hasSyncedSlot) return;
    setPendingTerminalSlotId(null);
    setSlotSyncWarning(null);
    setPendingSequenceThumbnail(null);
    setDisplayState('terminal');
  }, [activeSequenceRunId, pendingTerminalSlotId, setPendingSequenceThumbnail, slots]);

  const handleRetryPendingSlotSync = useCallback(async (): Promise<void> => {
    if (!activeSequenceRunId || !pendingTerminalSlotId) return;

    const snapshot = await fetchRunSnapshot(activeSequenceRunId);
    if (!snapshot?.run) {
      toast('Unable to refresh sequence run snapshot.', { variant: 'error' });
      return;
    }

    setDisplayState('resolving_terminal_slot');
    const resolved = await resolveTerminalSlotSelection({
      run: snapshot.run,
      hintedSlot: snapshot.currentSlot ?? null,
    });
    if (resolved) {
      setPendingTerminalSlotId(null);
      setSlotSyncWarning(null);
      setDisplayState('terminal');
      setPendingSequenceThumbnail(null);
      toast('Sequence output synced to canvas.', { variant: 'success' });
      return;
    }
    setDisplayState('terminal');
    toast('Output card is still syncing. Try again in a moment.', { variant: 'info' });
  }, [
    activeSequenceRunId,
    fetchRunSnapshot,
    pendingTerminalSlotId,
    resolveTerminalSlotSelection,
    setPendingSequenceThumbnail,
    toast,
  ]);

  const handleToggleSequencingEnabled = useCallback((checked: boolean): void => {
    setStudioSettings((prev) => {
      return {
        ...prev,
        projectSequencing: {
          ...prev.projectSequencing,
          enabled: Boolean(checked),
        },
      };
    });
  }, [setStudioSettings]);

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-2'>
      <StudioCard label='Sequencing Runtime' className='shrink-0'>
        <div className='space-y-3'>
          <div className='flex flex-wrap items-center gap-3'>
            <ToggleRow
              label='Enable Sequencing'
              checked={studioSettings.projectSequencing.enabled}
              onCheckedChange={handleToggleSequencingEnabled}
              className='bg-transparent border-none p-0 hover:bg-transparent'
            />
            <Hint size='xxs' className='text-gray-500'>
              Trigger: {studioSettings.projectSequencing.trigger}
            </Hint>
            <Hint size='xxs' className='text-gray-500'>
              Runtime: {studioSettings.projectSequencing.runtime}
            </Hint>
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
            className='h-7 w-full rounded border border-border/60 bg-card/40 px-2 text-[11px] text-gray-100 outline-none'
            placeholder='Preset name'
            aria-label='Sequence preset name'
          />
          <div className='grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-1.5'>
            <SelectSimple
              size='sm'
              value={selectedPresetId}
              onValueChange={(value: string) => setSelectedPresetId(value)}
              options={sequencePresetOptions}
              placeholder='Select sequence preset'
              triggerClassName='h-7 text-[11px]'
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
        activeGenerationModel={activeGenerationModel}
        sequencerFieldTooltipsEnabled={studioSettings.helpTooltips.sequencerFieldsEnabled}
        cropShapeOptions={cropShapeOptions}
        cropShapeGeometryById={cropShapeGeometryById}
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
              loading={isSequenceRunning}
            >
              <Play className='mr-2 size-4' />
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
          {displayState !== 'idle' ? (
            <div className='text-[11px] text-gray-500'>
              Sync state: {displayState.replaceAll('_', ' ')}
            </div>
          ) : null}
          {activeStepLabel ? (
            <div className='text-[11px] text-gray-400'>
              Active step: {activeStepLabel}
            </div>
          ) : null}
          {slotSyncWarning ? (
            <div className='text-[11px] text-amber-300'>{slotSyncWarning}</div>
          ) : null}
          {pendingTerminalSlotId ? (
            <div className='flex justify-start'>
              <Button
                size='xs'
                type='button'
                variant='outline'
                onClick={() => {
                  void handleRetryPendingSlotSync();
                }}
                disabled={displayState === 'resolving_terminal_slot'}
              >
                Retry Sync Output
              </Button>
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
