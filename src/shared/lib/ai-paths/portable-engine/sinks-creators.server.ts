import 'server-only';

import prisma from '@/shared/lib/db/prisma';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent, type SystemLogInput } from '@/shared/lib/observability/system-logger';

import type {
  PortablePathEnvelopeVerificationAuditEvent,
  PortablePathEnvelopeVerificationObservabilitySnapshot,
} from './portable-engine-envelope-observability';
import {
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_CATEGORY,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_MONGO_COLLECTION,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
} from './sinks-constants.server';
import type {
  PortablePathEnvelopeVerificationAuditSinkHealthCheck,
  PortablePathEnvelopeVerificationAuditSinkWithHealthCheck,
} from './sinks-contracts.server';
import {
  buildPortablePathEnvelopeVerificationAuditSinkHealthMessage,
  buildPortablePathEnvelopeVerificationMessage,
  createPortablePathEnvelopeVerificationAuditSinkHealthMongoDocument,
  createPortablePathEnvelopeVerificationAuditSinkHealthSystemLogInput,
  createPortablePathEnvelopeVerificationPrismaContext,
  getSinkLevel,
  toPortablePathEnvelopeVerificationMongoDocument,
  toPortablePathEnvelopeVerificationSystemLogInput,
  toPrismaJson,
} from './sinks-shared.server';

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
          category: options.category ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_CATEGORY,
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
              options.category ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
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
    options.collectionName ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_MONGO_COLLECTION;
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
