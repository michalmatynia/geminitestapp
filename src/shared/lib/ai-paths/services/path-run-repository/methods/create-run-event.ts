import { randomUUID } from 'node:crypto';

import type { AiPathRunEventCreateInput, AiPathRunEventRecord } from '@/shared/contracts/ai-paths';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  ensureIndexes,
  EVENTS_COLLECTION,
  toEventRecord,
  type EventDocument,
} from './shared';

export const createRunEvent = async (
  input: AiPathRunEventCreateInput
): Promise<AiPathRunEventRecord> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const document: EventDocument = {
    _id: randomUUID(),
    runId: input.runId,
    nodeId: input.nodeId ?? null,
    nodeType: input.nodeType ?? null,
    nodeTitle: input.nodeTitle ?? null,
    status: input.status ?? null,
    iteration: input.iteration ?? null,
    level: input.level,
    message: input.message,
    metadata: input.metadata ?? null,
    createdAt: now,
  };

  await db.collection<EventDocument>(EVENTS_COLLECTION).insertOne(document);
  return toEventRecord(document);
};
