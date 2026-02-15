'use client';

import { useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  useRunStudio,
  type ImageStudioRunRecord,
  type ImageStudioRunStatus,
  type RunStudioEnqueueResult,
  type RunStudioPayload,
} from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import type { ImageFileRecord } from '@/shared/types/domain/files';
import { useToast } from '@/shared/ui';

import { useMaskingState, useMaskingActions } from './MaskingContext';
import { useProjectsState } from './ProjectsContext';
import { usePromptState, usePromptActions } from './PromptContext';
import { useSettingsState } from './SettingsContext';
import { useSlotsState } from './SlotsContext';
import { buildRunRequestPreview } from '../utils/run-request-preview';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GenerationRecord {
  id: string;
  timestamp: string;
  prompt: string;
  maskShapeCount: number;
  maskInvert: boolean;
  maskFeather: number;
  outputs: ImageFileRecord[];
  slotId: string;
  slotName: string;
}

export interface GenerationLandingSlot {
  id: string;
  index: number;
  status: 'pending' | 'completed' | 'failed';
  output: ImageFileRecord | null;
}

export interface GenerationState {
  runMutation: UseMutationResult<RunStudioEnqueueResult, Error, RunStudioPayload>;
  runOutputs: ImageFileRecord[];
  maskEligibleCount: number;
  generationHistory: GenerationRecord[];
  activeRunId: string | null;
  activeRunStatus: ImageStudioRunStatus | null;
  activeRunError: string | null;
  isRunInFlight: boolean;
  landingSlots: GenerationLandingSlot[];
}

export interface GenerationActions {
  handleRunGeneration: () => void;
  restoreGeneration: (record: GenerationRecord) => void;
  clearActiveRunError: () => void;
}

type PollToken = {
  runId: string;
  cancelled: boolean;
  settled: boolean;
  eventSource: EventSource | null;
};

// ── Contexts ─────────────────────────────────────────────────────────────────

const GenerationStateContext = createContext<GenerationState | null>(null);
const GenerationActionsContext = createContext<GenerationActions | null>(null);

const POLL_INTERVAL_MS = 1200;
const SSE_FALLBACK_POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 600;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeExpectedOutputs = (value: unknown, fallback = 1): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(10, Math.floor(parsed)));
};

const buildPendingLandingSlots = (runId: string, expectedOutputs: number): GenerationLandingSlot[] => {
  const count = normalizeExpectedOutputs(expectedOutputs, 1);
  return Array.from({ length: count }, (_value, index) => ({
    id: `${runId}:${index + 1}`,
    index: index + 1,
    status: 'pending',
    output: null,
  }));
};

const buildLandingSlotsFromRun = (run: ImageStudioRunRecord): GenerationLandingSlot[] => {
  const outputs = Array.isArray(run.outputs) ? run.outputs : [];
  const slotCount = Math.max(normalizeExpectedOutputs(run.expectedOutputs, 1), outputs.length);
  return Array.from({ length: slotCount }, (_value, index) => {
    const output = outputs[index] ?? null;
    const status: GenerationLandingSlot['status'] = output
      ? 'completed'
      : run.status === 'failed' || run.status === 'completed'
        ? 'failed'
        : 'pending';
    return {
      id: `${run.id}:${index + 1}`,
      index: index + 1,
      status,
      output,
    };
  });
};

const toGenerationRecordFromRun = (run: ImageStudioRunRecord): GenerationRecord | null => {
  const outputs = Array.isArray(run.outputs) ? run.outputs : [];
  if (outputs.length === 0) return null;

  const requestMask = run.request?.mask;
  const maskShapeCount = requestMask?.type === 'polygons'
    ? (Array.isArray(requestMask.polygons) ? requestMask.polygons.length : 0)
    : requestMask?.type === 'polygon'
      ? (Array.isArray(requestMask.points) && requestMask.points.length >= 3 ? 1 : 0)
      : 0;
  const maskInvert = requestMask?.type === 'polygons'
    ? Boolean(requestMask.invert)
    : false;
  const maskFeather = requestMask?.type === 'polygons'
    ? Number(requestMask.feather ?? 0) || 0
    : 0;

  return {
    id: run.id,
    timestamp: run.finishedAt ?? run.updatedAt ?? run.createdAt,
    prompt: run.request?.prompt ?? '',
    maskShapeCount,
    maskInvert,
    maskFeather,
    outputs,
    slotId: run.request?.asset?.id ?? '',
    slotName:
      run.request?.asset?.id ??
      run.request?.asset?.filepath ??
      run.id,
  };
};

// ── Provider ─────────────────────────────────────────────────────────────────

export function GenerationProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cross-domain reads
  const { projectId } = useProjectsState();
  const { workingSlot, slots, compositeAssetIds } = useSlotsState();
  const { maskShapes, maskInvert, maskFeather } = useMaskingState();
  const { setMaskInvert, setMaskFeather } = useMaskingActions();
  const { promptText, paramsState } = usePromptState();
  const { setPromptText } = usePromptActions();
  const { studioSettings } = useSettingsState();

  const runMutation = useRunStudio();
  const [runOutputs, setRunOutputs] = useState<ImageFileRecord[]>([]);
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRunStatus, setActiveRunStatus] = useState<ImageStudioRunStatus | null>(null);
  const [activeRunError, setActiveRunError] = useState<string | null>(null);
  const [landingSlots, setLandingSlots] = useState<GenerationLandingSlot[]>([]);

  const pollTokenRef = useRef<PollToken | null>(null);

  const maskEligibleCount = useMemo(
    () => maskShapes.filter((s) => s.visible && s.closed && (s.type === 'polygon' || s.type === 'lasso') && s.points.length >= 3).length,
    [maskShapes]
  );

  const isRunInFlight = activeRunStatus === 'queued' || activeRunStatus === 'running';

  const cancelCurrentPoll = useCallback((): void => {
    if (pollTokenRef.current) {
      pollTokenRef.current.cancelled = true;
      if (pollTokenRef.current.eventSource) {
        pollTokenRef.current.eventSource.close();
        pollTokenRef.current.eventSource = null;
      }
      pollTokenRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelCurrentPoll();
    };
  }, [cancelCurrentPoll]);

  const pollRunUntilFinished = useCallback(
    async (params: {
      runId: string;
      resolvedPrompt: string;
      maskShapeCount: number;
      submittedMaskInvert: boolean;
      submittedMaskFeather: number;
      submittedSlotId: string;
      submittedSlotName: string;
      submittedSlotFolderPath: string;
      expectedOutputs: number;
    }): Promise<void> => {
      const token: PollToken = {
        runId: params.runId,
        cancelled: false,
        settled: false,
        eventSource: null,
      };
      cancelCurrentPoll();
      pollTokenRef.current = token;

      let sseConnected = false;

      const closeEventSource = (): void => {
        if (token.eventSource) {
          token.eventSource.close();
          token.eventSource = null;
        }
      };

      const settle = (): void => {
        if (token.settled) return;
        token.settled = true;
        closeEventSource();
        if (pollTokenRef.current === token) {
          pollTokenRef.current = null;
        }
      };

      const applyRunSnapshot = (run: ImageStudioRunRecord): boolean => {
        if (token.cancelled || token.settled || pollTokenRef.current !== token) return true;

        setActiveRunId(run.id);
        setActiveRunStatus(run.status);
        setActiveRunError(run.errorMessage ?? null);

        const expectedOutputs = normalizeExpectedOutputs(run.expectedOutputs, params.expectedOutputs);
        if (run.status === 'completed') {
          const outputs = Array.isArray(run.outputs) ? run.outputs : [];

          setRunOutputs(outputs);
          void invalidateImageStudioSlots(queryClient, projectId);
          setLandingSlots(buildLandingSlotsFromRun({
            ...run,
            expectedOutputs,
          }));

          const record: GenerationRecord = {
            id: run.id,
            timestamp: run.finishedAt ?? new Date().toISOString(),
            prompt: params.resolvedPrompt,
            maskShapeCount: params.maskShapeCount,
            maskInvert: params.submittedMaskInvert,
            maskFeather: params.submittedMaskFeather,
            outputs,
            slotId: params.submittedSlotId,
            slotName: params.submittedSlotName,
          };
          setGenerationHistory((prev) => {
            const deduped = prev.filter((entry) => entry.id !== record.id);
            return [record, ...deduped].slice(0, 50);
          });
          settle();
          toast(`Generated ${outputs.length} image(s).`, { variant: 'success' });
          return true;
        }

        if (run.status === 'failed') {
          setLandingSlots((prev) =>
            prev.map((slot) =>
              slot.status === 'completed' ? slot : { ...slot, status: 'failed' }
            )
          );
          settle();
          toast(run.errorMessage || 'Generation failed.', { variant: 'error' });
          return true;
        }

        return false;
      };

      const fetchAndApplyRunStatus = async (): Promise<boolean> => {
        const response = await api.get<{ run: ImageStudioRunRecord }>(
          `/api/image-studio/runs/${encodeURIComponent(params.runId)}`
        );
        return applyRunSnapshot(response.run);
      };

      if (typeof EventSource !== 'undefined') {
        try {
          const source = new EventSource(`/api/image-studio/runs/${encodeURIComponent(params.runId)}/stream`);
          token.eventSource = source;

          source.onopen = () => {
            if (token.cancelled || token.settled || pollTokenRef.current !== token) {
              source.close();
              return;
            }
            sseConnected = true;
          };

          source.onmessage = (event: MessageEvent) => {
            if (token.cancelled || token.settled || pollTokenRef.current !== token) return;
            try {
              const payload = JSON.parse(event.data as string) as { type?: string };
              if (payload?.type === 'heartbeat') return;
            } catch {
              // Continue with status refresh for unknown event payloads.
            }
            void fetchAndApplyRunStatus().catch(() => {
              // Polling fallback handles transient failures.
            });
          };

          source.onerror = () => {
            sseConnected = false;
            if (token.eventSource === source) {
              source.close();
              token.eventSource = null;
            }
          };
        } catch {
          // Polling fallback remains active.
        }
      }

      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
        if (token.cancelled || token.settled || pollTokenRef.current !== token) return;

        try {
          const finished = await fetchAndApplyRunStatus();
          if (finished) {
            return;
          }
        } catch (error) {
          if (attempt === 0 && !sseConnected) {
            toast(error instanceof Error ? error.message : 'Failed to receive generation callback.', {
              variant: 'error',
            });
          }
        }

        const nextDelay = sseConnected ? SSE_FALLBACK_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
        await sleep(nextDelay);
      }

      if (token.cancelled || token.settled || pollTokenRef.current !== token) return;
      setActiveRunStatus('failed');
      setActiveRunError('Generation callback timed out.');
      setLandingSlots((prev) =>
        prev.map((slot) =>
          slot.status === 'completed' ? slot : { ...slot, status: 'failed' }
        )
      );
      settle();
      toast('Generation callback timed out.', { variant: 'error' });
    },
    [cancelCurrentPoll, projectId, queryClient, toast]
  );

  const pollRunUntilFinishedRef = useRef(pollRunUntilFinished);
  useEffect(() => {
    pollRunUntilFinishedRef.current = pollRunUntilFinished;
  }, [pollRunUntilFinished]);

  useEffect(() => {
    cancelCurrentPoll();

    if (!projectId) {
      setRunOutputs([]);
      setGenerationHistory([]);
      setLandingSlots([]);
      setActiveRunId(null);
      setActiveRunStatus(null);
      setActiveRunError(null);
      return;
    }

    let cancelled = false;
    const hydrationAbortController = new AbortController();

    const hydrateLatestRun = async (): Promise<void> => {
      try {
        const response = await api.get<{ runs?: ImageStudioRunRecord[] }>(
          `/api/image-studio/runs?projectId=${encodeURIComponent(projectId)}&limit=25`,
          { signal: hydrationAbortController.signal }
        );
        if (cancelled) return;

        const runs = Array.isArray(response.runs) ? response.runs : [];
        const historyRecords = runs
          .map((run: ImageStudioRunRecord) => toGenerationRecordFromRun(run))
          .filter((record: GenerationRecord | null): record is GenerationRecord => Boolean(record))
          .slice(0, 50);
        setGenerationHistory(historyRecords);

        const latestRun = runs[0] ?? null;
        if (!latestRun) {
          setRunOutputs([]);
          setGenerationHistory([]);
          setLandingSlots([]);
          setActiveRunId(null);
          setActiveRunStatus(null);
          setActiveRunError(null);
          return;
        }

        setRunOutputs(Array.isArray(latestRun.outputs) ? latestRun.outputs : []);
        setLandingSlots(buildLandingSlotsFromRun(latestRun));
        setActiveRunId(latestRun.id);
        setActiveRunStatus(latestRun.status);
        setActiveRunError(latestRun.errorMessage ?? null);

        if (latestRun.status !== 'queued' && latestRun.status !== 'running') {
          return;
        }

        const requestMask = latestRun.request?.mask;
        const maskShapeCount = requestMask?.type === 'polygons'
          ? (Array.isArray(requestMask.polygons) ? requestMask.polygons.length : 0)
          : requestMask?.type === 'polygon'
            ? (Array.isArray(requestMask.points) && requestMask.points.length >= 3 ? 1 : 0)
            : 0;

        const submittedMaskInvert = requestMask?.type === 'polygons'
          ? Boolean(requestMask.invert)
          : false;
        const submittedMaskFeather = requestMask?.type === 'polygons'
          ? Number(requestMask.feather ?? 0) || 0
          : 0;

        void pollRunUntilFinishedRef.current({
          runId: latestRun.id,
          resolvedPrompt: latestRun.request?.prompt ?? '',
          maskShapeCount,
          submittedMaskInvert,
          submittedMaskFeather,
          submittedSlotId: latestRun.request?.asset?.id ?? '',
          submittedSlotName:
            latestRun.request?.asset?.id ??
            latestRun.request?.asset?.filepath ??
            latestRun.id,
          submittedSlotFolderPath: '',
          expectedOutputs: normalizeExpectedOutputs(latestRun.expectedOutputs, 1),
        });
      } catch {
        // Keep current UI state on hydration failures.
      }
    };

    void hydrateLatestRun();

    return () => {
      cancelled = true;
      hydrationAbortController.abort();
      cancelCurrentPoll();
    };
  }, [projectId, cancelCurrentPoll]);

  const handleRunGeneration = useCallback(() => {
    if (!projectId || !workingSlot) {
      toast('Select a project and choose a card image to generate.', { variant: 'info' });
      return;
    }
    const filepath = workingSlot.imageFile?.filepath;
    if (!filepath) {
      toast('Working card has no image file.', { variant: 'info' });
      return;
    }
    if (!promptText.trim()) {
      toast('Enter a prompt before generating.', { variant: 'info' });
      return;
    }

    const requestPreview = buildRunRequestPreview({
      projectId,
      workingSlot,
      slots,
      compositeAssetIds,
      promptText,
      paramsState,
      maskShapes,
      maskInvert,
      maskFeather,
      studioSettings,
    });
    if (!requestPreview.payload) {
      toast(requestPreview.errors[0] || 'Request payload is not valid.', { variant: 'info' });
      return;
    }

    const resolvedPrompt = requestPreview.resolvedPrompt;
    const submittedSlotId = workingSlot?.id ?? '';
    const submittedSlotName = workingSlot?.name ?? workingSlot?.id ?? '';
    const submittedSlotFolderPath = workingSlot?.folderPath ?? '';
    const submittedMaskInvert = maskInvert;
    const submittedMaskFeather = maskFeather;
    const expectedOutputs = normalizeExpectedOutputs(studioSettings.targetAi.openai.image.n, 1);

    cancelCurrentPoll();
    setRunOutputs([]);
    setActiveRunError(null);
    setActiveRunId('pending');
    setActiveRunStatus('queued');
    setLandingSlots(buildPendingLandingSlots('pending', expectedOutputs));

    runMutation.mutate(requestPreview.payload, {
      onSuccess: (data) => {
        const queuedExpected = normalizeExpectedOutputs(data.expectedOutputs, expectedOutputs);
        setActiveRunId(data.runId);
        setActiveRunStatus(data.status);
        setActiveRunError(null);
        setLandingSlots(buildPendingLandingSlots(data.runId, queuedExpected));
        if (data.dispatchMode === 'inline') {
          toast('Redis queue unavailable, generation is running inline.', { variant: 'info' });
        }

        void pollRunUntilFinished({
          runId: data.runId,
          resolvedPrompt,
          maskShapeCount: requestPreview.maskShapeCount,
          submittedMaskInvert,
          submittedMaskFeather,
          submittedSlotId,
          submittedSlotName,
          submittedSlotFolderPath,
          expectedOutputs: queuedExpected,
        });
      },
      onError: (error) => {
        setActiveRunStatus('failed');
        setActiveRunError(error.message || 'Generation failed.');
        setLandingSlots((prev) => prev.map((slot) => ({ ...slot, status: 'failed' })));
        toast(error.message || 'Generation failed.', { variant: 'error' });
      },
    });
  }, [
    cancelCurrentPoll,
    projectId,
    workingSlot,
    promptText,
    paramsState,
    maskShapes,
    maskInvert,
    maskFeather,
    studioSettings,
    workingSlot?.folderPath,
    runMutation,
    toast,
    compositeAssetIds,
    slots,
    pollRunUntilFinished,
  ]);

  const restoreGeneration = useCallback(
    (record: GenerationRecord) => {
      setPromptText(record.prompt);
      setMaskInvert(record.maskInvert);
      setMaskFeather(record.maskFeather);
      setRunOutputs(record.outputs);
      setLandingSlots(
        record.outputs.map((output, index) => ({
          id: `${record.id}:${index + 1}`,
          index: index + 1,
          status: 'completed',
          output,
        }))
      );
      setActiveRunId(null);
      setActiveRunStatus('completed');
      setActiveRunError(null);
      toast('Restored generation settings.', { variant: 'info' });
    },
    [setPromptText, setMaskInvert, setMaskFeather, toast]
  );

  const clearActiveRunError = useCallback((): void => {
    setActiveRunError(null);
  }, []);

  const state = useMemo<GenerationState>(
    () => ({
      runMutation,
      runOutputs,
      maskEligibleCount,
      generationHistory,
      activeRunId,
      activeRunStatus,
      activeRunError,
      isRunInFlight,
      landingSlots,
    }),
    [
      runMutation,
      runOutputs,
      maskEligibleCount,
      generationHistory,
      activeRunId,
      activeRunStatus,
      activeRunError,
      isRunInFlight,
      landingSlots,
    ]
  );

  const actions = useMemo<GenerationActions>(
    () => ({ handleRunGeneration, restoreGeneration, clearActiveRunError }),
    [handleRunGeneration, restoreGeneration, clearActiveRunError]
  );

  return (
    <GenerationActionsContext.Provider value={actions}>
      <GenerationStateContext.Provider value={state}>
        {children}
      </GenerationStateContext.Provider>
    </GenerationActionsContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useGenerationState(): GenerationState {
  const ctx = useContext(GenerationStateContext);
  if (!ctx) throw new Error('useGenerationState must be used within a GenerationProvider');
  return ctx;
}

export function useGenerationActions(): GenerationActions {
  const ctx = useContext(GenerationActionsContext);
  if (!ctx) throw new Error('useGenerationActions must be used within a GenerationProvider');
  return ctx;
}

export function useGeneration(): GenerationState & GenerationActions {
  return { ...useGenerationState(), ...useGenerationActions() };
}
