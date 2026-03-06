import 'server-only';

import prisma from '@/shared/lib/db/prisma';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent, type SystemLogInput } from '@/shared/lib/observability/system-logger';

import {
  getPortablePathEnvelopeVerificationAuditSinkSnapshot,
  getPortablePathSigningPolicyUsageSnapshot,
  listPortablePathEnvelopeVerificationAuditSinkIds,
  registerPortablePathSigningPolicyUsageHook,
  registerPortablePathEnvelopeVerificationAuditSink,
  unregisterPortablePathEnvelopeVerificationAuditSink,
  type PortablePathEnvelopeVerificationAuditEvent,
  type PortablePathEnvelopeVerificationAuditSinkSnapshot,
  type PortablePathEnvelopeVerificationAuditSink,
  type PortablePathEnvelopeVerificationObservabilitySnapshot,
  type PortablePathSigningPolicyProfile,
  type PortablePathSigningPolicySurface,
  type PortablePathSigningPolicyUsageSnapshot,
} from './index';
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


export const resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment = (
  nodeEnv: string | undefined = process.env['NODE_ENV']
): PortablePathEnvelopeVerificationAuditSinkProfile => {
  return normalizePortablePathEnvelopeVerificationAuditSinkProfile(nodeEnv) ?? 'dev';
};

export const resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment = (
  profile = process.env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILE_ENV]
): PortablePathEnvelopeVerificationAuditSinkProfile | null =>
  normalizePortablePathEnvelopeVerificationAuditSinkProfile(profile);

export const resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment = (
  value = process.env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICY_ENV]
): PortablePathEnvelopeVerificationAuditSinkHealthPolicy | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'off') return 'off';
  if (normalized === 'warn' || normalized === 'warning') return 'warn';
  if (normalized === 'error' || normalized === 'strict') return 'error';
  return null;
};

const parseBooleanFromEnvironment = (value: string | undefined): boolean | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized.length === 0) return null;
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return null;
};

export const resolvePortablePathEnvelopeVerificationAuditSinkHealthTimeoutMsFromEnvironment = (
  value = process.env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS_ENV]
): number | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return resolveHealthTimeoutMs(numeric);
};

const PORTABLE_PATH_SIGNING_POLICY_SURFACES = ['canvas', 'product', 'api'] as const;
const PORTABLE_PATH_SIGNING_POLICY_PROFILES = ['dev', 'staging', 'prod'] as const;
const DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES = 20;

export type PortablePathSigningPolicyExpectedProfilesBySurface = Record<
  PortablePathSigningPolicySurface,
  PortablePathSigningPolicyProfile[]
>;

export type PortablePathSigningPolicyDriftAlert = {
  surface: PortablePathSigningPolicySurface;
  profile: PortablePathSigningPolicyProfile;
  observedUses: number;
  allowedProfiles: PortablePathSigningPolicyProfile[];
};

type PortablePathSigningPolicyTrendReportTrigger = 'threshold' | 'manual';

type PortablePathSigningPolicyTrendSnapshotEnvelope = {
  version: 1;
  updatedAt: string;
  entries: PortablePathSigningPolicyTrendPersistedSnapshot[];
};

export type PortablePathSigningPolicyTrendPersistedSnapshot = {
  at: string;
  trigger: PortablePathSigningPolicyTrendReportTrigger;
  reportEveryUses: number;
  usageTotals: PortablePathSigningPolicyUsageSnapshot['totals'];
  usageBySurface: PortablePathSigningPolicyUsageSnapshot['bySurface'];
  usageByProfile: PortablePathSigningPolicyUsageSnapshot['byProfile'];
  sinkTotals: PortablePathEnvelopeVerificationAuditSinkSnapshot['totals'];
  sinkRegisteredIds: string[];
  sinkRecentFailures: PortablePathEnvelopeVerificationAuditSinkSnapshot['recentFailures'];
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface;
  driftAlerts: PortablePathSigningPolicyDriftAlert[];
};

type PortablePathSigningPolicyTrendStoreReadRaw = () => Promise<string | null>;
type PortablePathSigningPolicyTrendStoreWriteRaw = (raw: string) => Promise<boolean>;

type PortablePathSigningPolicyTrendStoreSettingRecord = {
  _id?: string;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

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

const dedupePortablePathSigningPolicyProfiles = (
  profiles: readonly PortablePathSigningPolicyProfile[]
): PortablePathSigningPolicyProfile[] => {
  const deduped: PortablePathSigningPolicyProfile[] = [];
  for (const profile of profiles) {
    if (!deduped.includes(profile)) deduped.push(profile);
  }
  return deduped;
};

const coercePortablePathSigningPolicyReportEveryUses = (value: number | null | undefined): number => {
  if (!Number.isFinite(value)) return DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES;
  return Math.max(1, Math.floor(Number(value)));
};

const DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS = 200;
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

const resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) return DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS;
  const normalized = Math.floor(Number(value));
  if (normalized <= 0) return DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS;
  return Math.min(normalized, 1000);
};

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

const createDefaultPortablePathSigningPolicyExpectedProfilesBySurface = (
  environmentProfile: PortablePathSigningPolicyProfile
): PortablePathSigningPolicyExpectedProfilesBySurface => {
  switch (environmentProfile) {
    case 'prod':
      return {
        canvas: ['prod'],
        product: ['prod'],
        api: ['prod'],
      };
    case 'staging':
      return {
        canvas: ['staging', 'prod'],
        product: ['staging', 'prod'],
        api: ['staging', 'prod'],
      };
    case 'dev':
    default:
      return {
        canvas: ['dev', 'staging', 'prod'],
        product: ['dev', 'staging', 'prod'],
        api: ['dev', 'staging', 'prod'],
      };
  }
};

const normalizePortablePathSigningPolicyExpectedProfilesBySurface = (
  override: Partial<Record<PortablePathSigningPolicySurface, PortablePathSigningPolicyProfile[]>> | undefined,
  environmentProfile: PortablePathSigningPolicyProfile
): PortablePathSigningPolicyExpectedProfilesBySurface => {
  const defaults =
    createDefaultPortablePathSigningPolicyExpectedProfilesBySurface(environmentProfile);
  const resolved: PortablePathSigningPolicyExpectedProfilesBySurface = {
    canvas: defaults.canvas,
    product: defaults.product,
    api: defaults.api,
  };
  for (const surface of PORTABLE_PATH_SIGNING_POLICY_SURFACES) {
    const candidate = override?.[surface];
    if (!candidate || candidate.length === 0) continue;
    resolved[surface] = dedupePortablePathSigningPolicyProfiles(candidate);
  }
  return resolved;
};

const normalizePortablePathSigningPolicyProfile = (
  value: string
): PortablePathSigningPolicyProfile | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'dev' || normalized === 'development' || normalized === 'local') {
    return 'dev';
  }
  if (normalized === 'staging' || normalized === 'stage' || normalized === 'preprod') {
    return 'staging';
  }
  if (normalized === 'prod' || normalized === 'production') {
    return 'prod';
  }
  return null;
};

const parsePortablePathSigningPolicyExpectedProfilesBySurfaceFromEnvironment = (
  value: string | undefined,
  environmentProfile: PortablePathSigningPolicyProfile
): PortablePathSigningPolicyExpectedProfilesBySurface => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return createDefaultPortablePathSigningPolicyExpectedProfilesBySurface(environmentProfile);
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return createDefaultPortablePathSigningPolicyExpectedProfilesBySurface(environmentProfile);
    }
    const record = parsed as Record<string, unknown>;
    const override: Partial<Record<PortablePathSigningPolicySurface, PortablePathSigningPolicyProfile[]>> =
      {};
    for (const surface of PORTABLE_PATH_SIGNING_POLICY_SURFACES) {
      const raw = record[surface];
      if (!Array.isArray(raw)) continue;
      const normalized = raw
        .map((item): PortablePathSigningPolicyProfile | null => {
          if (typeof item !== 'string') return null;
          return normalizePortablePathSigningPolicyProfile(item);
        })
        .filter((item): item is PortablePathSigningPolicyProfile => item !== null);
      if (normalized.length > 0) {
        override[surface] = dedupePortablePathSigningPolicyProfiles(normalized);
      }
    }
    return normalizePortablePathSigningPolicyExpectedProfilesBySurface(
      override,
      environmentProfile
    );
  } catch {
    return createDefaultPortablePathSigningPolicyExpectedProfilesBySurface(environmentProfile);
  }
};

const resolvePortablePathSigningPolicyAlertLevel = (
  value: string | undefined | null
): PortablePathSigningPolicyAlertLevel | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'off' || normalized === '0' || normalized === 'false') return 'off';
  if (normalized === 'warn' || normalized === 'warning') return 'warn';
  if (normalized === 'error' || normalized === 'critical' || normalized === 'strict') return 'error';
  return null;
};

export const resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment = (
  value = process.env[PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV]
): PortablePathSigningPolicyAlertLevel | null =>
  resolvePortablePathSigningPolicyAlertLevel(value);

export const resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV]
): PortablePathSigningPolicyAlertLevel | null =>
  resolvePortablePathSigningPolicyAlertLevel(value);

export const resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment = (
  value = process.env[PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV]
): number | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return coercePortablePathSigningPolicyReportEveryUses(numeric);
};

export const resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment = (
  value = process.env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV]
): boolean | null => parseBooleanFromEnvironment(value);

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

export const resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment = (
  value = process.env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV]
): number | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots(numeric);
};

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

const canUsePrismaSettings = (): boolean => Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;
