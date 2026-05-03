import type { AiPathRunNodeRecord } from '@/shared/contracts/ai-paths';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  ensureIndexes,
  NODES_COLLECTION,
  toNodeRecord,
  type NodeDocument,
} from './shared';

export const listRunNodes = async (runId: string): Promise<AiPathRunNodeRecord[]> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const docs = await db
    .collection<NodeDocument>(NODES_COLLECTION)
    .find({ runId })
    .sort({ createdAt: 1 })
    .toArray();

  return docs.map(toNodeRecord);
};
