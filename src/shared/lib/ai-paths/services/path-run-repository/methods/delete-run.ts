import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  ensureIndexes,
  EVENTS_COLLECTION,
  NODES_COLLECTION,
  RUNS_COLLECTION,
  type EventDocument,
  type NodeDocument,
  type RunDocument,
} from './shared';

export const deleteRun = async (runId: string): Promise<boolean> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const existing = await db
    .collection<RunDocument>(RUNS_COLLECTION)
    .findOneAndDelete({ $or: [{ _id: runId }, { id: runId }] });
  const doc = existing;
  if (doc === null) return false;

  const effectiveRunId = doc.id ?? doc._id;
  await Promise.all([
    db.collection<NodeDocument>(NODES_COLLECTION).deleteMany({ runId: effectiveRunId }),
    db.collection<EventDocument>(EVENTS_COLLECTION).deleteMany({ runId: effectiveRunId }),
  ]);
  return true;
};
