import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { ensureIndexes, RUNS_COLLECTION, toRunRecord, type RunDocument } from './shared';
import type { Filter } from 'mongodb';

export const findRunById = async (runId: string): Promise<AiPathRunRecord | null> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const collection = db.collection<RunDocument>(RUNS_COLLECTION);
  const filter: Filter<RunDocument> = { $or: [{ _id: runId }, { id: runId }] as any };
  const doc = await collection.findOne(filter);
  
  if (doc === null) return null;
  return toRunRecord(doc);
};
