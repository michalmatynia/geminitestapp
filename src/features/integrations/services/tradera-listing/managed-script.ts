import {
  isTraderaApiIntegrationSlug,
  isTraderaIntegrationSlug,
} from '@/features/integrations/constants/slugs';

import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from './default-script';

export const CURRENT_MANAGED_TRADERA_QUICKLIST_MARKER = 'tradera-quicklist-default:v103';

const MANAGED_TRADERA_QUICKLIST_MARKER_PATTERN = /tradera-quicklist-default:v\d+/;
const COMPATIBLE_LEGACY_MANAGED_TRADERA_QUICKLIST_MARKERS = new Set([
  'tradera-quicklist-default:v76',
]);

const isTraderaBrowserIntegrationSlug = (slug: string | null | undefined): boolean =>
  isTraderaIntegrationSlug(slug) && !isTraderaApiIntegrationSlug(slug);

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const usesLegacyDefaultTraderaQuickListScript = (
  script: string | null | undefined
): boolean => {
  const normalized = typeof script === 'string' ? script : '';
  return (
    normalized.includes('await import(\'node:fs/promises\')') &&
    normalized.includes('tradera-quicklist')
  );
};

export const extractManagedTraderaQuickListMarker = (
  script: string | null | undefined
): string | null => {
  const normalized = typeof script === 'string' ? script : '';
  return MANAGED_TRADERA_QUICKLIST_MARKER_PATTERN.exec(normalized)?.[0] ?? null;
};

export const isManagedTraderaQuickListScript = (
  script: string | null | undefined
): boolean => {
  const normalized = typeof script === 'string' ? script : '';
  return (
    extractManagedTraderaQuickListMarker(normalized) !== null ||
    (normalized.includes(
      'const ACTIVE_URL = \'https://www.tradera.com/en/my/listings?tab=active\';'
    ) &&
      normalized.includes('FAIL_SELL_PAGE_INVALID: Tradera create listing page did not load.'))
  );
};

export const usesStaleManagedDefaultTraderaQuickListScript = (
  script: string | null | undefined
): boolean => {
  if (!isManagedTraderaQuickListScript(script)) {
    return false;
  }

  const marker = extractManagedTraderaQuickListMarker(script);
  if (marker) {
    if (marker === CURRENT_MANAGED_TRADERA_QUICKLIST_MARKER) {
      return script !== DEFAULT_TRADERA_QUICKLIST_SCRIPT;
    }

    return !COMPATIBLE_LEGACY_MANAGED_TRADERA_QUICKLIST_MARKERS.has(marker);
  }

  return script !== DEFAULT_TRADERA_QUICKLIST_SCRIPT;
};

export const normalizePersistedTraderaPlaywrightListingScript = ({
  integrationSlug,
  traderaBrowserMode,
  playwrightListingScript,
}: {
  integrationSlug: string | null | undefined;
  traderaBrowserMode: 'builtin' | 'scripted' | null | undefined;
  playwrightListingScript: string | null | undefined;
}): string | null | undefined => {
  const normalizedScript = toTrimmedString(playwrightListingScript);

  if (!isTraderaBrowserIntegrationSlug(integrationSlug)) {
    return normalizedScript || (playwrightListingScript ?? undefined);
  }

  if (traderaBrowserMode !== 'scripted') {
    return normalizedScript || (playwrightListingScript ?? undefined);
  }

  if (!normalizedScript) {
    return null;
  }

  return isManagedTraderaQuickListScript(normalizedScript) ? null : normalizedScript;
};
