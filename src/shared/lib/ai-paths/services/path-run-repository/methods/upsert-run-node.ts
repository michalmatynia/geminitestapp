import type { AiPathRunNodeRecord, AiPathRunNodeUpdate } from '@/shared/contracts/ai-paths';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  ensureIndexes,
  NODES_COLLECTION,
  toNodeRecord,
  type NodeDocument,
} from './shared';

export const upsertRunNode = async (
  runId: string,
  nodeId: string,
  data: AiPathRunNodeUpdate & { nodeType: string; nodeTitle?: string | null }
): Promise<AiPathRunNodeRecord> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: now,
  };

  const dateFields: Array<keyof typeof updateData> = ['startedAt', 'finishedAt'];
  for (const field of dateFields) {
    const value = updateData[field];
    if (typeof value === 'string') {
      updateData[field] = new Date(value);
    }
  }

  const collection = db.collection<NodeDocument>(NODES_COLLECTION);
  const result = await collection.findOneAndUpdate(
    { runId, nodeId },
    { $set: updateData, $setOnInsert: { runId, nodeId, createdAt: now } },
    { returnDocument: 'after', upsert: true }
  ) as NodeDocument | { value: NodeDocument | null } | null;

  const value =
    result && typeof result === 'object' && 'value' in result ? result.value : result;
  if (value === null) {
    throw new Error('Run node not found');
  }

  return toNodeRecord(value);
};
