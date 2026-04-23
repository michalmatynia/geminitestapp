import type { AiPathRunNodeRecord } from '@/shared/contracts/ai-paths';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  ensureIndexes,
  NODES_COLLECTION,
  toNodeRecord,
  type NodeDocument,
} from './shared';

export const listRunNodesSince = async (
  runId: string,
  cursor: { updatedAt: Date | string; nodeId: string },
  options: { limit?: number } = {}
): Promise<AiPathRunNodeRecord[]> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const updatedAt =
    cursor.updatedAt instanceof Date ? cursor.updatedAt : new Date(cursor.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) {
    return [];
  }

  const nodeId = cursor.nodeId.trim();
  const filter: Record<string, unknown> = {
    runId,
    $or: [{ updatedAt: { $gt: updatedAt } }, { updatedAt, nodeId: { $gt: nodeId } }],
  };
  const limit =
    typeof options.limit === 'number' && options.limit > 0
      ? Math.min(Math.floor(options.limit), 500)
      : 200;

  const docs = await db
    .collection<NodeDocument>(NODES_COLLECTION)
    .find(filter)
    .sort({ updatedAt: 1, nodeId: 1 })
    .limit(limit)
    .toArray();

  return docs.map(toNodeRecord);
};
