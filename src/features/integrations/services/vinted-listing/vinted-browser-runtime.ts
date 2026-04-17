import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';
import type { PlaywrightBrowserPreference } from '@/shared/lib/playwright/browser-launch';
import { buildPlaywrightListingHistoryFields } from '@/features/playwright/server';

export type VintedListingSource = 'manual' | 'scheduler' | 'api';

export const resolveRequestedVintedBrowserMode = ({
  requestedBrowserMode,
  source,
}: {
  requestedBrowserMode: PlaywrightRelistBrowserMode | undefined;
  source: VintedListingSource;
}): PlaywrightRelistBrowserMode => {
  if (requestedBrowserMode !== undefined) {
    return requestedBrowserMode;
  }

  if (source === 'scheduler') {
    return 'connection_default';
  }

  // Vinted is noticeably less stable when we inherit the generic headless default.
  // For user-triggered runs prefer a real headed browser unless the caller overrides it.
  return 'headed';
};

export const resolveRequestedVintedBrowserPreference = ({
  requestedBrowserPreference,
  source,
}: {
  requestedBrowserPreference: PlaywrightBrowserPreference | undefined;
  source: VintedListingSource;
}): PlaywrightBrowserPreference | undefined => {
  if (requestedBrowserPreference !== undefined) {
    return requestedBrowserPreference;
  }

  if (source === 'scheduler') {
    return undefined;
  }

  // Upgrade generic/default Chromium-style choices to Brave for Vinted.
  return 'brave';
};

export const resolveEffectiveVintedBrowserMode = ({
  requestedBrowserMode,
  connectionHeadless,
}: {
  requestedBrowserMode: PlaywrightRelistBrowserMode;
  connectionHeadless: boolean;
}): 'headed' | 'headless' => {
  if (requestedBrowserMode === 'headed') {
    return 'headed';
  }
  if (requestedBrowserMode === 'headless') {
    return 'headless';
  }
  return connectionHeadless ? 'headless' : 'headed';
};

export const resolveEffectiveBrowserPreferenceFromLabel = ({
  launchLabel,
  requestedBrowserPreference,
}: {
  launchLabel: string;
  requestedBrowserPreference: PlaywrightBrowserPreference;
}): PlaywrightBrowserPreference => {
  const normalizedLabel = launchLabel.trim().toLowerCase();
  if (normalizedLabel.includes('brave')) return 'brave';
  if (normalizedLabel.includes('chrome')) return 'chrome';
  if (normalizedLabel.includes('chromium')) return 'chromium';
  return requestedBrowserPreference;
};

export const buildVintedHistoryFields = (
  browserMode: string | null | undefined
): string[] | null =>
  buildPlaywrightListingHistoryFields({
    browserMode,
  });
