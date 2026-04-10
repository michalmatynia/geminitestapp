import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';
import type { PlaywrightBrowserPreference } from '@/shared/lib/playwright/browser-launch';

export type VintedListingSource = 'manual' | 'scheduler' | 'api';

const isBrowserPreference = (value: unknown): value is PlaywrightBrowserPreference =>
  value === 'auto' || value === 'brave' || value === 'chrome' || value === 'chromium';

const normalizeConfiguredBrowserPreference = (
  value: unknown
): PlaywrightBrowserPreference => (isBrowserPreference(value) ? value : 'auto');

export const resolveRequestedVintedBrowserMode = ({
  requestedBrowserMode,
  source,
  connectionHeadless,
}: {
  requestedBrowserMode: PlaywrightRelistBrowserMode | undefined;
  source: VintedListingSource;
  connectionHeadless: boolean | null | undefined;
}): PlaywrightRelistBrowserMode => {
  if (requestedBrowserMode) return requestedBrowserMode;

  if (source === 'scheduler') {
    if (connectionHeadless === false) return 'headed';
    if (connectionHeadless === true) return 'headless';
    return 'connection_default';
  }

  // Vinted is noticeably less stable when we inherit the generic headless default.
  // For user-triggered runs prefer a real headed browser unless the caller overrides it.
  return 'headed';
};

export const resolveRequestedVintedBrowserPreference = ({
  requestedBrowserPreference,
  source,
  connectionBrowserPreference,
}: {
  requestedBrowserPreference: PlaywrightBrowserPreference | undefined;
  source: VintedListingSource;
  connectionBrowserPreference: unknown;
}): PlaywrightBrowserPreference => {
  if (requestedBrowserPreference) return requestedBrowserPreference;

  const configuredPreference = normalizeConfiguredBrowserPreference(connectionBrowserPreference);

  if (source === 'scheduler') {
    return configuredPreference;
  }

  if (configuredPreference === 'brave' || configuredPreference === 'chrome') {
    return configuredPreference;
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
}): 'headed' | 'headless' =>
  requestedBrowserMode === 'headed'
    ? 'headed'
    : requestedBrowserMode === 'headless'
      ? 'headless'
      : connectionHeadless
        ? 'headless'
        : 'headed';

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
): string[] | null => {
  const normalizedBrowserMode =
    typeof browserMode === 'string' && browserMode.trim().length > 0
      ? browserMode.trim()
      : null;
  if (!normalizedBrowserMode) return null;
  return [`browser_mode:${normalizedBrowserMode}`];
};
