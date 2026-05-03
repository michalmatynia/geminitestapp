import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

import {
  ensureIndexes,
  RUNS_COLLECTION,
  toRunRecord,
  type RunDocument,
} from './shared';

export const claimRunForProcessing = async (runId: string): Promise<AiPathRunRecord | null> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const result = await db.collection<RunDocument>(RUNS_COLLECTION).findOneAndUpdate(
    {
      $and: [
        { $or: [{ _id: runId }, { id: runId }] },
        { status: 'queued' },
        { $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }] },
      ],
    },
    { $set: { status: 'running', startedAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );

  return result ? toRunRecord(result) : null;
};
