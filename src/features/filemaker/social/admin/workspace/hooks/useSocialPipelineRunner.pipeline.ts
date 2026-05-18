'use client';

import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import {
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

import {
  getErrorMessage,
  invalidateSocialQueries,
  isManualPipelineResult,
  PIPELINE_POLL_INTERVAL_MS,
  PIPELINE_REQUEST_TIMEOUT_MS,
  PIPELINE_TIMEOUT_MS,
} from './useSocialPipelineRunner.runtime';
import {
  beginPipelineRun,
  buildPipelineInput,
  createPipelineRun,
  queuedToastMessage,
  successToastMessage,
  type PipelineRun,
} from './useSocialPipelineRunner.pipeline-runtime';
import type {
  ManualPipelineJobResult,
  PipelineCaptureMode,
  PipelineJobRecord,
  PipelineTriggerResponse,
  RunPipelineOptions,
  SocialPipelineRunnerRefs,
  SocialPipelineRunnerState,
  SocialPipelineToast,
} from './useSocialPipelineRunner.types';

export type RunSocialPipeline = (
  captureMode: PipelineCaptureMode,
  options?: RunPipelineOptions
) => Promise<void>;

const triggerPipelineRun = async (run: PipelineRun): Promise<PipelineTriggerResponse> => {
  const response = await api.post<PipelineTriggerResponse>(
    '/api/filemaker/social-pipeline/trigger',
    {
      jobType: 'manual-post-pipeline',
      input: buildPipelineInput(run),
    },
    { timeout: PIPELINE_REQUEST_TIMEOUT_MS }
  );
  if (response.jobType !== 'manual-post-pipeline') {
    throw new Error('Pipeline queue returned an unexpected job type.');
  }
  return response;
};

const syncPipelineProgress = (
  state: SocialPipelineRunnerState,
  job: PipelineJobRecord
): void => {
  if (job.progress === null) return;
  state.setPipelineProgress(job.progress);
  state.setPipelineStep(job.progress.step);
};

const pollPipelineAgain = async (
  run: PipelineRun,
  jobId: string,
  startedAt: number
): Promise<PipelineJobRecord | null> => {
  const shouldContinue = await run.waitForNextPoll(PIPELINE_POLL_INTERVAL_MS);
  if (!shouldContinue) return null;
  return pollPipelineJob(run, jobId, startedAt);
};

const pollPipelineJob = async (
  run: PipelineRun,
  jobId: string,
  startedAt: number
): Promise<PipelineJobRecord | null> => {
  if (Date.now() - startedAt >= PIPELINE_TIMEOUT_MS) {
    throw new Error('Pipeline timed out while waiting for the server job.');
  }
  const job = await api.get<PipelineJobRecord | null>('/api/filemaker/social-pipeline/jobs', {
    params: { id: jobId },
    timeout: PIPELINE_REQUEST_TIMEOUT_MS,
  });
  if (job === null) return pollPipelineAgain(run, jobId, startedAt);

  run.state.setCurrentPipelineJob(job);
  syncPipelineProgress(run.state, job);
  if (job.status === 'completed') return job;
  if (job.status === 'failed') {
    throw new Error(job.failedReason ?? 'Server pipeline job failed.');
  }
  return pollPipelineAgain(run, jobId, startedAt);
};

const requirePipelineResult = (job: PipelineJobRecord): ManualPipelineJobResult => {
  if (!isManualPipelineResult(job.result)) {
    throw new Error('Pipeline completed without a usable result payload.');
  }
  if (job.result.generatedPost === null) {
    throw new Error('Pipeline completed without generated content.');
  }
  return job.result;
};

const updateGeneratedPostCache = (
  queryClient: QueryClient,
  generatedPost: SocialPublishingPost
): void => {
  const postsQueryKey = QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null });
  queryClient.setQueryData<SocialPublishingPost[]>(postsQueryKey, (current) =>
    (current ?? []).map((post) => (post.id === generatedPost.id ? generatedPost : post))
  );
};

const applyPipelineResult = (run: PipelineRun, result: ManualPipelineJobResult): void => {
  const generatedPost = result.generatedPost;
  if (generatedPost === null) return;
  run.state.setPipelineStep('previewing');
  run.deps.setActivePostId(generatedPost.id);
  run.deps.setEditorState({
    titlePl: generatedPost.titlePl,
    titleEn: generatedPost.titleEn,
    bodyPl: generatedPost.bodyPl,
    bodyEn: generatedPost.bodyEn,
  });
  run.deps.setContextSummary(generatedPost.contextSummary ?? result.contextSummary);
  run.deps.setImageAddonIds(result.imageAddonIds);
  run.deps.setImageAssets(result.imageAssets);
  run.deps.setBatchCaptureResult(result.batchCaptureResult);
  if (result.batchCaptureResult !== null) {
    run.deps.handleSelectAddons(result.batchCaptureResult.addons);
  }
  updateGeneratedPostCache(run.queryClient, generatedPost);
  invalidateSocialQueries(run.queryClient);
};

const completePipelineRun = (run: PipelineRun): void => {
  run.state.setPipelineStep('done');
  run.toast(successToastMessage(run.captureMode), { variant: 'success' });
  trackSocialPublishingClientEvent(
    'social_publishing_pipeline_success',
    run.deps.buildSocialContext({
      captureMode: run.captureMode,
      usesPrefetchedVisualAnalysis: run.usesPrefetchedVisualAnalysis,
    })
  );
};

const failPipelineRun = (run: PipelineRun, error: unknown): void => {
  const errorMessage = getErrorMessage(error, 'Unknown pipeline error');
  run.state.setPipelineStep('error');
  run.state.setPipelineErrorMessage(errorMessage);
  run.toast(`Pipeline failed: ${errorMessage}`, { variant: 'error' });
  invalidateSocialQueries(run.queryClient);
  logSocialPublishingClientError(error, {
    source: 'AdminSocialPublishingPage',
    action: 'runFullPipeline',
    ...run.refs.depsRef.current.buildSocialContext({
      error: true,
      captureMode: run.captureMode,
      usesPrefetchedVisualAnalysis: run.usesPrefetchedVisualAnalysis,
    }),
  });
  trackSocialPublishingClientEvent(
    'social_publishing_pipeline_failed',
    run.refs.depsRef.current.buildSocialContext({
      error: true,
      captureMode: run.captureMode,
      usesPrefetchedVisualAnalysis: run.usesPrefetchedVisualAnalysis,
    })
  );
};

const markPipelineQueued = (run: PipelineRun, jobId: string): void => {
  run.state.setCurrentPipelineJob({
    id: jobId,
    status: 'waiting',
    progress: null,
    result: null,
    failedReason: null,
  });
  run.state.setPipelineStep('capturing');
  run.toast(queuedToastMessage(run), { variant: 'default' });
};

const executePipelineRun = async (run: PipelineRun): Promise<void> => {
  beginPipelineRun(run);
  const response = await triggerPipelineRun(run);
  markPipelineQueued(run, response.jobId);
  const finalJob = await pollPipelineJob(run, response.jobId, Date.now());
  if (finalJob === null) return;
  applyPipelineResult(run, requirePipelineResult(finalJob));
  completePipelineRun(run);
};

export const useSocialPipelineRun = ({
  queryClient,
  refs,
  state,
  toast,
  waitForNextPoll,
}: {
  queryClient: QueryClient;
  refs: SocialPipelineRunnerRefs;
  state: SocialPipelineRunnerState;
  toast: SocialPipelineToast;
  waitForNextPoll: (ms: number) => Promise<boolean>;
}): RunSocialPipeline =>
  useCallback<RunSocialPipeline>(async (captureMode, options) => {
    const deps = refs.depsRef.current;
    const run = createPipelineRun({
      captureMode,
      deps,
      options,
      queryClient,
      refs,
      state,
      toast,
      waitForNextPoll,
    });
    if (run === null) return;
    trackSocialPublishingClientEvent(
      'social_publishing_pipeline_attempt',
      deps.buildSocialContext({
        captureMode,
        usesPrefetchedVisualAnalysis: run.usesPrefetchedVisualAnalysis,
        imageAssetCount: run.effectiveImageAssets.length,
        imageAddonCount: run.effectiveImageAddonIds.length,
      })
    );

    try {
      await executePipelineRun(run);
    } catch (error) {
      failPipelineRun(run, error);
    }
  }, [queryClient, refs, state, toast, waitForNextPoll]);
