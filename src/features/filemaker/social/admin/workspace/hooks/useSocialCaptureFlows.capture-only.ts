'use client';

import { useCallback, useState } from 'react';

import { logSocialPublishingClientError } from '@/features/filemaker/social/client-observability';
import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingImageAddonsBatchResult,
} from '@/shared/contracts/social-publishing-image-addons';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import {
  appendCaptureFailureSummary,
  buildCaptureFailureMessage,
  buildLiveBatchCaptureMessage,
  isBatchCaptureJobTerminal,
} from '../SocialPublishingPage.capture-feedback';
import type {
  AttachBatchCaptureResult,
  SocialCaptureFlowsProps,
  SocialCaptureOnlyControls,
  WaitForBatchCaptureJob,
} from './useSocialCaptureFlows.types';

type UseSocialCaptureOnlyFlowParams = {
  props: SocialCaptureFlowsProps;
  attachBatchCaptureResultToActiveDraft: AttachBatchCaptureResult;
  waitForBatchCaptureJob: WaitForBatchCaptureJob;
};

type CaptureOnlyFeedbackSetters = {
  setCaptureOnlyMessage: (message: string | null) => void;
  setCaptureOnlyErrorMessage: (message: string | null) => void;
};

type CaptureOnlyStateControls = CaptureOnlyFeedbackSetters & {
  captureOnlyPending: boolean;
  captureOnlyBatchCaptureJob: SocialPublishingImageAddonsBatchJob | null;
  captureOnlyMessage: string | null;
  captureOnlyErrorMessage: string | null;
  setCaptureOnlyPending: (pending: boolean) => void;
  setCaptureOnlyBatchCaptureJob: (
    job: SocialPublishingImageAddonsBatchJob | null
  ) => void;
};

type RunCaptureImagesOnlyParams = UseSocialCaptureOnlyFlowParams & {
  state: CaptureOnlyStateControls;
};

const CAPTURE_ONLY_STARTED_MESSAGE =
  'Capturing fresh screenshots and linking them to the active draft...';

const resolveCaptureJobErrorMessage = (
  job: SocialPublishingImageAddonsBatchJob,
  fallback: string
): string => {
  const errorMessage = job.error?.trim();
  return errorMessage !== undefined && errorMessage.length > 0 ? errorMessage : fallback;
};

const requireCompletedCaptureResult = (
  job: SocialPublishingImageAddonsBatchJob
): SocialPublishingImageAddonsBatchResult => {
  if (job.status === 'completed' && job.result !== null) {
    return job.result;
  }

  throw new Error(resolveCaptureJobErrorMessage(job, 'Failed to capture screenshots.'));
};

const buildCaptureOnlySuccessMessage = (
  result: SocialPublishingImageAddonsBatchResult,
  usedPresetCount: number
): string => {
  if (result.addons.length === 0) {
    return 'Capture finished with no new screenshots to attach.';
  }

  const screenshotLabel = `screenshot${result.addons.length === 1 ? '' : 's'}`;
  const presetLabel = `preset${usedPresetCount === 1 ? '' : 's'}`;

  return appendCaptureFailureSummary(
    `Captured ${result.addons.length} ${screenshotLabel} from ${usedPresetCount} ${presetLabel} and linked them to the draft.`,
    result.failures
  );
};

const applyLiveCaptureOnlyMessage = (
  job: SocialPublishingImageAddonsBatchJob,
  setCaptureOnlyMessage: (message: string) => void
): void => {
  const liveMessage = buildLiveBatchCaptureMessage(job);

  if (!isBatchCaptureJobTerminal(job.status) && liveMessage !== null && liveMessage.length > 0) {
    setCaptureOnlyMessage(liveMessage);
  }
};

const setCaptureOnlyFailure = (
  setters: CaptureOnlyFeedbackSetters,
  message: string | null
): void => {
  setters.setCaptureOnlyMessage(null);
  setters.setCaptureOnlyErrorMessage(message);
};

const handleCaptureOnlyException = ({
  error,
  setters,
  props,
}: {
  error: unknown;
  setters: CaptureOnlyFeedbackSetters;
  props: SocialCaptureFlowsProps;
}): void => {
  const message = error instanceof Error ? error.message : 'Failed to capture screenshots.';
  setCaptureOnlyFailure(setters, message);
  void ErrorSystem.captureException(error);
  logSocialPublishingClientError(error, {
    source: 'AdminSocialPublishingPage',
    action: 'captureImagesOnly',
    ...props.buildSocialContext({ error: true }),
  });
};

const handleBlockedCaptureOnlyRun = ({
  state,
  blockedReason,
}: {
  state: CaptureOnlyStateControls;
  blockedReason: string | null;
}): void => {
  state.setCaptureOnlyBatchCaptureJob(null);
  setCaptureOnlyFailure(state, blockedReason);
};

const runStartedCaptureOnlyJob = async ({
  props,
  state,
  waitForBatchCaptureJob,
}: Pick<RunCaptureImagesOnlyParams, 'props' | 'state' | 'waitForBatchCaptureJob'>): Promise<
  SocialPublishingImageAddonsBatchResult
> => {
  const startedJob = await props.imageAddons.startBatchCapture();
  state.setCaptureOnlyBatchCaptureJob(startedJob);
  applyLiveCaptureOnlyMessage(startedJob, state.setCaptureOnlyMessage);

  const completedJob = await waitForBatchCaptureJob(startedJob, (job) => {
    state.setCaptureOnlyBatchCaptureJob(job);
    applyLiveCaptureOnlyMessage(job, state.setCaptureOnlyMessage);
  });

  return requireCompletedCaptureResult(completedJob);
};

const finishCaptureOnlyRun = async ({
  result,
  params,
}: {
  result: SocialPublishingImageAddonsBatchResult;
  params: RunCaptureImagesOnlyParams;
}): Promise<void> => {
  await params.attachBatchCaptureResultToActiveDraft(result);

  if (result.addons.length === 0 && result.failures.length > 0) {
    setCaptureOnlyFailure(
      params.state,
      buildCaptureFailureMessage('Failed to capture screenshots.', result.failures)
    );
    return;
  }

  params.state.setCaptureOnlyMessage(
    buildCaptureOnlySuccessMessage(
      result,
      result.usedPresetCount ?? params.props.effectiveBatchCapturePresetCount
    )
  );
};

const runCaptureImagesOnly = async (params: RunCaptureImagesOnlyParams): Promise<void> => {
  if (params.props.editor.activePost === null) {
    return;
  }
  if (params.props.hasBatchCaptureConfig === false) {
    handleBlockedCaptureOnlyRun({
      state: params.state,
      blockedReason: params.props.socialBatchCaptureBlockedReason,
    });
    return;
  }

  params.state.setCaptureOnlyPending(true);
  params.state.setCaptureOnlyBatchCaptureJob(null);
  params.state.setCaptureOnlyErrorMessage(null);
  params.state.setCaptureOnlyMessage(CAPTURE_ONLY_STARTED_MESSAGE);

  try {
    const result = await runStartedCaptureOnlyJob(params);
    await finishCaptureOnlyRun({ result, params });
  } catch (error) {
    handleCaptureOnlyException({ error, setters: params.state, props: params.props });
  } finally {
    params.state.setCaptureOnlyPending(false);
  }
};

const useCaptureOnlyState = (): CaptureOnlyStateControls => {
  const [captureOnlyPending, setCaptureOnlyPending] = useState(false);
  const [captureOnlyMessage, setCaptureOnlyMessage] = useState<string | null>(null);
  const [captureOnlyErrorMessage, setCaptureOnlyErrorMessage] = useState<string | null>(null);
  const [captureOnlyBatchCaptureJob, setCaptureOnlyBatchCaptureJob] =
    useState<SocialPublishingImageAddonsBatchJob | null>(null);

  return {
    captureOnlyPending,
    captureOnlyBatchCaptureJob,
    captureOnlyMessage,
    captureOnlyErrorMessage,
    setCaptureOnlyPending,
    setCaptureOnlyBatchCaptureJob,
    setCaptureOnlyMessage,
    setCaptureOnlyErrorMessage,
  };
};

export const useSocialCaptureOnlyFlow = ({
  props,
  attachBatchCaptureResultToActiveDraft,
  waitForBatchCaptureJob,
}: UseSocialCaptureOnlyFlowParams): SocialCaptureOnlyControls => {
  const state = useCaptureOnlyState();

  const clearCaptureOnlyFeedback = useCallback((): void => {
    state.setCaptureOnlyMessage(null);
    state.setCaptureOnlyErrorMessage(null);
  }, [state]);

  const handleCaptureImagesOnly = useCallback(async (): Promise<void> => {
    await runCaptureImagesOnly({
      props,
      attachBatchCaptureResultToActiveDraft,
      waitForBatchCaptureJob,
      state,
    });
  }, [attachBatchCaptureResultToActiveDraft, props, state, waitForBatchCaptureJob]);

  return {
    captureOnlyPending: state.captureOnlyPending,
    captureOnlyBatchCaptureJob: state.captureOnlyBatchCaptureJob,
    captureOnlyMessage: state.captureOnlyMessage,
    captureOnlyErrorMessage: state.captureOnlyErrorMessage,
    handleCaptureImagesOnly,
    clearCaptureOnlyFeedback,
  };
};
