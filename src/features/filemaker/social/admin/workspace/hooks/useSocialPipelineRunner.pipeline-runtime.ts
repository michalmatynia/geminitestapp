import type { QueryClient } from '@tanstack/react-query';

import {
  getSocialPublishingProjectUrlError,
  normalizeSocialPublishingProjectUrl,
} from '@/features/filemaker/social/project-url';
import { createSocialPublishingManualPipelineProgress } from '@/shared/contracts/social-publishing-pipeline';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

import type {
  PipelineCaptureMode,
  RunPipelineOptions,
  SocialPipelineRunnerDeps,
  SocialPipelineRunnerRefs,
  SocialPipelineRunnerState,
  SocialPipelineToast,
} from './useSocialPipelineRunner.types';

export type PipelineRun = {
  activePostId: string;
  captureMode: PipelineCaptureMode;
  deps: SocialPipelineRunnerDeps;
  effectiveImageAddonIds: string[];
  effectiveImageAssets: ImageFileSelection[];
  normalizedProjectUrl: string;
  options?: RunPipelineOptions;
  queryClient: QueryClient;
  refs: SocialPipelineRunnerRefs;
  state: SocialPipelineRunnerState;
  toast: SocialPipelineToast;
  usesPrefetchedVisualAnalysis: boolean;
  waitForNextPoll: (ms: number) => Promise<boolean>;
};

const requestedPresetCount = (run: PipelineRun): number => {
  if (run.captureMode !== 'fresh_capture') return 0;
  const limit = run.deps.batchCapturePresetLimit;
  if (limit === null) return run.deps.batchCapturePresetIds.length;
  return Math.min(limit, run.deps.batchCapturePresetIds.length);
};

const queuedProgressMessage = (run: PipelineRun): string => {
  if (run.captureMode === 'fresh_capture') {
    return 'Queued on the server. Waiting to start a fresh Playwright capture...';
  }
  if (run.usesPrefetchedVisualAnalysis) {
    return 'Queued on the server. Waiting to generate from the analyzed visuals...';
  }
  return 'Queued on the server. Waiting to generate from the attached visuals...';
};

const queueingToastMessage = (run: PipelineRun): string => {
  if (run.captureMode === 'fresh_capture') {
    return 'Pipeline: queueing fresh-capture server run...';
  }
  if (run.usesPrefetchedVisualAnalysis) {
    return 'Pipeline: queueing server run with image analysis...';
  }
  return 'Pipeline: queueing server run from current visuals...';
};

export const queuedToastMessage = (run: PipelineRun): string => {
  if (run.captureMode === 'fresh_capture') {
    return 'Pipeline: queued on the server. Waiting for fresh capture and generation...';
  }
  if (run.usesPrefetchedVisualAnalysis) {
    return 'Pipeline: queued on the server. Waiting for visual-aware generation...';
  }
  return 'Pipeline: queued on the server. Waiting for generation...';
};

export const successToastMessage = (captureMode: PipelineCaptureMode): string => {
  if (captureMode === 'fresh_capture') {
    return 'Pipeline complete — fresh screenshots captured and draft updated.';
  }
  return 'Pipeline complete — review your updated post.';
};

const resolvePipelineRunTarget = ({
  deps,
  toast,
}: {
  deps: SocialPipelineRunnerDeps;
  toast: SocialPipelineToast;
}): { activePost: SocialPublishingPost; normalizedProjectUrl: string } | null => {
  if (!deps.canRunServerPipeline) {
    toast(
      deps.pipelineBlockedReason ??
        'Choose a Social Publishing post model in Settings or assign AI Brain routing first.',
      { variant: 'warning' }
    );
    return null;
  }
  if (deps.activePost === null) {
    toast('Create or select a post first', { variant: 'warning' });
    return null;
  }
  const normalizedProjectUrl = normalizeSocialPublishingProjectUrl(deps.projectUrl);
  const projectUrlError = getSocialPublishingProjectUrlError(normalizedProjectUrl);
  if (projectUrlError !== null) {
    toast(projectUrlError, { variant: 'warning' });
    return null;
  }
  return { activePost: deps.activePost, normalizedProjectUrl };
};

export const createPipelineRun = ({
  captureMode,
  deps,
  options,
  queryClient,
  refs,
  state,
  toast,
  waitForNextPoll,
}: {
  captureMode: PipelineCaptureMode;
  deps: SocialPipelineRunnerDeps;
  options?: RunPipelineOptions;
  queryClient: QueryClient;
  refs: SocialPipelineRunnerRefs;
  state: SocialPipelineRunnerState;
  toast: SocialPipelineToast;
  waitForNextPoll: (ms: number) => Promise<boolean>;
}): PipelineRun | null => {
  const target = resolvePipelineRunTarget({ deps, toast });
  if (target === null) return null;

  return {
    activePostId: target.activePost.id,
    captureMode,
    deps,
    effectiveImageAddonIds: options?.imageAddonIdsOverride ?? deps.imageAddonIds,
    effectiveImageAssets: options?.imageAssetsOverride ?? deps.imageAssets,
    normalizedProjectUrl: target.normalizedProjectUrl,
    options,
    queryClient,
    refs,
    state,
    toast,
    usesPrefetchedVisualAnalysis: options?.prefetchedVisualAnalysis !== undefined,
    waitForNextPoll,
  };
};

export const buildPipelineInput = (run: PipelineRun): Record<string, unknown> => {
  const input: Record<string, unknown> = {
    postId: run.activePostId,
    editorState: run.deps.editorState,
    imageAssets: run.effectiveImageAssets,
    imageAddonIds: run.effectiveImageAddonIds,
    captureMode: run.captureMode,
    publishingConnectionId: run.deps.publishingConnectionId,
    brainModelId: run.deps.brainModelId,
    visionModelId: run.deps.visionModelId,
    projectUrl: run.normalizedProjectUrl,
    generationNotes: run.deps.generationNotes,
    docReferences: run.deps.resolveDocReferences(),
    prefetchedVisualAnalysis: run.options?.prefetchedVisualAnalysis,
    requireVisualAnalysisInBody: run.options?.requireVisualAnalysisInBody ?? false,
  };
  if (run.captureMode === 'fresh_capture') {
    input['batchCaptureBaseUrl'] = run.deps.batchCaptureBaseUrl;
    input['batchCapturePresetIds'] = run.deps.batchCapturePresetIds;
    input['batchCapturePresetLimit'] = run.deps.batchCapturePresetLimit;
  }
  return input;
};

export const beginPipelineRun = (run: PipelineRun): void => {
  const count = requestedPresetCount(run);
  run.state.setPipelineErrorMessage(null);
  run.deps.setBatchCaptureResult(null);
  run.state.setPipelineProgress(createSocialPublishingManualPipelineProgress({
    step: 'loading_context',
    captureMode: run.captureMode,
    message: queuedProgressMessage(run),
    updatedAt: Date.now(),
    requestedPresetCount: count,
    captureCompletedCount: 0,
    captureRemainingCount: count,
    captureTotalCount: count,
  }));
  run.state.setPipelineStep('loading_context');
  run.toast(queueingToastMessage(run), { variant: 'default' });
};
