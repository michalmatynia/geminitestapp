import type {
  PlaywrightPersonaOption,
  SocialPostPlaywrightCaptureContext,
} from './SocialPost.PlaywrightCaptureModal.runtime';

export const SOCIAL_RUNTIME_LOCK_TITLE = 'Wait for the current Social runtime job to finish.';

type CaptureTitleArgs = {
  context: SocialPostPlaywrightCaptureContext;
  hasBlockingRuntimeJob: boolean;
  hasValidConfig: boolean;
  issue: string | null;
};

export const captureSaveTitle = ({
  context,
  hasBlockingRuntimeJob,
  hasValidConfig,
  issue,
}: CaptureTitleArgs): string => {
  if (hasBlockingRuntimeJob) return SOCIAL_RUNTIME_LOCK_TITLE;
  if (context.activePost === null) return 'Select an active draft before running programmable capture.';
  if (!hasValidConfig) {
    return issue ?? 'Add at least one valid route and a script before starting programmable capture.';
  }
  return 'Capture programmable images';
};

export const captureAndRunPipelineTitle = ({
  context,
  hasBlockingRuntimeJob,
  hasValidConfig,
  issue,
}: CaptureTitleArgs): string => {
  if (hasBlockingRuntimeJob) return SOCIAL_RUNTIME_LOCK_TITLE;
  if (context.activePost === null) {
    return 'Select an active draft before running programmable capture and pipeline.';
  }
  if (!hasValidConfig) {
    return issue ?? 'Add at least one valid route and a script before starting capture and pipeline.';
  }
  if (!context.canGenerateSocialDraft) {
    return context.socialDraftBlockedReason ?? 'Choose a Social Publishing post model before running capture and pipeline.';
  }
  return 'Capture programmable screenshots, attach them to the draft, and start the normal generation pipeline.';
};

export const selectedPersonaLabel = (
  personaOptions: PlaywrightPersonaOption[],
  personaId: string
): string => {
  const trimmedPersonaId = personaId.trim();
  if (trimmedPersonaId.length === 0) return 'Default runtime persona';
  return personaOptions.find((option) => option.value === trimmedPersonaId)?.label ?? trimmedPersonaId;
};

export const captureAndRunPipelineText = ({
  hasBlockingRuntimeJob,
  isPipelineJobInFlight,
}: {
  hasBlockingRuntimeJob: boolean;
  isPipelineJobInFlight: boolean;
}): string => {
  if (isPipelineJobInFlight) return 'Full pipeline in progress...';
  if (hasBlockingRuntimeJob) return 'Generate post in progress...';
  return 'Capture + run pipeline';
};
