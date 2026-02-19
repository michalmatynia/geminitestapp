import type { ClientLoggingSettingsDto } from '@/shared/contracts/observability';

export const CLIENT_LOGGING_KEYS = {
  featureFlags: 'client_log_feature_flags',
  tags: 'client_log_tags',
} as const;

export type ClientLoggingSettings = ClientLoggingSettingsDto;
