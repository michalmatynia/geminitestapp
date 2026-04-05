import type {
  KangurSocialImageAddonBatchCaptureResult,
  KangurSocialImageAddonBatchFailure,
  KangurSocialProgrammableCaptureRoute,
} from '@/shared/contracts/kangur-social-image-addons';

import { KANGUR_SOCIAL_CAPTURE_PRESETS } from './social-capture-presets';
import {
  buildKangurSocialCaptureFailureSummaryText,
  buildKangurSocialCapturePrimaryIssueSummaryText,
  resolveKangurSocialCaptureFailureReasonLabel,
  resolveKangurSocialCapturePrimaryIssue,
  resolveKangurSocialCaptureTargetLabelFromSources,
} from './social-capture-feedback.helpers';

const PRESET_TITLE_BY_ID = new Map(
  KANGUR_SOCIAL_CAPTURE_PRESETS.map((preset) => [preset.id, preset.title])
);

export const normalizeKangurSocialCaptureFailureReason = (
  reason: string | null | undefined
): string => resolveKangurSocialCaptureFailureReasonLabel(reason);

export const resolveKangurSocialCaptureTargetLabel = (
  id: string | null | undefined,
  routes?: Array<Pick<KangurSocialProgrammableCaptureRoute, 'id' | 'title'>>
): string =>
  resolveKangurSocialCaptureTargetLabelFromSources({
    id,
    routes,
    presetTitleById: PRESET_TITLE_BY_ID,
  });

export const buildKangurSocialCaptureFailureSummary = (
  failures: KangurSocialImageAddonBatchFailure[],
  options?: {
    routes?: Array<Pick<KangurSocialProgrammableCaptureRoute, 'id' | 'title'>>;
    maxItems?: number;
  }
): string | null =>
  buildKangurSocialCaptureFailureSummaryText({
    failures,
    routes: options?.routes,
    maxItems: options?.maxItems,
    presetTitleById: PRESET_TITLE_BY_ID,
  });

export const resolveFailedKangurSocialPresetIds = (
  failures: KangurSocialImageAddonBatchFailure[]
): string[] =>
  Array.from(
    new Set(
      failures
        .map((failure) => failure.id.trim())
        .filter((id) => PRESET_TITLE_BY_ID.has(id))
    )
  );

export const resolveFailedKangurSocialProgrammableCaptureRoutes = (
  failures: KangurSocialImageAddonBatchFailure[],
  routes: KangurSocialProgrammableCaptureRoute[]
): KangurSocialProgrammableCaptureRoute[] => {
  const failedIds = new Set(
    failures.map((failure) => failure.id.trim()).filter(Boolean)
  );
  return routes.filter((route) => failedIds.has(route.id.trim()));
};

export const buildKangurSocialCapturePrimaryIssueSummary = (
  captureResults: KangurSocialImageAddonBatchCaptureResult[],
  options?: {
    routes?: Array<Pick<KangurSocialProgrammableCaptureRoute, 'id' | 'title'>>;
  }
): string | null =>
  buildKangurSocialCapturePrimaryIssueSummaryText({
    issue: resolveKangurSocialCapturePrimaryIssue(captureResults),
    routes: options?.routes,
    presetTitleById: PRESET_TITLE_BY_ID,
  });
