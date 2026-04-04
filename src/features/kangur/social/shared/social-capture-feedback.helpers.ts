import type {
  KangurSocialImageAddonBatchCaptureResult,
  KangurSocialImageAddonBatchFailure,
  KangurSocialProgrammableCaptureRoute,
} from '@/shared/contracts/kangur-social-image-addons';

const FAILURE_REASON_LABELS: Record<string, string> = {
  capture_failed: 'Capture failed',
  artifact_missing: 'Screenshot artifact missing',
  artifact_read_failed: 'Saved screenshot could not be read',
  missing_url: 'Capture URL is missing',
};

const normalizeCaptureString = (value: string | null | undefined): string => value?.trim() ?? '';

export const resolveKangurSocialCaptureFailureReasonLabel = (
  reason: string | null | undefined
): string => {
  const normalized = normalizeCaptureString(reason);
  if (!normalized) {
    return 'Capture failed';
  }

  return FAILURE_REASON_LABELS[normalized.toLowerCase()] ?? normalized;
};

export const formatKangurSocialCaptureToken = (
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
  routes?: Array<Pick<KangurSocialProgrammableCaptureRoute, 'id' | 'title'>>
): string | null => {
  const programmableRoute = routes?.find((route) => normalizeCaptureString(route.id) === id);
  if (!programmableRoute) {
    return null;
  }

  return normalizeCaptureString(programmableRoute.title) || id;
};

export const resolveKangurSocialCaptureTargetLabelFromSources = (args: {
  id: string | null | undefined;
  routes?: Array<Pick<KangurSocialProgrammableCaptureRoute, 'id' | 'title'>>;
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

export const buildKangurSocialCaptureFailureEntry = (args: {
  failure: KangurSocialImageAddonBatchFailure;
  routes?: Array<Pick<KangurSocialProgrammableCaptureRoute, 'id' | 'title'>>;
  presetTitleById: ReadonlyMap<string, string>;
}): string => {
  const targetLabel = resolveKangurSocialCaptureTargetLabelFromSources({
    id: args.failure.id,
    routes: args.routes,
    presetTitleById: args.presetTitleById,
  });
  const reason = resolveKangurSocialCaptureFailureReasonLabel(args.failure.reason);
  return `${targetLabel}: ${reason}`;
};

export const buildKangurSocialCaptureFailureSummaryText = (args: {
  failures: KangurSocialImageAddonBatchFailure[];
  routes?: Array<Pick<KangurSocialProgrammableCaptureRoute, 'id' | 'title'>>;
  maxItems?: number;
  presetTitleById: ReadonlyMap<string, string>;
}): string | null => {
  if (args.failures.length === 0) {
    return null;
  }

  const maxItems = clampFailureSummaryMaxItems(args.maxItems);
  const visibleEntries = args.failures.slice(0, maxItems).map((failure) =>
    buildKangurSocialCaptureFailureEntry({
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

export const resolveKangurSocialCapturePrimaryIssue = (
  captureResults: KangurSocialImageAddonBatchCaptureResult[]
): KangurSocialImageAddonBatchCaptureResult | null =>
  captureResults.find((result) => result.status === 'failed') ??
  captureResults.find((result) => result.status === 'skipped') ??
  null;

const resolvePrimaryIssueTargetLabel = (args: {
  issue: KangurSocialImageAddonBatchCaptureResult;
  routes?: Array<Pick<KangurSocialProgrammableCaptureRoute, 'id' | 'title'>>;
  presetTitleById: ReadonlyMap<string, string>;
}): string =>
  normalizeCaptureString(args.issue.title) ||
  resolveKangurSocialCaptureTargetLabelFromSources({
    id: args.issue.id,
    routes: args.routes,
    presetTitleById: args.presetTitleById,
  });

const resolvePrimaryIssueAttemptLabel = (attemptCount: number | null | undefined): string =>
  attemptCount && attemptCount > 1 ? ` after ${attemptCount} attempts` : '';

const resolvePrimaryIssueStatusPhrase = (
  status: KangurSocialImageAddonBatchCaptureResult['status'],
  targetLabel: string
): string => (status === 'skipped' ? `${targetLabel} was skipped` : `${targetLabel} failed`);

export const buildKangurSocialCapturePrimaryIssueSummaryText = (args: {
  issue: KangurSocialImageAddonBatchCaptureResult | null;
  routes?: Array<Pick<KangurSocialProgrammableCaptureRoute, 'id' | 'title'>>;
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
  const stageLabel = formatKangurSocialCaptureToken(args.issue.stage);
  const reasonLabel = resolveKangurSocialCaptureFailureReasonLabel(args.issue.reason);
  const attemptLabel = resolvePrimaryIssueAttemptLabel(args.issue.attemptCount);
  const statusPhrase = resolvePrimaryIssueStatusPhrase(args.issue.status, targetLabel);
  const stagePhrase = stageLabel ? ` at ${stageLabel}` : '';

  return `${statusPhrase}${stagePhrase}${attemptLabel}. ${reasonLabel}`;
};
