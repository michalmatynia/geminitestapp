import type { AiPathRunStatus } from '@/shared/contracts/ai-paths';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { buildRunFilter } from './run-query-helpers';
import {
  ensureIndexes,
  RUNS_COLLECTION,
} from './shared';

export const writeFinalizedRunState = async (
  runId: string,
  status: AiPathRunStatus,
  options?: {
    errorMessage?: string | null;
    finishedAt?: string | null;
  }
): Promise<void> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const finishedAtRaw = options?.finishedAt;
  const finishedAt = (typeof finishedAtRaw === 'string' && finishedAtRaw !== '') ? new Date(finishedAtRaw) : new Date();

  await db.collection(RUNS_COLLECTION).bulkWrite([
    {
      updateOne: {
        filter: buildRunFilter({ id: runId }),
        update: {
          $set: {
            status,
            errorMessage: options?.errorMessage ?? null,
            finishedAt,
            updatedAt: new Date(),
          },
        },
      },
    },
  ]);
};
