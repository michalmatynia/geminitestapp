import type {
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
