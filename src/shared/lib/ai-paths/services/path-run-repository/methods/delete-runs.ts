import type { AiPathRunListOptions } from '@/shared/contracts/ai-paths';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  appendRunIdConstraint,
  buildRunFilter,
  resolveRunIdsForNodeFilter,
} from './run-query-helpers';
import {
  ensureIndexes,
  EVENTS_COLLECTION,
  NODES_COLLECTION,
  RUNS_COLLECTION,
  type EventDocument,
  type NodeDocument,
  type RunDocument,
} from './shared';

export const deleteRuns = async (
  options: AiPathRunListOptions = {}
): Promise<{ count: number }> => {
  await ensureIndexes();
  const db = await getMongoDb();
  let filter = buildRunFilter(options);
  const nodeId = options.nodeId !== null && options.nodeId !== undefined ? options.nodeId.trim() : undefined;
  if (nodeId !== undefined && nodeId !== '') {
    const runIdsForNode = await resolveRunIdsForNodeFilter(db, nodeId);
    if (runIdsForNode.length === 0) {
      return { count: 0 };
    }
    filter = appendRunIdConstraint(filter, runIdsForNode);
  }
  const runDocs = await db
    .collection<RunDocument>(RUNS_COLLECTION)
    .find(filter, { projection: { _id: 1, id: 1 } })
    .toArray();
  if (runDocs.length === 0) {
    return { count: 0 };
  }
  const runIds = runDocs
    .map((doc: RunDocument) => doc.id ?? doc._id)
    .filter((value: string | undefined | null): value is string => value !== null && value !== undefined && value !== '');
  if (runIds.length === 0) {
    return { count: 0 };
  }

  const [runDelete] = await Promise.all([
    db.collection<RunDocument>(RUNS_COLLECTION).deleteMany({
      $or: [{ _id: { $in: runIds } }, { id: { $in: runIds } }],
    }),
    db.collection<NodeDocument>(NODES_COLLECTION).deleteMany({ runId: { $in: runIds } }),
    db.collection<EventDocument>(EVENTS_COLLECTION).deleteMany({ runId: { $in: runIds } }),
  ]);

  return { count: runDelete.deletedCount ?? 0 };
};
