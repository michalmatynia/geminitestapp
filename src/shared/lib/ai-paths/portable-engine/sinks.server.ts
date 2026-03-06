import 'server-only';

import { logSystemEvent, type SystemLogInput } from '@/shared/lib/observability/system-logger';

import {
  listPortablePathEnvelopeVerificationAuditSinkIds,
  registerPortablePathEnvelopeVerificationAuditSink,
  unregisterPortablePathEnvelopeVerificationAuditSink,
} from './portable-engine-observability';
import {
  enqueuePortablePathAuditSinkAutoRemediationDeadLetterCore,
  loadPortablePathAuditSinkAutoRemediationDeadLettersCore,
  notifyPortablePathAuditSinkAutoRemediationCore,
  savePortablePathAuditSinkAutoRemediationDeadLettersCore,
  type EnqueuePortablePathAuditSinkAutoRemediationDeadLetterOptions,
  type LoadPortablePathAuditSinkAutoRemediationDeadLettersOptions,
  type NotifyPortablePathAuditSinkAutoRemediationDeps,
  type NotifyPortablePathAuditSinkAutoRemediationOptions,
  type PortablePathAuditSinkAutoRemediationAction,
  type PortablePathAuditSinkAutoRemediationNotificationChannel,
  type PortablePathAuditSinkAutoRemediationNotificationChannelResult,
  type PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  type PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature,
  type PortablePathAuditSinkAutoRemediationNotificationInput,
  type PortablePathAuditSinkAutoRemediationNotificationReceipt,
  type PortablePathAuditSinkAutoRemediationNotificationResult,
  type SavePortablePathAuditSinkAutoRemediationDeadLettersOptions,
} from './sinks-auto-remediation-notifications.server';
import {
  replayPortablePathAuditSinkAutoRemediationDeadLettersCore,
  type PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt,
  type PortablePathAuditSinkAutoRemediationDeadLetterReplayResult,
  type ReplayPortablePathAuditSinkAutoRemediationDeadLettersDeps,
  type ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions,
} from './sinks-auto-remediation-replay.server';
import {
  createPortablePathEnvelopeVerificationLogForwardingSink,
  createPortablePathEnvelopeVerificationMongoSink,
  createPortablePathEnvelopeVerificationPrismaSink,
  type CreatePortablePathEnvelopeVerificationLogForwardingSinkOptions,
  type CreatePortablePathEnvelopeVerificationMongoSinkOptions,
  type CreatePortablePathEnvelopeVerificationPrismaSinkOptions,
} from './sinks-creators.server';
import {
  parseBooleanFromEnvironment,
  readSettingsRawByProviderPriority,
  resolveHealthTimeoutMs,
  resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkHealthTimeoutMsFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment,
  runWithTimeout,
  toErrorMessage,
  toStartupHealthSummaryLogInput,
  writeSettingsRawByProviderPriority,
} from './sinks-shared.server';
import {
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ENDPOINT_ALLOWLIST_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_KEY_ID_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_REDACTION_MODE_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_SECRET_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_WINDOW_SECONDS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_SETTINGS_KEY,
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
  PORTABLE_PATH_AUDIT_SINK_STARTUP_HEALTH_STATE_SETTINGS_KEY,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_ENABLED_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICY_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILE_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  type PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode,
  type PortablePathEnvelopeVerificationAuditSinkHealthCheck,
  type PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic,
  type PortablePathEnvelopeVerificationAuditSinkHealthPolicy,
  type PortablePathEnvelopeVerificationAuditSinkProfile,
  type PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus,
  type PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
  type PortablePathEnvelopeVerificationAuditSinkWithHealthCheck,
} from './sinks-types.server';

export * from './sinks-types.server';
export * from './sinks-creators.server';
export * from './sinks-trends.server';
export {
  resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkHealthTimeoutMsFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment,
} from './sinks-shared.server';

const resolveDefaultProfileInclusion = (
  profile: PortablePathEnvelopeVerificationAuditSinkProfile
): {
  includeLogForwarding: boolean;
  includePrisma: boolean;
  includeMongo: boolean;
} => {
  switch (profile) {
    case 'prod':
      return {
        includeLogForwarding: true,
        includePrisma: true,
        includeMongo: true,
      };
    case 'staging':
      return {
        includeLogForwarding: true,
        includePrisma: true,
        includeMongo: false,
      };
    case 'dev':
    default:
      return {
        includeLogForwarding: true,
        includePrisma: false,
        includeMongo: false,
      };
  }
};

const applyBooleanOverride = (
  value: boolean,
  override: boolean | undefined
): boolean => (override === undefined ? value : override);

export type PortablePathAuditSinkStartupHealthState = {
  consecutiveFailureCount: number;
  lastFailureAt: string | null;
  lastRecoveredAt: string | null;
  lastFailedSinkIds: string[];
  remediationCount: number;
  lastRemediatedAt: string | null;
  remediationWindowStartedAt: string | null;
  remediationWindowActionCount: number;
  lastRemediationSkippedAt: string | null;
  lastRemediationSkippedReason: 'cooldown' | 'rate_limited' | null;
  lastStatus: PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus | null;
};

type PortablePathAuditSinkStartupHealthStateEnvelope = {
  version: 1;
  updatedAt: string;
  state: PortablePathAuditSinkStartupHealthState;
};

const createDefaultPortablePathAuditSinkStartupHealthState =
  (): PortablePathAuditSinkStartupHealthState => ({
    consecutiveFailureCount: 0,
    lastFailureAt: null,
    lastRecoveredAt: null,
    lastFailedSinkIds: [],
    remediationCount: 0,
    lastRemediatedAt: null,
    remediationWindowStartedAt: null,
    remediationWindowActionCount: 0,
    lastRemediationSkippedAt: null,
    lastRemediationSkippedReason: null,
    lastStatus: null,
  });
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD = 3;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS = 300;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS = 3600;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS = 3;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS = 8000;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES = 200;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_LIMIT = 20;
const DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_WINDOW_SECONDS =
  7 * 24 * 60 * 60;
const _PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGIES = [
  'none',
  'unregister_all',
  'degrade_to_log_only',
] as const;

export type PortablePathAuditSinkAutoRemediationStrategy =
  (typeof _PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGIES)[number];

const resolvePortablePathAuditSinkAutoRemediationThreshold = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD;
  const normalized = Math.floor(Number(value));
  if (normalized <= 0) return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD;
  return Math.min(normalized, 100);
};

const resolvePortablePathAuditSinkAutoRemediationCooldownSeconds = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS;
  const normalized = Math.floor(Number(value));
  if (normalized < 0) return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS;
  return Math.min(normalized, 86400);
};

const resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSeconds = (
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

const resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActions = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS;
  const normalized = Math.floor(Number(value));
  if (normalized < 0) return DEFAULT_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS;
  return Math.min(normalized, 100);
};

const resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMs = (
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

const resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries = (
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

const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayLimit = (
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

const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSeconds = (
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

const resolveDefaultPortablePathAuditSinkAutoRemediationStrategyByProfile = (
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

const normalizePortablePathAuditSinkAutoRemediationEndpoint = (
  value: string | null | undefined
): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return parseOptionalUrlFromEnvironment(trimmed) ?? null;
};

const normalizePortablePathAuditSinkAutoRemediationEndpointAllowlist = (
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
): boolean | null => parseBooleanFromEnvironment(value);

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

export const resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SIGNATURE_KEY_ID_ENV]
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
    value =
    process.env[
      PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_WINDOW_SECONDS_ENV
    ]
  ): number | null => {
    const numeric = parseNumberFromEnvironment(value);
    if (numeric === null) return null;
    return resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSeconds(numeric);
  };

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayEndpointAllowlistFromEnvironment =
  (
    value =
    process.env[
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
    value =
    process.env[
      PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_SECRET_ENV
    ]
  ): string | null => parseOptionalSecretFromEnvironment(value);

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironment =
  (
    value =
    process.env[
      PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_KEY_ID_ENV
    ]
  ): string | null => parseOptionalSecretFromEnvironment(value);

const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode = (
  value: string | undefined | null
): PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (
    normalized === 'off' ||
    normalized === '0' ||
    normalized === 'false'
  ) {
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
    value =
    process.env[
      PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_REDACTION_MODE_ENV
    ]
  ): PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode | null =>
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode(value);

export const resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD_ENV]
): number | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return resolvePortablePathAuditSinkAutoRemediationThreshold(numeric);
};

const parsePortablePathAuditSinkStartupHealthStateEnvelope = (
  raw: string | null
): PortablePathAuditSinkStartupHealthState => {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return createDefaultPortablePathAuditSinkStartupHealthState();
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return createDefaultPortablePathAuditSinkStartupHealthState();
    }
    const envelope = parsed as Partial<PortablePathAuditSinkStartupHealthStateEnvelope> & {
      state?: unknown;
    };
    if (!envelope.state || typeof envelope.state !== 'object' || Array.isArray(envelope.state)) {
      return createDefaultPortablePathAuditSinkStartupHealthState();
    }
    const state = envelope.state as Record<string, unknown>;
    return {
      consecutiveFailureCount:
        typeof state['consecutiveFailureCount'] === 'number' &&
        Number.isFinite(state['consecutiveFailureCount'])
          ? Math.max(0, Math.floor(state['consecutiveFailureCount']))
          : 0,
      lastFailureAt:
        typeof state['lastFailureAt'] === 'string' && state['lastFailureAt'].trim().length > 0
          ? state['lastFailureAt']
          : null,
      lastRecoveredAt:
        typeof state['lastRecoveredAt'] === 'string' && state['lastRecoveredAt'].trim().length > 0
          ? state['lastRecoveredAt']
          : null,
      lastFailedSinkIds: Array.isArray(state['lastFailedSinkIds'])
        ? state['lastFailedSinkIds'].filter((item): item is string => typeof item === 'string')
        : [],
      remediationCount:
        typeof state['remediationCount'] === 'number' && Number.isFinite(state['remediationCount'])
          ? Math.max(0, Math.floor(state['remediationCount']))
          : 0,
      lastRemediatedAt:
        typeof state['lastRemediatedAt'] === 'string' && state['lastRemediatedAt'].trim().length > 0
          ? state['lastRemediatedAt']
          : null,
      remediationWindowStartedAt:
        typeof state['remediationWindowStartedAt'] === 'string' &&
        state['remediationWindowStartedAt'].trim().length > 0
          ? state['remediationWindowStartedAt']
          : null,
      remediationWindowActionCount:
        typeof state['remediationWindowActionCount'] === 'number' &&
        Number.isFinite(state['remediationWindowActionCount'])
          ? Math.max(0, Math.floor(state['remediationWindowActionCount']))
          : 0,
      lastRemediationSkippedAt:
        typeof state['lastRemediationSkippedAt'] === 'string' &&
        state['lastRemediationSkippedAt'].trim().length > 0
          ? state['lastRemediationSkippedAt']
          : null,
      lastRemediationSkippedReason:
        state['lastRemediationSkippedReason'] === 'cooldown' ||
        state['lastRemediationSkippedReason'] === 'rate_limited'
          ? state['lastRemediationSkippedReason']
          : null,
      lastStatus:
        state['lastStatus'] === 'healthy' ||
        state['lastStatus'] === 'degraded' ||
        state['lastStatus'] === 'failed' ||
        state['lastStatus'] === 'skipped'
          ? state['lastStatus']
          : null,
    };
  } catch {
    return createDefaultPortablePathAuditSinkStartupHealthState();
  }
};

const stringifyPortablePathAuditSinkStartupHealthStateEnvelope = (
  state: PortablePathAuditSinkStartupHealthState
): string | null => {
  try {
    const envelope: PortablePathAuditSinkStartupHealthStateEnvelope = {
      version: 1,
      updatedAt: new Date().toISOString(),
      state,
    };
    return JSON.stringify(envelope);
  } catch {
    return null;
  }
};

export type LoadPortablePathAuditSinkStartupHealthStateOptions = {
  readRaw?: () => Promise<string | null>;
};

export const loadPortablePathAuditSinkStartupHealthState = async (
  options: LoadPortablePathAuditSinkStartupHealthStateOptions = {}
): Promise<PortablePathAuditSinkStartupHealthState> => {
  const readRaw =
    options.readRaw ??
    (async (): Promise<string | null> =>
      readSettingsRawByProviderPriority(PORTABLE_PATH_AUDIT_SINK_STARTUP_HEALTH_STATE_SETTINGS_KEY));
  const raw = await readRaw();
  return parsePortablePathAuditSinkStartupHealthStateEnvelope(raw);
};

export type SavePortablePathAuditSinkStartupHealthStateOptions = {
  writeRaw?: (raw: string) => Promise<boolean>;
};

export const savePortablePathAuditSinkStartupHealthState = async (
  state: PortablePathAuditSinkStartupHealthState,
  options: SavePortablePathAuditSinkStartupHealthStateOptions = {}
): Promise<boolean> => {
  const serialized = stringifyPortablePathAuditSinkStartupHealthStateEnvelope(state);
  if (!serialized) return false;
  const writeRaw =
    options.writeRaw ??
    (async (raw: string): Promise<boolean> =>
      writeSettingsRawByProviderPriority(
        PORTABLE_PATH_AUDIT_SINK_STARTUP_HEALTH_STATE_SETTINGS_KEY,
        raw
      ));
  return writeRaw(serialized);
};

export type {
  EnqueuePortablePathAuditSinkAutoRemediationDeadLetterOptions,
  LoadPortablePathAuditSinkAutoRemediationDeadLettersOptions,
  SavePortablePathAuditSinkAutoRemediationDeadLettersOptions,
  PortablePathAuditSinkAutoRemediationNotificationChannel,
  PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature,
};

export const loadPortablePathAuditSinkAutoRemediationDeadLetters = async (
  options: LoadPortablePathAuditSinkAutoRemediationDeadLettersOptions = {}
): Promise<PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[]> => {
  const maxEntries = resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries(
    options.maxEntries
  );
  const readRaw =
    options.readRaw ??
    (async (): Promise<string | null> =>
      readSettingsRawByProviderPriority(
        PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_SETTINGS_KEY
      ));
  return loadPortablePathAuditSinkAutoRemediationDeadLettersCore({
    maxEntries,
    readRaw,
  });
};

export const savePortablePathAuditSinkAutoRemediationDeadLetters = async (
  entries: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[],
  options: SavePortablePathAuditSinkAutoRemediationDeadLettersOptions = {}
): Promise<boolean> => {
  const maxEntries = resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries(
    options.maxEntries
  );
  const writeRaw =
    options.writeRaw ??
    (async (raw: string): Promise<boolean> =>
      writeSettingsRawByProviderPriority(
        PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_SETTINGS_KEY,
        raw
      ));
  return savePortablePathAuditSinkAutoRemediationDeadLettersCore(entries, {
    maxEntries,
    writeRaw,
  });
};

export const enqueuePortablePathAuditSinkAutoRemediationDeadLetter = async (
  entry: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  options: EnqueuePortablePathAuditSinkAutoRemediationDeadLetterOptions = {}
): Promise<boolean> => {
  const maxEntries = resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries(
    options.maxEntries
  );
  const readRaw =
    options.readRaw ??
    (async (): Promise<string | null> =>
      readSettingsRawByProviderPriority(
        PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_SETTINGS_KEY
      ));
  const writeRaw =
    options.writeRaw ??
    (async (raw: string): Promise<boolean> =>
      writeSettingsRawByProviderPriority(
        PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_SETTINGS_KEY,
        raw
      ));
  return enqueuePortablePathAuditSinkAutoRemediationDeadLetterCore(entry, {
    maxEntries,
    readRaw,
    writeRaw,
  });
};

export type {
  NotifyPortablePathAuditSinkAutoRemediationOptions,
  PortablePathAuditSinkAutoRemediationAction,
  PortablePathAuditSinkAutoRemediationNotificationChannelResult,
  PortablePathAuditSinkAutoRemediationNotificationInput,
  PortablePathAuditSinkAutoRemediationNotificationReceipt,
  PortablePathAuditSinkAutoRemediationNotificationResult,
};

export type PortablePathAuditSinkAutoRemediationThrottleReason =
  | 'cooldown'
  | 'rate_limited'
  | null;

export type PortablePathAuditSinkAutoRemediationResult = {
  enabled: boolean;
  threshold: number;
  strategy: PortablePathAuditSinkAutoRemediationStrategy;
  cooldownSeconds: number;
  rateLimitWindowSeconds: number;
  rateLimitMaxActions: number;
  throttled: boolean;
  throttleReason: PortablePathAuditSinkAutoRemediationThrottleReason;
  triggered: boolean;
  action: PortablePathAuditSinkAutoRemediationAction;
  notification: PortablePathAuditSinkAutoRemediationNotificationResult | null;
  state: PortablePathAuditSinkStartupHealthState;
};

export type RunPortablePathAuditSinkAutoRemediationOptions = {
  enabled?: boolean;
  threshold?: number;
  strategy?: PortablePathAuditSinkAutoRemediationStrategy;
  cooldownSeconds?: number;
  rateLimitWindowSeconds?: number;
  rateLimitMaxActions?: number;
  unregisterAll?: () => void;
  activateLogOnlyMode?: () => void;
  notify?: (
    input: PortablePathAuditSinkAutoRemediationNotificationInput
  ) => Promise<PortablePathAuditSinkAutoRemediationNotificationResult>;
  now?: string | Date;
  writeLog?: (input: SystemLogInput) => Promise<void>;
  loadState?: () => Promise<PortablePathAuditSinkStartupHealthState>;
  saveState?: (state: PortablePathAuditSinkStartupHealthState) => Promise<boolean>;
};

const NOTIFY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEPS: NotifyPortablePathAuditSinkAutoRemediationDeps =
  {
    resolveTimeoutMs: resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMs,
    defaultFetch: fetch,
    defaultWriteLog: logSystemEvent,
    toErrorMessage,
    logSource: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
    logService: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
    logCategory: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
    logKind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  };

export const notifyPortablePathAuditSinkAutoRemediation = async (
  input: PortablePathAuditSinkAutoRemediationNotificationInput,
  options: NotifyPortablePathAuditSinkAutoRemediationOptions = {}
): Promise<PortablePathAuditSinkAutoRemediationNotificationResult> => {
  const deadLetterMaxEntries = resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries(
    options.deadLetterMaxEntries
  );
  const enqueueDeadLetter =
    options.enqueueDeadLetter ??
    (async (
      entry: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry
    ): Promise<boolean> =>
      enqueuePortablePathAuditSinkAutoRemediationDeadLetter(entry, {
        maxEntries: deadLetterMaxEntries,
        readRaw: options.deadLetterReadRaw,
        writeRaw: options.deadLetterWriteRaw,
      }));
  return notifyPortablePathAuditSinkAutoRemediationCore(
    input,
    {
      ...options,
      enqueueDeadLetter,
    },
    NOTIFY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEPS
  );
};

export type {
  PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt,
  PortablePathAuditSinkAutoRemediationDeadLetterReplayResult,
  ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions,
};

const REPLAY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTERS_DEPS: ReplayPortablePathAuditSinkAutoRemediationDeadLettersDeps =
  {
    resolveReplayLimit: resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayLimit,
    resolveReplayWindowSeconds:
      resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSeconds,
    resolveTimeoutMs: resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMs,
    resolveMaxEntries: resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries,
    normalizeEndpoint: normalizePortablePathAuditSinkAutoRemediationEndpoint,
    normalizeEndpointAllowlist:
      normalizePortablePathAuditSinkAutoRemediationEndpointAllowlist,
    loadDeadLetters: ({ maxEntries, readRaw }) =>
      loadPortablePathAuditSinkAutoRemediationDeadLetters({ maxEntries, readRaw }),
    saveDeadLetters: (entries, { maxEntries, writeRaw }) =>
      savePortablePathAuditSinkAutoRemediationDeadLetters(entries, { maxEntries, writeRaw }),
    defaultWriteLog: logSystemEvent,
    toErrorMessage,
    logSource: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
    logService: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
    logCategory: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
    logKind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  };

export const replayPortablePathAuditSinkAutoRemediationDeadLetters = async (
  options: ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions = {}
): Promise<PortablePathAuditSinkAutoRemediationDeadLetterReplayResult> =>
  replayPortablePathAuditSinkAutoRemediationDeadLettersCore(
    options,
    REPLAY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTERS_DEPS
  );
const toEpochMs = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const runPortablePathAuditSinkAutoRemediation = async (
  summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
  options: RunPortablePathAuditSinkAutoRemediationOptions = {}
): Promise<PortablePathAuditSinkAutoRemediationResult> => {
  const enabled = options.enabled ?? true;
  const threshold = resolvePortablePathAuditSinkAutoRemediationThreshold(options.threshold);
  const strategy = options.strategy ?? 'unregister_all';
  const cooldownSeconds = resolvePortablePathAuditSinkAutoRemediationCooldownSeconds(
    options.cooldownSeconds
  );
  const rateLimitWindowSeconds =
    resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSeconds(
      options.rateLimitWindowSeconds
    );
  const rateLimitMaxActions = resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActions(
    options.rateLimitMaxActions
  );
  const writeLog = options.writeLog ?? logSystemEvent;
  const loadState = options.loadState ?? loadPortablePathAuditSinkStartupHealthState;
  const saveState = options.saveState ?? savePortablePathAuditSinkStartupHealthState;
  const nowDate =
    options.now instanceof Date
      ? options.now
      : typeof options.now === 'string'
        ? new Date(options.now)
        : new Date();
  const now = Number.isNaN(nowDate.getTime()) ? new Date().toISOString() : nowDate.toISOString();
  const nowMs = Date.parse(now);
  const previousState = await loadState();
  const state: PortablePathAuditSinkStartupHealthState = {
    ...previousState,
    lastStatus: summary.status,
  };
  let throttled = false;
  let throttleReason: PortablePathAuditSinkAutoRemediationThrottleReason = null;
  let notification: PortablePathAuditSinkAutoRemediationNotificationResult | null = null;

  if (summary.status === 'healthy' || summary.status === 'skipped') {
    state.consecutiveFailureCount = 0;
    state.lastRecoveredAt = now;
    state.lastFailedSinkIds = [];
    state.lastRemediationSkippedAt = null;
    state.lastRemediationSkippedReason = null;
    await saveState(state);
    return {
      enabled,
      threshold,
      strategy,
      cooldownSeconds,
      rateLimitWindowSeconds,
      rateLimitMaxActions,
      throttled,
      throttleReason,
      triggered: false,
      action: 'none',
      notification,
      state,
    };
  }

  state.consecutiveFailureCount = Math.max(0, state.consecutiveFailureCount) + 1;
  state.lastFailureAt = now;
  state.lastFailedSinkIds = [...summary.failedSinkIds];
  let triggered = false;
  let action: PortablePathAuditSinkAutoRemediationAction = 'none';
  const rateLimitEnabled = rateLimitWindowSeconds > 0 && rateLimitMaxActions > 0;

  if (enabled && state.consecutiveFailureCount >= threshold) {
    const lastRemediatedAtMs = toEpochMs(state.lastRemediatedAt);
    const inCooldown =
      cooldownSeconds > 0 &&
      lastRemediatedAtMs !== null &&
      nowMs - lastRemediatedAtMs < cooldownSeconds * 1000;
    if (inCooldown) {
      throttled = true;
      throttleReason = 'cooldown';
    }

    if (!throttled && rateLimitEnabled) {
      const previousWindowStartedAtMs = toEpochMs(state.remediationWindowStartedAt);
      const isWindowExpired =
        previousWindowStartedAtMs === null ||
        nowMs - previousWindowStartedAtMs >= rateLimitWindowSeconds * 1000;
      if (isWindowExpired) {
        state.remediationWindowStartedAt = now;
        state.remediationWindowActionCount = 0;
      }
      if (state.remediationWindowActionCount >= rateLimitMaxActions) {
        throttled = true;
        throttleReason = 'rate_limited';
      }
    }

    if (throttled) {
      state.lastRemediationSkippedAt = now;
      state.lastRemediationSkippedReason = throttleReason;
      await writeLog({
        level: 'warn',
        source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
        service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
        message:
          'Portable envelope verification audit sink auto-remediation skipped due to throttle policy.',
        context: {
          category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
          kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
          alertType: 'portable_audit_sink_auto_remediation_throttled',
          throttleReason,
          cooldownSeconds,
          rateLimitWindowSeconds,
          rateLimitMaxActions,
          consecutiveFailureCount: state.consecutiveFailureCount,
        },
      });
    } else if (strategy === 'unregister_all') {
      options.unregisterAll?.();
      triggered = true;
      action = 'unregister_all';
    } else if (strategy === 'degrade_to_log_only') {
      if (options.activateLogOnlyMode) {
        options.activateLogOnlyMode();
        triggered = true;
        action = 'degrade_to_log_only';
      } else {
        options.unregisterAll?.();
        triggered = true;
        action = 'unregister_all';
      }
    } else {
      triggered = false;
      action = 'none';
    }
    if (triggered) {
      if (rateLimitEnabled) {
        const previousWindowStartedAtMs = toEpochMs(state.remediationWindowStartedAt);
        if (
          previousWindowStartedAtMs === null ||
          nowMs - previousWindowStartedAtMs >= rateLimitWindowSeconds * 1000
        ) {
          state.remediationWindowStartedAt = now;
          state.remediationWindowActionCount = 0;
        }
        state.remediationWindowActionCount = Math.max(0, state.remediationWindowActionCount) + 1;
      }
      state.remediationCount = Math.max(0, state.remediationCount) + 1;
      state.lastRemediatedAt = now;
      state.lastRemediationSkippedAt = null;
      state.lastRemediationSkippedReason = null;
      await writeLog({
        level: 'error',
        source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
        service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
        message:
          'Portable envelope verification audit sink auto-remediation triggered after repeated startup failures.',
        context: {
          category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
          kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
          alertType: 'portable_audit_sink_auto_remediation',
          strategy,
          threshold,
          consecutiveFailureCount: state.consecutiveFailureCount,
          failedSinkIds: summary.failedSinkIds,
          action,
        },
      });
      if (options.notify) {
        try {
          notification = await options.notify({
            summary,
            strategy,
            action,
            threshold,
            cooldownSeconds,
            rateLimitWindowSeconds,
            rateLimitMaxActions,
            state,
          });
        } catch (error) {
          await writeLog({
            level: 'warn',
            source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
            service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
            message: 'Portable audit sink auto-remediation notification dispatch failed.',
            context: {
              category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
              kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
              alertType: 'portable_audit_sink_auto_remediation_notification_failed',
              error: toErrorMessage(error),
            },
          });
        }
      }
    }
  }

  await saveState(state);
  return {
    enabled,
    threshold,
    strategy,
    cooldownSeconds,
    rateLimitWindowSeconds,
    rateLimitMaxActions,
    throttled,
    throttleReason,
    triggered,
    action,
    notification,
    state,
  };
};

export type BootstrapPortablePathEnvelopeVerificationAuditSinksOptions = {
  profile?: PortablePathEnvelopeVerificationAuditSinkProfile;
  clearExisting?: boolean;
  includeLogForwarding?: boolean;
  includePrisma?: boolean;
  includeMongo?: boolean;
  logForwarding?: Omit<
    CreatePortablePathEnvelopeVerificationLogForwardingSinkOptions,
    'id'
  > & { id?: string };
  prisma?: Omit<CreatePortablePathEnvelopeVerificationPrismaSinkOptions, 'id'> & {
    id?: string;
  };
  mongo?: Omit<CreatePortablePathEnvelopeVerificationMongoSinkOptions, 'id'> & {
    id?: string;
  };
};

export type RunPortablePathEnvelopeVerificationAuditSinkStartupHealthChecksOptions = {
  policy?: PortablePathEnvelopeVerificationAuditSinkHealthPolicy;
  timeoutMs?: number;
  emitSystemLog?: boolean;
};

export type BootstrapPortablePathEnvelopeVerificationAuditSinksResult = {
  profile: PortablePathEnvelopeVerificationAuditSinkProfile;
  registeredSinkIds: string[];
  runStartupHealthChecks: (
    options?: RunPortablePathEnvelopeVerificationAuditSinkStartupHealthChecksOptions
  ) => Promise<PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary>;
  unregisterAll: () => void;
};

export const bootstrapPortablePathEnvelopeVerificationAuditSinks = (
  options: BootstrapPortablePathEnvelopeVerificationAuditSinksOptions = {}
): BootstrapPortablePathEnvelopeVerificationAuditSinksResult => {
  const profile =
    options.profile ??
    resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment();
  const defaults = resolveDefaultProfileInclusion(profile);
  const includeLogForwarding = applyBooleanOverride(
    defaults.includeLogForwarding,
    options.includeLogForwarding
  );
  const includePrisma = applyBooleanOverride(
    defaults.includePrisma,
    options.includePrisma
  );
  const includeMongo = applyBooleanOverride(defaults.includeMongo, options.includeMongo);
  const clearExisting = options.clearExisting !== false;

  if (clearExisting) {
    const existingSinkIds = listPortablePathEnvelopeVerificationAuditSinkIds();
    for (const sinkId of existingSinkIds) {
      unregisterPortablePathEnvelopeVerificationAuditSink(sinkId);
    }
  }

  const unregisterCallbacks: Array<() => void> = [];
  const registeredSinkIds: string[] = [];
  const healthChecksBySinkId = new Map<
    string,
    PortablePathEnvelopeVerificationAuditSinkHealthCheck
  >();
  const register = (sink: PortablePathEnvelopeVerificationAuditSinkWithHealthCheck): void => {
    const unregister = registerPortablePathEnvelopeVerificationAuditSink(sink);
    unregisterCallbacks.push(unregister);
    registeredSinkIds.push(sink.id);
    if (typeof sink.healthCheck === 'function') {
      healthChecksBySinkId.set(sink.id, sink.healthCheck);
    }
  };

  try {
    if (includeLogForwarding) {
      register(
        createPortablePathEnvelopeVerificationLogForwardingSink({
          ...(options.logForwarding ?? {}),
        })
      );
    }
    if (includePrisma) {
      register(
        createPortablePathEnvelopeVerificationPrismaSink({
          ...(options.prisma ?? {}),
        })
      );
    }
    if (includeMongo) {
      register(
        createPortablePathEnvelopeVerificationMongoSink({
          ...(options.mongo ?? {}),
        })
      );
    }
  } catch (error) {
    for (const unregister of [...unregisterCallbacks].reverse()) {
      try {
        unregister();
      } catch {
        // Best-effort rollback; surfacing original registration error.
      }
    }
    throw error;
  }

  return {
    profile,
    registeredSinkIds: [...registeredSinkIds],
    runStartupHealthChecks: async (
      healthOptions: RunPortablePathEnvelopeVerificationAuditSinkStartupHealthChecksOptions = {}
    ): Promise<PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary> => {
      const policy = healthOptions.policy ?? 'warn';
      const timeoutMs = resolveHealthTimeoutMs(healthOptions.timeoutMs);
      const checkedAt = new Date().toISOString();
      if (policy === 'off') {
        const summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary = {
          profile,
          policy,
          timeoutMs,
          status: 'skipped',
          checkedAt,
          failedSinkIds: [],
          diagnostics: [],
        };
        if (healthOptions.emitSystemLog !== false) {
          await logSystemEvent(toStartupHealthSummaryLogInput(summary));
        }
        return summary;
      }

      const diagnostics = await Promise.all(
        registeredSinkIds.map(
          async (
            sinkId: string
          ): Promise<PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic> => {
            const startedAt = Date.now();
            const healthCheck = healthChecksBySinkId.get(sinkId);
            if (!healthCheck) {
              return {
                sinkId,
                status: 'skipped',
                checkedAt: new Date().toISOString(),
                durationMs: Date.now() - startedAt,
                message: 'No health check is registered for this sink.',
                error: null,
              };
            }
            try {
              await runWithTimeout(sinkId, timeoutMs, healthCheck);
              return {
                sinkId,
                status: 'healthy',
                checkedAt: new Date().toISOString(),
                durationMs: Date.now() - startedAt,
                message: 'Health check passed.',
                error: null,
              };
            } catch (error) {
              return {
                sinkId,
                status: 'failed',
                checkedAt: new Date().toISOString(),
                durationMs: Date.now() - startedAt,
                message: 'Health check failed.',
                error: toErrorMessage(error),
              };
            }
          }
        )
      );

      const failedSinkIds = diagnostics
        .filter((entry: PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic): boolean => {
          return entry.status === 'failed';
        })
        .map((entry: PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic): string => {
          return entry.sinkId;
        });
      let status: PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus = 'healthy';
      if (diagnostics.length === 0) {
        status = 'skipped';
      } else if (failedSinkIds.length > 0) {
        status = policy === 'error' ? 'failed' : 'degraded';
      }

      const summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary = {
        profile,
        policy,
        timeoutMs,
        status,
        checkedAt,
        failedSinkIds,
        diagnostics,
      };

      if (healthOptions.emitSystemLog !== false) {
        await logSystemEvent(toStartupHealthSummaryLogInput(summary));
      }
      if (summary.status === 'failed') {
        throw new Error(
          `Portable envelope verification audit sink startup health checks failed for sinks: ${summary.failedSinkIds.join(
            ', '
          )}.`
        );
      }
      return summary;
    },
    unregisterAll: () => {
      for (const unregister of [...unregisterCallbacks].reverse()) {
        try {
          unregister();
        } catch {
          // Best-effort unregister.
        }
      }
    },
  };
};

export type BootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecksOptions =
  BootstrapPortablePathEnvelopeVerificationAuditSinksOptions & {
    healthChecks?: RunPortablePathEnvelopeVerificationAuditSinkStartupHealthChecksOptions;
  };

export type BootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecksResult =
  BootstrapPortablePathEnvelopeVerificationAuditSinksResult & {
    startupHealthSummary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary;
  };

export const bootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecks = async (
  options: BootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecksOptions = {}
): Promise<BootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecksResult> => {
  const { healthChecks, ...bootstrapOptions } = options;
  const bootstrap = bootstrapPortablePathEnvelopeVerificationAuditSinks(bootstrapOptions);
  try {
    const startupHealthSummary = await bootstrap.runStartupHealthChecks(healthChecks);
    return {
      ...bootstrap,
      startupHealthSummary,
    };
  } catch (error) {
    bootstrap.unregisterAll();
    throw error;
  }
};

export type BootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironmentOptions = {
  env?: Record<string, string | undefined>;
  emitSystemLog?: boolean;
};

export type BootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironmentResult = {
  enabled: boolean;
  profile: PortablePathEnvelopeVerificationAuditSinkProfile;
  healthPolicy: PortablePathEnvelopeVerificationAuditSinkHealthPolicy;
  healthTimeoutMs: number | null;
  startupHealthSummary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary | null;
  autoRemediation: PortablePathAuditSinkAutoRemediationResult | null;
  unregisterAll: () => void;
};

export const bootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironment = async (
  options: BootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironmentOptions = {}
): Promise<BootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironmentResult> => {
  const env = options.env ?? process.env;
  const enabled =
    parseBooleanFromEnvironment(env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_ENABLED_ENV]) ??
    true;
  const profile =
    resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment(
      env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILE_ENV]
    ) ??
    resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment(env['NODE_ENV']);
  const healthPolicy =
    resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment(
      env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICY_ENV]
    ) ?? 'warn';
  const healthTimeoutMs = resolvePortablePathEnvelopeVerificationAuditSinkHealthTimeoutMsFromEnvironment(
    env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS_ENV]
  );
  const autoRemediationEnabled =
    resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_ENABLED_ENV]
    ) ?? true;
  const autoRemediationThreshold =
    resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD_ENV]
    );
  const autoRemediationStrategy =
    resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGY_ENV]
    ) ?? resolveDefaultPortablePathAuditSinkAutoRemediationStrategyByProfile(profile);
  const autoRemediationCooldownSeconds =
    resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS_ENV]
    );
  const autoRemediationRateLimitWindowSeconds =
    resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS_ENV]
    );
  const autoRemediationRateLimitMaxActions =
    resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS_ENV]
    );
  const autoRemediationNotificationsEnabled =
    resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATIONS_ENABLED_ENV]
    ) ?? true;
  const autoRemediationWebhookUrl =
    resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_URL_ENV]
    );
  const autoRemediationEmailWebhookUrl =
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_URL_ENV]
    );
  const autoRemediationEmailRecipients =
    resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_RECIPIENTS_ENV]
    );
  const autoRemediationNotificationTimeoutMs =
    resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS_ENV]
    );
  const autoRemediationWebhookSecret =
    resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SECRET_ENV]
    );
  const autoRemediationWebhookSignatureKeyId =
    resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SIGNATURE_KEY_ID_ENV]
    );
  const autoRemediationEmailWebhookSecret =
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SECRET_ENV]
    );
  const autoRemediationEmailWebhookSignatureKeyId =
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SIGNATURE_KEY_ID_ENV]
    );
  const autoRemediationDeadLetterMaxEntries =
    resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES_ENV]
    );

  if (!enabled) {
    if (options.emitSystemLog !== false) {
      await logSystemEvent({
        level: 'info',
        source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
        service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
        message: 'Portable envelope verification audit sink bootstrap disabled by environment.',
        context: {
          category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
          kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
          enabled: false,
          profile,
          policy: healthPolicy,
        },
      });
    }
    return {
      enabled: false,
      profile,
      healthPolicy,
      healthTimeoutMs,
      startupHealthSummary: null,
      autoRemediation: null,
      unregisterAll: () => {},
    };
  }

  const bootstrapped = await bootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecks({
    profile,
    healthChecks: {
      policy: healthPolicy,
      timeoutMs: healthTimeoutMs ?? undefined,
      emitSystemLog: options.emitSystemLog,
    },
  });
  const remediationUnregisterCallbacks: Array<() => void> = [];
  const unregisterAll = (): void => {
    for (const unregister of [...remediationUnregisterCallbacks].reverse()) {
      try {
        unregister();
      } catch {
        // Best-effort unregister for remediation replacement sinks.
      }
    }
    remediationUnregisterCallbacks.length = 0;
    bootstrapped.unregisterAll();
  };
  const autoRemediation = await runPortablePathAuditSinkAutoRemediation(
    bootstrapped.startupHealthSummary,
    {
      enabled: autoRemediationEnabled,
      threshold: autoRemediationThreshold ?? undefined,
      strategy: autoRemediationStrategy,
      cooldownSeconds: autoRemediationCooldownSeconds ?? undefined,
      rateLimitWindowSeconds: autoRemediationRateLimitWindowSeconds ?? undefined,
      rateLimitMaxActions: autoRemediationRateLimitMaxActions ?? undefined,
      unregisterAll,
      activateLogOnlyMode: () => {
        unregisterAll();
        const unregisterLogOnlySink = registerPortablePathEnvelopeVerificationAuditSink(
          createPortablePathEnvelopeVerificationLogForwardingSink()
        );
        remediationUnregisterCallbacks.push(unregisterLogOnlySink);
      },
      notify: async (notificationInput) =>
        notifyPortablePathAuditSinkAutoRemediation(notificationInput, {
          enabled: autoRemediationNotificationsEnabled,
          webhookUrl: autoRemediationWebhookUrl,
          webhookSecret: autoRemediationWebhookSecret,
          webhookSignatureKeyId: autoRemediationWebhookSignatureKeyId,
          emailWebhookUrl: autoRemediationEmailWebhookUrl,
          emailWebhookSecret: autoRemediationEmailWebhookSecret,
          emailWebhookSignatureKeyId: autoRemediationEmailWebhookSignatureKeyId,
          emailRecipients: autoRemediationEmailRecipients,
          timeoutMs: autoRemediationNotificationTimeoutMs ?? undefined,
          deadLetterMaxEntries: autoRemediationDeadLetterMaxEntries ?? undefined,
        }),
    }
  );
  return {
    enabled: true,
    profile,
    healthPolicy,
    healthTimeoutMs,
    startupHealthSummary: bootstrapped.startupHealthSummary,
    autoRemediation,
    unregisterAll,
  };
};
