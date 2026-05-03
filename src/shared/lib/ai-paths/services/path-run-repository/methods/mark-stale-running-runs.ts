import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  ensureIndexes,
  RUNS_COLLECTION,
  type RunDocument,
} from './shared';

export const markStaleRunningRuns = async (
  maxAgeMs: number
): Promise<{ count: number }> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const cutoff = new Date(Date.now() - maxAgeMs);
  const result = await db.collection<RunDocument>(RUNS_COLLECTION).updateMany(
    {
      status: 'running',
      $or: [
        { startedAt: { $lt: cutoff } },
        {
          $and: [
            {
              $or: [{ startedAt: null }, { startedAt: { $exists: false } }],
            },
            {
              $or: [
                { updatedAt: { $lt: cutoff } },
                {
                  $and: [
                    { $or: [{ updatedAt: { $exists: false } }] },
                    { createdAt: { $lt: cutoff } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      $set: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: 'Run marked failed due to stale running state.',
      },
    }
  );

  return { count: result.modifiedCount };
};
