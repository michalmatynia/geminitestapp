import type { TraderaSystemSettings } from '@/shared/contracts/integrations';

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
} as const;

export const DEFAULT_TRADERA_SYSTEM_SETTINGS: TraderaSystemSettings = {
  defaultDurationHours: 72,
  autoRelistEnabled: true,
  autoRelistLeadMinutes: 180,
  schedulerEnabled: true,
  schedulerIntervalMs: 5 * 60 * 1000,
  allowSimulatedSuccess: false,
  listingFormUrl: 'https://www.tradera.com/sell/item/new',
  selectorProfile: 'default',
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
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  const withMin =
    typeof options?.min === 'number' ? Math.max(options.min, rounded) : rounded;
  return typeof options?.max === 'number' ? Math.min(options.max, withMin) : withMin;
};

type SettingLookup = {
  get: (key: string) => string | null | undefined;
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
    listingFormUrl:
      lookup.get(TRADERA_SETTINGS_KEYS.listingFormUrl)?.trim() ||
      defaults.listingFormUrl,
    selectorProfile:
      lookup.get(TRADERA_SETTINGS_KEYS.selectorProfile)?.trim() ||
      defaults.selectorProfile,
  };
};
