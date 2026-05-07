import type {
  SocialPublishingImageAddonBatchCaptureResult,
  SocialPublishingImageAddonBatchFailure,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';

import { SOCIAL_PUBLISHING_CAPTURE_PRESETS } from './social-capture-presets';
import {
  buildSocialPublishingCaptureFailureSummaryText,
  buildSocialPublishingCapturePrimaryIssueSummaryText,
  resolveSocialPublishingCaptureFailureReasonLabel,
  resolveSocialPublishingCapturePrimaryIssue,
  resolveSocialPublishingCaptureTargetLabelFromSources,
} from './social-capture-feedback.helpers';

const PRESET_TITLE_BY_ID = new Map(
  SOCIAL_PUBLISHING_CAPTURE_PRESETS.map((preset) => [preset.id, preset.title])
);

export const normalizeSocialPublishingCaptureFailureReason = (
  reason: string | null | undefined
): string => resolveSocialPublishingCaptureFailureReasonLabel(reason);

export const resolveSocialPublishingCaptureTargetLabel = (
  id: string | null | undefined,
  routes?: Array<Pick<SocialPublishingProgrammableCaptureRoute, 'id' | 'title'>>
): string =>
  resolveSocialPublishingCaptureTargetLabelFromSources({
    id,
    routes,
    presetTitleById: PRESET_TITLE_BY_ID,
  });

export const buildSocialPublishingCaptureFailureSummary = (
  failures: SocialPublishingImageAddonBatchFailure[],
  options?: {
    routes?: Array<Pick<SocialPublishingProgrammableCaptureRoute, 'id' | 'title'>>;
    maxItems?: number;
  }
): string | null =>
  buildSocialPublishingCaptureFailureSummaryText({
    failures,
    routes: options?.routes,
    maxItems: options?.maxItems,
    presetTitleById: PRESET_TITLE_BY_ID,
  });

export const resolveFailedSocialPublishingPresetIds = (
  failures: SocialPublishingImageAddonBatchFailure[]
): string[] =>
  Array.from(
    new Set(
      failures
        .map((failure) => failure.id.trim())
        .filter((id) => PRESET_TITLE_BY_ID.has(id))
    )
  );

export const resolveFailedSocialPublishingProgrammableCaptureRoutes = (
  failures: SocialPublishingImageAddonBatchFailure[],
  routes: SocialPublishingProgrammableCaptureRoute[]
): SocialPublishingProgrammableCaptureRoute[] => {
  const failedIds = new Set(
    failures.map((failure) => failure.id.trim()).filter(Boolean)
  );
  return routes.filter((route) => failedIds.has(route.id.trim()));
};

export const buildSocialPublishingCapturePrimaryIssueSummary = (
  captureResults: SocialPublishingImageAddonBatchCaptureResult[],
  options?: {
    routes?: Array<Pick<SocialPublishingProgrammableCaptureRoute, 'id' | 'title'>>;
  }
): string | null =>
  buildSocialPublishingCapturePrimaryIssueSummaryText({
    issue: resolveSocialPublishingCapturePrimaryIssue(captureResults),
    routes: options?.routes,
    presetTitleById: PRESET_TITLE_BY_ID,
  });
