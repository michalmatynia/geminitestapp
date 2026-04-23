import { randomUUID } from 'node:crypto';

import type { AiNode } from '@/shared/contracts/ai-paths';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  ensureIndexes,
  NODES_COLLECTION,
  type NodeDocument,
} from './shared';

export const createRunNodes = async (runId: string, nodes: AiNode[]): Promise<void> => {
  await ensureIndexes();
  if (nodes.length === 0) return;

  const db = await getMongoDb();
  const now = new Date();
  const docs: NodeDocument[] = nodes.map((node: AiNode) => ({
    _id: randomUUID(),
    runId,
    nodeId: node.id,
    nodeType: node.type,
    nodeTitle: node.title ?? null,
    status: 'pending',
    attempt: 0,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  }));

  await db.collection<NodeDocument>(NODES_COLLECTION).insertMany(docs);
};
