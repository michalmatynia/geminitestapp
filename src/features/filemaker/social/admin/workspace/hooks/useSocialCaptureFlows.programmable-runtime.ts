import { logSocialPublishingClientError } from '@/features/filemaker/social/client-observability';
import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingImageAddonsBatchResult,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import {
  appendCaptureFailureSummary,
  buildCaptureFailureMessage,
  buildLiveBatchCaptureMessage,
  isBatchCaptureJobTerminal,
} from '../SocialPublishingPage.capture-feedback';
import type {
  SocialCaptureFlowsProps,
  SocialProgrammableCaptureControls,
} from './useSocialCaptureFlows.types';

export type ProgrammableFlowSetters = Pick<
  SocialProgrammableCaptureControls,
  | 'setProgrammableCaptureMessage'
  | 'setProgrammableCaptureErrorMessage'
  | 'setProgrammableCaptureBatchCaptureJob'
>;

export const resolveProgrammableFallbackMessage = (shouldRunPipeline: boolean): string =>
  shouldRunPipeline
    ? 'Failed to run programmable Playwright capture and pipeline.'
    : 'Failed to run programmable Playwright capture.';

const resolveProgrammableJobErrorMessage = (
  job: SocialPublishingImageAddonsBatchJob,
  shouldRunPipeline: boolean
): string => {
  const errorMessage = job.error?.trim();
  if (errorMessage !== undefined && errorMessage.length > 0) {
    return errorMessage;
  }

  return resolveProgrammableFallbackMessage(shouldRunPipeline);
};

const resolveUnknownProgrammableErrorMessage = (
  error: unknown,
  shouldRunPipeline: boolean
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return resolveProgrammableFallbackMessage(shouldRunPipeline);
};

export const requireCompletedProgrammableResult = (
  job: SocialPublishingImageAddonsBatchJob,
  shouldRunPipeline: boolean
): SocialPublishingImageAddonsBatchResult => {
  if (job.status === 'completed' && job.result !== null) {
    return job.result;
  }

  throw new Error(resolveProgrammableJobErrorMessage(job, shouldRunPipeline));
};

export const buildProgrammableInitialMessage = (shouldRunPipeline: boolean): string =>
  shouldRunPipeline
    ? 'Running programmable Playwright capture, linking the images to the draft, and starting the pipeline...'
    : 'Running programmable Playwright capture and linking the images to the active draft...';

export const buildNoAttachmentMessage = (shouldRunPipeline: boolean): string =>
  shouldRunPipeline
    ? 'Programmable capture finished with no new screenshots to attach. The pipeline was not started.'
    : 'Programmable capture finished with no new screenshots to attach.';

export const buildNoAttachmentFailureMessage = ({
  result,
  routes,
  shouldRunPipeline,
}: {
  result: SocialPublishingImageAddonsBatchResult;
  routes: SocialPublishingProgrammableCaptureRoute[];
  shouldRunPipeline: boolean;
}): string =>
  buildCaptureFailureMessage(
    shouldRunPipeline
      ? 'Programmable capture failed. The pipeline was not started.'
      : 'Failed to run programmable Playwright capture.',
    result.failures,
    routes
  );

export const buildProgrammableSuccessMessage = ({
  result,
  routeCount,
  routes,
  shouldRunPipeline,
}: {
  result: SocialPublishingImageAddonsBatchResult;
  routeCount: number;
  routes: SocialPublishingProgrammableCaptureRoute[];
  shouldRunPipeline: boolean;
}): string => {
  const screenshotLabel = `screenshot${result.addons.length === 1 ? '' : 's'}`;
  const routeLabel = `programmable route${routeCount === 1 ? '' : 's'}`;
  const suffix = shouldRunPipeline
    ? '. Starting the draft pipeline now...'
    : ' and linked them to the draft.';

  return appendCaptureFailureSummary(
    `Captured ${result.addons.length} ${screenshotLabel} from ${routeCount} ${routeLabel}${suffix}`,
    result.failures,
    routes
  );
};

export const applyLiveProgrammableCaptureMessage = (
  job: SocialPublishingImageAddonsBatchJob,
  setters: Pick<
    ProgrammableFlowSetters,
    'setProgrammableCaptureBatchCaptureJob' | 'setProgrammableCaptureMessage'
  >
): void => {
  setters.setProgrammableCaptureBatchCaptureJob(job);
  const liveMessage = buildLiveBatchCaptureMessage(job);

  if (!isBatchCaptureJobTerminal(job.status) && liveMessage !== null && liveMessage.length > 0) {
    setters.setProgrammableCaptureMessage(liveMessage);
  }
};

export const setProgrammableFlowFailure = (
  setters: Pick<
    ProgrammableFlowSetters,
    'setProgrammableCaptureMessage' | 'setProgrammableCaptureErrorMessage'
  >,
  message: string
): void => {
  setters.setProgrammableCaptureMessage(null);
  setters.setProgrammableCaptureErrorMessage(message);
};

export const handleProgrammableFlowException = ({
  error,
  setters,
  props,
  shouldRunPipeline,
}: {
  error: unknown;
  setters: Pick<
    ProgrammableFlowSetters,
    'setProgrammableCaptureMessage' | 'setProgrammableCaptureErrorMessage'
  >;
  props: SocialCaptureFlowsProps;
  shouldRunPipeline: boolean;
}): void => {
  const message = resolveUnknownProgrammableErrorMessage(error, shouldRunPipeline);
  setProgrammableFlowFailure(setters, message);
  void ErrorSystem.captureException(error);
  logSocialPublishingClientError(error, {
    source: 'AdminSocialPublishingPage',
    action: shouldRunPipeline
      ? 'programmablePlaywrightCaptureAndPipeline'
      : 'programmablePlaywrightCapture',
    ...props.buildSocialContext({ error: true }),
  });
};
