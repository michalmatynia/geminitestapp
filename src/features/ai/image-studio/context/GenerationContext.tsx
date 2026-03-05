'use client';

import { useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useRunStudio } from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import type {
  ImageStudioRunRecord,
  ImageStudioRunStatus,
  RunStudioEnqueueResult,
  RunStudioPayload,
} from '@/shared/contracts/image-studio';
import type { ImageFileRecord } from '@/shared/contracts/files';
import { api } from '@/shared/lib/api-client';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useToast } from '@/shared/ui';

import { useMaskingState, useMaskingActions } from './MaskingContext';
import { useProjectsState } from './ProjectsContext';
import { usePromptState, usePromptActions } from './PromptContext';
import { useSettingsState } from './SettingsContext';
import { useSlotsState, useSlotsActions } from './SlotsContext';
import { buildRunRequestPreview } from '@/features/ai/image-studio/utils/run-request-preview';

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
  activeRunSourceSlotId: string | null;
  activeRunStatus: ImageStudioRunStatus | null;
  activeRunError: string | null;
  isRunInFlight: boolean;
  landingSlots: GenerationLandingSlot[];
}

export interface GenerationActions {
  handleRunGeneration: () => void;
  restoreGeneration: (record: GenerationRecord) => void;
  clearActiveRunError: () => void;
  removeGenerationRecord: (recordId: string) => Promise<void>;
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

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const readCreatedSlotIdsFromPayload = (payload: unknown): string[] => {
  const payloadRecord = asRecord(payload);
  if (!payloadRecord) return [];

  const createdIds: string[] = [];
  const pushIds = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    value.forEach((entry: unknown) => {
      if (typeof entry !== 'string') return;
      const normalized = entry.trim();
      if (!normalized) return;
      createdIds.push(normalized);
    });
  };

  pushIds(payloadRecord['createdSlotIds']);
  const callbackPayload = asRecord(payloadRecord['callbackPayload']);
  if (callbackPayload) {
    pushIds(callbackPayload['createdSlotIds']);
  }

  return createdIds;
};

const extractCreatedSlotIdsFromRun = (runRecord: ImageStudioRunRecord): string[] => {
  const historyEvents = Array.isArray(runRecord.historyEvents)
    ? [...runRecord.historyEvents].reverse()
    : [];
  const createdSlotIds: string[] = [];
  const seen = new Set<string>();

  for (const event of historyEvents) {
    const nextIds = readCreatedSlotIdsFromPayload(event.payload);
    nextIds.forEach((slotId: string) => {
      if (seen.has(slotId)) return;
      seen.add(slotId);
      createdSlotIds.push(slotId);
    });

    if (event.type === 'completed' && createdSlotIds.length > 0) {
      break;
    }
  }

  return createdSlotIds;
};

const normalizeExpectedOutputs = (value: unknown, fallback = 1): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(10, Math.floor(parsed)));
};

const buildPendingLandingSlots = (
  runId: string,
  expectedOutputs: number
): GenerationLandingSlot[] => {
  const count = normalizeExpectedOutputs(expectedOutputs, 1);
  return Array.from({ length: count }, (_value, index) => ({
    id: `${runId}:${index + 1}`,
    index: index + 1,
    status: 'pending',
    output: null,
  }));
};

const toImageFileRecord = (
  output: { id: string; filepath: string },
  timestamp: string
): ImageFileRecord => ({
  id: output.id,
  filepath: output.filepath,
  filename: output.filepath.split('/').pop() || output.id,
  mimetype: 'image/png',
  size: 0,
  tags: [],
  createdAt: timestamp,
  updatedAt: timestamp,
});

const toImageFileRecords = (
  outputs: Array<{ id: string; filepath: string }>
): ImageFileRecord[] => {
  const timestamp = new Date().toISOString();
  return outputs.map((output) => toImageFileRecord(output, timestamp));
};

const buildLandingSlotsFromRun = (run: ImageStudioRunRecord): GenerationLandingSlot[] => {
  const outputs = Array.isArray(run.outputs) ? run.outputs : [];
  const slotCount = Math.max(normalizeExpectedOutputs(run.expectedOutputs, 1), outputs.length);
  return Array.from({ length: slotCount }, (_value, index) => {
    const rawOutput = outputs[index] ?? null;
    const output: ImageFileRecord | null = rawOutput
      ? toImageFileRecord(rawOutput, new Date().toISOString())
      : null;
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

const cloneLandingSlots = (slots: GenerationLandingSlot[]): GenerationLandingSlot[] =>
  slots.map((slot) => ({ ...slot }));

const markLandingSlotsAsFailed = (
  slots: GenerationLandingSlot[],
  runId: string,
  expectedOutputs: number
): GenerationLandingSlot[] => {
  const baseSlots =
    slots.length > 0 ? cloneLandingSlots(slots) : buildPendingLandingSlots(runId, expectedOutputs);
  return baseSlots.map((slot) => ({
    ...slot,
    status: slot.output ? 'completed' : 'failed',
  }));
};

const toGenerationRecordFromRun = (runRecord: ImageStudioRunRecord): GenerationRecord | null => {
  const outputs = Array.isArray(runRecord.outputs) ? runRecord.outputs : [];
  if (outputs.length === 0) return null;

  const requestMask = runRecord.request?.mask;
  const maskShapeCount =
    requestMask?.type === 'polygons'
      ? Array.isArray(requestMask.polygons)
        ? requestMask.polygons.length
        : 0
      : requestMask?.type === 'polygon'
        ? Array.isArray(requestMask.points) && requestMask.points.length >= 3
          ? 1
          : 0
        : 0;
  const maskInvert = requestMask?.type === 'polygons' ? Boolean(requestMask.invert) : false;
  const maskFeather = requestMask?.type === 'polygons' ? Number(requestMask.feather ?? 0) || 0 : 0;

  return {
    id: runRecord.id,
    timestamp: runRecord.finishedAt ?? runRecord.updatedAt ?? runRecord.createdAt,
    prompt: runRecord.request?.prompt ?? '',
    maskShapeCount,
    maskInvert,
    maskFeather,
    outputs: toImageFileRecords(outputs),
    slotId: runRecord.request?.asset?.id ?? '',
    slotName: runRecord.request?.asset?.id ?? runRecord.request?.asset?.filepath ?? runRecord.id,
  };
};

// ── Provider ─────────────────────────────────────────────────────────────────

export function GenerationProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cross-domain reads
  const { projectId } = useProjectsState();
  const { workingSlot, slots, compositeAssetIds } = useSlotsState();
  const { setSelectedSlotId, setWorkingSlotId } = useSlotsActions();
  const { maskShapes, maskInvert, maskFeather } = useMaskingState();
  const { setMaskInvert, setMaskFeather } = useMaskingActions();
  const { promptText, paramsState } = usePromptState();
  const { setPromptText } = usePromptActions();
  const { studioSettings } = useSettingsState();
  const generationModel = useBrainAssignment({
    capability: 'image_studio.general',
  });

  const runMutation = useRunStudio();
  const [runOutputs, setRunOutputs] = useState<ImageFileRecord[]>([]);
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRunSourceSlotId, setActiveRunSourceSlotId] = useState<string | null>(null);
  const [activeRunStatus, setActiveRunStatus] = useState<ImageStudioRunStatus | null>(null);
  const [activeRunError, setActiveRunError] = useState<string | null>(null);
  const [landingSlots, setLandingSlots] = useState<GenerationLandingSlot[]>([]);
  const [pendingSourceSlotId, setPendingSourceSlotId] = useState<string | null>(null);

  const pollTokenRef = useRef<PollToken | null>(null);
  const lastSseHandledAtRef = useRef<number>(0);
  const generationHistoryRef = useRef(generationHistory);
  generationHistoryRef.current = generationHistory;

  const maskEligibleCount = useMemo(
    () =>
      maskShapes.filter(
        (s) =>
          s.visible &&
          s.closed &&
          (s.type === 'polygon' || s.type === 'lasso') &&
          s.points.length >= 3
      ).length,
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

  useEffect(() => {
    if (!pendingSourceSlotId) return;
    const sourceSlotExists = slots.some((slot) => slot.id === pendingSourceSlotId);
    if (!sourceSlotExists) return;

    setSelectedSlotId(pendingSourceSlotId);
    setWorkingSlotId(pendingSourceSlotId);
    setPendingSourceSlotId(null);
  }, [pendingSourceSlotId, setSelectedSlotId, setWorkingSlotId, slots]);

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

      const applyRunSnapshot = (runRecord: ImageStudioRunRecord): boolean => {
        if (token.cancelled || token.settled || pollTokenRef.current !== token) return true;

        setActiveRunId(runRecord.id);
        setActiveRunSourceSlotId(runRecord.request?.asset?.id?.trim() || null);
        setActiveRunStatus(runRecord.status);
        setActiveRunError(runRecord.errorMessage ?? null);

        const expectedOutputs = normalizeExpectedOutputs(
          runRecord.expectedOutputs,
          params.expectedOutputs
        );
        if (runRecord.status === 'completed') {
          const outputs = Array.isArray(runRecord.outputs)
            ? toImageFileRecords(runRecord.outputs)
            : [];
          if (outputs.length === 0) {
            const message =
              runRecord.errorMessage?.trim() || 'Generation completed but returned no images.';
            setActiveRunStatus('failed');
            setActiveRunError(message);
            setRunOutputs([]);
            setLandingSlots(markLandingSlotsAsFailed([], runRecord.id, expectedOutputs));
            settle();
            toast(message, { variant: 'error' });
            return true;
          }

          const createdSlotIds = extractCreatedSlotIdsFromRun(runRecord);
          const generatedSourceSlotId = createdSlotIds[0] ?? null;
          const shouldPromoteGeneratedSource = params.submittedSlotId.trim().length === 0;

          setRunOutputs(outputs);
          if (generatedSourceSlotId && shouldPromoteGeneratedSource) {
            setPendingSourceSlotId(generatedSourceSlotId);
          }
          setLandingSlots(
            buildLandingSlotsFromRun({
              ...runRecord,
              expectedOutputs,
            })
          );

          const record: GenerationRecord = {
            id: runRecord.id,
            timestamp: runRecord.finishedAt ?? new Date().toISOString(),
            prompt: params.resolvedPrompt,
            maskShapeCount: params.maskShapeCount,
            maskInvert: params.submittedMaskInvert,
            maskFeather: params.submittedMaskFeather,
            outputs: outputs,
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

        if (runRecord.status === 'failed') {
          const failedOutputs = Array.isArray(runRecord.outputs)
            ? toImageFileRecords(runRecord.outputs)
            : [];
          const failedLandingSlots = buildLandingSlotsFromRun({
            ...runRecord,
            expectedOutputs,
          });
          setRunOutputs(failedOutputs);
          setLandingSlots(
            markLandingSlotsAsFailed(failedLandingSlots, runRecord.id, expectedOutputs)
          );
          settle();
          toast(runRecord.errorMessage || 'Generation failed.', { variant: 'error' });
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
          const source = new EventSource(
            `/api/image-studio/runs/${encodeURIComponent(params.runId)}/stream`
          );
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
            lastSseHandledAtRef.current = Date.now();
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

        // Skip the HTTP fetch when SSE already handled this status window to
        // avoid sending duplicate requests while SSE is the active channel.
        const sseHandledRecently =
          sseConnected && Date.now() - lastSseHandledAtRef.current < SSE_FALLBACK_POLL_INTERVAL_MS;

        if (!sseHandledRecently) {
          try {
            const finished = await fetchAndApplyRunStatus();
            if (finished) {
              return;
            }
          } catch (error) {
            if (attempt === 0 && !sseConnected) {
              toast(
                error instanceof Error ? error.message : 'Failed to receive generation callback.',
                {
                  variant: 'error',
                }
              );
            }
          }
        }

        const nextDelay = sseConnected ? SSE_FALLBACK_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
        await sleep(nextDelay);
      }

      if (token.cancelled || token.settled || pollTokenRef.current !== token) return;
      setActiveRunStatus('failed');
      setActiveRunError('Generation callback timed out.');
      setRunOutputs([]);
      setLandingSlots((previous) =>
        markLandingSlotsAsFailed(previous, params.runId, params.expectedOutputs)
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
      setActiveRunSourceSlotId(null);
      setActiveRunStatus(null);
      setActiveRunError(null);
      setPendingSourceSlotId(null);
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

        const latestRunInFlight =
          runs.find((run) => run.status === 'queued' || run.status === 'running') ?? null;
        const latestRunRaw = latestRunInFlight ?? runs[0] ?? null;
        const latestRun = latestRunRaw;
        if (!latestRun) {
          setRunOutputs([]);
          setGenerationHistory([]);
          setLandingSlots([]);
          setActiveRunId(null);
          setActiveRunSourceSlotId(null);
          setActiveRunStatus(null);
          setActiveRunError(null);
          return;
        }

        setRunOutputs(
          Array.isArray(latestRun.outputs) ? toImageFileRecords(latestRun.outputs) : []
        );
        setLandingSlots(buildLandingSlotsFromRun(latestRun));
        setActiveRunId(latestRun.id);
        setActiveRunSourceSlotId(latestRun.request?.asset?.id?.trim() || null);
        setActiveRunStatus(latestRun.status);
        const latestSelectedRunInFlight =
          latestRun.status === 'queued' || latestRun.status === 'running';
        setActiveRunError(latestSelectedRunInFlight ? (latestRun.errorMessage ?? null) : null);

        if (!latestSelectedRunInFlight) {
          return;
        }

        const requestMask = latestRun.request?.mask;
        const maskShapeCount =
          requestMask?.type === 'polygons'
            ? Array.isArray(requestMask.polygons)
              ? requestMask.polygons.length
              : 0
            : requestMask?.type === 'polygon'
              ? Array.isArray(requestMask.points) && requestMask.points.length >= 3
                ? 1
                : 0
              : 0;

        const submittedMaskInvert =
          requestMask?.type === 'polygons' ? Boolean(requestMask.invert) : false;
        const submittedMaskFeather =
          requestMask?.type === 'polygons' ? Number(requestMask.feather ?? 0) || 0 : 0;

        void pollRunUntilFinishedRef.current({
          runId: latestRun.id,
          resolvedPrompt: latestRun.request?.prompt ?? '',
          maskShapeCount,
          submittedMaskInvert,
          submittedMaskFeather,
          submittedSlotId: latestRun.request?.asset?.id ?? '',
          submittedSlotName:
            latestRun.request?.asset?.id ?? latestRun.request?.asset?.filepath ?? latestRun.id,
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
    if (!projectId) {
      toast('Select a project before generating.', { variant: 'info' });
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
      selectedModelId: generationModel.effectiveModelId,
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
    setActiveRunError(null);
    setActiveRunId('pending');
    setActiveRunSourceSlotId(submittedSlotId || null);
    setActiveRunStatus('queued');
    setPendingSourceSlotId(null);
    setLandingSlots(buildPendingLandingSlots('pending', expectedOutputs));

    runMutation.mutate(requestPreview.payload, {
      onSuccess: (data) => {
        const queuedExpected = normalizeExpectedOutputs(data.expectedOutputs, expectedOutputs);
        setActiveRunId(data.runId);
        setActiveRunSourceSlotId(submittedSlotId || null);
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
        setRunOutputs([]);
        setLandingSlots((previous) =>
          markLandingSlotsAsFailed(previous, 'pending', expectedOutputs)
        );
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
      setActiveRunSourceSlotId(record.slotId || null);
      setActiveRunStatus('completed');
      setActiveRunError(null);
      toast('Restored generation settings.', { variant: 'info' });
    },
    [setPromptText, setMaskInvert, setMaskFeather, toast]
  );

  const clearActiveRunError = useCallback((): void => {
    setActiveRunError(null);
  }, []);

  const removeGenerationRecord = useCallback(
    async (recordId: string): Promise<void> => {
      const record = generationHistoryRef.current.find((r) => r.id === recordId);
      if (record && projectId && record.outputs.length > 0) {
        await Promise.allSettled(
          record.outputs.map((output) =>
            api
              .post(`/api/image-studio/projects/${encodeURIComponent(projectId)}/variants/delete`, {
                assetId: output.id,
                generationRunId: record.id,
                sourceSlotId: record.slotId,
              })
              .catch(() => {})
          )
        );
      }
      setGenerationHistory((prev) => prev.filter((r) => r.id !== recordId));
    },
    [projectId]
  );

  const state = useMemo<GenerationState>(
    () => ({
      runMutation,
      runOutputs,
      maskEligibleCount,
      generationHistory,
      activeRunId,
      activeRunSourceSlotId,
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
      activeRunSourceSlotId,
      activeRunStatus,
      activeRunError,
      isRunInFlight,
      landingSlots,
    ]
  );

  const actions = useMemo<GenerationActions>(
    () => ({ handleRunGeneration, restoreGeneration, clearActiveRunError, removeGenerationRecord }),
    [handleRunGeneration, restoreGeneration, clearActiveRunError, removeGenerationRecord]
  );

  return (
    <GenerationActionsContext.Provider value={actions}>
      <GenerationStateContext.Provider value={state}>{children}</GenerationStateContext.Provider>
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
