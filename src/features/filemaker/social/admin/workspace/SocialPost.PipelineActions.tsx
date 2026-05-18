'use client';

import React from 'react';

import { Badge, Button } from '@/shared/ui';
import { useSocialPostContext } from './SocialPostContext';
import { getSocialJobStatusLabel } from './SocialJobStatusPill';
import type { PipelineStep } from './SocialPublishingPage.Constants';

type ButtonVariant = React.ComponentProps<typeof Button>['variant'];
type SocialContext = ReturnType<typeof useSocialPostContext>;

type PipelineAction = {
  key: string;
  label: string;
  variant?: ButtonVariant;
  disabled: boolean;
  title: string;
  onClick: () => void;
};

type VisualAnalysisFlag = 'canRunVisualAnalysis' | 'hasFailedStatus' | 'hasInFlightStatus' | 'hasLatestMetadata' | 'hasReadyAnalysis' | 'hasReviewableAnalysis' | 'shouldWarnStale';
type VisualAnalysisState = Record<VisualAnalysisFlag, boolean>;
type ActionGateFlag = 'blockingJob' | 'busy' | 'canCaptureOnly' | 'canRunFreshCapture' | 'canRunTextPipeline' | 'hasActivePost';
type ActionGateState = Record<ActionGateFlag, boolean> & { visualState: VisualAnalysisState };

type CaptureTitleArgs = Pick<ActionGateState, 'blockingJob' | 'busy' | 'hasActivePost'> & {
  context: SocialContext;
};

const BUSY_PIPELINE_STEPS = new Set<PipelineStep>(['loading_context', 'capturing', 'saving', 'generating', 'previewing']);

const hasText = (value: string | null | undefined): boolean =>
  (value?.length ?? 0) > 0;

const getRuntimeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const activeDraftLabel = (context: SocialContext): string => {
  const editorState = context.editorState as { titleEn?: unknown; titlePl?: unknown } | undefined;
  const titlePl = getRuntimeString(editorState?.titlePl);
  if (titlePl.length > 0) return titlePl;

  const titleEn = getRuntimeString(editorState?.titleEn);
  return titleEn.length > 0 ? titleEn : 'Untitled draft';
};

const isRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase() ?? '';
  return normalized.length > 0 && normalized !== 'completed' && normalized !== 'failed';
};

const isPipelineBusy = (step: PipelineStep): boolean => BUSY_PIPELINE_STEPS.has(step);

const hasBlockingRuntimeJob = (context: SocialContext): boolean =>
  [
    context.currentVisualAnalysisJob?.status,
    context.currentGenerationJob?.status,
    context.currentPipelineJob?.status,
  ].some(isRuntimeJobInFlight);

const hasCaptureConfig = (context: SocialContext): boolean =>
  context.batchCaptureBaseUrl.trim().length > 0 &&
  context.batchCapturePresetIds.length > 0;

const hasReadyAnalysis = (context: SocialContext): boolean =>
  (context.visualAnalysisResult?.summary.trim().length ?? 0) > 0 ||
  (context.visualAnalysisResult?.highlights.length ?? 0) > 0;

const getRuntimeActivePost = (
  context: SocialContext
): SocialContext['activePost'] | undefined =>
  context.activePost as SocialContext['activePost'] | undefined;

const hasRuntimeValue = (value: unknown): boolean =>
  value !== null && value !== undefined;

const latestVisualAnalysisStatus = (context: SocialContext): string | null => {
  const latestStatus: unknown =
    context.currentVisualAnalysisJob?.status ?? getRuntimeActivePost(context)?.visualAnalysisStatus;
  return typeof latestStatus === 'string' ? latestStatus : null;
};

const hasLatestVisualAnalysisMetadata = (
  context: SocialContext,
  latestStatus: string | null
): boolean => {
  const activePost = getRuntimeActivePost(context);
  if (getSocialJobStatusLabel(latestStatus) !== null) return true;
  if (activePost === null || activePost === undefined) return false;
  if (hasRuntimeValue(activePost.visualAnalysisUpdatedAt)) return true;
  if (hasText(activePost.visualAnalysisModelId?.trim())) return true;
  return hasText(activePost.visualAnalysisJobId?.trim());
};

const shouldWarnStaleAnalysis = (context: SocialContext, hasLiveJob: boolean): boolean => {
  if (hasLiveJob) return false;
  return context.isSavedVisualAnalysisStale && context.hasSavedVisualAnalysis;
};

const isReviewableAnalysis = (
  hasLiveJob: boolean,
  readyAnalysis: boolean,
  latestMetadata: boolean,
  stale: boolean
): boolean => {
  if (hasLiveJob) return true;
  if (stale) return false;
  return readyAnalysis || latestMetadata;
};

const buildVisualAnalysisState = (
  context: SocialContext,
  hasActivePost: boolean
): VisualAnalysisState => {
  const latestStatus = latestVisualAnalysisStatus(context);
  const statusKey = latestStatus?.trim().toLowerCase() ?? '';
  const hasLiveJob = hasText(context.currentVisualAnalysisJob?.status);
  const readyAnalysis = hasReadyAnalysis(context);
  const latestMetadata = hasLatestVisualAnalysisMetadata(context, latestStatus);

  return {
    canRunVisualAnalysis: hasActivePost && context.canRunVisualAnalysisPipeline,
    hasFailedStatus: statusKey === 'failed',
    hasInFlightStatus: ['active', 'queued', 'running', 'waiting'].includes(statusKey),
    hasLatestMetadata: latestMetadata,
    hasReadyAnalysis: readyAnalysis,
    hasReviewableAnalysis: isReviewableAnalysis(
      hasLiveJob,
      readyAnalysis,
      latestMetadata,
      context.isSavedVisualAnalysisStale
    ),
    shouldWarnStale: shouldWarnStaleAnalysis(context, hasLiveJob),
  };
};

const resolveTextPipelineTitle = (
  context: SocialContext,
  state: ActionGateState
): string => {
  if (!state.hasActivePost) return 'Create or select a draft before running the pipeline.';
  if (!context.canGenerateSocialDraft) {
    return context.socialDraftBlockedReason ?? 'Choose a Social post model first.';
  }
  if (state.busy || state.blockingJob) return 'Wait for the current Social runtime job to finish.';
  return 'Generate a post from the current draft and selected visuals.';
};

const resolveVisualAnalysisReviewTitle = (state: VisualAnalysisState): string => {
  if (state.hasFailedStatus) return 'Review the failed image-analysis run or rerun analysis from the modal.';
  if (state.hasInFlightStatus) return 'Review the latest image-analysis run status or open the modal to wait for the saved result.';
  if (state.hasLatestMetadata) return 'Review the latest saved image-analysis run status or rerun analysis from the modal.';
  return 'Analyze the selected visuals first, then use Generate post with analysis as the follow-up AI pass.';
};

const resolveVisualAnalysisTitle = (
  context: SocialContext,
  state: ActionGateState
): string => {
  if (!state.hasActivePost) return 'Create or select a draft before running image analysis.';
  if (!state.visualState.canRunVisualAnalysis) {
    return context.socialVisualAnalysisBlockedReason ??
      'Select at least one image add-on and configure a vision model first.';
  }
  if (state.busy) return 'Wait for the current pipeline run to finish.';
  if (state.visualState.shouldWarnStale) {
    return 'Saved image analysis exists for this draft, but the selected visuals changed. Rerun image analysis before generating.';
  }
  if (state.visualState.hasReadyAnalysis) {
    return 'Review the saved image analysis or start the separate Generate post with analysis step.';
  }
  return resolveVisualAnalysisReviewTitle(state.visualState);
};

const resolveFreshCaptureTitle = (
  args: CaptureTitleArgs & { canRunFreshCapture: boolean }
): string => {
  if (!args.hasActivePost) return 'Create or select a draft before running fresh capture.';
  if (!args.canRunFreshCapture) {
    return args.context.socialBatchCaptureBlockedReason ??
      'Configure fresh capture before using this flow.';
  }
  if (args.busy || args.blockingJob) return 'Wait for the current Social runtime job to finish.';
  return 'Capture fresh screenshots first, then generate a post from them.';
};

const resolveCaptureOnlyTitle = (
  args: CaptureTitleArgs & { canCaptureOnly: boolean }
): string => {
  if (!args.hasActivePost) return 'Create or select a draft before capturing images.';
  if (!args.canCaptureOnly) {
    return args.context.socialBatchCaptureBlockedReason ??
      'Configure fresh capture before capturing images.';
  }
  if (args.context.captureOnlyPending || args.busy || args.blockingJob) {
    return 'Wait for the current Social runtime job to finish.';
  }
  return 'Capture screenshots and attach them to the active draft without generating copy.';
};

const buildActionGateState = (context: SocialContext): ActionGateState => {
  const hasActivePost = hasText(context.activePostId);
  const busy = isPipelineBusy(context.pipelineStep);
  const blockingJob = hasBlockingRuntimeJob(context);

  return {
    blockingJob,
    busy,
    canCaptureOnly: hasActivePost && hasCaptureConfig(context),
    canRunFreshCapture: hasActivePost && context.canRunFreshCapturePipeline,
    canRunTextPipeline: hasActivePost && context.canGenerateSocialDraft,
    hasActivePost,
    visualState: buildVisualAnalysisState(context, hasActivePost),
  };
};

const buildTextAction = (context: SocialContext, state: ActionGateState): PipelineAction => ({
  key: 'text',
  label: 'Run full pipeline',
  disabled: !state.canRunTextPipeline || state.busy || state.blockingJob,
  title: resolveTextPipelineTitle(context, state),
  onClick: () => {
    void context.handleRunFullPipeline();
  },
});

const buildVisualAction = (context: SocialContext, state: ActionGateState): PipelineAction => ({
  key: 'visual',
  label: state.visualState.hasReviewableAnalysis ? 'Review image analysis' : 'Image analysis',
  variant: state.visualState.hasReviewableAnalysis ? 'secondary' : 'outline',
  disabled: !state.visualState.canRunVisualAnalysis || state.busy,
  title: resolveVisualAnalysisTitle(context, state),
  onClick: context.handleOpenVisualAnalysisModal,
});

const buildFreshCaptureAction = (
  context: SocialContext,
  state: ActionGateState
): PipelineAction => ({
  key: 'fresh-capture',
  label: 'Fresh capture & pipeline',
  variant: 'outline',
  disabled: !state.canRunFreshCapture || state.busy || state.blockingJob,
  title: resolveFreshCaptureTitle({
    blockingJob: state.blockingJob,
    busy: state.busy,
    canRunFreshCapture: state.canRunFreshCapture,
    context,
    hasActivePost: state.hasActivePost,
  }),
  onClick: () => {
    void context.handleRunFullPipelineWithFreshCapture();
  },
});

const buildCaptureOnlyAction = (
  context: SocialContext,
  state: ActionGateState
): PipelineAction => ({
  key: 'capture-only',
  label: 'Capture images only',
  variant: 'outline',
  disabled: !state.canCaptureOnly || context.captureOnlyPending || state.busy || state.blockingJob,
  title: resolveCaptureOnlyTitle({
    blockingJob: state.blockingJob,
    busy: state.busy,
    canCaptureOnly: state.canCaptureOnly,
    context,
    hasActivePost: state.hasActivePost,
  }),
  onClick: () => {
    void context.handleCaptureImagesOnly();
  },
});

const buildPipelineActions = (context: SocialContext): PipelineAction[] => {
  const state = buildActionGateState(context);
  return [
    buildTextAction(context, state),
    buildVisualAction(context, state),
    buildFreshCaptureAction(context, state),
    buildCaptureOnlyAction(context, state),
  ];
};

const getBusyLabel = (step: PipelineStep): string => {
  if (step === 'capturing') return 'Capturing...';
  if (step === 'loading_context') return 'Loading context...';
  return 'Generating...';
};

export function SocialPipelineActions(): React.JSX.Element {
  const context = useSocialPostContext();
  const actions = buildPipelineActions(context);
  const hasActivePost = hasText(context.activePostId);
  const busy = isPipelineBusy(context.pipelineStep);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-sm font-semibold text-foreground'>Social pipeline</div>
        {busy ? (
          <Badge variant='outline' className='animate-pulse'>
            {getBusyLabel(context.pipelineStep)}
          </Badge>
        ) : null}
      </div>
      {hasActivePost ? (
        <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
          Active draft:{' '}
          <span className='font-semibold text-foreground/90'>{activeDraftLabel(context)}</span>
        </div>
      ) : null}
      <div className='flex flex-wrap gap-2'>
        {actions.map((action) => (
          <Button
            key={action.key}
            type='button'
            variant={action.variant}
            size='sm'
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
