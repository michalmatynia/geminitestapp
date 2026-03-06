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
  type PortablePathSigningPolicyUsageSnapshot,
} from './index';
import type {
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
  PortablePathEnvelopeVerificationAuditSinkProfile,
  PortablePathEnvelopeVerificationAuditSinkHealthPolicy,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus,
  PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
  PortablePathAuditSinkStartupHealthState,
  PortablePathAuditSinkAutoRemediationStrategy,
} from './types';
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

export * from './sinks-base.server';

export const resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment = (
  value = process.env[PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV]
): PortablePathSigningPolicyAlertLevel | null => resolvePortablePathSigningPolicyAlertLevel(value);

export const resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV]
): PortablePathSigningPolicyAlertLevel | null => resolvePortablePathSigningPolicyAlertLevel(value);

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

export const resolvePortablePathAuditSinkAutoRemediationStrategy = (
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

export const parseStringArrayFromEnvironment = (value: string | undefined): string[] | null => {
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

export const parseNumberFromEnvironment = (value: string | undefined): number | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
};

export const parseOptionalUrlFromEnvironment = (value: string | undefined): string | null => {
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

export const parseOptionalSecretFromEnvironment = (value: string | undefined): string | null => {
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

export const resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode = (
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

export const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

export type PrismaSettingClient = {
  setting?: {
    findUnique: (input: {
      where: { key: string };
      select: { value: true };
    }) => Promise<{ value: string } | null>;
    upsert: (input: {
      where: { key: string };
      create: { key: string; value: string };
      update: { value: string };
    }) => Promise<unknown>;
  };
};

export const readSettingsRawFromPrisma = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  try {
    const prismaClient = prisma as unknown as PrismaSettingClient;
    if (!prismaClient.setting || typeof prismaClient.setting.findUnique !== 'function') {
      return null;
    }
    const setting = await prismaClient.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  } catch {
    return null;
  }
};

export const writeSettingsRawToPrisma = async (key: string, raw: string): Promise<boolean> => {
  if (!canUsePrismaSettings()) return false;
  try {
    const prismaClient = prisma as unknown as PrismaSettingClient;
    if (!prismaClient.setting || typeof prismaClient.setting.upsert !== 'function') {
      return false;
    }
    await prismaClient.setting.upsert({
      where: { key },
      create: { key, value: raw },
      update: { value: raw },
    });
    return true;
  } catch {
    return false;
  }
};

export const readSettingsRawFromMongo = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const record = await mongo
      .collection<PortablePathSigningPolicyTrendStoreSettingRecord>('settings')
      .findOne(
        {
          $or: [{ _id: key }, { key }],
        },
        { projection: { value: 1 } }
      );
    return typeof record?.value === 'string' ? record.value : null;
  } catch {
    return null;
  }
};

export const writeSettingsRawToMongo = async (key: string, raw: string): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) return false;
  try {
    const mongo = await getMongoDb();
    const now = new Date();
    await mongo.collection<PortablePathSigningPolicyTrendStoreSettingRecord>('settings').updateOne(
      {
        $or: [{ _id: key }, { key }],
      },
      {
        $set: {
          key,
          value: raw,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: key,
          createdAt: now,
        },
      },
      { upsert: true }
    );
    return true;
  } catch {
    return false;
  }
};

export const readSettingsRawByProviderPriority = async (key: string): Promise<string | null> => {
  const provider = await Promise.resolve(getAppDbProvider()).catch(() => null);
  if (provider === 'mongodb') {
    const mongoRaw = await readSettingsRawFromMongo(key);
    if (mongoRaw !== null) return mongoRaw;
    return readSettingsRawFromPrisma(key);
  }
  const prismaRaw = await readSettingsRawFromPrisma(key);
  if (prismaRaw !== null) return prismaRaw;
  return readSettingsRawFromMongo(key);
};

export const writeSettingsRawByProviderPriority = async (key: string, raw: string): Promise<boolean> => {
  const provider = await Promise.resolve(getAppDbProvider()).catch(() => null);
  if (provider === 'mongodb') {
    const mongoOk = await writeSettingsRawToMongo(key, raw);
    if (mongoOk) return true;
    return writeSettingsRawToPrisma(key, raw);
  }
  const prismaOk = await writeSettingsRawToPrisma(key, raw);
  if (prismaOk) return true;
  return writeSettingsRawToMongo(key, raw);
};

export const readPortablePathSigningPolicyTrendRawByProviderPriority = async (): Promise<string | null> =>
  readSettingsRawByProviderPriority(PORTABLE_PATH_SIGNING_POLICY_TREND_SETTINGS_KEY);

export const writePortablePathSigningPolicyTrendRawByProviderPriority = async (
  raw: string
): Promise<boolean> =>
  writeSettingsRawByProviderPriority(PORTABLE_PATH_SIGNING_POLICY_TREND_SETTINGS_KEY, raw);

export const isPortablePathSigningPolicyTrendPersistedSnapshot = (
  value: unknown
): value is PortablePathSigningPolicyTrendPersistedSnapshot => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record['at'] !== 'string' || record['at'].trim().length === 0) return false;
  if (record['trigger'] !== 'threshold' && record['trigger'] !== 'manual') return false;
  return (
    typeof record['reportEveryUses'] === 'number' && Number.isFinite(record['reportEveryUses'])
  );
};

export const parsePortablePathSigningPolicyTrendSnapshotEnvelope = (
  raw: string | null,
  maxSnapshots: number
): PortablePathSigningPolicyTrendPersistedSnapshot[] => {
  if (typeof raw !== 'string' || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is PortablePathSigningPolicyTrendPersistedSnapshot =>
          isPortablePathSigningPolicyTrendPersistedSnapshot(item)
        )
        .slice(-maxSnapshots);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    const envelope = parsed as Partial<PortablePathSigningPolicyTrendSnapshotEnvelope> & {
      entries?: unknown;
    };
    if (!Array.isArray(envelope.entries)) return [];
    return envelope.entries
      .filter((item): item is PortablePathSigningPolicyTrendPersistedSnapshot =>
        isPortablePathSigningPolicyTrendPersistedSnapshot(item)
      )
      .slice(-maxSnapshots);
  } catch {
    return [];
  }
};

export const stringifyPortablePathSigningPolicyTrendSnapshotEnvelope = (
  snapshots: PortablePathSigningPolicyTrendPersistedSnapshot[],
  maxSnapshots: number
): string | null => {
  try {
    const envelope: PortablePathSigningPolicyTrendSnapshotEnvelope = {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: snapshots.slice(-maxSnapshots),
    };
    return JSON.stringify(envelope);
  } catch {
    return null;
  }
};

export type LoadPortablePathSigningPolicyTrendSnapshotsOptions = {
  maxSnapshots?: number;
  readRaw?: PortablePathSigningPolicyTrendStoreReadRaw;
};

export const loadPortablePathSigningPolicyTrendSnapshots = async (
  options: LoadPortablePathSigningPolicyTrendSnapshotsOptions = {}
): Promise<PortablePathSigningPolicyTrendPersistedSnapshot[]> => {
  const maxSnapshots = resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots(
    options.maxSnapshots
  );
  const readRaw = options.readRaw ?? readPortablePathSigningPolicyTrendRawByProviderPriority;
  const raw = await readRaw();
  return parsePortablePathSigningPolicyTrendSnapshotEnvelope(raw, maxSnapshots);
};

export type AppendPortablePathSigningPolicyTrendSnapshotOptions = {
  maxSnapshots?: number;
  readRaw?: PortablePathSigningPolicyTrendStoreReadRaw;
  writeRaw?: PortablePathSigningPolicyTrendStoreWriteRaw;
};

export const appendPortablePathSigningPolicyTrendSnapshot = async (
  snapshot: PortablePathSigningPolicyTrendPersistedSnapshot,
  options: AppendPortablePathSigningPolicyTrendSnapshotOptions = {}
): Promise<boolean> => {
  const maxSnapshots = resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots(
    options.maxSnapshots
  );
  const readRaw = options.readRaw ?? readPortablePathSigningPolicyTrendRawByProviderPriority;
  const writeRaw = options.writeRaw ?? writePortablePathSigningPolicyTrendRawByProviderPriority;
  const existing = parsePortablePathSigningPolicyTrendSnapshotEnvelope(
    await readRaw(),
    maxSnapshots
  );
  const serialized = stringifyPortablePathSigningPolicyTrendSnapshotEnvelope(
    [...existing, snapshot],
    maxSnapshots
  );
  if (!serialized) return false;
  return writeRaw(serialized);
};

export const parsePortablePathAuditSinkStartupHealthStateEnvelope = (
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

export const stringifyPortablePathAuditSinkStartupHealthStateEnvelope = (
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
      readSettingsRawByProviderPriority(
        PORTABLE_PATH_AUDIT_SINK_STARTUP_HEALTH_STATE_SETTINGS_KEY
      ));
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

export const toPortablePathSigningPolicyUsageSurfaceDelta = (
  current: PortablePathSigningPolicyUsageSnapshot,
  previous: PortablePathSigningPolicyUsageSnapshot,
  surface: PortablePathSigningPolicySurface
): number => Math.max(0, current.bySurface[surface] - previous.bySurface[surface]);

export const toPortablePathAuditSinkTotalsDelta = (
  current: PortablePathEnvelopeVerificationAuditSinkSnapshot,
  previous: PortablePathEnvelopeVerificationAuditSinkSnapshot
): {
  writesAttempted: number;
  writesSucceeded: number;
  writesFailed: number;
} => ({
  writesAttempted: Math.max(0, current.totals.writesAttempted - previous.totals.writesAttempted),
  writesSucceeded: Math.max(0, current.totals.writesSucceeded - previous.totals.writesSucceeded),
  writesFailed: Math.max(0, current.totals.writesFailed - previous.totals.writesFailed),
});

export const collectPortablePathSigningPolicyDriftAlerts = (
  snapshot: PortablePathSigningPolicyUsageSnapshot,
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface
): PortablePathSigningPolicyDriftAlert[] => {
  const alerts: PortablePathSigningPolicyDriftAlert[] = [];
  for (const surface of PORTABLE_PATH_SIGNING_POLICY_SURFACES) {
    const allowedProfiles = expectedProfilesBySurface[surface];
    for (const profile of PORTABLE_PATH_SIGNING_POLICY_PROFILES) {
      if (allowedProfiles.includes(profile)) continue;
      const observedUses = snapshot.byProfile[profile].bySurface[surface];
      if (observedUses <= 0) continue;
      alerts.push({
        surface,
        profile,
        observedUses,
        allowedProfiles,
      });
    }
  }
  return alerts;
};

export const toPortablePathSigningPolicyAlertLevel = (
  level: PortablePathSigningPolicyAlertLevel
): 'warn' | 'error' => (level === 'error' ? 'error' : 'warn');

export type CreatePortablePathSigningPolicyTrendReporterOptions = {
  reportEveryUses?: number;
  driftAlertLevel?: PortablePathSigningPolicyAlertLevel;
  sinkFailureAlertLevel?: PortablePathSigningPolicyAlertLevel;
  persistenceEnabled?: boolean;
  persistenceMaxSnapshots?: number;
  expectedProfilesBySurface?: Partial<
    Record<PortablePathSigningPolicySurface, PortablePathSigningPolicyProfile[]>
  >;
  environmentProfile?: PortablePathSigningPolicyProfile;
  writeLog?: (input: SystemLogInput) => Promise<void>;
  persistSnapshot?: (
    snapshot: PortablePathSigningPolicyTrendPersistedSnapshot,
    options: { maxSnapshots: number }
  ) => Promise<boolean>;
  getUsageSnapshot?: () => PortablePathSigningPolicyUsageSnapshot;
  getSinkSnapshot?: () => PortablePathEnvelopeVerificationAuditSinkSnapshot;
  subscribeUsageHook?: typeof registerPortablePathSigningPolicyUsageHook;
};

export type PortablePathSigningPolicyTrendReporterState = {
  reportEveryUses: number;
  reportsEmitted: number;
  driftAlertsEmitted: number;
  sinkFailureAlertsEmitted: number;
  persistenceWritesSucceeded: number;
  persistenceWritesFailed: number;
  lastReportedAt: string | null;
  lastUsageTotal: number;
  lastSinkFailureTotal: number;
};

export type PortablePathSigningPolicyTrendReporter = {
  reportNow: () => Promise<void>;
  stop: () => void;
  getState: () => PortablePathSigningPolicyTrendReporterState;
};

export const toPortablePathSigningPolicyTrendLogInput = (
  usageSnapshot: PortablePathSigningPolicyUsageSnapshot,
  usageBaseline: PortablePathSigningPolicyUsageSnapshot,
  sinkSnapshot: PortablePathEnvelopeVerificationAuditSinkSnapshot,
  sinkBaseline: PortablePathEnvelopeVerificationAuditSinkSnapshot,
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface,
  reportEveryUses: number,
  trigger: PortablePathSigningPolicyTrendReportTrigger
): SystemLogInput => ({
  level: 'info',
  source: PORTABLE_PATH_SIGNING_POLICY_TREND_SOURCE,
  service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  message: 'Portable signing policy usage trend snapshot.',
  context: {
    category: PORTABLE_PATH_SIGNING_POLICY_TREND_CATEGORY,
    kind: PORTABLE_PATH_SIGNING_POLICY_TREND_KIND,
    trigger,
    reportEveryUses,
    usageDelta: {
      uses: Math.max(0, usageSnapshot.totals.uses - usageBaseline.totals.uses),
      bySurface: {
        canvas: toPortablePathSigningPolicyUsageSurfaceDelta(
          usageSnapshot,
          usageBaseline,
          'canvas'
        ),
        product: toPortablePathSigningPolicyUsageSurfaceDelta(
          usageSnapshot,
          usageBaseline,
          'product'
        ),
        api: toPortablePathSigningPolicyUsageSurfaceDelta(usageSnapshot, usageBaseline, 'api'),
      },
    },
    usageTotals: usageSnapshot.totals,
    sinkTotals: sinkSnapshot.totals,
    sinkDelta: toPortablePathAuditSinkTotalsDelta(sinkSnapshot, sinkBaseline),
    expectedProfilesBySurface,
  },
});

export const toPortablePathSigningPolicyTrendPersistedSnapshot = (
  usageSnapshot: PortablePathSigningPolicyUsageSnapshot,
  sinkSnapshot: PortablePathEnvelopeVerificationAuditSinkSnapshot,
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface,
  reportEveryUses: number,
  trigger: PortablePathSigningPolicyTrendReportTrigger,
  driftAlerts: PortablePathSigningPolicyDriftAlert[]
): PortablePathSigningPolicyTrendPersistedSnapshot => ({
  at: new Date().toISOString(),
  trigger,
  reportEveryUses,
  usageTotals: usageSnapshot.totals,
  usageBySurface: usageSnapshot.bySurface,
  usageByProfile: usageSnapshot.byProfile,
  sinkTotals: sinkSnapshot.totals,
  sinkRegisteredIds: sinkSnapshot.registeredSinkIds,
  sinkRecentFailures: sinkSnapshot.recentFailures.slice(-20),
  expectedProfilesBySurface,
  driftAlerts,
});

export const createPortablePathSigningPolicyTrendReporter = (
  options: CreatePortablePathSigningPolicyTrendReporterOptions = {}
): PortablePathSigningPolicyTrendReporter => {
  const writeLog = options.writeLog ?? logSystemEvent;
  const getUsageSnapshot = options.getUsageSnapshot ?? getPortablePathSigningPolicyUsageSnapshot;
  const getSinkSnapshot =
    options.getSinkSnapshot ?? getPortablePathEnvelopeVerificationAuditSinkSnapshot;
  const subscribeUsageHook =
    options.subscribeUsageHook ?? registerPortablePathSigningPolicyUsageHook;
  const environmentProfile =
    options.environmentProfile ??
    resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment();
  const reportEveryUses = coercePortablePathSigningPolicyReportEveryUses(options.reportEveryUses);
  const driftAlertLevel = options.driftAlertLevel ?? 'warn';
  const sinkFailureAlertLevel = options.sinkFailureAlertLevel ?? 'warn';
  const persistenceEnabled = options.persistenceEnabled ?? true;
  const persistenceMaxSnapshots = resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots(
    options.persistenceMaxSnapshots
  );
  const persistSnapshot = options.persistSnapshot ?? appendPortablePathSigningPolicyTrendSnapshot;
  const expectedProfilesBySurface = normalizePortablePathSigningPolicyExpectedProfilesBySurface(
    options.expectedProfilesBySurface,
    environmentProfile
  );

  let usageBaseline = getUsageSnapshot();
  let sinkBaseline = getSinkSnapshot();
  let reportsEmitted = 0;
  let driftAlertsEmitted = 0;
  let sinkFailureAlertsEmitted = 0;
  let persistenceWritesSucceeded = 0;
  let persistenceWritesFailed = 0;
  let lastReportedAt: string | null = null;
  let lastSinkFailureAlertTotal = sinkBaseline.totals.writesFailed;
  const driftAlertCursor = new Map<string, number>();
  let disposed = false;

  const emitAlerts = async (
    sinkSnapshot: PortablePathEnvelopeVerificationAuditSinkSnapshot,
    driftAlerts: PortablePathSigningPolicyDriftAlert[]
  ): Promise<void> => {
    if (driftAlertLevel !== 'off') {
      for (const alert of driftAlerts) {
        const alertKey = `${alert.surface}:${alert.profile}`;
        const previousObserved = driftAlertCursor.get(alertKey) ?? 0;
        if (alert.observedUses < previousObserved) {
          driftAlertCursor.set(alertKey, 0);
        }
        const normalizedPrevious = driftAlertCursor.get(alertKey) ?? 0;
        if (alert.observedUses <= normalizedPrevious) continue;
        driftAlertCursor.set(alertKey, alert.observedUses);
        driftAlertsEmitted += 1;
        await writeLog({
          level: toPortablePathSigningPolicyAlertLevel(driftAlertLevel),
          source: PORTABLE_PATH_SIGNING_POLICY_TREND_SOURCE,
          service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
          message: `Portable signing policy drift detected surface=${alert.surface} profile=${alert.profile}.`,
          context: {
            category: PORTABLE_PATH_SIGNING_POLICY_TREND_CATEGORY,
            kind: PORTABLE_PATH_SIGNING_POLICY_TREND_KIND,
            alertType: 'signing_policy_profile_drift',
            surface: alert.surface,
            profile: alert.profile,
            observedUses: alert.observedUses,
            deltaUses: alert.observedUses - normalizedPrevious,
            allowedProfiles: alert.allowedProfiles,
          },
        });
      }
    }

    if (sinkFailureAlertLevel === 'off') {
      lastSinkFailureAlertTotal = sinkSnapshot.totals.writesFailed;
      return;
    }

    if (sinkSnapshot.totals.writesFailed < lastSinkFailureAlertTotal) {
      lastSinkFailureAlertTotal = 0;
    }
    const sinkFailureDelta = sinkSnapshot.totals.writesFailed - lastSinkFailureAlertTotal;
    if (sinkFailureDelta <= 0) return;
    lastSinkFailureAlertTotal = sinkSnapshot.totals.writesFailed;
    sinkFailureAlertsEmitted += 1;
    await writeLog({
      level: toPortablePathSigningPolicyAlertLevel(sinkFailureAlertLevel),
      source: PORTABLE_PATH_SIGNING_POLICY_TREND_SOURCE,
      service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
      message: 'Portable envelope verification audit sink failures increased.',
      context: {
        category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
        kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
        alertType: 'portable_audit_sink_failures_increased',
        writesFailedDelta: sinkFailureDelta,
        writesFailedTotal: sinkSnapshot.totals.writesFailed,
        writesAttemptedTotal: sinkSnapshot.totals.writesAttempted,
        writesSucceededTotal: sinkSnapshot.totals.writesSucceeded,
        recentFailures: sinkSnapshot.recentFailures.slice(-5),
      },
    });
  };

  const emitTrendSnapshot = async (
    trigger: PortablePathSigningPolicyTrendReportTrigger
  ): Promise<void> => {
    if (disposed) return;
    const usageSnapshot = getUsageSnapshot();
    const sinkSnapshot = getSinkSnapshot();
    const usageDelta = usageSnapshot.totals.uses - usageBaseline.totals.uses;
    if (trigger === 'threshold' && usageDelta < reportEveryUses) {
      return;
    }
    const driftAlerts = collectPortablePathSigningPolicyDriftAlerts(
      usageSnapshot,
      expectedProfilesBySurface
    );

    await writeLog(
      toPortablePathSigningPolicyTrendLogInput(
        usageSnapshot,
        usageBaseline,
        sinkSnapshot,
        sinkBaseline,
        expectedProfilesBySurface,
        reportEveryUses,
        trigger
      )
    );
    await emitAlerts(sinkSnapshot, driftAlerts);
    if (persistenceEnabled) {
      try {
        const persisted = await persistSnapshot(
          toPortablePathSigningPolicyTrendPersistedSnapshot(
            usageSnapshot,
            sinkSnapshot,
            expectedProfilesBySurface,
            reportEveryUses,
            trigger,
            driftAlerts
          ),
          {
            maxSnapshots: persistenceMaxSnapshots,
          }
        );
        if (persisted) {
          persistenceWritesSucceeded += 1;
        } else {
          persistenceWritesFailed += 1;
        }
      } catch {
        persistenceWritesFailed += 1;
      }
    }
    usageBaseline = usageSnapshot;
    sinkBaseline = sinkSnapshot;
    reportsEmitted += 1;
    lastReportedAt = new Date().toISOString();
  };

  const unsubscribeUsageHook = subscribeUsageHook(() => {
    void emitTrendSnapshot('threshold').catch(() => {
      // Observability reporter must stay non-blocking.
    });
  });

  return {
    reportNow: async (): Promise<void> => {
      await emitTrendSnapshot('manual');
    },
    stop: (): void => {
      if (disposed) return;
      disposed = true;
      unsubscribeUsageHook();
    },
    getState: (): PortablePathSigningPolicyTrendReporterState => ({
      reportEveryUses,
      reportsEmitted,
      driftAlertsEmitted,
      sinkFailureAlertsEmitted,
      persistenceWritesSucceeded,
      persistenceWritesFailed,
      lastReportedAt,
      lastUsageTotal: usageBaseline.totals.uses,
      lastSinkFailureTotal: sinkBaseline.totals.writesFailed,
    }),
  };
};

export type EmitPortablePathAuditSinkStartupHealthAlertOptions = {
  level?: PortablePathSigningPolicyAlertLevel;
  writeLog?: (input: SystemLogInput) => Promise<void>;
};
