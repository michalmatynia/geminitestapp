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

export const PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_KIND =
  'ai-paths.portable-envelope-verification-audit.v1' as const;
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_CATEGORY =
  'ai_path_portable_envelope_verification_audit';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE =
  'ai-paths.portable-engine.envelope-verification';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE = 'ai-paths.portable-engine';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_MONGO_COLLECTION =
  'ai_path_portable_envelope_verification_audit';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND =
  'ai-paths.portable-envelope-verification-audit-sink-health.v1' as const;
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY =
  'ai_path_portable_envelope_verification_audit_sink_health';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE =
  'ai-paths.portable-engine.envelope-verification.sink-bootstrap';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILES = [
  'dev',
  'staging',
  'prod',
] as const;
export type PortablePathEnvelopeVerificationAuditSinkProfile =
  (typeof PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILES)[number];
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICIES = [
  'off',
  'warn',
  'error',
] as const;
export type PortablePathEnvelopeVerificationAuditSinkHealthPolicy =
  (typeof PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICIES)[number];
export type PortablePathEnvelopeVerificationAuditSinkHealthCheck = () => void | Promise<void>;
export type PortablePathEnvelopeVerificationAuditSinkWithHealthCheck =
  PortablePathEnvelopeVerificationAuditSink & {
    healthCheck?: PortablePathEnvelopeVerificationAuditSinkHealthCheck;
  };
export type PortablePathEnvelopeVerificationAuditSinkHealthDiagnosticStatus =
  | 'healthy'
  | 'failed'
  | 'skipped';
export type PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic = {
  sinkId: string;
  status: PortablePathEnvelopeVerificationAuditSinkHealthDiagnosticStatus;
  checkedAt: string;
  durationMs: number;
  message: string;
  error: string | null;
};
export type PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'skipped';
export type PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary = {
  profile: PortablePathEnvelopeVerificationAuditSinkProfile;
  policy: PortablePathEnvelopeVerificationAuditSinkHealthPolicy;
  timeoutMs: number;
  status: PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus;
  checkedAt: string;
  failedSinkIds: string[];
  diagnostics: PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic[];
};

const DEFAULT_PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS = 3000;
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_ENABLED_ENV =
  'PORTABLE_PATH_AUDIT_SINK_BOOTSTRAP_ENABLED';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILE_ENV =
  'PORTABLE_PATH_AUDIT_SINK_PROFILE';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICY_ENV =
  'PORTABLE_PATH_AUDIT_SINK_HEALTH_POLICY';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS_ENV =
  'PORTABLE_PATH_AUDIT_SINK_HEALTH_TIMEOUT_MS';
export const PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV =
  'PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED';
export const PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV =
  'PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES';
export const PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV =
  'PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED';
export const PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV =
  'PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS';
export const PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV =
  'PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL';
export const PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV =
  'PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_ENABLED_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_ENABLED';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGY_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGY';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATIONS_ENABLED_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATIONS_ENABLED';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_URL_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_URL';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_URL_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_URL';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_RECIPIENTS_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_RECIPIENTS';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SECRET_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SECRET';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SIGNATURE_KEY_ID_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SIGNATURE_KEY_ID';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SECRET_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SECRET';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SIGNATURE_KEY_ID_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SIGNATURE_KEY_ID';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES';
export const PORTABLE_PATH_SIGNING_POLICY_TREND_KIND =
  'ai-paths.portable-signing-policy-trend.v1' as const;
export const PORTABLE_PATH_SIGNING_POLICY_TREND_CATEGORY =
  'ai_path_portable_signing_policy_trend';
export const PORTABLE_PATH_SIGNING_POLICY_TREND_SOURCE =
  'ai-paths.portable-engine.signing-policy-trend';
export const PORTABLE_PATH_SIGNING_POLICY_TREND_SETTINGS_KEY =
  'ai_paths_portable_signing_policy_trend_history_v1';
export const PORTABLE_PATH_AUDIT_SINK_STARTUP_HEALTH_STATE_SETTINGS_KEY =
  'ai_paths_portable_audit_sink_startup_health_state_v1';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_SETTINGS_KEY =
  'ai_paths_portable_audit_sink_auto_remediation_dead_letters_v1';
export const PORTABLE_PATH_SIGNING_POLICY_ALERT_LEVELS = ['off', 'warn', 'error'] as const;
export type PortablePathSigningPolicyAlertLevel =
  (typeof PORTABLE_PATH_SIGNING_POLICY_ALERT_LEVELS)[number];

type PortablePathEnvelopeVerificationSinkLevel = 'info' | 'warn' | 'error';

const getSinkLevel = (
  event: PortablePathEnvelopeVerificationAuditEvent
): PortablePathEnvelopeVerificationSinkLevel => {
  if (event.status === 'rejected') return 'error';
  if (event.status === 'warned') return 'warn';
  return 'info';
};

const normalizePortablePathEnvelopeVerificationKeyId = (
  keyId: string | null
): string => {
  if (typeof keyId !== 'string') return 'none';
  const normalized = keyId.trim();
  return normalized.length > 0 ? normalized : 'none';
};

const buildPortablePathEnvelopeVerificationMessage = (
  event: PortablePathEnvelopeVerificationAuditEvent
): string =>
  [
    'Portable envelope verification',
    `status=${event.status}`,
    `outcome=${event.outcome}`,
    `phase=${event.phase}`,
    `algorithm=${event.algorithm ?? 'unknown'}`,
    `keyId=${normalizePortablePathEnvelopeVerificationKeyId(event.keyId)}`,
  ].join(' ');

const buildPortablePathEnvelopeVerificationAuditSinkHealthMessage = (
  sinkId: string,
  stage: 'probe' | 'summary'
): string => {
  if (stage === 'probe') {
    return `Portable envelope verification audit sink health probe sinkId=${sinkId}`;
  }
  return `Portable envelope verification audit sink startup health summary sinkId=${sinkId}`;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) return error.message.trim();
  if (typeof error === 'string' && error.trim().length > 0) return error.trim();
  try {
    return JSON.stringify(error);
  } catch {
    return 'unknown_error';
  }
};

const resolveHealthTimeoutMs = (value: number | undefined): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS;
  }
  const normalized = Math.floor(Number(value));
  if (normalized < 250) {
    return DEFAULT_PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS;
  }
  return normalized;
};

type PortablePathEnvelopeVerificationSnapshotReference = {
  totals: PortablePathEnvelopeVerificationObservabilitySnapshot['totals'];
  keyIdBucket:
    | PortablePathEnvelopeVerificationObservabilitySnapshot['byKeyId'][string]
    | null;
};

const createPortablePathEnvelopeVerificationSnapshotReference = (
  event: PortablePathEnvelopeVerificationAuditEvent,
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
): PortablePathEnvelopeVerificationSnapshotReference => {
  const normalizedKeyId = normalizePortablePathEnvelopeVerificationKeyId(event.keyId);
  return {
    totals: snapshot.totals,
    keyIdBucket: snapshot.byKeyId[normalizedKeyId] ?? null,
  };
};

const toPortablePathEnvelopeVerificationSystemLogInput = (
  event: PortablePathEnvelopeVerificationAuditEvent,
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot,
  options?: {
    source?: string;
    service?: string;
    category?: string;
    includeSnapshot?: boolean;
  }
): SystemLogInput => ({
  level: getSinkLevel(event),
  source: options?.source ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
  service: options?.service ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  message: buildPortablePathEnvelopeVerificationMessage(event),
  context: {
    category: options?.category ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_CATEGORY,
    kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_KIND,
    event,
    ...(options?.includeSnapshot === false
      ? {}
      : {
          snapshot: createPortablePathEnvelopeVerificationSnapshotReference(
            event,
            snapshot
          ),
        }),
  },
});

const toPortablePathEnvelopeVerificationMongoDocument = (
  event: PortablePathEnvelopeVerificationAuditEvent,
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot,
  options?: {
    source?: string;
    service?: string;
    category?: string;
    includeSnapshot?: boolean;
  }
): Record<string, unknown> => ({
  kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_KIND,
  level: getSinkLevel(event),
  source: options?.source ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
  service: options?.service ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  category: options?.category ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_CATEGORY,
  message: buildPortablePathEnvelopeVerificationMessage(event),
  event,
  ...(options?.includeSnapshot === false
    ? {}
    : {
        snapshot: createPortablePathEnvelopeVerificationSnapshotReference(event, snapshot),
      }),
  createdAt: new Date(event.at),
});

const createPortablePathEnvelopeVerificationPrismaContext = (
  event: PortablePathEnvelopeVerificationAuditEvent,
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot,
  includeSnapshot = true
): Record<string, unknown> => ({
  kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_KIND,
  event,
  ...(includeSnapshot
    ? {
        snapshot: createPortablePathEnvelopeVerificationSnapshotReference(event, snapshot),
      }
    : {}),
});

const toPrismaJson = (value: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(
    JSON.stringify(value, (_key: string, current: unknown) => {
      if (typeof current === 'bigint') return current.toString();
      return current;
    })
  ) as Record<string, unknown>;

const createPortablePathEnvelopeVerificationAuditSinkHealthSystemLogInput = (
  sinkId: string,
  options?: {
    source?: string;
    service?: string;
    category?: string;
  }
): SystemLogInput => ({
  level: 'info',
  source: options?.source ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
  service: options?.service ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  message: buildPortablePathEnvelopeVerificationAuditSinkHealthMessage(sinkId, 'probe'),
  context: {
    category:
      options?.category ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
    kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
    sinkId,
    stage: 'probe',
  },
});

const createPortablePathEnvelopeVerificationAuditSinkHealthMongoDocument = (
  sinkId: string,
  options?: {
    source?: string;
    service?: string;
    category?: string;
  }
): Record<string, unknown> => ({
  kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  level: 'info',
  source: options?.source ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
  service: options?.service ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  category: options?.category ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  message: buildPortablePathEnvelopeVerificationAuditSinkHealthMessage(sinkId, 'probe'),
  sinkId,
  stage: 'probe',
  createdAt: new Date(),
});

const toStartupHealthSummaryLogInput = (
  summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary
): SystemLogInput => ({
  level: summary.status === 'failed' ? 'error' : summary.status === 'degraded' ? 'warn' : 'info',
  source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
  service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  message: buildPortablePathEnvelopeVerificationAuditSinkHealthMessage('all', 'summary'),
  context: {
    category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
    kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
    profile: summary.profile,
    policy: summary.policy,
    timeoutMs: summary.timeoutMs,
    status: summary.status,
    failedSinkIds: summary.failedSinkIds,
    diagnostics: summary.diagnostics,
  },
});

const runWithTimeout = async (
  sinkId: string,
  timeoutMs: number,
  callback: () => void | Promise<void>
): Promise<void> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          `Portable envelope verification audit sink "${sinkId}" health check timed out after ${timeoutMs}ms.`
        )
      );
    }, timeoutMs);
  });
  try {
    await Promise.race([Promise.resolve().then(callback), timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};

export type CreatePortablePathEnvelopeVerificationLogForwardingSinkOptions = {
  id?: string;
  source?: string;
  service?: string;
  category?: string;
  includeSnapshot?: boolean;
  writeLog?: (input: SystemLogInput) => Promise<void>;
  healthCheck?: PortablePathEnvelopeVerificationAuditSinkHealthCheck;
};

export const createPortablePathEnvelopeVerificationLogForwardingSink = (
  options: CreatePortablePathEnvelopeVerificationLogForwardingSinkOptions = {}
): PortablePathEnvelopeVerificationAuditSinkWithHealthCheck => {
  const sinkId = options.id ?? 'portable-envelope-verification-log-forwarding';
  const writer = options.writeLog ?? logSystemEvent;
  return {
    id: sinkId,
    write: async (
      event: PortablePathEnvelopeVerificationAuditEvent,
      snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
    ): Promise<void> => {
      await writer(
        toPortablePathEnvelopeVerificationSystemLogInput(event, snapshot, {
          source: options.source,
          service: options.service,
          category: options.category,
          includeSnapshot: options.includeSnapshot,
        })
      );
    },
    healthCheck:
      options.healthCheck ??
      (async (): Promise<void> => {
        await writer(
          createPortablePathEnvelopeVerificationAuditSinkHealthSystemLogInput(sinkId, {
            source: options.source,
            service: options.service,
            category: options.category,
          })
        );
      }),
  };
};

type PrismaSystemLogClient = {
  systemLog?: {
    create: (input: {
      data: {
        level: string;
        message: string;
        category?: string;
        source?: string;
        service?: string;
        context?: unknown;
      };
    }) => Promise<unknown>;
  };
};

export type CreatePortablePathEnvelopeVerificationPrismaSinkOptions = {
  id?: string;
  source?: string;
  service?: string;
  category?: string;
  includeSnapshot?: boolean;
  prismaClient?: PrismaSystemLogClient;
  healthCheck?: PortablePathEnvelopeVerificationAuditSinkHealthCheck;
};

export const createPortablePathEnvelopeVerificationPrismaSink = (
  options: CreatePortablePathEnvelopeVerificationPrismaSinkOptions = {}
): PortablePathEnvelopeVerificationAuditSinkWithHealthCheck => {
  const sinkId = options.id ?? 'portable-envelope-verification-prisma';
  return {
    id: sinkId,
    write: async (
      event: PortablePathEnvelopeVerificationAuditEvent,
      snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
    ): Promise<void> => {
      const prismaClient = (options.prismaClient ?? prisma) as PrismaSystemLogClient;
      if (!prismaClient.systemLog) return;
      await prismaClient.systemLog.create({
        data: {
          level: getSinkLevel(event),
          message: buildPortablePathEnvelopeVerificationMessage(event),
          category:
            options.category ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_CATEGORY,
          source: options.source ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
          service: options.service ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
          context: toPrismaJson(
            createPortablePathEnvelopeVerificationPrismaContext(
              event,
              snapshot,
              options.includeSnapshot !== false
            )
          ),
        },
      });
    },
    healthCheck:
      options.healthCheck ??
      (async (): Promise<void> => {
        const prismaClient = (options.prismaClient ?? prisma) as PrismaSystemLogClient;
        if (!prismaClient.systemLog || typeof prismaClient.systemLog.create !== 'function') {
          throw new Error(
            'Prisma systemLog.create is unavailable for portable envelope verification audit sink health checks.'
          );
        }
        await prismaClient.systemLog.create({
          data: {
            level: 'info',
            message: buildPortablePathEnvelopeVerificationAuditSinkHealthMessage(sinkId, 'probe'),
            category:
              options.category ??
              PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
            source: options.source ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
            service: options.service ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
            context: toPrismaJson({
              kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
              sinkId,
              stage: 'probe',
            }),
          },
        });
      }),
  };
};

type MongoDbLike = {
  collection: (name: string) => {
    insertOne: (doc: Record<string, unknown>) => Promise<unknown>;
  };
};

export type CreatePortablePathEnvelopeVerificationMongoSinkOptions = {
  id?: string;
  source?: string;
  service?: string;
  category?: string;
  collectionName?: string;
  includeSnapshot?: boolean;
  getDb?: () => Promise<MongoDbLike>;
  healthCheck?: PortablePathEnvelopeVerificationAuditSinkHealthCheck;
};

export const createPortablePathEnvelopeVerificationMongoSink = (
  options: CreatePortablePathEnvelopeVerificationMongoSinkOptions = {}
): PortablePathEnvelopeVerificationAuditSinkWithHealthCheck => {
  const sinkId = options.id ?? 'portable-envelope-verification-mongo';
  const getDb =
    options.getDb ?? (async () => (await getMongoDb()) as unknown as MongoDbLike);
  const collectionName =
    options.collectionName ??
    PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_MONGO_COLLECTION;
  return {
    id: sinkId,
    write: async (
      event: PortablePathEnvelopeVerificationAuditEvent,
      snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
    ): Promise<void> => {
      const db = await getDb();
      await db.collection(collectionName).insertOne(
        toPortablePathEnvelopeVerificationMongoDocument(event, snapshot, {
          source: options.source,
          service: options.service,
          category: options.category,
          includeSnapshot: options.includeSnapshot,
        })
      );
    },
    healthCheck:
      options.healthCheck ??
      (async (): Promise<void> => {
        const db = await getDb();
        await db.collection(collectionName).insertOne(
          createPortablePathEnvelopeVerificationAuditSinkHealthMongoDocument(sinkId, {
            source: options.source,
            service: options.service,
            category: options.category,
          })
        );
      }),
  };
};

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

const normalizePortablePathEnvelopeVerificationAuditSinkProfile = (
  value: string | undefined | null
): PortablePathEnvelopeVerificationAuditSinkProfile | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (
    normalized === 'production' ||
    normalized === 'prod'
  ) {
    return 'prod';
  }
  if (
    normalized === 'staging' ||
    normalized === 'stage' ||
    normalized === 'preprod'
  ) {
    return 'staging';
  }
  if (
    normalized === 'development' ||
    normalized === 'dev' ||
    normalized === 'local' ||
    normalized === 'test'
  ) {
    return 'dev';
  }
  return null;
};

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
const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGIES = [
  'none',
  'unregister_all',
  'degrade_to_log_only',
] as const;

export type PortablePathAuditSinkAutoRemediationStrategy =
  (typeof PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGIES)[number];

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

type PrismaSettingClient = {
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

const readSettingsRawFromPrisma = async (key: string): Promise<string | null> => {
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

const writeSettingsRawToPrisma = async (key: string, raw: string): Promise<boolean> => {
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

const readSettingsRawFromMongo = async (key: string): Promise<string | null> => {
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

const writeSettingsRawToMongo = async (key: string, raw: string): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) return false;
  try {
    const mongo = await getMongoDb();
    const now = new Date();
    await mongo
      .collection<PortablePathSigningPolicyTrendStoreSettingRecord>('settings')
      .updateOne(
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

const readSettingsRawByProviderPriority = async (key: string): Promise<string | null> => {
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

const writeSettingsRawByProviderPriority = async (
  key: string,
  raw: string
): Promise<boolean> => {
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

const readPortablePathSigningPolicyTrendRawByProviderPriority =
  async (): Promise<string | null> =>
    readSettingsRawByProviderPriority(PORTABLE_PATH_SIGNING_POLICY_TREND_SETTINGS_KEY);

const writePortablePathSigningPolicyTrendRawByProviderPriority = async (
  raw: string
): Promise<boolean> =>
  writeSettingsRawByProviderPriority(PORTABLE_PATH_SIGNING_POLICY_TREND_SETTINGS_KEY, raw);

const isPortablePathSigningPolicyTrendPersistedSnapshot = (
  value: unknown
): value is PortablePathSigningPolicyTrendPersistedSnapshot => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record['at'] !== 'string' || record['at'].trim().length === 0) return false;
  if (record['trigger'] !== 'threshold' && record['trigger'] !== 'manual') return false;
  return typeof record['reportEveryUses'] === 'number' && Number.isFinite(record['reportEveryUses']);
};

const parsePortablePathSigningPolicyTrendSnapshotEnvelope = (
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

const stringifyPortablePathSigningPolicyTrendSnapshotEnvelope = (
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
  const existing = parsePortablePathSigningPolicyTrendSnapshotEnvelope(await readRaw(), maxSnapshots);
  const serialized = stringifyPortablePathSigningPolicyTrendSnapshotEnvelope(
    [...existing, snapshot],
    maxSnapshots
  );
  if (!serialized) return false;
  return writeRaw(serialized);
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

const toPortablePathSigningPolicyUsageSurfaceDelta = (
  current: PortablePathSigningPolicyUsageSnapshot,
  previous: PortablePathSigningPolicyUsageSnapshot,
  surface: PortablePathSigningPolicySurface
): number => Math.max(0, current.bySurface[surface] - previous.bySurface[surface]);

const toPortablePathAuditSinkTotalsDelta = (
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

const toPortablePathSigningPolicyAlertLevel = (
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

const toPortablePathSigningPolicyTrendLogInput = (
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

const toPortablePathSigningPolicyTrendPersistedSnapshot = (
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

export const emitPortablePathAuditSinkStartupHealthAlert = async (
  summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary | null | undefined,
  options: EmitPortablePathAuditSinkStartupHealthAlertOptions = {}
): Promise<boolean> => {
  if (!summary || summary.status === 'healthy' || summary.status === 'skipped') {
    return false;
  }
  const level = options.level ?? 'warn';
  if (level === 'off') return false;
  const writer = options.writeLog ?? logSystemEvent;
  await writer({
    level: toPortablePathSigningPolicyAlertLevel(level),
    source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
    service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
    message: `Portable envelope verification audit sink startup health is ${summary.status}.`,
    context: {
      category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
      kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
      alertType: 'portable_audit_sink_startup_health',
      startupHealth: summary,
    },
  });
  return true;
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

export type PortablePathAuditSinkAutoRemediationNotificationChannelResult = {
  attempted: boolean;
  delivered: boolean;
  error: string | null;
  statusCode: number | null;
  endpoint: string | null;
  signatureApplied: boolean;
  deadLetterQueued: boolean;
  receiptAt: string | null;
};

export type PortablePathAuditSinkAutoRemediationNotificationReceipt = {
  channel: PortablePathAuditSinkAutoRemediationNotificationChannel;
  attempted: boolean;
  delivered: boolean;
  endpoint: string | null;
  statusCode: number | null;
  error: string | null;
  signatureApplied: boolean;
  deadLetterQueued: boolean;
  at: string;
};

export type PortablePathAuditSinkAutoRemediationNotificationResult = {
  enabled: boolean;
  receipts: PortablePathAuditSinkAutoRemediationNotificationReceipt[];
  webhook: PortablePathAuditSinkAutoRemediationNotificationChannelResult;
  email: PortablePathAuditSinkAutoRemediationNotificationChannelResult & {
    recipients: string[];
  };
};

export type PortablePathAuditSinkAutoRemediationNotificationInput = {
  summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary;
  strategy: PortablePathAuditSinkAutoRemediationStrategy;
  action: PortablePathAuditSinkAutoRemediationAction;
  threshold: number;
  cooldownSeconds: number;
  rateLimitWindowSeconds: number;
  rateLimitMaxActions: number;
  state: PortablePathAuditSinkStartupHealthState;
};

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

export type PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt = {
  replayedAt: string;
  queuedAt: string;
  channel: PortablePathAuditSinkAutoRemediationNotificationChannel;
  endpoint: string | null;
  attempted: boolean;
  delivered: boolean;
  statusCode: number | null;
  error: string | null;
  signatureApplied: boolean;
  attemptCountBefore: number;
  attemptCountAfter: number;
};

export type PortablePathAuditSinkAutoRemediationDeadLetterReplayResult = {
  dryRun: boolean;
  selectedCount: number;
  attemptedCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
  removedCount: number;
  retainedCount: number;
  persisted: boolean;
  remainingCount: number;
  attempts: PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt[];
};

export type ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions = {
  dryRun?: boolean;
  limit?: number;
  channel?: PortablePathAuditSinkAutoRemediationNotificationChannel | 'all';
  endpoint?: string | null;
  timeoutMs?: number;
  now?: string | Date;
  maxEntries?: number;
  webhookSecret?: string | null;
  webhookSignatureKeyId?: string | null;
  emailWebhookSecret?: string | null;
  emailWebhookSignatureKeyId?: string | null;
  fetchImpl?: typeof fetch;
  writeLog?: (input: SystemLogInput) => Promise<void>;
  readRaw?: () => Promise<string | null>;
  writeRaw?: (raw: string) => Promise<boolean>;
};

export const replayPortablePathAuditSinkAutoRemediationDeadLetters = async (
  options: ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions = {}
): Promise<PortablePathAuditSinkAutoRemediationDeadLetterReplayResult> => {
  const dryRun = options.dryRun ?? false;
  const replayLimit = resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayLimit(
    options.limit
  );
  const timeoutMs = resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMs(
    options.timeoutMs
  );
  const maxEntries = resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries(
    options.maxEntries
  );
  const fetchImpl = options.fetchImpl ?? fetch;
  const writeLog = options.writeLog ?? logSystemEvent;
  const replayedAt = toPortablePathAuditSinkAutoRemediationNotificationTimestamp(options.now);
  const normalizedChannel =
    options.channel === 'webhook' || options.channel === 'email' ? options.channel : null;
  const normalizedEndpoint = options.endpoint?.trim() ?? '';
  const endpointFilter = normalizedEndpoint.length > 0 ? normalizedEndpoint : null;
  const webhookSecret = options.webhookSecret ?? null;
  const webhookSignatureKeyId = options.webhookSignatureKeyId ?? null;
  const emailWebhookSecret = options.emailWebhookSecret ?? null;
  const emailWebhookSignatureKeyId = options.emailWebhookSignatureKeyId ?? null;

  const entries = await loadPortablePathAuditSinkAutoRemediationDeadLetters({
    maxEntries,
    readRaw: options.readRaw,
  });
  const selected = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      if (normalizedChannel && entry.channel !== normalizedChannel) return false;
      if (endpointFilter && entry.endpoint !== endpointFilter) return false;
      return true;
    })
    .slice(0, replayLimit);

  const attempts: PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt[] = [];
  if (selected.length === 0) {
    return {
      dryRun,
      selectedCount: 0,
      attemptedCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      skippedCount: 0,
      removedCount: 0,
      retainedCount: entries.length,
      persisted: true,
      remainingCount: entries.length,
      attempts,
    };
  }

  const remainingEntries = entries.map((entry) => ({ ...entry }));
  const indicesToRemove = new Set<number>();
  let attemptedCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const { entry, index } of selected) {
    const attemptBase: PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt = {
      replayedAt,
      queuedAt: entry.queuedAt,
      channel: entry.channel,
      endpoint: entry.endpoint,
      attempted: false,
      delivered: false,
      statusCode: null,
      error: null,
      signatureApplied: false,
      attemptCountBefore: entry.attemptCount,
      attemptCountAfter: entry.attemptCount,
    };
    if (dryRun) {
      skippedCount += 1;
      attempts.push(attemptBase);
      continue;
    }
    if (!entry.endpoint) {
      skippedCount += 1;
      failedCount += 1;
      const attemptCountAfter = entry.attemptCount + 1;
      remainingEntries[index] = {
        ...entry,
        error: 'dead_letter_endpoint_missing',
        statusCode: null,
        attemptCount: attemptCountAfter,
      };
      attempts.push({
        ...attemptBase,
        error: 'dead_letter_endpoint_missing',
        attemptCountAfter,
      });
      continue;
    }

    const request = buildPortablePathAuditSinkAutoRemediationPreparedNotificationRequest(
      entry.payload,
      entry.channel === 'email'
        ? {
            signatureSecret: emailWebhookSecret,
            signatureKeyId: emailWebhookSignatureKeyId,
            now: replayedAt,
          }
        : {
            signatureSecret: webhookSecret,
            signatureKeyId: webhookSignatureKeyId,
            now: replayedAt,
          }
    );
    attemptBase.signatureApplied = request.signature !== null;

    try {
      attemptedCount += 1;
      attemptBase.attempted = true;
      attemptBase.statusCode = await postPortablePathAuditSinkAutoRemediationNotification(
        entry.endpoint,
        request,
        timeoutMs,
        fetchImpl,
        entry.channel === 'email'
          ? 'portable-audit-sink-auto-remediation-email-webhook-replay'
          : 'portable-audit-sink-auto-remediation-webhook-replay',
        entry.channel === 'email'
          ? 'portable-audit-sink-auto-remediation-email-webhook-replay'
          : 'portable-audit-sink-auto-remediation-webhook-replay'
      );
      attemptBase.delivered = true;
      deliveredCount += 1;
      indicesToRemove.add(index);
      attempts.push(attemptBase);
    } catch (error) {
      attemptedCount += 1;
      failedCount += 1;
      attemptBase.attempted = true;
      attemptBase.error = toErrorMessage(error);
      attemptBase.statusCode =
        toPortablePathAuditSinkAutoRemediationNotificationStatusCode(error);
      const attemptCountAfter = entry.attemptCount + 1;
      attemptBase.attemptCountAfter = attemptCountAfter;
      remainingEntries[index] = {
        ...entry,
        error: attemptBase.error,
        statusCode: attemptBase.statusCode,
        attemptCount: attemptCountAfter,
        signature: request.signature,
      };
      attempts.push(attemptBase);
    }
  }

  const persistedEntries = dryRun
    ? remainingEntries
    : remainingEntries.filter((_entry, index) => !indicesToRemove.has(index));
  const persisted = dryRun
    ? true
    : await savePortablePathAuditSinkAutoRemediationDeadLetters(persistedEntries, {
        maxEntries,
        writeRaw: options.writeRaw,
      });
  const removedCount = dryRun ? 0 : indicesToRemove.size;
  const retainedCount = persistedEntries.length;

  await writeLog({
    level: failedCount > 0 || !persisted ? 'warn' : 'info',
    source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
    service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
    message: 'Portable audit sink auto-remediation dead-letter replay completed.',
    context: {
      category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
      kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
      alertType: 'portable_audit_sink_auto_remediation_dead_letter_replay',
      dryRun,
      selectedCount: selected.length,
      attemptedCount,
      deliveredCount,
      failedCount,
      skippedCount,
      removedCount,
      retainedCount,
      persisted,
      filters: {
        channel: normalizedChannel,
        endpoint: endpointFilter,
        limit: replayLimit,
      },
      attempts: attempts.slice(-50),
    },
  });

  return {
    dryRun,
    selectedCount: selected.length,
    attemptedCount,
    deliveredCount,
    failedCount,
    skippedCount,
    removedCount,
    retainedCount,
    persisted,
    remainingCount: retainedCount,
    attempts,
  };
};

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

export type BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentOptions = {
  env?: Record<string, string | undefined>;
  startupHealthSummary?: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary | null;
};

export type BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentResult = {
  enabled: boolean;
  reportEveryUses: number | null;
  persistenceEnabled: boolean;
  persistenceMaxSnapshots: number | null;
  driftAlertLevel: PortablePathSigningPolicyAlertLevel;
  sinkFailureAlertLevel: PortablePathSigningPolicyAlertLevel;
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface;
  reporter: PortablePathSigningPolicyTrendReporter | null;
  stop: () => void;
};

export const bootstrapPortablePathSigningPolicyTrendReporterFromEnvironment = async (
  options: BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentOptions = {}
): Promise<BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentResult> => {
  const env = options.env ?? process.env;
  const enabled =
    parseBooleanFromEnvironment(env[PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV]) ??
    true;
  const environmentProfile = resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment(
    env['NODE_ENV']
  );
  const reportEveryUses = resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment(
    env[PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV]
  );
  const persistenceEnabled =
    resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV]
    ) ?? true;
  const persistenceMaxSnapshots =
    resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV]
    );
  const driftAlertLevel =
    resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV]
    ) ?? 'warn';
  const sinkFailureAlertLevel =
    resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV]
    ) ?? 'warn';
  const expectedProfilesBySurface =
    parsePortablePathSigningPolicyExpectedProfilesBySurfaceFromEnvironment(
      env['PORTABLE_PATH_SIGNING_POLICY_ALLOWED_PROFILES_BY_SURFACE'],
      environmentProfile
    );

  await emitPortablePathAuditSinkStartupHealthAlert(options.startupHealthSummary, {
    level: sinkFailureAlertLevel,
  });

  if (!enabled) {
    return {
      enabled: false,
      reportEveryUses,
      persistenceEnabled,
      persistenceMaxSnapshots,
      driftAlertLevel,
      sinkFailureAlertLevel,
      expectedProfilesBySurface,
      reporter: null,
      stop: () => {},
    };
  }

  const reporter = createPortablePathSigningPolicyTrendReporter({
    reportEveryUses: reportEveryUses ?? undefined,
    driftAlertLevel,
    sinkFailureAlertLevel,
    persistenceEnabled,
    persistenceMaxSnapshots: persistenceMaxSnapshots ?? undefined,
    expectedProfilesBySurface,
    environmentProfile,
  });

  return {
    enabled: true,
    reportEveryUses: reportEveryUses ?? reporter.getState().reportEveryUses,
    persistenceEnabled,
    persistenceMaxSnapshots:
      persistenceMaxSnapshots ??
      resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots(undefined),
    driftAlertLevel,
    sinkFailureAlertLevel,
    expectedProfilesBySurface,
    reporter,
    stop: () => {
      reporter.stop();
    },
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
