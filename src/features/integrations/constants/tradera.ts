import type { TraderaSystemSettings } from '@/shared/contracts/integrations/tradera';
import { TRADERA_CATEGORY_FETCH_METHODS } from '@/shared/contracts/integrations/marketplace';
import type { TraderaCategoryFetchMethod } from '@/shared/contracts/integrations/marketplace';

export type { TraderaSystemSettings };

export const TRADERA_SETTINGS_KEYS = {
  defaultDurationHours: 'tradera_default_duration_hours',
  autoRelistEnabled: 'tradera_auto_relist_enabled',
  autoRelistLeadMinutes: 'tradera_auto_relist_lead_minutes',
  schedulerEnabled: 'tradera_relist_scheduler_enabled',
  schedulerIntervalMs: 'tradera_relist_scheduler_interval_ms',
  allowSimulatedSuccess: 'tradera_allow_simulated_success',
  listingFormUrl: 'tradera_listing_form_url',
  selectorProfile: 'tradera_selector_profile',
  categoryFetchMethod: 'tradera_category_fetch_method',
} as const;

export const TRADERA_DIRECT_LISTING_FORM_URL = 'https://www.tradera.com/en/selling/new';
export const TRADERA_PUBLIC_CATEGORIES_URL = 'https://www.tradera.com/en/categories';

const TRADERA_ALLOWED_HOSTS = new Set(['www.tradera.com', 'tradera.com']);
const TRADERA_NEW_LISTING_PATH_PATTERN =
  /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?selling\/new\/?$/i;

const isAllowedTraderaListingFormUrl = (value: URL): boolean => {
  if (!TRADERA_ALLOWED_HOSTS.has(value.host.toLowerCase())) {
    return false;
  }

  return TRADERA_NEW_LISTING_PATH_PATTERN.test(value.pathname);
};

export const normalizeTraderaListingFormUrl = (value: string | null | undefined): string => {
  const trimmed = value?.trim();
  if (!trimmed) return TRADERA_DIRECT_LISTING_FORM_URL;

  try {
    const parsed = new URL(trimmed, TRADERA_DIRECT_LISTING_FORM_URL);
    if (!isAllowedTraderaListingFormUrl(parsed)) {
      return TRADERA_DIRECT_LISTING_FORM_URL;
    }
    return parsed.href;
  } catch {
    return TRADERA_DIRECT_LISTING_FORM_URL;
  }
};

export const DEFAULT_TRADERA_SYSTEM_SETTINGS: TraderaSystemSettings = {
  defaultDurationHours: 72,
  autoRelistEnabled: true,
  autoRelistLeadMinutes: 180,
  schedulerEnabled: false,
  schedulerIntervalMs: 5 * 60 * 1000,
  allowSimulatedSuccess: false,
  listingFormUrl: TRADERA_DIRECT_LISTING_FORM_URL,
  selectorProfile: 'default',
  categoryFetchMethod: 'playwright_listing_form',
};

const toBoolean = (value: string | null | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const toInt = (
  value: string | null | undefined,
  fallback: number,
  options?: { min?: number; max?: number }
): number => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  const withMin = typeof options?.min === 'number' ? Math.max(options.min, rounded) : rounded;
  return typeof options?.max === 'number' ? Math.min(options.max, withMin) : withMin;
};

type SettingLookup = {
  get: (key: string) => string | null | undefined;
};

const normalizeTraderaCategoryFetchMethod = (
  value: string | null | undefined
): TraderaCategoryFetchMethod => {
  const trimmed = value?.trim() ?? '';
  const found = TRADERA_CATEGORY_FETCH_METHODS.find((m) => m === trimmed);
  return found ?? DEFAULT_TRADERA_SYSTEM_SETTINGS.categoryFetchMethod;
};

export const resolveTraderaSystemSettings = (lookup: SettingLookup): TraderaSystemSettings => {
  const defaults = DEFAULT_TRADERA_SYSTEM_SETTINGS;
  return {
    defaultDurationHours: toInt(
      lookup.get(TRADERA_SETTINGS_KEYS.defaultDurationHours),
      defaults.defaultDurationHours,
      { min: 1, max: 720 }
    ),
    autoRelistEnabled: toBoolean(
      lookup.get(TRADERA_SETTINGS_KEYS.autoRelistEnabled),
      defaults.autoRelistEnabled
    ),
    autoRelistLeadMinutes: toInt(
      lookup.get(TRADERA_SETTINGS_KEYS.autoRelistLeadMinutes),
      defaults.autoRelistLeadMinutes,
      { min: 0, max: 10080 }
    ),
    schedulerEnabled: toBoolean(
      lookup.get(TRADERA_SETTINGS_KEYS.schedulerEnabled),
      defaults.schedulerEnabled
    ),
    schedulerIntervalMs: toInt(
      lookup.get(TRADERA_SETTINGS_KEYS.schedulerIntervalMs),
      defaults.schedulerIntervalMs,
      { min: 30_000, max: 3_600_000 }
    ),
    allowSimulatedSuccess: toBoolean(
      lookup.get(TRADERA_SETTINGS_KEYS.allowSimulatedSuccess),
      defaults.allowSimulatedSuccess
    ),
    listingFormUrl: normalizeTraderaListingFormUrl(
      lookup.get(TRADERA_SETTINGS_KEYS.listingFormUrl) ?? defaults.listingFormUrl
    ),
    selectorProfile:
      lookup.get(TRADERA_SETTINGS_KEYS.selectorProfile)?.trim() || defaults.selectorProfile,
    categoryFetchMethod: normalizeTraderaCategoryFetchMethod(
      lookup.get(TRADERA_SETTINGS_KEYS.categoryFetchMethod)
    ),
  };
};
