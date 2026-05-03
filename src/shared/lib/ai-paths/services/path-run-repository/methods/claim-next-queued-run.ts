import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { ensureIndexes, RUNS_COLLECTION, type RunDocument } from './shared';

export const findNextQueuedRunId = async (): Promise<string | null> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const next = await db.collection<RunDocument>(RUNS_COLLECTION).findOne(
    { status: 'queued', $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }] },
    {
      projection: { _id: 1, id: 1 },
      sort: { createdAt: 1 },
    }
  );

  return next ? next.id ?? next._id : null;
};
