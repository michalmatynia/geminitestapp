'use client';

import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { safeSetTimeout } from '@/shared/lib/timers';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

import {
  getErrorMessage,
  invalidateSocialQueries,
  isSocialRuntimeJobInFlight,
  isVisualAnalysisJobResult,
  PIPELINE_POLL_INTERVAL_MS,
  PIPELINE_REQUEST_TIMEOUT_MS,
  PIPELINE_TIMEOUT_MS,
} from './useSocialPipelineRunner.runtime';
import type {
  SocialPipelineRunnerRefs,
  SocialPipelineRunnerState,
  VisualAnalysisJobRecord,
} from './useSocialPipelineRunner.types';

export type PollVisualAnalysisJob = (
  jobId: string,
  options?: { trackPending?: boolean; useSavedJobState?: boolean }
) => Promise<VisualAnalysisJobRecord | null>;

type VisualPollContext = {
  jobId: string;
  pollRunId: number;
  pollStartedAt: number;
  options?: { trackPending?: boolean; useSavedJobState?: boolean };
  queryClient: QueryClient;
  refs: SocialPipelineRunnerRefs;
  state: SocialPipelineRunnerState;
  waitForNextPoll: (ms: number) => Promise<boolean>;
  lastSeenStatusRef: { current: string | null };
};

type SavedVisualJobState = {
  error: string | null;
  jobId: string;
  status: string | null;
};

export type SocialPipelinePolling = {
  waitForNextPoll: (ms: number) => Promise<boolean>;
  pollVisualAnalysisJob: PollVisualAnalysisJob;
};

const shouldStopVisualPoll = (context: VisualPollContext): boolean =>
  context.refs.isUnmountedRef.current ||
  context.refs.visualAnalysisPollRunRef.current !== context.pollRunId;

const savedVisualJobState = (context: VisualPollContext): SavedVisualJobState => {
  const activePost = context.refs.depsRef.current.activePost;
  if (activePost === null) {
    return {
      jobId: '',
      status: null,
      error: null,
    };
  }
  return {
    jobId: activePost.visualAnalysisJobId?.trim() ?? '',
    status: activePost.visualAnalysisStatus,
    error: activePost.visualAnalysisError?.trim() ?? null,
  };
};

const mergeSavedVisualPendingJob = ({
  context,
  current,
  savedJob,
}: {
  context: VisualPollContext;
  current: VisualAnalysisJobRecord | null;
  savedJob: SavedVisualJobState;
}): VisualAnalysisJobRecord | null => {
  const matchedCurrent = current?.id === context.jobId ? current : null;
  if (matchedCurrent === null) {
    return {
      id: context.jobId,
      status: savedJob.status ?? 'waiting',
      progress: null,
      result: null,
      failedReason: savedJob.error,
    };
  }
  if (matchedCurrent.progress !== null) return matchedCurrent;
  return {
    id: context.jobId,
    status: matchedCurrent.status,
    progress: matchedCurrent.progress,
    result: matchedCurrent.result,
    failedReason: matchedCurrent.failedReason,
  };
};

const syncSavedVisualPendingState = (context: VisualPollContext): void => {
  const savedJob = savedVisualJobState(context);
  if (context.options?.useSavedJobState !== true) return;
  if (savedJob.jobId !== context.jobId) return;
  if (savedJob.status === null || !isSocialRuntimeJobInFlight(savedJob.status)) return;

  context.state.setCurrentVisualAnalysisJob((current) =>
    mergeSavedVisualPendingJob({ context, current, savedJob })
  );
};

const savedTerminalFailedReason = ({
  context,
  current,
  savedJob,
}: {
  context: VisualPollContext;
  current: VisualAnalysisJobRecord | null;
  savedJob: SavedVisualJobState;
}): string | null => {
  if (current?.id !== context.jobId) return savedJob.error;
  if (current.failedReason !== null && current.failedReason.length > 0) {
    return current.failedReason;
  }
  return savedJob.error;
};

const stopForSavedVisualCompletion = (context: VisualPollContext): boolean => {
  const savedJob = savedVisualJobState(context);
  if (context.options?.useSavedJobState !== true) return false;
  if (savedJob.jobId !== context.jobId) return false;
  if (savedJob.status === null || isSocialRuntimeJobInFlight(savedJob.status)) return false;

  context.state.setCurrentVisualAnalysisJob((current) => ({
    id: context.jobId,
    status: savedJob.status ?? 'completed',
    progress: current?.id === context.jobId ? current.progress : null,
    result: current?.id === context.jobId ? current.result : null,
    failedReason: savedTerminalFailedReason({ context, current, savedJob }),
  }));
  invalidateSocialQueries(context.queryClient);
  return true;
};

const fetchVisualAnalysisJob = async (
  jobId: string
): Promise<VisualAnalysisJobRecord | null> =>
  api.get<VisualAnalysisJobRecord | null>('/api/filemaker/social-pipeline/jobs', {
    params: { id: jobId },
    timeout: PIPELINE_REQUEST_TIMEOUT_MS,
  });

const waitThenPollVisualAnalysis = async (
  context: VisualPollContext
): Promise<VisualAnalysisJobRecord | null> => {
  const shouldContinue = await context.waitForNextPoll(PIPELINE_POLL_INTERVAL_MS);
  if (!shouldContinue) return null;
  return pollVisualAnalysisIteration(context);
};

const continueVisualPollWithJob = async (
  context: VisualPollContext,
  job: VisualAnalysisJobRecord
): Promise<VisualAnalysisJobRecord | null> => {
  const { lastSeenStatusRef } = context;
  context.state.setCurrentVisualAnalysisJob(job);
  if (job.status !== lastSeenStatusRef.current) {
    lastSeenStatusRef.current = job.status;
    invalidateSocialQueries(context.queryClient);
  }
  if (job.status === 'completed') return job;
  if (job.status === 'failed') {
    throw new Error(job.failedReason ?? 'Server visual analysis job failed.');
  }
  return waitThenPollVisualAnalysis(context);
};

const pollVisualAnalysisIteration = async (
  context: VisualPollContext
): Promise<VisualAnalysisJobRecord | null> => {
  if (shouldStopVisualPoll(context)) return null;
  if (Date.now() - context.pollStartedAt >= PIPELINE_TIMEOUT_MS) {
    throw new Error('Image analysis timed out while waiting for the server job.');
  }
  if (stopForSavedVisualCompletion(context)) return null;

  const job = await fetchVisualAnalysisJob(context.jobId);
  if (shouldStopVisualPoll(context)) return null;
  if (job === null) return waitThenPollVisualAnalysis(context);
  return continueVisualPollWithJob(context, job);
};

const completedVisualResultPostId = (
  context: VisualPollContext,
  completedResult: NonNullable<VisualAnalysisJobRecord['result']>
): string | null => {
  if (completedResult.savedPost !== null) return completedResult.savedPost.id;
  if (context.refs.depsRef.current.activePostId !== null) {
    return context.refs.depsRef.current.activePostId;
  }
  return context.refs.depsRef.current.activePost?.id ?? null;
};

const applyCompletedVisualAnalysisJob = (
  context: VisualPollContext,
  completedJob: VisualAnalysisJobRecord
): void => {
  const completedResult = completedJob.result;
  if (!isVisualAnalysisJobResult(completedResult)) {
    throw new Error('Image analysis completed without a usable result payload.');
  }

  const resultPostId = completedVisualResultPostId(context, completedResult);
  if (resultPostId !== null && resultPostId.length > 0) {
    context.state.setTransientVisualAnalysisResult({
      postId: resultPostId,
      result: completedResult.analysis,
    });
  }
  context.state.setVisualAnalysisErrorMessage(null);
  updateSavedVisualAnalysisPost(context.queryClient, completedResult.savedPost);
  invalidateSocialQueries(context.queryClient);
};

const updateSavedVisualAnalysisPost = (
  queryClient: QueryClient,
  savedPost: SocialPublishingPost | null
): void => {
  if (savedPost === null) return;
  const postsQueryKey = QUERY_KEYS.socialPublishing.posts({
    scope: 'admin',
    limit: null,
  });
  queryClient.setQueryData<SocialPublishingPost[]>(postsQueryKey, (current) =>
    (current ?? []).map((post) => (post.id === savedPost.id ? savedPost : post))
  );
};

const failVisualAnalysisJob = (
  context: VisualPollContext,
  errorMessage: string
): void => {
  context.state.setVisualAnalysisErrorMessage(errorMessage);
  context.state.setCurrentVisualAnalysisJob((current) =>
    current?.id === context.jobId
      ? {
          ...current,
          status: 'failed',
          failedReason: errorMessage,
        }
      : current
  );
  invalidateSocialQueries(context.queryClient);
};

const executeVisualPoll = async (
  context: VisualPollContext
): Promise<VisualAnalysisJobRecord | null> => {
  try {
    const completedJob = await pollVisualAnalysisIteration(context);
    if (completedJob !== null) applyCompletedVisualAnalysisJob(context, completedJob);
    return completedJob;
  } catch (error) {
    if (shouldStopVisualPoll(context)) return null;
    failVisualAnalysisJob(context, getErrorMessage(error, 'Image analysis failed.'));
    throw error;
  }
};

export const useSocialPipelinePolling = ({
  queryClient,
  refs,
  state,
}: {
  queryClient: QueryClient;
  refs: SocialPipelineRunnerRefs;
  state: SocialPipelineRunnerState;
}): SocialPipelinePolling => {
  const { isUnmountedRef, pollDelayTimeoutRef, visualAnalysisPollRunRef } = refs;
  const waitForNextPoll = useCallback((ms: number): Promise<boolean> => {
    if (isUnmountedRef.current) return Promise.resolve(false);

    return new Promise((resolve) => {
      pollDelayTimeoutRef.current = safeSetTimeout(() => {
        pollDelayTimeoutRef.current = null;
        resolve(!isUnmountedRef.current);
      }, ms);
    });
  }, [isUnmountedRef, pollDelayTimeoutRef]);

  const pollVisualAnalysisJob = useCallback<PollVisualAnalysisJob>(async (jobId, options) => {
    const pollRunId = visualAnalysisPollRunRef.current + 1;
    visualAnalysisPollRunRef.current = pollRunId;
    const context = {
      jobId,
      pollRunId,
      options,
      queryClient,
      refs,
      state,
      waitForNextPoll,
      pollStartedAt: Date.now(),
      lastSeenStatusRef: { current: null },
    };
    if (options?.trackPending === true) state.setVisualAnalysisPending(true);
    syncSavedVisualPendingState(context);

    try {
      return await executeVisualPoll(context);
    } finally {
      if (options?.trackPending === true && visualAnalysisPollRunRef.current === pollRunId) {
        state.setVisualAnalysisPending(false);
      }
    }
  }, [queryClient, refs, state, visualAnalysisPollRunRef, waitForNextPoll]);

  return {
    waitForNextPoll,
    pollVisualAnalysisJob,
  };
};
