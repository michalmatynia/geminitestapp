import 'server-only';

import { parseBooleanFromEnvironment } from './sinks-environment.server';
import {
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ENDPOINT_ALLOWLIST_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_KEY_ID_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_REDACTION_MODE_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_SECRET_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_WINDOW_SECONDS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_RECIPIENTS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SECRET_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SIGNATURE_KEY_ID_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_URL_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_ENABLED_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATIONS_ENABLED_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGY_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SECRET_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SIGNATURE_KEY_ID_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_URL_ENV,
} from './sinks-constants.server';
import type {
  PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode,
  PortablePathEnvelopeVerificationAuditSinkProfile,
} from './sinks-contracts.server';
import type { PortablePathAuditSinkAutoRemediationStrategy } from './types';

export type { PortablePathAuditSinkAutoRemediationStrategy } from './types';

const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD = 3;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS = 300;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS = 3600;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS = 3;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS = 8000;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES = 200;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_LIMIT = 20;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_WINDOW_SECONDS =
  7 * 24 * 60 * 60;

export const resolvePortablePathAuditSinkAutoRemediationThreshold = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD;
  const normalized = Math.floor(Number(value));
  if (normalized <= 0) return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD;
  return Math.min(normalized, 100);
};

export const resolvePortablePathAuditSinkAutoRemediationCooldownSeconds = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS;
  }
  const normalized = Math.floor(Number(value));
  if (normalized < 0) return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS;
  return Math.min(normalized, 86400);
};

export const resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSeconds = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS;
  }
  const normalized = Math.floor(Number(value));
  if (normalized < 0) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS;
  }
  return Math.min(normalized, 604800);
};

export const resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActions = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS;
  }
  const normalized = Math.floor(Number(value));
  if (normalized < 0)
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS;
  return Math.min(normalized, 100);
};

export const resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMs = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS;
  }
  const normalized = Math.floor(Number(value));
  if (normalized < 250) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS;
  }
  return Math.min(normalized, 60000);
};

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES;
  }
  const normalized = Math.floor(Number(value));
  if (normalized <= 0) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES;
  }
  return Math.min(normalized, 1000);
};

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayLimit = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_LIMIT;
  }
  const normalized = Math.floor(Number(value));
  if (normalized <= 0) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_LIMIT;
  }
  return Math.min(normalized, 200);
};

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSeconds = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_WINDOW_SECONDS;
  }
  const normalized = Math.floor(Number(value));
  if (normalized < 0) {
    return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_WINDOW_SECONDS;
  }
  return Math.min(normalized, 90 * 24 * 60 * 60);
};

export const resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_ENABLED_ENV]
): boolean | null => parseBooleanFromEnvironment(value);

const resolvePortablePathAuditSinkAutoRemediationStrategy = (
  value: string | undefined | null
): PortablePathAuditSinkAutoRemediationStrategy | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized.length === 0) return null;
  if (normalized === 'off' || normalized === 'none' || normalized === 'disabled') {
    return 'none';
  }
  if (
    normalized === 'unregister_all' ||
    normalized === 'unregister-all' ||
    normalized === 'unregisterall'
  ) {
    return 'unregister_all';
  }
  if (
    normalized === 'degrade_to_log_only' ||
    normalized === 'degrade-to-log-only' ||
    normalized === 'log_only' ||
    normalized === 'log-only'
  ) {
    return 'degrade_to_log_only';
  }
  return null;
};

export const resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGY_ENV]
): PortablePathAuditSinkAutoRemediationStrategy | null =>
  resolvePortablePathAuditSinkAutoRemediationStrategy(value);

export const resolveDefaultPortablePathAuditSinkAutoRemediationStrategyByProfile = (
  profile: PortablePathEnvelopeVerificationAuditSinkProfile
): PortablePathAuditSinkAutoRemediationStrategy => {
  if (profile === 'prod') return 'unregister_all';
  return 'degrade_to_log_only';
};

const parseStringArrayFromEnvironment = (value: string | undefined): string[] | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const values = trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (values.length === 0) return null;
  return Array.from(new Set(values));
};

const parseNumberFromEnvironment = (value: string | undefined): number | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
};

const parseOptionalUrlFromEnvironment = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

export const normalizePortablePathAuditSinkAutoRemediationEndpoint = (
  value: string | null | undefined
): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return parseOptionalUrlFromEnvironment(trimmed) ?? null;
};

export const normalizePortablePathAuditSinkAutoRemediationEndpointAllowlist = (
  values: readonly string[] | null | undefined
): string[] => {
  if (!values) return [];
  const normalized: string[] = [];
  for (const value of values) {
    const endpoint = normalizePortablePathAuditSinkAutoRemediationEndpoint(value);
    if (!endpoint) continue;
    if (!normalized.includes(endpoint)) {
      normalized.push(endpoint);
    }
  }
  return normalized;
};

const parseOptionalSecretFromEnvironment = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
};

export const resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS_ENV]
): number | null => {
  const numeric = parseNumberFromEnvironment(value);
  if (numeric === null) return null;
  return resolvePortablePathAuditSinkAutoRemediationCooldownSeconds(numeric);
};

export const resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS_ENV]
): number | null => {
  const numeric = parseNumberFromEnvironment(value);
  if (numeric === null) return null;
  return resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSeconds(numeric);
};

export const resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS_ENV]
): number | null => {
  const numeric = parseNumberFromEnvironment(value);
  if (numeric === null) return null;
  return resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActions(numeric);
};

export const resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATIONS_ENABLED_ENV]
): boolean | null => resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment(value);

export const resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_URL_ENV]
): string | null => parseOptionalUrlFromEnvironment(value);

export const resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_URL_ENV]
): string | null => parseOptionalUrlFromEnvironment(value);

export const resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_RECIPIENTS_ENV]
): string[] | null => parseStringArrayFromEnvironment(value);

export const resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS_ENV]
): number | null => {
  const numeric = parseNumberFromEnvironment(value);
  if (numeric === null) return null;
  return resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMs(numeric);
};

export const resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SECRET_ENV]
): string | null => parseOptionalSecretFromEnvironment(value);

export const resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SIGNATURE_KEY_ID_ENV]
): string | null => parseOptionalSecretFromEnvironment(value);

export const resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SECRET_ENV]
): string | null => parseOptionalSecretFromEnvironment(value);

export const resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment =
  (
    value = process.env[
      PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SIGNATURE_KEY_ID_ENV
    ]
  ): string | null => parseOptionalSecretFromEnvironment(value);

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES_ENV]
): number | null => {
  const numeric = parseNumberFromEnvironment(value);
  if (numeric === null) return null;
  return resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries(numeric);
};

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSecondsFromEnvironment =
  (
    value = process.env[
      PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_WINDOW_SECONDS_ENV
    ]
  ): number | null => {
    const numeric = parseNumberFromEnvironment(value);
    if (numeric === null) return null;
    return resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSeconds(numeric);
  };

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayEndpointAllowlistFromEnvironment =
  (
    value = process.env[
      PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ENDPOINT_ALLOWLIST_ENV
    ]
  ): string[] | null => {
    const parsed = parseStringArrayFromEnvironment(value);
    if (!parsed) return null;
    const normalized = normalizePortablePathAuditSinkAutoRemediationEndpointAllowlist(parsed);
    return normalized.length > 0 ? normalized : null;
  };

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironment =
  (
    value = process.env[
      PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_SECRET_ENV
    ]
  ): string | null => parseOptionalSecretFromEnvironment(value);

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironment =
  (
    value = process.env[
      PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_KEY_ID_ENV
    ]
  ): string | null => parseOptionalSecretFromEnvironment(value);

const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode = (
  value: string | undefined | null
): PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'off' || normalized === '0' || normalized === 'false') {
    return 'off';
  }
  if (
    normalized === 'sensitive' ||
    normalized === 'on' ||
    normalized === '1' ||
    normalized === 'true' ||
    normalized === 'low_trust' ||
    normalized === 'low-trust' ||
    normalized === 'lower_trust' ||
    normalized === 'lower-trust'
  ) {
    return 'sensitive';
  }
  return null;
};

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionModeFromEnvironment =
  (
    value = process.env[
      PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_REDACTION_MODE_ENV
    ]
  ): PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode | null =>
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode(value);

export const resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD_ENV]
): number | null => {
  const numeric = parseNumberFromEnvironment(value);
  if (numeric === null) return null;
  return resolvePortablePathAuditSinkAutoRemediationThreshold(numeric);
};
