import type { AiPathRunQueueStatsOptions } from '@/shared/contracts/ai-paths';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { buildQueueStatsFilter } from './run-query-helpers';
import {
  ensureIndexes,
  RUNS_COLLECTION,
  toDate,
  type RunDocument,
} from './shared';

export const getQueueStats = async (
  options: AiPathRunQueueStatsOptions = {}
): Promise<{ queuedCount: number; oldestQueuedAt: Date | null }> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const filter = buildQueueStatsFilter(options);
  const [queuedCount, oldest] = await Promise.all([
    db.collection<RunDocument>(RUNS_COLLECTION).countDocuments(filter),
    db
      .collection<RunDocument>(RUNS_COLLECTION)
      .find(filter, { projection: { createdAt: 1 } })
      .sort({ createdAt: 1 })
      .limit(1)
      .next(),
  ]);

  return { queuedCount, oldestQueuedAt: toDate(oldest?.createdAt) };
};
