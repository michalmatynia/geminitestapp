import 'server-only';

import prisma from '@/shared/lib/db/prisma';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent, type SystemLogInput } from '@/shared/lib/observability/system-logger';

import type {
  PortablePathEnvelopeVerificationAuditEvent,
  PortablePathEnvelopeVerificationAuditSink,
  PortablePathEnvelopeVerificationObservabilitySnapshot,
} from './index';

export const PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_KIND =
  'ai-paths.portable-envelope-verification-audit.v1' as const;
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_CATEGORY =
  'ai_path_portable_envelope_verification_audit';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE =
  'ai-paths.portable-engine.envelope-verification';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE = 'ai-paths.portable-engine';
export const PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_MONGO_COLLECTION =
  'ai_path_portable_envelope_verification_audit';

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

export type CreatePortablePathEnvelopeVerificationLogForwardingSinkOptions = {
  id?: string;
  source?: string;
  service?: string;
  category?: string;
  includeSnapshot?: boolean;
  writeLog?: (input: SystemLogInput) => Promise<void>;
};

export const createPortablePathEnvelopeVerificationLogForwardingSink = (
  options: CreatePortablePathEnvelopeVerificationLogForwardingSinkOptions = {}
): PortablePathEnvelopeVerificationAuditSink => ({
  id: options.id ?? 'portable-envelope-verification-log-forwarding',
  write: async (
    event: PortablePathEnvelopeVerificationAuditEvent,
    snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
  ): Promise<void> => {
    const writer = options.writeLog ?? logSystemEvent;
    await writer(
      toPortablePathEnvelopeVerificationSystemLogInput(event, snapshot, {
        source: options.source,
        service: options.service,
        category: options.category,
        includeSnapshot: options.includeSnapshot,
      })
    );
  },
});

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
};

export const createPortablePathEnvelopeVerificationPrismaSink = (
  options: CreatePortablePathEnvelopeVerificationPrismaSinkOptions = {}
): PortablePathEnvelopeVerificationAuditSink => ({
  id: options.id ?? 'portable-envelope-verification-prisma',
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
});

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
};

export const createPortablePathEnvelopeVerificationMongoSink = (
  options: CreatePortablePathEnvelopeVerificationMongoSinkOptions = {}
): PortablePathEnvelopeVerificationAuditSink => ({
  id: options.id ?? 'portable-envelope-verification-mongo',
  write: async (
    event: PortablePathEnvelopeVerificationAuditEvent,
    snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
  ): Promise<void> => {
    const getDb = options.getDb ?? (async () => (await getMongoDb()) as unknown as MongoDbLike);
    const db = await getDb();
    const collectionName =
      options.collectionName ??
      PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_MONGO_COLLECTION;
    await db.collection(collectionName).insertOne(
      toPortablePathEnvelopeVerificationMongoDocument(event, snapshot, {
        source: options.source,
        service: options.service,
        category: options.category,
        includeSnapshot: options.includeSnapshot,
      })
    );
  },
});
