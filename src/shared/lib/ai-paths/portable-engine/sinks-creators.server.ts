import 'server-only';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent, type SystemLogInput } from '@/shared/lib/observability/system-logger';

import { PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_MONGO_COLLECTION } from './sinks-constants.server';
import {
  createPortablePathEnvelopeVerificationAuditSinkHealthMongoDocument,
  createPortablePathEnvelopeVerificationAuditSinkHealthSystemLogInput,
  toPortablePathEnvelopeVerificationMongoDocument,
  toPortablePathEnvelopeVerificationSystemLogInput,
} from './sinks-shared.server';

import type {
  PortablePathEnvelopeVerificationAuditEvent,
  PortablePathEnvelopeVerificationObservabilitySnapshot,
} from './portable-engine-envelope-observability';
import type {
  PortablePathEnvelopeVerificationAuditSinkHealthCheck,
  PortablePathEnvelopeVerificationAuditSinkWithHealthCheck,
} from './sinks-contracts.server';

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
