import type {
  KangurSocialImageAddonBatchCaptureResult,
  KangurSocialImageAddonBatchFailure,
  KangurSocialProgrammableCaptureRoute,
} from '@/shared/contracts/kangur-social-image-addons';

import { KANGUR_SOCIAL_CAPTURE_PRESETS } from './social-capture-presets';

const PRESET_TITLE_BY_ID = new Map(
  KANGUR_SOCIAL_CAPTURE_PRESETS.map((preset) => [preset.id, preset.title])
);

export const normalizeKangurSocialCaptureFailureReason = (
  reason: string | null | undefined
): string => {
  const normalized = reason?.trim() ?? '';
  if (!normalized) {
    return 'Capture failed';
  }

  switch (normalized.toLowerCase()) {
    case 'capture_failed':
      return 'Capture failed';
    case 'artifact_missing':
      return 'Screenshot artifact missing';
    case 'artifact_read_failed':
      return 'Saved screenshot could not be read';
    case 'missing_url':
      return 'Capture URL is missing';
    default:
      return normalized;
  }
};

const formatKangurSocialCaptureToken = (
  value: string | null | undefined
): string | null => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const resolveKangurSocialCaptureTargetLabel = (
  id: string | null | undefined,
  routes?: Array<Pick<KangurSocialProgrammableCaptureRoute, 'id' | 'title'>>
): string => {
  const normalizedId = id?.trim() ?? '';
  if (!normalizedId) {
    return 'Unknown target';
  }

  const programmableRoute = routes?.find((route) => route.id.trim() === normalizedId);
  if (programmableRoute) {
    return programmableRoute.title.trim() || normalizedId;
  }

  return PRESET_TITLE_BY_ID.get(normalizedId) ?? normalizedId;
};

export const buildKangurSocialCaptureFailureSummary = (
  failures: KangurSocialImageAddonBatchFailure[],
  options?: {
    routes?: Array<Pick<KangurSocialProgrammableCaptureRoute, 'id' | 'title'>>;
    maxItems?: number;
  }
): string | null => {
  if (failures.length === 0) {
    return null;
  }

  const maxItems = Math.max(1, options?.maxItems ?? 3);
  const visibleEntries = failures.slice(0, maxItems).map((failure) => {
    const targetLabel = resolveKangurSocialCaptureTargetLabel(failure.id, options?.routes);
    const reason = normalizeKangurSocialCaptureFailureReason(failure.reason);
    return `${targetLabel}: ${reason}`;
  });
  const remainingCount = failures.length - visibleEntries.length;

  return remainingCount > 0
    ? `${visibleEntries.join('; ')}; +${remainingCount} more`
    : visibleEntries.join('; ');
};

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
): string | null => {
  const primaryIssue =
    captureResults.find((result) => result.status === 'failed') ??
    captureResults.find((result) => result.status === 'skipped');

  if (!primaryIssue) {
    return null;
  }

  const targetLabel =
    primaryIssue.title?.trim() ||
    resolveKangurSocialCaptureTargetLabel(primaryIssue.id, options?.routes);
  const stageLabel = formatKangurSocialCaptureToken(primaryIssue.stage);
  const reasonLabel = normalizeKangurSocialCaptureFailureReason(primaryIssue.reason);
  const attemptLabel =
    primaryIssue.attemptCount && primaryIssue.attemptCount > 1
      ? ` after ${primaryIssue.attemptCount} attempts`
      : '';
  const statusPhrase =
    primaryIssue.status === 'skipped'
      ? `${targetLabel} was skipped`
      : `${targetLabel} failed`;
  const stagePhrase = stageLabel ? ` at ${stageLabel}` : '';

  return `${statusPhrase}${stagePhrase}${attemptLabel}. ${reasonLabel}`;
};
