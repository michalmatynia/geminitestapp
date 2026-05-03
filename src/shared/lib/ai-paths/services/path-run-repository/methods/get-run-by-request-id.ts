import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

import {
  ensureIndexes,
  RUNS_COLLECTION,
  toRunRecord,
  type RunDocument,
} from './shared';

export const getRunByRequestId = async (
  pathId: string,
  requestId: string
): Promise<AiPathRunRecord | null> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const doc = await db.collection<RunDocument>(RUNS_COLLECTION).findOne({
    pathId,
    'meta.requestId': requestId,
  });

  return doc ? toRunRecord(doc) : null;
};
