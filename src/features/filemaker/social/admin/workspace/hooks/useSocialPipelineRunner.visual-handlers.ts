'use client';

import { useCallback } from 'react';

import {
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import { api } from '@/shared/lib/api-client';

import {
  getErrorMessage,
  isVisualAnalysisJobResult,
  PIPELINE_REQUEST_TIMEOUT_MS,
} from './useSocialPipelineRunner.runtime';
import type { PollVisualAnalysisJob } from './useSocialPipelineRunner.polling';
import type {
  RunSocialPipeline,
} from './useSocialPipelineRunner.pipeline';
import type {
  SocialPipelineRunnerRefs,
  SocialPipelineRunnerState,
  SocialPipelineToast,
  UseSocialPipelineRunnerResult,
  VisualAnalysisSnapshot,
  VisualAnalysisTriggerResponse,
} from './useSocialPipelineRunner.types';

type VisualHandlerArgs = {
  pollVisualAnalysisJob: PollVisualAnalysisJob;
  refs: SocialPipelineRunnerRefs;
  runPipeline: RunSocialPipeline;
  snapshot: VisualAnalysisSnapshot;
  state: SocialPipelineRunnerState;
  toast: SocialPipelineToast;
};

type VisualHandlers = Pick<
  UseSocialPipelineRunnerResult,
  | 'handleAnalyzeSelectedVisuals'
  | 'handleCloseVisualAnalysisModal'
  | 'handleOpenVisualAnalysisModal'
  | 'handleRunFullPipelineWithVisualAnalysis'
>;

type AnalyzeVisualsArgs = Pick<
  VisualHandlerArgs,
  'pollVisualAnalysisJob' | 'refs' | 'state' | 'toast'
>;

const staleVisualAnalysisMessage = (snapshot: VisualAnalysisSnapshot): string => {
  if (snapshot.hasSavedVisualAnalysis && snapshot.isSavedVisualAnalysisStale) {
    return 'Saved image analysis is outdated for this draft. Rerun image analysis before generating.';
  }
  return 'Run image analysis first to generate the post with visual context.';
};

const canOpenVisualAnalysis = ({
  refs,
  toast,
}: {
  refs: SocialPipelineRunnerRefs;
  toast: SocialPipelineToast;
}): boolean => {
  const deps = refs.depsRef.current;
  if (deps.activePost === null) {
    toast('Create or select a post first', { variant: 'warning' });
    return false;
  }
  if (!deps.canRunVisualAnalysisPipeline) {
    toast(
      deps.visualAnalysisBlockedReason ??
        'Select at least one image add-on and configure a vision model first.',
      { variant: 'warning' }
    );
    return false;
  }
  return true;
};

const triggerVisualAnalysisJob = async (
  refs: SocialPipelineRunnerRefs
): Promise<VisualAnalysisTriggerResponse> => {
  const deps = refs.depsRef.current;
  const response = await api.post<VisualAnalysisTriggerResponse>(
    '/api/filemaker/social-posts/analyze-visuals',
    {
      postId: deps.activePost?.id,
      visionModelId: deps.visionModelId ?? undefined,
      imageAddonIds: deps.imageAddonIds,
    },
    { timeout: PIPELINE_REQUEST_TIMEOUT_MS }
  );
  return response;
};

const reportVisualAnalysisSuccess = (
  refs: SocialPipelineRunnerRefs,
  toast: SocialPipelineToast,
  highlightCount: number
): void => {
  toast('Image analysis complete — review the summary and generate the post.', {
    variant: 'success',
  });
  trackSocialPublishingClientEvent(
    'social_publishing_visual_analysis_success',
    refs.depsRef.current.buildSocialContext({ visualHighlightCount: highlightCount })
  );
};

const reportVisualAnalysisFailure = (
  refs: SocialPipelineRunnerRefs,
  state: SocialPipelineRunnerState,
  toast: SocialPipelineToast,
  error: unknown
): void => {
  const errorMessage = getErrorMessage(error, 'Image analysis failed.');
  state.setVisualAnalysisErrorMessage(errorMessage);
  toast(`Image analysis failed: ${errorMessage}`, { variant: 'error' });
  logSocialPublishingClientError(error, {
    source: 'AdminSocialPublishingPage',
    action: 'analyzeVisuals',
    ...refs.depsRef.current.buildSocialContext({ error: true }),
  });
  trackSocialPublishingClientEvent(
    'social_publishing_visual_analysis_failed',
    refs.depsRef.current.buildSocialContext({ error: true })
  );
};

const useAnalyzeSelectedVisuals = ({
  pollVisualAnalysisJob,
  refs,
  state,
  toast,
}: AnalyzeVisualsArgs): VisualHandlers['handleAnalyzeSelectedVisuals'] =>
  useCallback(async (): Promise<void> => {
    if (!canOpenVisualAnalysis({ refs, toast })) return;
    trackSocialPublishingClientEvent(
      'social_publishing_visual_analysis_attempt',
      refs.depsRef.current.buildSocialContext()
    );

    try {
      state.setVisualAnalysisPending(true);
      state.setVisualAnalysisErrorMessage(null);
      state.setTransientVisualAnalysisResult(null);
      const response = await triggerVisualAnalysisJob(refs);
      state.setCurrentVisualAnalysisJob({
        id: response.jobId,
        status: 'waiting',
        progress: null,
        result: null,
        failedReason: null,
      });
      const finalJob = await pollVisualAnalysisJob(response.jobId, { trackPending: false });
      if (finalJob === null || !isVisualAnalysisJobResult(finalJob.result)) return;
      reportVisualAnalysisSuccess(refs, toast, finalJob.result.analysis.highlights.length);
    } catch (error) {
      reportVisualAnalysisFailure(refs, state, toast, error);
    } finally {
      state.setVisualAnalysisPending(false);
    }
  }, [pollVisualAnalysisJob, refs, state, toast]);

export const useSocialPipelineVisualHandlers = ({
  pollVisualAnalysisJob,
  refs,
  runPipeline,
  snapshot,
  state,
  toast,
}: VisualHandlerArgs): VisualHandlers => {
  const handleOpenVisualAnalysisModal = useCallback((): void => {
    if (!canOpenVisualAnalysis({ refs, toast })) return;
    state.setVisualAnalysisErrorMessage(null);
    state.setIsVisualAnalysisModalOpen(true);
  }, [refs, state, toast]);

  const handleCloseVisualAnalysisModal = useCallback((): void => {
    state.setIsVisualAnalysisModalOpen(false);
    state.setVisualAnalysisErrorMessage(null);
    state.setVisualAnalysisPending(false);
  }, [state]);

  const handleAnalyzeSelectedVisuals = useAnalyzeSelectedVisuals({
    pollVisualAnalysisJob,
    refs,
    state,
    toast,
  });

  const handleRunFullPipelineWithVisualAnalysis = useCallback(async (): Promise<void> => {
    if (snapshot.visualAnalysisResult === null) {
      toast(staleVisualAnalysisMessage(snapshot), { variant: 'warning' });
      return;
    }

    state.setIsVisualAnalysisModalOpen(false);
    await runPipeline('existing_assets', {
      prefetchedVisualAnalysis: snapshot.visualAnalysisResult,
      requireVisualAnalysisInBody: true,
    });
  }, [runPipeline, snapshot, state, toast]);

  return {
    handleOpenVisualAnalysisModal,
    handleCloseVisualAnalysisModal,
    handleAnalyzeSelectedVisuals,
    handleRunFullPipelineWithVisualAnalysis,
  };
};
