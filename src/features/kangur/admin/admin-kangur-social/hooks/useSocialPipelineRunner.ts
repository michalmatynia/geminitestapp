'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/features/kangur/shared/ui';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { api } from '@/shared/lib/api-client';
import {
  createKangurSocialManualPipelineProgress,
  type KangurSocialManualPipelineProgress,
} from '@/shared/contracts/kangur-social-pipeline';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { safeClearTimeout, safeSetTimeout, type SafeTimerId } from '@/shared/lib/timers';
import type {
  KangurSocialDocUpdatesResponse,
  KangurSocialPost,
  KangurSocialVisualAnalysis,
} from '@/shared/contracts/kangur-social-posts';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type {
  KangurSocialImageAddon,
  KangurSocialImageAddonsBatchResult,
} from '@/shared/contracts/kangur-social-image-addons';

import {
  type EditorState,
  type PipelineStep,
} from '../AdminKangurSocialPage.Constants';
import type { KangurSocialPipelineCaptureMode } from '@/shared/contracts/kangur-social-pipeline';

type SocialPipelineRunnerDeps = {
  activePost: KangurSocialPost | null;
  activePostId: string | null;
  editorState: EditorState;
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  batchCaptureBaseUrl: string;
  batchCapturePresetIds: string[];
  batchCapturePresetLimit: number | null;
  linkedinConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
  canRunServerPipeline: boolean;
  pipelineBlockedReason: string | null;
  canRunVisualAnalysisPipeline: boolean;
  visualAnalysisBlockedReason: string | null;
  projectUrl: string;
  generationNotes: string;
  resolveDocReferences: () => string[];
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  handleLoadContext: (options?: {
    notify?: boolean;
    persist?: boolean;
    useDirect?: boolean;
  }) => Promise<{ summary: string | null; docCount: number | null; error?: boolean }>;
  setContextSummary: (value: string | null) => void;
  setActivePostId: (value: string | null) => void;
  setEditorState: (value: EditorState) => void;
  setImageAddonIds: (value: string[]) => void;
  setImageAssets: (value: ImageFileSelection[]) => void;
  setDocUpdatesResult: (value: KangurSocialDocUpdatesResponse | null) => void;
  setBatchCaptureResult: (value: KangurSocialImageAddonsBatchResult | null) => void;
  handleSelectAddons: (addons: KangurSocialImageAddon[]) => void;
};

type PipelineTriggerResponse = {
  success: boolean;
  jobId: string;
  jobType: 'pipeline-tick' | 'manual-post-pipeline';
};

type ManualPipelineJobResult = {
  type: 'manual-post-pipeline';
  postId: string;
  captureMode: Extract<KangurSocialPipelineCaptureMode, 'existing_assets' | 'fresh_capture'>;
  addonsCreated: number;
  failures: number;
  runId: string | null;
  contextSummary: string | null;
  contextDocCount: number;
  imageAddonIds: string[];
  imageAssets: ImageFileSelection[];
  batchCaptureResult: KangurSocialImageAddonsBatchResult | null;
  generatedPost: KangurSocialPost | null;
  docUpdates: KangurSocialDocUpdatesResponse | null;
};

type PipelineJobRecord = {
  id: string;
  status: string;
  progress: KangurSocialManualPipelineProgress | null;
  result: ManualPipelineJobResult | null;
  failedReason: string | null;
};

type RunPipelineOptions = {
  prefetchedVisualAnalysis?: KangurSocialVisualAnalysis;
  requireVisualAnalysisInBody?: boolean;
};

const PIPELINE_POLL_INTERVAL_MS = 2_000;
const PIPELINE_TIMEOUT_MS = 10 * 60 * 1000;
const PIPELINE_REQUEST_TIMEOUT_MS = 60_000;
const KANGUR_SOCIAL_POSTS_QUERY_KEY = ['kangur', 'social-posts'] as const;
const KANGUR_SOCIAL_IMAGE_ADDONS_QUERY_KEY = ['kangur', 'social-image-addons'] as const;

const isManualPipelineResult = (value: unknown): value is ManualPipelineJobResult =>
  Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: string }).type === 'manual-post-pipeline'
  );

const invalidateSocialQueries = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => Promise<unknown> | unknown;
}): void => {
  void queryClient.invalidateQueries({ queryKey: KANGUR_SOCIAL_POSTS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: KANGUR_SOCIAL_IMAGE_ADDONS_QUERY_KEY });
};

export function useSocialPipelineRunner(deps: SocialPipelineRunnerDeps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');
  const [pipelineProgress, setPipelineProgress] =
    useState<KangurSocialManualPipelineProgress | null>(null);
  const [pipelineErrorMessage, setPipelineErrorMessage] = useState<string | null>(null);
  const [isVisualAnalysisModalOpen, setIsVisualAnalysisModalOpen] = useState(false);
  const [visualAnalysisResult, setVisualAnalysisResult] =
    useState<KangurSocialVisualAnalysis | null>(null);
  const [visualAnalysisErrorMessage, setVisualAnalysisErrorMessage] = useState<string | null>(
    null
  );
  const [visualAnalysisPending, setVisualAnalysisPending] = useState(false);
  const visualAnalysisScope = JSON.stringify({
    postId: deps.activePostId ?? null,
    imageAddonIds: deps.imageAddonIds,
    visionModelId: deps.visionModelId ?? null,
    generationNotes: deps.generationNotes.trim(),
    docReferences: deps.resolveDocReferences(),
  });

  const depsRef = useRef(deps);
  const pollDelayTimeoutRef = useRef<SafeTimerId | null>(null);
  const isUnmountedRef = useRef(false);
  const previousVisualAnalysisScopeRef = useRef<string | null>(null);
  depsRef.current = deps;

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      safeClearTimeout(pollDelayTimeoutRef.current);
      pollDelayTimeoutRef.current = null;
    };
  }, []);

  useEffect(() => {
    deps.setDocUpdatesResult(null);
    deps.setBatchCaptureResult(null);
    setPipelineProgress(null);
    setPipelineErrorMessage(null);
    setVisualAnalysisResult(null);
    setVisualAnalysisErrorMessage(null);
    setIsVisualAnalysisModalOpen(false);
  }, [deps.activePostId]);

  useEffect(() => {
    const previousScope = previousVisualAnalysisScopeRef.current;
    previousVisualAnalysisScopeRef.current = visualAnalysisScope;

    if (previousScope === null || previousScope === visualAnalysisScope) {
      return;
    }

    setVisualAnalysisResult(null);
    setVisualAnalysisErrorMessage(null);
  }, [visualAnalysisScope]);

  const syncProgress = useCallback((progress: KangurSocialManualPipelineProgress | null): void => {
    if (!progress) return;
    setPipelineProgress(progress);
    setPipelineStep(progress.step);
  }, []);

  const waitForNextPoll = useCallback((ms: number): Promise<boolean> => {
    if (isUnmountedRef.current) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      pollDelayTimeoutRef.current = safeSetTimeout(() => {
        pollDelayTimeoutRef.current = null;
        resolve(!isUnmountedRef.current);
      }, ms);
    });
  }, []);

  const runPipeline = useCallback(async (
    captureMode: Extract<KangurSocialPipelineCaptureMode, 'existing_assets' | 'fresh_capture'>,
    options?: RunPipelineOptions
  ): Promise<void> => {
    const d = depsRef.current;
    if (!d.canRunServerPipeline) {
      toast(
        d.pipelineBlockedReason ??
          'Choose a StudiQ Social post model in Settings or assign AI Brain routing first.',
        { variant: 'warning' }
      );
      return;
    }
    if (!d.activePost) {
      toast('Create or select a post first', { variant: 'warning' });
      return;
    }

    const activePostId = d.activePost.id;
    const usesPrefetchedVisualAnalysis = Boolean(options?.prefetchedVisualAnalysis);
    trackKangurClientEvent(
      'kangur_social_pipeline_attempt',
      d.buildSocialContext({ captureMode, usesPrefetchedVisualAnalysis })
    );

    try {
      setPipelineErrorMessage(null);
      d.setBatchCaptureResult(null);
      const requestedPresetCount =
        captureMode === 'fresh_capture'
          ? d.batchCapturePresetLimit == null
            ? d.batchCapturePresetIds.length
            : Math.min(d.batchCapturePresetLimit, d.batchCapturePresetIds.length)
          : 0;
      setPipelineProgress(
        createKangurSocialManualPipelineProgress({
          step: 'loading_context',
          captureMode,
          message:
            captureMode === 'fresh_capture'
              ? 'Queued on the server. Waiting to start a fresh Playwright capture...'
              : usesPrefetchedVisualAnalysis
                ? 'Queued on the server. Waiting to generate from the analyzed visuals...'
                : 'Queued on the server. Waiting to generate from the attached visuals...',
          updatedAt: Date.now(),
          requestedPresetCount,
          captureCompletedCount: 0,
          captureRemainingCount: requestedPresetCount,
          captureTotalCount: requestedPresetCount,
        })
      );
      setPipelineStep('loading_context');
      toast(
        captureMode === 'fresh_capture'
          ? 'Pipeline: queueing fresh-capture server run...'
          : usesPrefetchedVisualAnalysis
            ? 'Pipeline: queueing server run with image analysis...'
            : 'Pipeline: queueing server run from current visuals...',
        { variant: 'default' }
      );

      const pipelineInput: Record<string, unknown> = {
        postId: activePostId,
        editorState: d.editorState,
        imageAssets: d.imageAssets,
        imageAddonIds: d.imageAddonIds,
        captureMode,
        linkedinConnectionId: d.linkedinConnectionId ?? null,
        brainModelId: d.brainModelId ?? null,
        visionModelId: d.visionModelId ?? null,
        projectUrl: d.projectUrl || '',
        generationNotes: d.generationNotes,
        docReferences: d.resolveDocReferences(),
        prefetchedVisualAnalysis: options?.prefetchedVisualAnalysis,
        requireVisualAnalysisInBody: options?.requireVisualAnalysisInBody ?? false,
      };

      if (captureMode === 'fresh_capture') {
        pipelineInput['batchCaptureBaseUrl'] = d.batchCaptureBaseUrl;
        pipelineInput['batchCapturePresetIds'] = d.batchCapturePresetIds;
        pipelineInput['batchCapturePresetLimit'] = d.batchCapturePresetLimit ?? null;
      }

      const response = await api.post<PipelineTriggerResponse>(
        '/api/kangur/social-pipeline/trigger',
        {
          jobType: 'manual-post-pipeline',
          input: pipelineInput,
        },
        { timeout: PIPELINE_REQUEST_TIMEOUT_MS }
      );

      if (response.jobType !== 'manual-post-pipeline') {
        throw new Error('Pipeline queue returned an unexpected job type.');
      }

      setPipelineStep('capturing');
      toast(
        captureMode === 'fresh_capture'
          ? 'Pipeline: queued on the server. Waiting for fresh capture and generation...'
          : usesPrefetchedVisualAnalysis
            ? 'Pipeline: queued on the server. Waiting for visual-aware generation...'
            : 'Pipeline: queued on the server. Waiting for generation...',
        { variant: 'default' }
      );

      const pollStartedAt = Date.now();
      let finalJob: PipelineJobRecord | null = null;

      while (Date.now() - pollStartedAt < PIPELINE_TIMEOUT_MS) {
        const job = await api.get<PipelineJobRecord | null>(
          '/api/kangur/social-pipeline/jobs',
          {
            params: { id: response.jobId },
            timeout: PIPELINE_REQUEST_TIMEOUT_MS,
          }
        );

        if (!job) {
          if (!(await waitForNextPoll(PIPELINE_POLL_INTERVAL_MS))) {
            return;
          }
          continue;
        }

        finalJob = job;
        syncProgress(job.progress);

        if (job.status === 'completed') {
          break;
        }

        if (job.status === 'failed') {
          throw new Error(job.failedReason ?? 'Server pipeline job failed.');
        }

        if (!(await waitForNextPoll(PIPELINE_POLL_INTERVAL_MS))) {
          return;
        }
      }

      if (finalJob?.status !== 'completed') {
        throw new Error('Pipeline timed out while waiting for the server job.');
      }

      if (!isManualPipelineResult(finalJob.result)) {
        throw new Error('Pipeline completed without a usable result payload.');
      }

      const result = finalJob.result;
      const generatedPost = result.generatedPost;
      if (!generatedPost) {
        throw new Error('Pipeline completed without generated content.');
      }

      setPipelineStep('previewing');
      const latestDeps = depsRef.current;
      latestDeps.setActivePostId(generatedPost.id);
      latestDeps.setEditorState({
        titlePl: generatedPost.titlePl ?? '',
        titleEn: generatedPost.titleEn ?? '',
        bodyPl: generatedPost.bodyPl ?? '',
        bodyEn: generatedPost.bodyEn ?? '',
      });
      latestDeps.setContextSummary(
        generatedPost.contextSummary ?? result.contextSummary ?? null
      );
      latestDeps.setDocUpdatesResult(result.docUpdates ?? null);
      latestDeps.setImageAddonIds(result.imageAddonIds ?? []);
      latestDeps.setImageAssets(result.imageAssets ?? []);
      latestDeps.setBatchCaptureResult(result.batchCaptureResult ?? null);
      if (result.batchCaptureResult) {
        latestDeps.handleSelectAddons(result.batchCaptureResult.addons);
      }

      const postsQueryKey = QUERY_KEYS.kangur.socialPosts({
        scope: 'admin',
        limit: null,
      });
      queryClient.setQueryData<KangurSocialPost[]>(postsQueryKey, (current) =>
        (current ?? []).map((post) =>
          post.id === generatedPost.id ? generatedPost : post
        )
      );
      invalidateSocialQueries(queryClient);

      setPipelineStep('done');
      toast(
        captureMode === 'fresh_capture'
          ? 'Pipeline complete — fresh screenshots captured and draft updated.'
          : 'Pipeline complete — review your post and documentation updates.',
        { variant: 'success' }
      );
      trackKangurClientEvent(
        'kangur_social_pipeline_success',
        latestDeps.buildSocialContext({ captureMode, usesPrefetchedVisualAnalysis })
      );
    } catch (error) {
      setPipelineStep('error');
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown pipeline error';
      setPipelineErrorMessage(errorMessage);
      toast(`Pipeline failed: ${errorMessage}`, { variant: 'error' });
      invalidateSocialQueries(queryClient);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'runFullPipeline',
        ...depsRef.current.buildSocialContext({
          error: true,
          captureMode,
          usesPrefetchedVisualAnalysis,
        }),
      });
      trackKangurClientEvent(
        'kangur_social_pipeline_failed',
        depsRef.current.buildSocialContext({
          error: true,
          captureMode,
          usesPrefetchedVisualAnalysis,
        })
      );
    }
  }, [queryClient, syncProgress, toast, waitForNextPoll]);

  const handleRunFullPipeline = useCallback(
    async (): Promise<void> => runPipeline('existing_assets'),
    [runPipeline]
  );

  const handleRunFullPipelineWithFreshCapture = useCallback(
    async (): Promise<void> => runPipeline('fresh_capture'),
    [runPipeline]
  );

  const handleOpenVisualAnalysisModal = useCallback((): void => {
    const d = depsRef.current;
    if (!d.activePost) {
      toast('Create or select a post first', { variant: 'warning' });
      return;
    }
    if (!d.canRunVisualAnalysisPipeline) {
      toast(
        d.visualAnalysisBlockedReason ??
          'Select at least one image add-on and configure a vision model first.',
        { variant: 'warning' }
      );
      return;
    }
    setVisualAnalysisErrorMessage(null);
    setIsVisualAnalysisModalOpen(true);
  }, [toast]);

  const handleCloseVisualAnalysisModal = useCallback((): void => {
    setIsVisualAnalysisModalOpen(false);
    setVisualAnalysisErrorMessage(null);
    setVisualAnalysisPending(false);
  }, []);

  const handleAnalyzeSelectedVisuals = useCallback(async (): Promise<void> => {
    const d = depsRef.current;
    if (!d.activePost) {
      toast('Create or select a post first', { variant: 'warning' });
      return;
    }
    if (!d.canRunVisualAnalysisPipeline) {
      toast(
        d.visualAnalysisBlockedReason ??
          'Select at least one image add-on and configure a vision model first.',
        { variant: 'warning' }
      );
      return;
    }

    trackKangurClientEvent(
      'kangur_social_visual_analysis_attempt',
      d.buildSocialContext()
    );

    try {
      setVisualAnalysisPending(true);
      setVisualAnalysisErrorMessage(null);
      setVisualAnalysisResult(null);
      const analysis = await api.post<KangurSocialVisualAnalysis>(
        '/api/kangur/social-posts/analyze-visuals',
        {
          postId: d.activePost.id,
          docReferences: d.resolveDocReferences(),
          notes: d.generationNotes,
          visionModelId: d.visionModelId ?? undefined,
          imageAddonIds: d.imageAddonIds,
        },
        { timeout: PIPELINE_REQUEST_TIMEOUT_MS }
      );
      setVisualAnalysisResult(analysis);
      toast('Image analysis complete — review the summary and generate the post.', {
        variant: 'success',
      });
      trackKangurClientEvent(
        'kangur_social_visual_analysis_success',
        d.buildSocialContext({
          visualHighlightCount: analysis.highlights.length,
          visualDocUpdateCount: analysis.docUpdates.length,
        })
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Image analysis failed.';
      setVisualAnalysisErrorMessage(errorMessage);
      toast(`Image analysis failed: ${errorMessage}`, { variant: 'error' });
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'analyzeVisuals',
        ...d.buildSocialContext({ error: true }),
      });
      trackKangurClientEvent(
        'kangur_social_visual_analysis_failed',
        d.buildSocialContext({ error: true })
      );
    } finally {
      setVisualAnalysisPending(false);
    }
  }, [toast]);

  const handleRunFullPipelineWithVisualAnalysis = useCallback(async (): Promise<void> => {
    if (!visualAnalysisResult) {
      toast('Run image analysis first to generate the post with visual context.', {
        variant: 'warning',
      });
      return;
    }

    setIsVisualAnalysisModalOpen(false);
    await runPipeline('existing_assets', {
      prefetchedVisualAnalysis: visualAnalysisResult,
      requireVisualAnalysisInBody: true,
    });
  }, [runPipeline, toast, visualAnalysisResult]);

  return {
    pipelineStep,
    pipelineProgress,
    pipelineErrorMessage,
    isVisualAnalysisModalOpen,
    visualAnalysisResult,
    visualAnalysisErrorMessage,
    visualAnalysisPending,
    handleRunFullPipeline,
    handleRunFullPipelineWithFreshCapture,
    handleOpenVisualAnalysisModal,
    handleCloseVisualAnalysisModal,
    handleAnalyzeSelectedVisuals,
    handleRunFullPipelineWithVisualAnalysis,
  };
}
