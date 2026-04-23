import type { AiPathRunListOptions, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  appendRunIdConstraint,
  buildRunFilter,
  resolveRunIdsForNodeFilter,
  RUN_LIST_PROJECTION,
} from './run-query-helpers';
import {
  ensureIndexes,
  RUNS_COLLECTION,
  toRunRecord,
  type RunDocument,
} from './shared';

const getSortDirection = (_options: AiPathRunListOptions): Record<string, 1 | -1> => {
  return { createdAt: -1 };
};

export const listRuns = async (
  options: AiPathRunListOptions = {}
): Promise<{ runs: AiPathRunRecord[]; total: number }> => {
  await ensureIndexes();
  const db = await getMongoDb();
  let filter = buildRunFilter(options);
  const nodeId = options.nodeId !== null && options.nodeId !== undefined ? options.nodeId.trim() : undefined;

  if (nodeId !== undefined && nodeId !== '') {
    const runIds = await resolveRunIdsForNodeFilter(db, nodeId);
    if (runIds.length === 0) return { runs: [], total: 0 };
    filter = appendRunIdConstraint(filter, runIds);
  }

  const cursor = db
    .collection<RunDocument>(RUNS_COLLECTION)
    .find(filter, { projection: RUN_LIST_PROJECTION })
    .sort(getSortDirection(options))
    .allowDiskUse(true);

  if (typeof options.offset === 'number') cursor.skip(options.offset);
  if (typeof options.limit === 'number') cursor.limit(options.limit);

  const docs = await cursor.toArray();
  const includeTotal = options.includeTotal ?? true;
  const total = includeTotal 
    ? await db.collection<RunDocument>(RUNS_COLLECTION).countDocuments(filter)
    : docs.length;

  return { runs: docs.map(toRunRecord), total };
};
