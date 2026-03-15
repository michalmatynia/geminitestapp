'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useOptionalContextRegistryPageEnvelope } from '@/features/ai/ai-context-registry/context/page-context';
import {
  buildDefaultSharedLayout,
  computeCanvasOffsetFromObjectBounds,
  extractObjectBoundsFromRunResult,
  loadAiPathsObjectAnalysisConfig,
  parseAiPathMetasFromSettings,
  parseAiPathNodesAndEdgesFromSettings,
  saveAiPathsObjectAnalysisConfig,
  type AiPathMeta,
  type AiPathsObjectAnalysisAutoApplyTarget,
  type AiPathsObjectAnalysisConfig,
  type ExtractedObjectBounds,
} from '@/features/ai/image-studio/utils/ai-paths-object-analysis';
import {
  saveImageStudioAnalysisApplyIntent,
  type ImageStudioAnalysisApplyTarget,
} from '@/features/ai/image-studio/utils/analysis-bridge';
import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui';

import { useUiActions, useUiCanvasState } from '../context/UiContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiPathsObjectAnalysisStatus =
  | 'idle'
  | 'fetching_path'
  | 'queuing'
  | 'running'
  | 'completed'
  | 'error';

export type AiPathsObjectAnalysisResult = {
  runId: string;
  bounds: ExtractedObjectBounds | null;
  confidence: number | null;
  rawResult: Record<string, unknown> | null;
  appliedPreviewOffset: boolean;
  appliedToTargets: AiPathsObjectAnalysisAutoApplyTarget;
};

export type UseAiPathsObjectAnalysisOptions = {
  projectId: string;
  workingSlotId?: string | null | undefined;
  workingSlotImageSrc?: string | null | undefined;
  workingSlotImageWidth?: number | null | undefined;
  workingSlotImageHeight?: number | null | undefined;
  canvasWidth?: number | null | undefined;
  canvasHeight?: number | null | undefined;
};

export type UseAiPathsObjectAnalysisReturn = {
  status: AiPathsObjectAnalysisStatus;
  errorMessage: string | null;
  lastResult: AiPathsObjectAnalysisResult | null;
  config: AiPathsObjectAnalysisConfig;
  pathMetas: AiPathMeta[];
  pathMetasLoading: boolean;
  setConfig: (updater: (prev: AiPathsObjectAnalysisConfig) => AiPathsObjectAnalysisConfig) => void;
  triggerAnalysis: () => Promise<void>;
  /** Fire analysis for an explicit pathId (used by custom trigger buttons). */
  triggerAnalysisForPath: (pathId: string) => Promise<void>;
  cancelAnalysis: () => void;
};

// ---------------------------------------------------------------------------
// Internal types for API responses
// ---------------------------------------------------------------------------

type AiPathsSettingItem = { key: string; value: string };

type EnqueueRunResponse = {
  run: {
    id: string;
    status: string;
  };
};

type GetRunResponse = {
  run: {
    id: string;
    status: string;
    result: Record<string, unknown> | null | undefined;
    error: string | null | undefined;
  };
};

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'canceled', 'dead_lettered']);

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_MS = 120_000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAiPathsObjectAnalysis(
  options: UseAiPathsObjectAnalysisOptions
): UseAiPathsObjectAnalysisReturn {
  const {
    projectId,
    workingSlotId,
    workingSlotImageSrc,
    workingSlotImageWidth,
    workingSlotImageHeight,
    canvasWidth,
    canvasHeight,
  } = options;

  const { toast } = useToast();
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const { canvasImageOffset } = useUiCanvasState();
  const { setCanvasImageOffset, setCenterGuidesEnabled, getPreviewCanvasImageFrame } =
    useUiActions();

  const [status, setStatus] = useState<AiPathsObjectAnalysisStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AiPathsObjectAnalysisResult | null>(null);
  const [config, setConfigState] = useState<AiPathsObjectAnalysisConfig>(() =>
    loadAiPathsObjectAnalysisConfig(projectId)
  );
  const [pathMetas, setPathMetas] = useState<AiPathMeta[]>([]);
  const [pathMetasLoading, setPathMetasLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartedAtRef = useRef<number>(0);
  const activeProjectIdRef = useRef(projectId);
  activeProjectIdRef.current = projectId;

  // Sync config when projectId changes
  useEffect(() => {
    setConfigState(loadAiPathsObjectAnalysisConfig(projectId));
    setLastResult(null);
    setStatus('idle');
    setErrorMessage(null);
  }, [projectId]);

  // Fetch available path metas for the dropdown
  useEffect(() => {
    let cancelled = false;
    setPathMetasLoading(true);
    api
      .get<AiPathsSettingItem[]>('/api/ai-paths/settings')
      .then((settings) => {
        if (cancelled) return;
        setPathMetas(parseAiPathMetasFromSettings(Array.isArray(settings) ? settings : []));
      })
      .catch(() => {
        if (cancelled) return;
        setPathMetas([]);
      })
      .finally(() => {
        if (!cancelled) setPathMetasLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) clearTimeout(pollTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const setConfig = useCallback(
    (updater: (prev: AiPathsObjectAnalysisConfig) => AiPathsObjectAnalysisConfig) => {
      setConfigState((prev) => {
        const next = updater(prev);
        saveAiPathsObjectAnalysisConfig(activeProjectIdRef.current, next);
        return next;
      });
    },
    []
  );

  const cancelAnalysis = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  const applyResults = useCallback(
    (
      bounds: ExtractedObjectBounds | null,
      confidence: number | null,
      rawResult: Record<string, unknown> | null,
      runId: string,
      cfg: AiPathsObjectAnalysisConfig,
      slotId: string,
      imageUrl: string
    ) => {
      const pid = activeProjectIdRef.current;
      let appliedPreviewOffset = false;

      // 1. Canvas preview repositioning
      if (bounds && cfg.applyPreviewOffset) {
        const frameBinding = getPreviewCanvasImageFrame();
        const imgW =
          typeof workingSlotImageWidth === 'number' &&
          Number.isFinite(workingSlotImageWidth) &&
          workingSlotImageWidth > 0
            ? workingSlotImageWidth
            : null;
        const imgH =
          typeof workingSlotImageHeight === 'number' &&
          Number.isFinite(workingSlotImageHeight) &&
          workingSlotImageHeight > 0
            ? workingSlotImageHeight
            : null;
        const cvW =
          typeof canvasWidth === 'number' && Number.isFinite(canvasWidth) && canvasWidth > 0
            ? canvasWidth
            : null;
        const cvH =
          typeof canvasHeight === 'number' && Number.isFinite(canvasHeight) && canvasHeight > 0
            ? canvasHeight
            : null;

        if (frameBinding && imgW && imgH && cvW && cvH) {
          const newOffset = computeCanvasOffsetFromObjectBounds(
            bounds,
            frameBinding.frame,
            imgW,
            imgH,
            cvW,
            cvH,
            canvasImageOffset
          );
          setCanvasImageOffset(newOffset);
          setCenterGuidesEnabled(true);
          appliedPreviewOffset = true;
        }
      }

      // 2. Apply to Object Layout / Auto Scaler tools via analysis apply intent
      const target = cfg.autoApplyTarget;
      if (target !== 'none' && slotId && imageUrl) {
        const sourceSignature = `ai_paths_run|${runId}|slot:${slotId}|src:${imageUrl.slice(0, 80)}`;
        const layout = buildDefaultSharedLayout();
        const targets: ImageStudioAnalysisApplyTarget[] =
          target === 'both' ? ['object_layout', 'auto_scaler'] : [target];

        for (const t of targets) {
          saveImageStudioAnalysisApplyIntent(pid, {
            slotId,
            sourceSignature,
            runAfterApply: cfg.runAfterApply,
            target: t,
            layout,
          });
        }
      }

      setLastResult({
        runId,
        bounds,
        confidence,
        rawResult,
        appliedPreviewOffset,
        appliedToTargets: cfg.autoApplyTarget,
      });
    },
    [
      canvasHeight,
      canvasImageOffset,
      canvasWidth,
      getPreviewCanvasImageFrame,
      setCenterGuidesEnabled,
      setCanvasImageOffset,
      workingSlotImageHeight,
      workingSlotImageWidth,
    ]
  );

  // Internal: shared analysis runner — accepts pathId explicitly so both
  // triggerAnalysis (uses config.pathId) and triggerAnalysisForPath (uses param) can reuse it.
  const runAnalysis = useCallback(
    async (pathId: string): Promise<void> => {
      const imageUrl = workingSlotImageSrc?.trim() ?? '';
      const slotId = workingSlotId?.trim() ?? '';

      if (!imageUrl) {
        toast('No image source available for analysis.', { variant: 'info' });
        return;
      }
      if (status === 'running' || status === 'fetching_path' || status === 'queuing') {
        return;
      }

      // Cancel any existing run
      abortRef.current?.abort();
      if (pollTimerRef.current !== null) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      const abort = new AbortController();
      abortRef.current = abort;

      setStatus('fetching_path');
      setErrorMessage(null);

      try {
        // 1. Fetch path config (nodes + edges) from AI-Paths settings
        const settings = await api.get<AiPathsSettingItem[]>('/api/ai-paths/settings');
        if (abort.signal.aborted) return;

        const pathGraph = parseAiPathNodesAndEdgesFromSettings(
          Array.isArray(settings) ? settings : [],
          pathId
        );
        if (!pathGraph) {
          throw new Error(
            `AI Path "${pathId}" not found. Make sure the path exists in AI-Paths settings.`
          );
        }

        // 2. Enqueue run
        setStatus('queuing');
        const enqueuePayload: Record<string, unknown> = {
          pathId,
          nodes: pathGraph.nodes,
          edges: pathGraph.edges,
          triggerContext: {
            imageUrl,
            ...(typeof workingSlotImageWidth === 'number' && Number.isFinite(workingSlotImageWidth)
              ? { imageWidth: workingSlotImageWidth }
              : {}),
            ...(typeof workingSlotImageHeight === 'number' &&
            Number.isFinite(workingSlotImageHeight)
              ? { imageHeight: workingSlotImageHeight }
              : {}),
            ...(slotId ? { slotId } : {}),
            ...(activeProjectIdRef.current ? { projectId: activeProjectIdRef.current } : {}),
          },
          meta: {
            source: 'image_studio_object_analysis',
          },
          ...(contextRegistry ? { contextRegistry } : {}),
        };
        if (config.triggerNodeId) {
          enqueuePayload['triggerNodeId'] = config.triggerNodeId;
        }
        if (config.triggerEvent) {
          enqueuePayload['triggerEvent'] = config.triggerEvent;
        }

        const enqueueResult = await api.post<EnqueueRunResponse>(
          '/api/ai-paths/runs/enqueue',
          enqueuePayload
        );
        if (abort.signal.aborted) return;

        const runId = enqueueResult?.run?.id;
        if (!runId || typeof runId !== 'string') {
          throw new Error('Failed to enqueue AI path run: no run ID returned.');
        }

        // 3. Poll for completion
        setStatus('running');
        pollStartedAtRef.current = Date.now();

        const poll = async (): Promise<void> => {
          if (abort.signal.aborted) return;

          const elapsed = Date.now() - pollStartedAtRef.current;
          if (elapsed > POLL_MAX_MS) {
            setStatus('error');
            setErrorMessage(
              `Analysis timed out after ${POLL_MAX_MS / 1000}s. The path may still be running.`
            );
            return;
          }

          let runData: GetRunResponse | null;
          try {
            runData = await api.get<GetRunResponse>(
              `/api/ai-paths/runs/${encodeURIComponent(runId)}`
            );
          } catch (error) {
            logClientError(error);
            if (abort.signal.aborted) return;
            // Transient fetch error — keep polling
            pollTimerRef.current = setTimeout(() => void poll(), POLL_INTERVAL_MS);
            return;
          }

          if (abort.signal.aborted) return;

          const runStatus = runData?.run?.status ?? '';
          if (!TERMINAL_STATUSES.has(runStatus)) {
            pollTimerRef.current = setTimeout(() => void poll(), POLL_INTERVAL_MS);
            return;
          }

          // Terminal state reached
          if (runStatus !== 'completed') {
            const errMsg = runData?.run?.error ?? `Path run ended with status "${runStatus}".`;
            setStatus('error');
            setErrorMessage(typeof errMsg === 'string' ? errMsg : String(errMsg));
            toast(
              `AI path analysis failed: ${typeof errMsg === 'string' ? errMsg : String(errMsg)}`,
              {
                variant: 'error',
              }
            );
            return;
          }

          // Completed successfully — extract bounds
          const rawResult = runData.run.result ?? null;
          const bounds = extractObjectBoundsFromRunResult(
            rawResult,
            config.fieldMapping,
            typeof workingSlotImageWidth === 'number' ? workingSlotImageWidth : null,
            typeof workingSlotImageHeight === 'number' ? workingSlotImageHeight : null
          );
          const confidence: number | null = null; // extractConfidenceFromRunResult can be added if needed

          if (!bounds) {
            setStatus('error');
            const noMatchMsg =
              'AI path completed but no object bounds were found. ' +
              'Check the field mapping configuration matches your path output.';
            setErrorMessage(noMatchMsg);
            toast(noMatchMsg, { variant: 'info' });
            return;
          }

          applyResults(bounds, confidence, rawResult, runId, config, slotId, imageUrl);
          setStatus('completed');
          toast('AI object analysis complete. Canvas repositioned.', { variant: 'success' });
        };

        pollTimerRef.current = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      } catch (err) {
        logClientError(err);
        if (abort.signal.aborted) return;
        const msg = err instanceof Error ? err.message : 'Failed to run AI path analysis.';
        setStatus('error');
        setErrorMessage(msg);
        toast(msg, { variant: 'error' });
      }
    },
    [
      applyResults,
      config,
      status,
      toast,
      contextRegistry,
      workingSlotId,
      workingSlotImageHeight,
      workingSlotImageSrc,
      workingSlotImageWidth,
    ]
  );

  const triggerAnalysis = useCallback(async (): Promise<void> => {
    if (!config.pathId) {
      toast('Select an AI Path before running analysis.', { variant: 'info' });
      return;
    }
    return runAnalysis(config.pathId);
  }, [config.pathId, runAnalysis, toast]);

  const triggerAnalysisForPath = useCallback(
    async (pathId: string): Promise<void> => {
      if (!pathId) {
        toast('Select an AI Path before running analysis.', { variant: 'info' });
        return;
      }
      return runAnalysis(pathId);
    },
    [runAnalysis, toast]
  );

  return {
    status,
    errorMessage,
    lastResult,
    config,
    pathMetas,
    pathMetasLoading,
    setConfig,
    triggerAnalysis,
    triggerAnalysisForPath,
    cancelAnalysis,
  };
}
