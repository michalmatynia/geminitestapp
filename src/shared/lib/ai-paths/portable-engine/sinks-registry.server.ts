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
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_WINDOW_SECONDS_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_WINDOW_SECONDS';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ENDPOINT_ALLOWLIST_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ENDPOINT_ALLOWLIST';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_SECRET_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_SECRET';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_KEY_ID_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_KEY_ID';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_REDACTION_MODE_ENV =
  'PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_REDACTION_MODE';
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ALERT_TYPE =
  'portable_audit_sink_auto_remediation_dead_letter_replay';
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
export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_REDACTION_MODES =
  ['off', 'sensitive'] as const;
export type PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode =
  (typeof PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_EXPORT_REDACTION_MODES)[number];

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
  const getDb = options.getDb ?? (async () => (await getMongoDb()) as MongoDbLike);
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
