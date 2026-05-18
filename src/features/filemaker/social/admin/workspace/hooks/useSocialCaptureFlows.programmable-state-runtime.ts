import {
  buildSocialPublishingProgrammableCaptureRoutesFromPresetIds,
} from '@/features/filemaker/social/shared/social-playwright-capture';
import type { SocialPublishingProgrammableCaptureRoute } from '@/shared/contracts/social-publishing-image-addons';

export type OpenProgrammablePlaywrightModalOptions = {
  loadPersistedDefaults?: boolean;
};

export const resolveDefaultProgrammableRoutes = ({
  persistedRoutes,
  presetIds,
}: {
  persistedRoutes: SocialPublishingProgrammableCaptureRoute[];
  presetIds: string[];
}): SocialPublishingProgrammableCaptureRoute[] => {
  if (persistedRoutes.length > 0) {
    return persistedRoutes;
  }

  return buildSocialPublishingProgrammableCaptureRoutesFromPresetIds(presetIds);
};

export const resolveProgrammableTextField = ({
  current,
  persisted,
  fallback,
  loadPersistedDefaults,
}: {
  current: string;
  persisted: string;
  fallback: string;
  loadPersistedDefaults: boolean;
}): string => {
  if (loadPersistedDefaults) {
    return persisted.length > 0 ? persisted : fallback;
  }

  const trimmedCurrent = current.trim();
  if (trimmedCurrent.length > 0) {
    return trimmedCurrent;
  }
  if (persisted.length > 0) {
    return persisted;
  }

  return fallback;
};

export const resolveNonEmptyString = (
  value: string | null | undefined,
  fallback: string
): string => {
  const text = value ?? '';
  return text.length > 0 ? text : fallback;
};

export const trimToNullableString = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const resolveProgrammableRoutesForOpen = ({
  current,
  persistedRoutes,
  presetIds,
  loadPersistedDefaults,
}: {
  current: SocialPublishingProgrammableCaptureRoute[];
  persistedRoutes: SocialPublishingProgrammableCaptureRoute[];
  presetIds: string[];
  loadPersistedDefaults: boolean;
}): SocialPublishingProgrammableCaptureRoute[] => {
  if (loadPersistedDefaults || current.length === 0) {
    return resolveDefaultProgrammableRoutes({ persistedRoutes, presetIds });
  }

  return current;
};
