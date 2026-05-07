import type {
  SocialPublishingImageAddonBatchCaptureResult,
  SocialPublishingImageAddonBatchFailure,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';

const FAILURE_REASON_LABELS: Record<string, string> = {
  capture_failed: 'Capture failed',
  artifact_missing: 'Screenshot artifact missing',
  artifact_read_failed: 'Saved screenshot could not be read',
  missing_url: 'Capture URL is missing',
};

const normalizeCaptureString = (value: string | null | undefined): string => value?.trim() ?? '';

export const resolveSocialPublishingCaptureFailureReasonLabel = (
  reason: string | null | undefined
): string => {
  const normalized = normalizeCaptureString(reason);
  if (!normalized) {
    return 'Capture failed';
  }

  return FAILURE_REASON_LABELS[normalized.toLowerCase()] ?? normalized;
};

export const formatSocialPublishingCaptureToken = (
  value: string | null | undefined
): string | null => {
  const normalized = normalizeCaptureString(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const resolveProgrammableRouteTitle = (
  id: string,
  routes?: Array<Pick<SocialPublishingProgrammableCaptureRoute, 'id' | 'title'>>
): string | null => {
  const programmableRoute = routes?.find((route) => normalizeCaptureString(route.id) === id);
  if (!programmableRoute) {
    return null;
  }

  return normalizeCaptureString(programmableRoute.title) || id;
};

export const resolveSocialPublishingCaptureTargetLabelFromSources = (args: {
  id: string | null | undefined;
  routes?: Array<Pick<SocialPublishingProgrammableCaptureRoute, 'id' | 'title'>>;
  presetTitleById: ReadonlyMap<string, string>;
}): string => {
  const normalizedId = normalizeCaptureString(args.id);
  if (!normalizedId) {
    return 'Unknown target';
  }

  return (
    resolveProgrammableRouteTitle(normalizedId, args.routes) ??
    args.presetTitleById.get(normalizedId) ??
    normalizedId
  );
};

const clampFailureSummaryMaxItems = (maxItems: number | undefined): number =>
  Math.max(1, maxItems ?? 3);

export const buildSocialPublishingCaptureFailureEntry = (args: {
  failure: SocialPublishingImageAddonBatchFailure;
  routes?: Array<Pick<SocialPublishingProgrammableCaptureRoute, 'id' | 'title'>>;
  presetTitleById: ReadonlyMap<string, string>;
}): string => {
  const targetLabel = resolveSocialPublishingCaptureTargetLabelFromSources({
    id: args.failure.id,
    routes: args.routes,
    presetTitleById: args.presetTitleById,
  });
  const reason = resolveSocialPublishingCaptureFailureReasonLabel(args.failure.reason);
  return `${targetLabel}: ${reason}`;
};

export const buildSocialPublishingCaptureFailureSummaryText = (args: {
  failures: SocialPublishingImageAddonBatchFailure[];
  routes?: Array<Pick<SocialPublishingProgrammableCaptureRoute, 'id' | 'title'>>;
  maxItems?: number;
  presetTitleById: ReadonlyMap<string, string>;
}): string | null => {
  if (args.failures.length === 0) {
    return null;
  }

  const maxItems = clampFailureSummaryMaxItems(args.maxItems);
  const visibleEntries = args.failures.slice(0, maxItems).map((failure) =>
    buildSocialPublishingCaptureFailureEntry({
      failure,
      routes: args.routes,
      presetTitleById: args.presetTitleById,
    })
  );
  const remainingCount = args.failures.length - visibleEntries.length;

  return remainingCount > 0
    ? `${visibleEntries.join('; ')}; +${remainingCount} more`
    : visibleEntries.join('; ');
};

export const resolveSocialPublishingCapturePrimaryIssue = (
  captureResults: SocialPublishingImageAddonBatchCaptureResult[]
): SocialPublishingImageAddonBatchCaptureResult | null =>
  captureResults.find((result) => result.status === 'failed') ??
  captureResults.find((result) => result.status === 'skipped') ??
  null;

const resolvePrimaryIssueTargetLabel = (args: {
  issue: SocialPublishingImageAddonBatchCaptureResult;
  routes?: Array<Pick<SocialPublishingProgrammableCaptureRoute, 'id' | 'title'>>;
  presetTitleById: ReadonlyMap<string, string>;
}): string =>
  normalizeCaptureString(args.issue.title) ||
  resolveSocialPublishingCaptureTargetLabelFromSources({
    id: args.issue.id,
    routes: args.routes,
    presetTitleById: args.presetTitleById,
  });

const resolvePrimaryIssueAttemptLabel = (attemptCount: number | null | undefined): string =>
  attemptCount && attemptCount > 1 ? ` after ${attemptCount} attempts` : '';

const resolvePrimaryIssueStatusPhrase = (
  status: SocialPublishingImageAddonBatchCaptureResult['status'],
  targetLabel: string
): string => (status === 'skipped' ? `${targetLabel} was skipped` : `${targetLabel} failed`);

export const buildSocialPublishingCapturePrimaryIssueSummaryText = (args: {
  issue: SocialPublishingImageAddonBatchCaptureResult | null;
  routes?: Array<Pick<SocialPublishingProgrammableCaptureRoute, 'id' | 'title'>>;
  presetTitleById: ReadonlyMap<string, string>;
}): string | null => {
  if (!args.issue) {
    return null;
  }

  const targetLabel = resolvePrimaryIssueTargetLabel({
    issue: args.issue,
    routes: args.routes,
    presetTitleById: args.presetTitleById,
  });
  const stageLabel = formatSocialPublishingCaptureToken(args.issue.stage);
  const reasonLabel = resolveSocialPublishingCaptureFailureReasonLabel(args.issue.reason);
  const attemptLabel = resolvePrimaryIssueAttemptLabel(args.issue.attemptCount);
  const statusPhrase = resolvePrimaryIssueStatusPhrase(args.issue.status, targetLabel);
  const stagePhrase = stageLabel ? ` at ${stageLabel}` : '';

  return `${statusPhrase}${stagePhrase}${attemptLabel}. ${reasonLabel}`;
};
