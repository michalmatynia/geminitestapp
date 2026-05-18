'use client';

import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/shared/ui';

import { isSocialRuntimeJobInFlight } from './useSocialPipelineRunner.runtime';
import {
  resolveVisualAnalysisSnapshot,
  useStableSocialPipelineStateActions,
  useSocialPipelineLifecycle,
  useSocialPipelineRunnerRefs,
  useSocialPipelineRunnerState,
  useTransientVisualAnalysisReset,
} from './useSocialPipelineRunner.state';
import {
  useSocialPipelinePolling,
  type PollVisualAnalysisJob,
} from './useSocialPipelineRunner.polling';
import {
  useSocialPipelineRun,
  type RunSocialPipeline,
} from './useSocialPipelineRunner.pipeline';
import { useSocialPipelineVisualHandlers } from './useSocialPipelineRunner.visual-handlers';
import type {
  SocialPipelineRunnerDeps,
  SocialPipelineRunnerState,
  UseSocialPipelineRunnerResult,
  VisualAnalysisSnapshot,
} from './useSocialPipelineRunner.types';

type PipelineRunnerActions = Pick<
  UseSocialPipelineRunnerResult,
  | 'handleAnalyzeSelectedVisuals'
  | 'handleCloseVisualAnalysisModal'
  | 'handleOpenVisualAnalysisModal'
  | 'handleRunFullPipeline'
  | 'handleRunFullPipelineWithFreshCapture'
  | 'handleRunFullPipelineWithOverrides'
  | 'handleRunFullPipelineWithVisualAnalysis'
>;

const savedVisualPollTarget = (
  activePost: SocialPipelineRunnerDeps['activePost']
): { jobId: string; status: string } | null => {
  if (activePost === null) return null;
  const jobId = activePost.visualAnalysisJobId?.trim() ?? '';
  const status = activePost.visualAnalysisStatus;
  if (jobId.length === 0) return null;
  if (status === null || !isSocialRuntimeJobInFlight(status)) return null;
  return { jobId, status };
};

const useSavedVisualAnalysisPolling = ({
  activePost,
  pollVisualAnalysisJob,
}: {
  activePost: SocialPipelineRunnerDeps['activePost'];
  pollVisualAnalysisJob: PollVisualAnalysisJob;
}): void => {
  useEffect(() => {
    const target = savedVisualPollTarget(activePost);
    if (target === null) return;

    void pollVisualAnalysisJob(target.jobId, {
      trackPending: true,
      useSavedJobState: true,
    }).catch(() => undefined);
  }, [activePost?.visualAnalysisJobId, activePost?.visualAnalysisStatus, pollVisualAnalysisJob]);
};

const usePipelineRunActions = (runPipeline: RunSocialPipeline): Pick<
  PipelineRunnerActions,
  | 'handleRunFullPipeline'
  | 'handleRunFullPipelineWithFreshCapture'
  | 'handleRunFullPipelineWithOverrides'
> => {
  const handleRunFullPipeline = useCallback(
    async (): Promise<void> => runPipeline('existing_assets'),
    [runPipeline]
  );
  const handleRunFullPipelineWithOverrides = useCallback(
    async (options: Parameters<PipelineRunnerActions['handleRunFullPipelineWithOverrides']>[0]) =>
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

  return {
    handleRunFullPipeline,
    handleRunFullPipelineWithOverrides,
    handleRunFullPipelineWithFreshCapture,
  };
};

const buildPipelineRunnerResult = ({
  actions,
  snapshot,
  state,
}: {
  actions: PipelineRunnerActions;
  snapshot: VisualAnalysisSnapshot;
  state: SocialPipelineRunnerState;
}): UseSocialPipelineRunnerResult => ({
  pipelineStep: state.pipelineStep,
  pipelineProgress: state.pipelineProgress,
  pipelineErrorMessage: state.pipelineErrorMessage,
  isVisualAnalysisModalOpen: state.isVisualAnalysisModalOpen,
  visualAnalysisResult: snapshot.visualAnalysisResult,
  hasSavedVisualAnalysis: snapshot.hasSavedVisualAnalysis,
  isSavedVisualAnalysisStale: snapshot.isSavedVisualAnalysisStale,
  visualAnalysisErrorMessage: state.visualAnalysisErrorMessage,
  visualAnalysisPending: state.visualAnalysisPending,
  currentPipelineJob: state.currentPipelineJob,
  currentVisualAnalysisJob: state.currentVisualAnalysisJob,
  handleRunFullPipeline: actions.handleRunFullPipeline,
  handleRunFullPipelineWithOverrides: actions.handleRunFullPipelineWithOverrides,
  handleRunFullPipelineWithFreshCapture: actions.handleRunFullPipelineWithFreshCapture,
  handleOpenVisualAnalysisModal: actions.handleOpenVisualAnalysisModal,
  handleCloseVisualAnalysisModal: actions.handleCloseVisualAnalysisModal,
  handleAnalyzeSelectedVisuals: actions.handleAnalyzeSelectedVisuals,
  handleRunFullPipelineWithVisualAnalysis: actions.handleRunFullPipelineWithVisualAnalysis,
});

export function useSocialPipelineRunner(
  deps: SocialPipelineRunnerDeps
): UseSocialPipelineRunnerResult {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const state = useSocialPipelineRunnerState();
  const stateActions = useStableSocialPipelineStateActions(state);
  const refs = useSocialPipelineRunnerRefs(deps);
  const snapshot = resolveVisualAnalysisSnapshot({
    deps,
    transientVisualAnalysisResult: state.transientVisualAnalysisResult,
  });
  const polling = useSocialPipelinePolling({ queryClient, refs, state: stateActions });
  const runPipeline = useSocialPipelineRun({
    queryClient,
    refs,
    state: stateActions,
    toast,
    waitForNextPoll: polling.waitForNextPoll,
  });
  const runActions = usePipelineRunActions(runPipeline);
  const visualHandlers = useSocialPipelineVisualHandlers({
    pollVisualAnalysisJob: polling.pollVisualAnalysisJob,
    refs,
    runPipeline,
    snapshot,
    state: stateActions,
    toast,
  });

  useSocialPipelineLifecycle({ deps, refs, state: stateActions });
  useTransientVisualAnalysisReset({
    activePostId: deps.activePostId,
    setTransientVisualAnalysisResult: state.setTransientVisualAnalysisResult,
    setVisualAnalysisErrorMessage: state.setVisualAnalysisErrorMessage,
    transientPostId: state.transientVisualAnalysisResult?.postId,
    visualAnalysisScope: snapshot.visualAnalysisScope,
  });
  useSavedVisualAnalysisPolling({
    activePost: deps.activePost,
    pollVisualAnalysisJob: polling.pollVisualAnalysisJob,
  });

  return buildPipelineRunnerResult({
    actions: {
      ...runActions,
      ...visualHandlers,
    },
    snapshot,
    state,
  });
}
