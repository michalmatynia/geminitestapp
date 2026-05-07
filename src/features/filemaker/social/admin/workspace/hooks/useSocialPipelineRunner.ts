'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/shared/ui';
import {
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import { api } from '@/shared/lib/api-client';
import {
  createSocialPublishingManualPipelineProgress,
  type SocialPublishingManualPipelineProgress,
} from '@/shared/contracts/social-publishing-pipeline';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { normalizeSocialPublishingVisualAnalysis } from '@/shared/lib/social-publishing-visual-analysis';
import { safeClearTimeout, safeSetTimeout, type SafeTimerId } from '@/shared/lib/timers';
import type {
  SocialPublishingPost,
  SocialPublishingVisualAnalysis,
} from '@/shared/contracts/social-publishing-posts';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type {
  SocialPublishingImageAddon,
  SocialPublishingImageAddonsBatchResult,
} from '@/shared/contracts/social-publishing-image-addons';
import {
  getSocialPublishingProjectUrlError,
  normalizeSocialPublishingProjectUrl,
} from '@/features/filemaker/social/project-url';

import {
  type EditorState,
  type PipelineStep,
} from '../SocialPublishingPage.Constants';
import type { SocialPublishingPipelineCaptureMode } from '@/shared/contracts/social-publishing-pipeline';

type SocialPipelineRunnerDeps = {
  activePost: SocialPublishingPost | null;
  activePostId: string | null;
  editorState: EditorState;
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  batchCaptureBaseUrl: string;
  batchCapturePresetIds: string[];
  batchCapturePresetLimit: number | null;
  publishingConnectionId: string | null;
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
  setBatchCaptureResult: (value: SocialPublishingImageAddonsBatchResult | null) => void;
  handleSelectAddons: (addons: SocialPublishingImageAddon[]) => void;
};

type PipelineTriggerResponse = {
  success: boolean;
  jobId: string;
  jobType: 'pipeline-tick' | 'manual-post-pipeline';
};

type VisualAnalysisTriggerResponse = {
  success: boolean;
  jobId: string;
  jobType: 'manual-post-visual-analysis';
};

type ManualPipelineJobResult = {
  type: 'manual-post-pipeline';
  postId: string;
  captureMode: Extract<SocialPublishingPipelineCaptureMode, 'existing_assets' | 'fresh_capture'>;
  addonsCreated: number;
  failures: number;
  runId: string | null;
  contextSummary: string | null;
  contextDocCount: number;
  imageAddonIds: string[];
  imageAssets: ImageFileSelection[];
  batchCaptureResult: SocialPublishingImageAddonsBatchResult | null;
  generatedPost: SocialPublishingPost | null;
};

type PipelineJobRecord = {
  id: string;
  status: string;
  progress: SocialPublishingManualPipelineProgress | null;
  result: ManualPipelineJobResult | null;
  failedReason: string | null;
};

type VisualAnalysisJobResult = {
  type: 'manual-post-visual-analysis';
  analysis: SocialPublishingVisualAnalysis;
  savedPost: SocialPublishingPost | null;
};

type VisualAnalysisJobRecord = {
  id: string;
  status: string;
  progress: {
    type: 'manual-post-visual-analysis';
    step: 'loading_assets' | 'analyzing' | 'saving';
    message: string | null;
    updatedAt: number;
    postId: string | null;
    imageAddonCount: number;
    highlightCount: number | null;
  } | null;
  result: VisualAnalysisJobResult | null;
  failedReason: string | null;
};

type RunPipelineOptions = {
  prefetchedVisualAnalysis?: SocialPublishingVisualAnalysis;
  requireVisualAnalysisInBody?: boolean;
  imageAssetsOverride?: ImageFileSelection[];
  imageAddonIdsOverride?: string[];
};

const PIPELINE_POLL_INTERVAL_MS = 2_000;
const PIPELINE_TIMEOUT_MS = 10 * 60 * 1000;
const PIPELINE_REQUEST_TIMEOUT_MS = 60_000;
const SOCIAL_PUBLISHING_POSTS_QUERY_KEY = ['social-publishing', 'posts'] as const;
const SOCIAL_PUBLISHING_IMAGE_ADDONS_QUERY_KEY = ['social-publishing', 'image-addons'] as const;

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

const isManualPipelineResult = (value: unknown): value is ManualPipelineJobResult =>
  Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: string }).type === 'manual-post-pipeline'
  );

const isVisualAnalysisJobResult = (value: unknown): value is VisualAnalysisJobResult =>
  Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: string }).type === 'manual-post-visual-analysis'
  );

const invalidateSocialQueries = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => Promise<unknown> | unknown;
}): void => {
  void queryClient.invalidateQueries({ queryKey: SOCIAL_PUBLISHING_POSTS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: SOCIAL_PUBLISHING_IMAGE_ADDONS_QUERY_KEY });
};

const buildVisualAnalysisFromPost = (
  post: SocialPublishingPost | null
): SocialPublishingVisualAnalysis | null => {
  if (!post) return null;

  const { summary, highlights } = normalizeSocialPublishingVisualAnalysis({
    summary: post.visualSummary,
    highlights: post.visualHighlights,
  });

  if (!summary.trim() && highlights.length === 0) {
    return null;
  }

  return {
    summary,
    highlights,
  };
};

const buildStringArraySignature = (values: string[] | null | undefined): string =>
  (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice()
    .sort()
    .join('|');

const hasSavedVisualAnalysisScopeMetadata = (post: SocialPublishingPost | null): boolean =>
  Boolean(
    post &&
      ((post.visualAnalysisSourceImageAddonIds?.length ?? 0) > 0 ||
        post.visualAnalysisSourceVisionModelId?.trim())
  );

const savedVisualAnalysisMatchesDraft = ({
  post,
  currentImageAddonIds,
  currentVisionModelId,
}: {
  post: SocialPublishingPost | null;
  currentImageAddonIds: string[];
  currentVisionModelId: string | null;
}): boolean => {
  if (!post) return false;
  if (!hasSavedVisualAnalysisScopeMetadata(post)) return true;

  return (
    buildStringArraySignature(post.visualAnalysisSourceImageAddonIds) ===
      buildStringArraySignature(currentImageAddonIds) &&
    (post.visualAnalysisSourceVisionModelId?.trim() ?? '') ===
      (currentVisionModelId?.trim() ?? '')
  );
};

export function useSocialPipelineRunner(deps: SocialPipelineRunnerDeps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');
  const [pipelineProgress, setPipelineProgress] =
    useState<SocialPublishingManualPipelineProgress | null>(null);
  const [pipelineErrorMessage, setPipelineErrorMessage] = useState<string | null>(null);
  const [isVisualAnalysisModalOpen, setIsVisualAnalysisModalOpen] = useState(false);
  const [transientVisualAnalysisResult, setTransientVisualAnalysisResult] = useState<{
    postId: string;
    result: SocialPublishingVisualAnalysis;
  } | null>(null);
  const [visualAnalysisErrorMessage, setVisualAnalysisErrorMessage] = useState<string | null>(
    null
  );
  const [visualAnalysisPending, setVisualAnalysisPending] = useState(false);
  const [currentPipelineJob, setCurrentPipelineJob] = useState<PipelineJobRecord | null>(null);
  const [currentVisualAnalysisJob, setCurrentVisualAnalysisJob] =
    useState<VisualAnalysisJobRecord | null>(null);
  const persistedVisualAnalysisResult = buildVisualAnalysisFromPost(deps.activePost);
  const hasSavedVisualAnalysis = Boolean(persistedVisualAnalysisResult);
  const isSavedVisualAnalysisStale =
    hasSavedVisualAnalysis &&
    !savedVisualAnalysisMatchesDraft({
      post: deps.activePost,
      currentImageAddonIds: deps.imageAddonIds,
      currentVisionModelId: deps.visionModelId,
    });
  const savedVisualAnalysisResult = isSavedVisualAnalysisStale
    ? null
    : persistedVisualAnalysisResult;
  const visualAnalysisResult =
    transientVisualAnalysisResult?.postId === deps.activePostId
      ? transientVisualAnalysisResult.result
      : savedVisualAnalysisResult;
  const visualAnalysisScope = JSON.stringify({
    postId: deps.activePostId ?? null,
    imageAddonIds: deps.imageAddonIds,
    visionModelId: deps.visionModelId ?? null,
  });

  const depsRef = useRef(deps);
  const pollDelayTimeoutRef = useRef<SafeTimerId | null>(null);
  const isUnmountedRef = useRef(false);
  const previousVisualAnalysisScopeRef = useRef<string | null>(null);
  const previousVisualAnalysisPostIdRef = useRef<string | null>(null);
  const visualAnalysisPollRunRef = useRef(0);
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
    visualAnalysisPollRunRef.current += 1;
    deps.setBatchCaptureResult(null);
    setPipelineProgress(null);
    setPipelineErrorMessage(null);
    setVisualAnalysisErrorMessage(null);
    setIsVisualAnalysisModalOpen(false);
    setCurrentPipelineJob(null);
    setCurrentVisualAnalysisJob(null);
  }, [deps.activePostId]);

  useEffect(() => {
    const previousScope = previousVisualAnalysisScopeRef.current;
    const previousPostId = previousVisualAnalysisPostIdRef.current;
    previousVisualAnalysisScopeRef.current = visualAnalysisScope;
    previousVisualAnalysisPostIdRef.current = deps.activePostId;

    if (previousScope === null || previousScope === visualAnalysisScope) {
      return;
    }

    if (previousPostId !== deps.activePostId) {
      return;
    }

    if (transientVisualAnalysisResult?.postId !== deps.activePostId) {
      return;
    }

    setTransientVisualAnalysisResult(null);
    setVisualAnalysisErrorMessage(null);
  }, [deps.activePostId, transientVisualAnalysisResult?.postId, visualAnalysisScope]);

  const syncProgress = useCallback((progress: SocialPublishingManualPipelineProgress | null): void => {
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

  const pollVisualAnalysisJob = useCallback(async (
    jobId: string,
    options?: { trackPending?: boolean; useSavedJobState?: boolean }
  ): Promise<VisualAnalysisJobRecord | null> => {
    const pollRunId = visualAnalysisPollRunRef.current + 1;
    visualAnalysisPollRunRef.current = pollRunId;

    const latestDeps = depsRef.current;
    const savedJobId = latestDeps.activePost?.visualAnalysisJobId?.trim() ?? '';
    const savedStatus = latestDeps.activePost?.visualAnalysisStatus ?? null;
    const savedError = latestDeps.activePost?.visualAnalysisError?.trim() ?? null;

    if (options?.trackPending) {
      setVisualAnalysisPending(true);
    }

    if (
      options?.useSavedJobState &&
      savedJobId === jobId &&
      savedStatus &&
      isSocialRuntimeJobInFlight(savedStatus)
    ) {
      setCurrentVisualAnalysisJob((current) =>
        current?.id === jobId && current.progress
          ? current
          : {
              id: jobId,
              status: current?.id === jobId ? current.status : savedStatus,
              progress: current?.id === jobId ? current.progress : null,
              result: current?.id === jobId ? current.result : null,
              failedReason: current?.id === jobId ? current.failedReason : savedError,
            }
      );
    }

    let finalJob: VisualAnalysisJobRecord | null = null;
    let lastSeenStatus: string | null = null;

    try {
      const pollStartedAt = Date.now();

      while (Date.now() - pollStartedAt < PIPELINE_TIMEOUT_MS) {
        if (
          isUnmountedRef.current ||
          visualAnalysisPollRunRef.current !== pollRunId
        ) {
          return null;
        }

        if (options?.useSavedJobState) {
          const latestSavedPost = depsRef.current.activePost;
          const latestSavedJobId = latestSavedPost?.visualAnalysisJobId?.trim() ?? '';
          const latestSavedStatus = latestSavedPost?.visualAnalysisStatus ?? null;
          const latestSavedError = latestSavedPost?.visualAnalysisError?.trim() ?? null;

          if (
            latestSavedJobId === jobId &&
            latestSavedStatus &&
            !isSocialRuntimeJobInFlight(latestSavedStatus)
          ) {
            setCurrentVisualAnalysisJob((current) => ({
              id: jobId,
              status: latestSavedStatus,
              progress: current?.id === jobId ? current.progress : null,
              result: current?.id === jobId ? current.result : null,
              failedReason:
                current?.id === jobId && current.failedReason
                  ? current.failedReason
                  : latestSavedError,
            }));
            invalidateSocialQueries(queryClient);
            return null;
          }
        }

        const job = await api.get<VisualAnalysisJobRecord | null>(
          '/api/filemaker/social-pipeline/jobs',
          {
            params: { id: jobId },
            timeout: PIPELINE_REQUEST_TIMEOUT_MS,
          }
        );

        if (
          isUnmountedRef.current ||
          visualAnalysisPollRunRef.current !== pollRunId
        ) {
          return null;
        }

        if (!job) {
          if (!(await waitForNextPoll(PIPELINE_POLL_INTERVAL_MS))) {
            return null;
          }
          continue;
        }

        finalJob = job;
        setCurrentVisualAnalysisJob(job);

        if (job.status !== lastSeenStatus) {
          lastSeenStatus = job.status;
          invalidateSocialQueries(queryClient);
        }

        if (job.status === 'completed') {
          break;
        }

        if (job.status === 'failed') {
          throw new Error(job.failedReason ?? 'Server visual analysis job failed.');
        }

        if (!(await waitForNextPoll(PIPELINE_POLL_INTERVAL_MS))) {
          return null;
        }
      }

      if (finalJob?.status !== 'completed') {
        throw new Error('Image analysis timed out while waiting for the server job.');
      }

      const completedJob = finalJob;
      const completedResult = completedJob.result;

      if (!isVisualAnalysisJobResult(completedResult)) {
        throw new Error('Image analysis completed without a usable result payload.');
      }

      const analysis = completedResult.analysis;
      const resultPostId =
        completedResult.savedPost?.id ??
        depsRef.current.activePostId ??
        depsRef.current.activePost?.id ??
        null;

      if (resultPostId) {
        setTransientVisualAnalysisResult({
          postId: resultPostId,
          result: analysis,
        });
      }
      setVisualAnalysisErrorMessage(null);

      const savedPost = completedResult.savedPost;
      if (savedPost) {
        const postsQueryKey = QUERY_KEYS.socialPublishing.posts({
          scope: 'admin',
          limit: null,
        });
        queryClient.setQueryData<SocialPublishingPost[]>(postsQueryKey, (current) =>
          (current ?? []).map((post) =>
            post.id === savedPost.id ? savedPost : post
          )
        );
      }
      invalidateSocialQueries(queryClient);

      return completedJob;
    } catch (error) {
      if (
        isUnmountedRef.current ||
        visualAnalysisPollRunRef.current !== pollRunId
      ) {
        return null;
      }
      const errorMessage = getErrorMessage(error, 'Image analysis failed.');
      setVisualAnalysisErrorMessage(errorMessage);
      setCurrentVisualAnalysisJob((current) =>
        current?.id === jobId
          ? {
              ...current,
              status: 'failed',
              failedReason: errorMessage,
            }
          : current
      );
      invalidateSocialQueries(queryClient);
      throw error;
    } finally {
      if (
        options?.trackPending &&
        visualAnalysisPollRunRef.current === pollRunId
      ) {
        setVisualAnalysisPending(false);
      }
    }
  }, [queryClient, waitForNextPoll]);

  useEffect(() => {
    const savedVisualAnalysisJobId = deps.activePost?.visualAnalysisJobId?.trim() ?? '';
    const savedVisualAnalysisStatus = deps.activePost?.visualAnalysisStatus ?? null;

    if (
      !savedVisualAnalysisJobId ||
      !savedVisualAnalysisStatus ||
      !isSocialRuntimeJobInFlight(savedVisualAnalysisStatus)
    ) {
      return;
    }

    void pollVisualAnalysisJob(savedVisualAnalysisJobId, {
      trackPending: true,
      useSavedJobState: true,
    }).catch(() => undefined);
  }, [
    deps.activePost?.visualAnalysisJobId,
    deps.activePost?.visualAnalysisStatus,
    pollVisualAnalysisJob,
  ]);

  const runPipeline = useCallback(async (
    captureMode: Extract<SocialPublishingPipelineCaptureMode, 'existing_assets' | 'fresh_capture'>,
    options?: RunPipelineOptions
  ): Promise<void> => {
    const d = depsRef.current;
    if (!d.canRunServerPipeline) {
      toast(
        d.pipelineBlockedReason ??
          'Choose a Social Publishing post model in Settings or assign AI Brain routing first.',
        { variant: 'warning' }
      );
      return;
    }
    if (!d.activePost) {
      toast('Create or select a post first', { variant: 'warning' });
      return;
    }
    const normalizedProjectUrl = normalizeSocialPublishingProjectUrl(d.projectUrl);
    const projectUrlError = getSocialPublishingProjectUrlError(normalizedProjectUrl);
    if (projectUrlError) {
      toast(projectUrlError, { variant: 'warning' });
      return;
    }

    const activePostId = d.activePost.id;
    const usesPrefetchedVisualAnalysis = Boolean(options?.prefetchedVisualAnalysis);
    const effectiveImageAssets = options?.imageAssetsOverride ?? d.imageAssets;
    const effectiveImageAddonIds = options?.imageAddonIdsOverride ?? d.imageAddonIds;
    trackSocialPublishingClientEvent(
      'social_publishing_pipeline_attempt',
      d.buildSocialContext({
        captureMode,
        usesPrefetchedVisualAnalysis,
        imageAssetCount: effectiveImageAssets.length,
        imageAddonCount: effectiveImageAddonIds.length,
      })
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
        createSocialPublishingManualPipelineProgress({
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
        imageAssets: effectiveImageAssets,
        imageAddonIds: effectiveImageAddonIds,
        captureMode,
        publishingConnectionId: d.publishingConnectionId ?? null,
        brainModelId: d.brainModelId ?? null,
        visionModelId: d.visionModelId ?? null,
        projectUrl: normalizedProjectUrl,
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
        '/api/filemaker/social-pipeline/trigger',
        {
          jobType: 'manual-post-pipeline',
          input: pipelineInput,
        },
        { timeout: PIPELINE_REQUEST_TIMEOUT_MS }
      );

      if (response.jobType !== 'manual-post-pipeline') {
        throw new Error('Pipeline queue returned an unexpected job type.');
      }

      setCurrentPipelineJob({
        id: response.jobId,
        status: 'waiting',
        progress: null,
        result: null,
        failedReason: null,
      });

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
          '/api/filemaker/social-pipeline/jobs',
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
        setCurrentPipelineJob(job);
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
      latestDeps.setImageAddonIds(result.imageAddonIds ?? []);
      latestDeps.setImageAssets(result.imageAssets ?? []);
      latestDeps.setBatchCaptureResult(result.batchCaptureResult ?? null);
      if (result.batchCaptureResult) {
        latestDeps.handleSelectAddons(result.batchCaptureResult.addons);
      }

      const postsQueryKey = QUERY_KEYS.socialPublishing.posts({
        scope: 'admin',
        limit: null,
      });
      queryClient.setQueryData<SocialPublishingPost[]>(postsQueryKey, (current) =>
        (current ?? []).map((post) =>
          post.id === generatedPost.id ? generatedPost : post
        )
      );
      invalidateSocialQueries(queryClient);

      setPipelineStep('done');
      toast(
        captureMode === 'fresh_capture'
          ? 'Pipeline complete — fresh screenshots captured and draft updated.'
          : 'Pipeline complete — review your updated post.',
        { variant: 'success' }
      );
      trackSocialPublishingClientEvent(
        'social_publishing_pipeline_success',
        latestDeps.buildSocialContext({ captureMode, usesPrefetchedVisualAnalysis })
      );
    } catch (error) {
      setPipelineStep('error');
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown pipeline error';
      setPipelineErrorMessage(errorMessage);
      toast(`Pipeline failed: ${errorMessage}`, { variant: 'error' });
      invalidateSocialQueries(queryClient);
      logSocialPublishingClientError(error, {
        source: 'AdminSocialPublishingPage',
        action: 'runFullPipeline',
        ...depsRef.current.buildSocialContext({
          error: true,
          captureMode,
          usesPrefetchedVisualAnalysis,
        }),
      });
      trackSocialPublishingClientEvent(
        'social_publishing_pipeline_failed',
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

  const handleRunFullPipelineWithOverrides = useCallback(
    async (options: {
      imageAssets: ImageFileSelection[];
      imageAddonIds: string[];
    }): Promise<void> =>
      runPipeline('existing_assets', {
        imageAssetsOverride: options.imageAssets,
        imageAddonIdsOverride: options.imageAddonIds,
      }),
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

    trackSocialPublishingClientEvent(
      'social_publishing_visual_analysis_attempt',
      d.buildSocialContext()
    );

    try {
      setVisualAnalysisPending(true);
      setVisualAnalysisErrorMessage(null);
      setTransientVisualAnalysisResult(null);
      const response = await api.post<VisualAnalysisTriggerResponse>(
        '/api/filemaker/social-posts/analyze-visuals',
        {
          postId: d.activePost.id,
          visionModelId: d.visionModelId ?? undefined,
          imageAddonIds: d.imageAddonIds,
        },
        { timeout: PIPELINE_REQUEST_TIMEOUT_MS }
      );

      if (response.jobType !== 'manual-post-visual-analysis') {
        throw new Error('Visual analysis queue returned an unexpected job type.');
      }

      setCurrentVisualAnalysisJob({
        id: response.jobId,
        status: 'waiting',
        progress: null,
        result: null,
        failedReason: null,
      });
      const finalJob = await pollVisualAnalysisJob(response.jobId, {
        trackPending: false,
      });
      if (!finalJob || !isVisualAnalysisJobResult(finalJob.result)) {
        return;
      }

      const analysis = finalJob.result.analysis;

      toast('Image analysis complete — review the summary and generate the post.', {
        variant: 'success',
      });
      trackSocialPublishingClientEvent(
        'social_publishing_visual_analysis_success',
        d.buildSocialContext({
          visualHighlightCount: analysis.highlights.length,
        })
      );
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Image analysis failed.');
      setVisualAnalysisErrorMessage(errorMessage);
      toast(`Image analysis failed: ${errorMessage}`, { variant: 'error' });
      logSocialPublishingClientError(error, {
        source: 'AdminSocialPublishingPage',
        action: 'analyzeVisuals',
        ...d.buildSocialContext({ error: true }),
      });
      trackSocialPublishingClientEvent(
        'social_publishing_visual_analysis_failed',
        d.buildSocialContext({ error: true })
      );
    } finally {
      setVisualAnalysisPending(false);
    }
  }, [pollVisualAnalysisJob, toast]);

  const handleRunFullPipelineWithVisualAnalysis = useCallback(async (): Promise<void> => {
    if (!visualAnalysisResult) {
      toast(
        hasSavedVisualAnalysis && isSavedVisualAnalysisStale
          ? 'Saved image analysis is outdated for this draft. Rerun image analysis before generating.'
          : 'Run image analysis first to generate the post with visual context.',
        {
          variant: 'warning',
        }
      );
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
    hasSavedVisualAnalysis,
    isSavedVisualAnalysisStale,
    visualAnalysisErrorMessage,
    visualAnalysisPending,
    currentPipelineJob,
    currentVisualAnalysisJob,
    handleRunFullPipeline,
    handleRunFullPipelineWithOverrides,
    handleRunFullPipelineWithFreshCapture,
    handleOpenVisualAnalysisModal,
    handleCloseVisualAnalysisModal,
    handleAnalyzeSelectedVisuals,
    handleRunFullPipelineWithVisualAnalysis,
  };
}
