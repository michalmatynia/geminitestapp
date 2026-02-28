import { type ClientLoggingSettings, CLIENT_LOGGING_KEYS } from '@/shared/contracts/observability';

export { CLIENT_LOGGING_KEYS };

export const DEFAULT_CLIENT_LOGGING_SETTINGS: ClientLoggingSettings = {
  featureFlags: null,
  tags: null,
};

const toNullableRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const normalizeClientLoggingSettings = (value: unknown): ClientLoggingSettings => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_CLIENT_LOGGING_SETTINGS;
  }
  const record = value as Record<string, unknown>;
  return {
    featureFlags: toNullableRecord(record['featureFlags']),
    tags: toNullableRecord(record['tags']),
  };
};
