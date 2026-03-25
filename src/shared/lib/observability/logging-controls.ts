import type {
  ObservabilityLoggingControls,
  SystemLogLevelDto as SystemLogLevel,
} from '@/shared/contracts/observability';
import { OBSERVABILITY_LOGGING_KEYS } from '@/shared/contracts/observability';

export const OBSERVABILITY_LOGGING_CONTROL_TYPES = ['info', 'activity', 'error'] as const;

export type ObservabilityLoggingControlType =
  (typeof OBSERVABILITY_LOGGING_CONTROL_TYPES)[number];

export const DEFAULT_OBSERVABILITY_LOGGING_CONTROLS: ObservabilityLoggingControls = {
  infoEnabled: true,
  activityEnabled: true,
  errorEnabled: true,
};

const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const LOGGING_CONTROL_SETTING_KEY_BY_TYPE: Record<ObservabilityLoggingControlType, string> = {
  info: OBSERVABILITY_LOGGING_KEYS.infoEnabled,
  activity: OBSERVABILITY_LOGGING_KEYS.activityEnabled,
  error: OBSERVABILITY_LOGGING_KEYS.errorEnabled,
};

export const getObservabilityLoggingSettingKey = (
  type: ObservabilityLoggingControlType
): string => LOGGING_CONTROL_SETTING_KEY_BY_TYPE[type];

export const parseObservabilityLoggingEnabledSetting = (
  value: string | null | undefined,
  fallback: boolean = true
): boolean => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (typeof parsed === 'boolean') return parsed;
  } catch {
    // Fall through to the provided fallback.
  }

  return fallback;
};

export const resolveObservabilityLoggingControls = (
  readValue: (key: string) => string | null | undefined
): ObservabilityLoggingControls => ({
  infoEnabled: parseObservabilityLoggingEnabledSetting(
    readValue(OBSERVABILITY_LOGGING_KEYS.infoEnabled),
    DEFAULT_OBSERVABILITY_LOGGING_CONTROLS.infoEnabled
  ),
  activityEnabled: parseObservabilityLoggingEnabledSetting(
    readValue(OBSERVABILITY_LOGGING_KEYS.activityEnabled),
    DEFAULT_OBSERVABILITY_LOGGING_CONTROLS.activityEnabled
  ),
  errorEnabled: parseObservabilityLoggingEnabledSetting(
    readValue(OBSERVABILITY_LOGGING_KEYS.errorEnabled),
    DEFAULT_OBSERVABILITY_LOGGING_CONTROLS.errorEnabled
  ),
});

export const isObservabilityLoggingEnabled = (
  controls: ObservabilityLoggingControls,
  type: ObservabilityLoggingControlType
): boolean => {
  if (type === 'info') return controls.infoEnabled;
  if (type === 'activity') return controls.activityEnabled;
  return controls.errorEnabled;
};

export const getObservabilityLoggingControlTypeForSystemLogLevel = (
  level: SystemLogLevel | null | undefined,
  critical: boolean = false
): Extract<ObservabilityLoggingControlType, 'info' | 'error'> =>
  critical || level === 'warn' || level === 'error' ? 'error' : 'info';
