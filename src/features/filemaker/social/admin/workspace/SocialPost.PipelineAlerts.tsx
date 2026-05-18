'use client';

import React from 'react';
import { LoadingState } from '@/shared/ui';
import { PipelineAlertBox, type PipelineAlertTone } from './SocialPost.PipelineAlertBox';
import { VisualAnalysisAlerts } from './SocialPost.PipelineVisualAlerts';
import { useSocialPostContext } from './SocialPostContext';
import type { PipelineStep } from './SocialPublishingPage.Constants';

type SocialContext = ReturnType<typeof useSocialPostContext>;
type ContextProps = { context: SocialContext };
type ActiveDraftProps = { state: ActiveDraftState };
type ContextDraftProps = ContextProps & ActiveDraftProps;

type ActiveDraftState = {
  hasActivePost: boolean;
  label: string;
};

const BUSY_PIPELINE_STEPS = new Set<PipelineStep>([
  'loading_context',
  'capturing',
  'saving',
  'generating',
  'previewing',
]);

const hasText = (value: string | null | undefined): boolean =>
  (value?.length ?? 0) > 0;

const getRuntimeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const isPipelineBusy = (step: PipelineStep): boolean => BUSY_PIPELINE_STEPS.has(step);

const activePostState = (context: SocialContext, label: string): ActiveDraftState => ({
  hasActivePost: hasText(context.activePostId),
  label,
});

const buildActiveDraftState = (context: SocialContext): ActiveDraftState => {
  const editorState = context.editorState as { titleEn?: unknown; titlePl?: unknown } | undefined;
  const titlePl = getRuntimeString(editorState?.titlePl);
  const titleEn = getRuntimeString(editorState?.titleEn);

  if (titlePl.length > 0) return activePostState(context, titlePl);
  if (titleEn.length > 0) return activePostState(context, titleEn);
  return activePostState(context, 'Untitled draft');
};

const resolveCapturePendingMessage = (message: string | null | undefined): string => {
  if (!hasText(message)) return 'Capturing...';
  return message ?? 'Capturing...';
};

function SelectionAlert({ state }: ActiveDraftProps): React.JSX.Element | null {
  if (state.hasActivePost) return null;
  return (
    <PipelineAlertBox tone='neutral'>
      Create or select a draft before running the social pipeline.
    </PipelineAlertBox>
  );
}

function SocialDraftBlockedAlert({ context }: ContextProps): React.JSX.Element | null {
  const reason = context.socialDraftBlockedReason ?? '';
  if (context.canGenerateSocialDraft || reason.length === 0) return null;
  return <PipelineAlertBox tone='warning'>{reason}</PipelineAlertBox>;
}

function VisualAnalysisBlockedAlert({
  context,
  state,
}: ContextDraftProps): React.JSX.Element | null {
  const reason = context.socialVisualAnalysisBlockedReason ?? '';
  const canRunVisualAnalysis = state.hasActivePost && context.canRunVisualAnalysisPipeline;
  if (canRunVisualAnalysis || !state.hasActivePost || reason.length === 0) return null;
  return <PipelineAlertBox tone='neutral'>{reason}</PipelineAlertBox>;
}

function BatchCaptureBlockedAlert({ context }: ContextProps): React.JSX.Element | null {
  const reason = context.socialBatchCaptureBlockedReason ?? '';
  if (context.hasBatchCaptureConfig || context.canGenerateSocialDraft || reason.length === 0) {
    return null;
  }
  return <PipelineAlertBox tone='neutral'>{reason}</PipelineAlertBox>;
}

function GateAlerts({ context, state }: ContextDraftProps): React.JSX.Element {
  return (
    <>
      <SelectionAlert state={state} />
      <SocialDraftBlockedAlert context={context} />
      <VisualAnalysisBlockedAlert context={context} state={state} />
      <BatchCaptureBlockedAlert context={context} />
    </>
  );
}

function MessageAlert({
  message,
  tone,
}: {
  message: string | null | undefined;
  tone: PipelineAlertTone;
}): React.JSX.Element | null {
  if (!hasText(message)) return null;
  return <PipelineAlertBox tone={tone}>{message}</PipelineAlertBox>;
}

function PipelineErrorAlert({ context }: ContextProps): React.JSX.Element | null {
  if (context.pipelineStep !== 'error' || !hasText(context.pipelineErrorMessage)) return null;
  return <PipelineAlertBox tone='error'>{context.pipelineErrorMessage}</PipelineAlertBox>;
}

function RuntimeMessageAlerts({ context }: ContextProps): React.JSX.Element {
  return (
    <>
      <MessageAlert message={context.programmableCaptureMessage} tone='success' />
      <MessageAlert message={context.programmableCaptureErrorMessage} tone='error' />
      <PipelineErrorAlert context={context} />
    </>
  );
}

function PipelineCompletionAlert({ context, state }: ContextDraftProps): React.JSX.Element | null {
  if (context.pipelineStep !== 'done' || !state.hasActivePost) return null;
  return (
    <PipelineAlertBox tone='success'>
      Draft updated: {state.label}. The editor opened with the generated content.
    </PipelineAlertBox>
  );
}

function CapturePendingAlert({ context }: ContextProps): React.JSX.Element | null {
  if (!context.captureOnlyPending) return null;
  return <LoadingState message={resolveCapturePendingMessage(context.captureOnlyMessage)} size='xs' />;
}

function CaptureMessageAlert({ context }: ContextProps): React.JSX.Element | null {
  if (context.captureOnlyPending) return null;
  return <MessageAlert message={context.captureOnlyMessage} tone='success' />;
}

function CaptureOnlyAlerts({ context }: ContextProps): React.JSX.Element {
  return (
    <>
      <CapturePendingAlert context={context} />
      <CaptureMessageAlert context={context} />
      <MessageAlert message={context.captureOnlyErrorMessage} tone='error' />
    </>
  );
}

export function SocialPipelineAlerts(): React.JSX.Element {
  const context = useSocialPostContext();
  const activeDraft = buildActiveDraftState(context);
  const busy = isPipelineBusy(context.pipelineStep);

  return (
    <>
      <GateAlerts context={context} state={activeDraft} />
      <VisualAnalysisAlerts busy={busy} context={context} />
      <RuntimeMessageAlerts context={context} />
      <PipelineCompletionAlert context={context} state={activeDraft} />
      <CaptureOnlyAlerts context={context} />
    </>
  );
}
