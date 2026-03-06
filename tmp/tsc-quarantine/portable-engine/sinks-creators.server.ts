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
  type PortablePathEnvelopeVerificationAuditSinkProfile,
} from './sinks-types.server';

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

