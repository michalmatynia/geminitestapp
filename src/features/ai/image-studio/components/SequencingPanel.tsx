'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOptionalContextRegistryPageEnvelope } from '@/features/ai/ai-context-registry/context/page-context';
import { resolvePromptPlaceholders } from '@/features/ai/image-studio/utils/run-request-preview';
import {
  resolveRenderableSlotById,
  slotHasRenderableImage,
} from '@/features/ai/image-studio/utils/sequence-slot-resolution';
import {
  normalizeImageStudioSequenceSteps,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSequenceStep,
} from '@/features/ai/image-studio/utils/studio-settings';
import type { ImageStudioSlotRecord, StudioSlotsResponse } from '@/shared/contracts/image-studio';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { api } from '@/shared/lib/api-client';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { useToast } from '@/shared/ui';

import {
  normalizeShapeToPolygons,
  type MaskShapeForExport,
} from './generation-toolbar/GenerationToolbarImageUtils';
import {
  collectSequenceMaskPolygons,
  resolveSequenceStepsForRun,
} from './right-sidebar/right-sidebar-utils';
import { SequenceStackCard } from './sequencing/SequenceStackCard';
import { PROJECT_SEQUENCE_OPERATION_LABELS } from './sequencing/sequencing-constants';
import { useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsActions, useSettingsState } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions } from '../context/UiContext';
import { studioKeys } from '../hooks/useImageStudioQueries';
import { SequencePresetsCard } from './sequencing/SequencePresetsCard';
import { SequenceRunCard } from './sequencing/SequenceRunCard';
import { SequenceRuntimeCard } from './sequencing/SequenceRuntimeCard';
import {
  type SequenceRunStatus,
  type SequenceRunRecord,
  type SequenceRunDetailResponse,
  type SequenceRunsListResponse,
  type SequenceRunStartResponse,
  type SequencerDisplayState,
} from './sequencing/sequencing-types';
import {
  SequencingPanelProvider,
  type SequencingPanelContextValue,
} from './sequencing/SequencingPanelContext';
import { useSequenceMonitor } from './sequencing/useSequenceMonitor';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const SLOT_RESOLUTION_RETRY_MS = 220;
const SLOT_RESOLUTION_ATTEMPTS = 10;
const AUTO_SLOT_SYNC_RETRY_MS = 900;
const ENABLE_ROBUST_SEQUENCE_SYNC =
  process.env['NEXT_PUBLIC_IMAGE_STUDIO_SEQUENCE_ROBUST_SYNC'] !== 'false';

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    const timer = window.setTimeout((): void => {
      window.clearTimeout(timer);
      resolve();
    }, ms);
  });

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const serializeGeometryValue = (value: unknown): string => JSON.stringify(value ?? null);

const toStepLogLine = (event: { at: string | number | Date; message: string }): string => {
  const timestamp = new Date(event.at).toLocaleTimeString();
  return `${timestamp} ${event.message}`;
};

export function SequencingPanel(): React.JSX.Element {
  const brainGenerationModel = useBrainAssignment({
    capability: 'image_studio.general',
  });
  const queryClient = useQueryClient();
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const { toast } = useToast();

  const sourceSlotIdRef = useRef<string | null>(null);
  const lastTerminalSnapshotRef = useRef<string | null>(null);

  const { projectId } = useProjectsState();
  const { slots, workingSlot, compositeAssetIds } = useSlotsState();
  const { setWorkingSlotId, setSelectedSlotId, setSlotSelectionLocked } = useSlotsActions();
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
  const [displayState, setDisplayState] = useState<SequencerDisplayState>('idle');
  const [pendingTerminalSlotId, setPendingTerminalSlotId] = useState<string | null>(null);
  const [slotSyncWarning, setSlotSyncWarning] = useState<string | null>(null);

  const editableSequenceSteps = useMemo(
    () => normalizeImageStudioSequenceSteps(studioSettings.projectSequencing.steps),
    [studioSettings.projectSequencing.steps]
  );

  const runtimeSequenceSteps = useMemo(
    () => resolveImageStudioSequenceActiveSteps(studioSettings.projectSequencing),
    [studioSettings.projectSequencing]
  );

  const enabledRuntimeSteps = useMemo(
    () => runtimeSequenceSteps.filter((step) => step.enabled),
    [runtimeSequenceSteps]
  );
  const activeGenerationModel = brainGenerationModel.effectiveModelId.trim() || 'Not configured';
  const workingSlotImageWidth = useMemo((): number | null => {
    const width = workingSlot?.imageFile?.width ?? null;
    return typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : null;
  }, [workingSlot?.imageFile?.width]);
  const workingSlotImageHeight = useMemo((): number | null => {
    const height = workingSlot?.imageFile?.height ?? null;
    return typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : null;
  }, [workingSlot?.imageFile?.height]);
  const sequenceImageContentFrame = useMemo((): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null => {
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    if (!normalizedWorkingSlotId) return null;
    const frameBinding = getPreviewCanvasImageFrame();
    if (frameBinding?.slotId !== normalizedWorkingSlotId) return null;
    return frameBinding.frame;
  }, [
    getPreviewCanvasImageFrame,
    workingSlot?.id,
    workingSlot?.imageFileId,
    workingSlot?.updatedAt,
  ]);
  const cropShapeOptions = useMemo(
    () =>
      maskShapes.map((shape, index) => {
        const label = shape.label?.trim() || shape.name?.trim() || `Shape ${index + 1}`;
        return {
          value: shape.id,
          label: shape.visible ? label : `${label} (hidden)`,
        };
      }),
    [maskShapes]
  );
  const cropShapeGeometryById = useMemo((): Record<
    string,
    {
      bbox: { x: number; y: number; width: number; height: number } | null;
      polygon: Array<{ x: number; y: number }> | null;
    }
  > => {
    const sourceWidth = workingSlotImageWidth ?? 1;
    const sourceHeight = workingSlotImageHeight ?? 1;
    const next: Record<
      string,
      {
        bbox: { x: number; y: number; width: number; height: number } | null;
        polygon: Array<{ x: number; y: number }> | null;
      }
    > = {};
    maskShapes.forEach((shape) => {
      const polygons = normalizeShapeToPolygons(
        shape as MaskShapeForExport,
        sourceWidth,
        sourceHeight,
        { imageContentFrame: sequenceImageContentFrame }
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
  }, [maskShapes, sequenceImageContentFrame, workingSlotImageHeight, workingSlotImageWidth]);

  const isSequenceRunning = activeSequenceStatus === 'queued' || activeSequenceStatus === 'running';

  const resolveTerminalSlotSelection = useCallback(
    async (input: {
      run: SequenceRunRecord;
      hintedSlot: SequenceRunDetailResponse['currentSlot'] | null;
    }): Promise<boolean> => {
      const normalizedProjectId = projectId.trim();
      if (!normalizedProjectId) return false;

      const resolveSequenceRenderableCandidate = (
        candidateSlots: StudioSlotsResponse['slots'] | ImageStudioSlotRecord[]
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
          const runId =
            typeof (sequence as Record<string, unknown>)['runId'] === 'string'
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
            const fresh = await fetchQueryV2<StudioSlotsResponse>(queryClient, {
              queryKey: studioKeys.slots(normalizedProjectId),
              queryFn: () =>
                api.get<StudioSlotsResponse>(
                  `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots`,
                  { cache: 'no-store', logError: false }
                ),
              staleTime: 0,
              meta: {
                source: 'imageStudio.sequencing.resolveTerminalSlot',
                operation: 'list',
                resource: 'image-studio.slots',
                domain: 'image_studio',
                queryKey: studioKeys.slots(normalizedProjectId),
                tags: ['image-studio', 'slots', 'fetch'],
                description: 'Loads image studio slots.'},
            })();
            cachedSlots = Array.isArray(fresh?.slots) ? fresh.slots : [];
          } catch (error) {
            logClientError(error);
            await invalidateImageStudioSlots(queryClient, normalizedProjectId);
            const cached = queryClient.getQueryData<StudioSlotsResponse>(
              studioKeys.slots(normalizedProjectId)
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
    [projectId, queryClient, setSelectedSlotId, setSlotSelectionLocked, setWorkingSlotId]
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

      const stepList = Array.isArray(run.request?.steps) ? run.request.steps : [];
      const activeStep =
        run.activeStepIndex !== null && run.activeStepIndex >= 0
          ? (stepList[run.activeStepIndex] ?? null)
          : (stepList.find((step) => step.id === run.activeStepId) ?? null);
      setActiveStepLabel(
        activeStep
          ? `${PROJECT_SEQUENCE_OPERATION_LABELS[activeStep.type]} (${activeStep.id})`
          : null
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
          setSlotSyncWarning('Sequence finished. Output thumbnail is syncing.');
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
      setPendingSequenceThumbnail,
      toast,
    ]
  );

  const { monitorRun, stopPolling, stopStreaming, fetchRunSnapshot } = useSequenceMonitor({
    onApplyRunSnapshot: applyRunSnapshot,
    onSetActiveSequenceStatus: setActiveSequenceStatus,
    onSetSequenceError: setSequenceError,
  });

  useEffect(() => {
    return () => {
      stopPolling();
      stopStreaming();
      setSlotSelectionLocked(false);
    };
  }, [setSlotSelectionLocked, stopPolling, stopStreaming]);

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
        const response = await api.get<SequenceRunsListResponse>('/api/image-studio/sequences', {
          params: {
            projectId,
            limit: 20,
          },
          cache: 'no-store',
          logError: false,
        });
        if (cancelled) return;

        const runs = Array.isArray(response.runs) ? response.runs : [];
        const active =
          runs.find((run) => run.status === 'queued' || run.status === 'running') ?? null;

        if (!active) return;

        await applyRunSnapshot({ run: active });
        if (active.status === 'queued' || active.status === 'running') {
          monitorRun(active.id);
        }
      } catch (error) {
        logClientError(error);
      
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
    [setStudioSettings]
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
      (step) => step.type === 'generate' || step.type === 'regenerate'
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
      }
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

      const result = await api.post<SequenceRunStartResponse>('/api/image-studio/sequences/run', {
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
        studioSettings: studioSettings as Record<string, unknown>,
        steps: resolvedSteps,
        metadata: {
          source: 'sequencing-panel',
        },
        ...(contextRegistry ? { contextRegistry } : {}),
      });

      setActiveSequenceRunId(result.runId);
      setActiveSequenceStatus(result.status);
      if (result.dispatchMode === 'inline') {
        toast('Redis queue unavailable, sequence is running inline.', {
          variant: 'info',
        });
      }
      monitorRun(result.runId);
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to start sequence.';
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
    contextRegistry,
    setPendingSequenceThumbnail,
  ]);

  const handleCancelSequence = useCallback(async (): Promise<void> => {
    if (!activeSequenceRunId) return;
    try {
      await api.post(
        `/api/image-studio/sequences/${encodeURIComponent(activeSequenceRunId)}/cancel`,
        {}
      );
      toast('Cancellation requested.', { variant: 'info' });
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to cancel sequence run.';
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
          await fetchQueryV2<StudioSlotsResponse>(queryClient, {
            queryKey: studioKeys.slots(normalizedProjectId),
            queryFn: () =>
              api.get<StudioSlotsResponse>(
                `/api/image-studio/projects/${encodeURIComponent(normalizedProjectId)}/slots`,
                { cache: 'no-store', logError: false }
              ),
            staleTime: 0,
            meta: {
              source: 'imageStudio.sequencing.syncTerminalSlot',
              operation: 'list',
              resource: 'image-studio.slots',
              domain: 'image_studio',
              queryKey: studioKeys.slots(normalizedProjectId),
              tags: ['image-studio', 'slots', 'fetch', 'sync'],
              description: 'Loads image studio slots.'},
          })();
        } catch (error) {
          logClientError(error);
        
          // Best effort
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
      if (!slot.metadata || typeof slot.metadata !== 'object' || Array.isArray(slot.metadata))
        return false;
      const sequence = slot.metadata['sequence'];
      if (!sequence || typeof sequence !== 'object' || Array.isArray(sequence)) return false;
      const runId =
        typeof (sequence as Record<string, unknown>)['runId'] === 'string'
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

  const contextValue = useMemo<SequencingPanelContextValue>(
    () => ({
      handleStartSequence: () => {
        void handleStartSequence();
      },
      handleCancelSequence: () => {
        void handleCancelSequence();
      },
      handleRetryPendingSlotSync: () => {
        void handleRetryPendingSlotSync();
      },
      mutateSteps,
      isSequenceRunning,
      projectId,
      workingSlotPresent: Boolean(workingSlot),
      sequencingEnabled: studioSettings.projectSequencing.enabled,
      enabledStepsCount: enabledRuntimeSteps.length,
      activeSequenceRunId,
      activeSequenceStatus,
      displayState,
      activeStepLabel,
      slotSyncWarning,
      pendingTerminalSlotId,
      sequenceError,
      sequenceLog,
      editableSequenceSteps,
      enabledRuntimeSteps,
      activeGenerationModel,
      sequencerFieldTooltipsEnabled: studioSettings.helpTooltips.sequencerFieldsEnabled,
      cropShapeOptions,
      cropShapeGeometryById,
    }),
    [
      handleStartSequence,
      handleCancelSequence,
      handleRetryPendingSlotSync,
      mutateSteps,
      isSequenceRunning,
      projectId,
      workingSlot,
      studioSettings.projectSequencing.enabled,
      studioSettings.helpTooltips.sequencerFieldsEnabled,
      enabledRuntimeSteps,
      activeSequenceRunId,
      activeSequenceStatus,
      displayState,
      activeStepLabel,
      slotSyncWarning,
      pendingTerminalSlotId,
      sequenceError,
      sequenceLog,
      editableSequenceSteps,
      activeGenerationModel,
      cropShapeOptions,
      cropShapeGeometryById,
    ]
  );

  return (
    <SequencingPanelProvider value={contextValue}>
      <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-2'>
        <SequenceRuntimeCard />
        <SequencePresetsCard />
        <SequenceStackCard />
        <SequenceRunCard />
      </div>
    </SequencingPanelProvider>
  );
}
