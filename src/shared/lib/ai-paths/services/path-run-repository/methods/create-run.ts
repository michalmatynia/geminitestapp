import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { randomUUID } from 'node:crypto';
import type { AiPathRunCreateInput, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import {
  ensureIndexes,
  RUNS_COLLECTION,
  toRunRecord,
  type RunDocument,
} from './shared';

export const createRun = async (input: AiPathRunCreateInput): Promise<AiPathRunRecord> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const id = randomUUID();
  const document: RunDocument = {
    _id: id,
    id,
    userId: input.userId ?? null,
    pathId: input.pathId ?? null,
    pathName: input.pathName ?? null,
    status: input.status ?? 'queued',
    triggerEvent: input.triggerEvent ?? null,
    triggerNodeId: input.triggerNodeId ?? null,
    triggerContext: input.triggerContext ?? null,
    graph: (input.graph as Record<string, unknown>) ?? null,
    runtimeState: (input.runtimeState as Record<string, unknown>) ?? null,
    meta: input.meta ?? null,
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? null,
    errorMessage: null,
    retryCount: input.retryCount ?? 0,
    maxAttempts: input.maxAttempts ?? 3,
    nextRetryAt: input.nextRetryAt ? new Date(input.nextRetryAt) : null,
    deadLetteredAt: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };

  await db.collection<RunDocument>(RUNS_COLLECTION).insertOne(document);
  return toRunRecord(document);
};
