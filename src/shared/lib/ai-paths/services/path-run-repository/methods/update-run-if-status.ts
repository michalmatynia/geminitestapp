import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { AiPathRunUpdate, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { ensureIndexes, RUNS_COLLECTION, toRunRecord, type RunDocument } from './shared';

export const updateRunIfStatus = async (
  runId: string,
  expectedStatuses: string[],
  data: AiPathRunUpdate
): Promise<AiPathRunRecord | null> => {
  await ensureIndexes();
  const statuses = expectedStatuses.filter((s): s is string => typeof s === 'string' && s.length > 0);
  if (statuses.length === 0) return null;
  
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
  const result = (await collection.findOneAndUpdate(
    {
      $or: [{ _id: runId }, { id: runId }],
      status: { $in: statuses },
    },
    { $set: updateData },
    { returnDocument: 'after' }
  )) as RunDocument | null;

  return result !== null ? toRunRecord(result) : null;
};
