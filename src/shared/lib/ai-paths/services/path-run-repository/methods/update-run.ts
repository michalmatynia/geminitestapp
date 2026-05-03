import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { AiPathRunUpdate, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { ensureIndexes, RUNS_COLLECTION, toRunRecord, type RunDocument } from './shared';

export const updateRun = async (runId: string, data: AiPathRunUpdate): Promise<AiPathRunRecord> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const updateData: Record<string, unknown> = { ...data, updatedAt: now };

  const dateFields: Array<keyof typeof updateData> = ['nextRetryAt', 'startedAt', 'finishedAt'];
  for (const field of dateFields) {
    const value = updateData[field];
    if (typeof value === 'string') {
      updateData[field] = new Date(value);
    }
  }

  const collection = db.collection<RunDocument>(RUNS_COLLECTION);
  const result = await collection.findOneAndUpdate(
    { $or: [{ _id: runId }, { id: runId }] },
    { $set: updateData },
    { returnDocument: 'after' }
  );

  if (!result) {
    throw new Error('Run not found');
  }
  return toRunRecord(result);
};
