/**
 * AI Path Run Repository - Query Operations
 * 
 * This module provides read-only operations for querying AI Path runs, nodes, 
 * and events within the MongoDB repository.
 */

import type { Filter } from 'mongodb';
import { databaseError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { 
  AiPathRunRecord, 
  AiPathRunEventListOptions, 
  AiPathRunEventRecord, 
  AiPathRunNodeRecord, 
  AiPathRunListOptions 
} from '@/shared/contracts/ai-paths';
import {
  ensureIndexes,
  EVENTS_COLLECTION,
  NODES_COLLECTION,
  RUNS_COLLECTION,
  toRunRecord,
  toEventRecord,
  toNodeRecord,
  type EventDocument,
  type NodeDocument,
  type RunDocument,
} from './repository-shared';
import {
  appendRunIdConstraint,
  buildRunFilter,
  resolveRunIdsForNodeFilter,
  RUN_LIST_PROJECTION,
} from './repository-shared';

/**
 * Finds a specific run by its internal MongoDB ID or external unique ID.
 */
export const findRunById = async (runId: string): Promise<AiPathRunRecord | null> => {
  try {
    await ensureIndexes();
    const db = await getMongoDb();
    const collection = db.collection<RunDocument>(RUNS_COLLECTION);
    const filter: Filter<RunDocument> = { $or: [{ _id: runId }, { id: runId }] as any };
    const doc = await collection.findOne(filter);
    
    if (doc === null) return null;
    return toRunRecord(doc);
  } catch (error) {
    throw databaseError(`Failed to find run by ID: ${runId}`, error, {
      collection: RUNS_COLLECTION,
      runId,
    });
  }
};

/**
 * Finds a run associated with a specific path and external request ID.
 */
export const getRunByRequestId = async (
  pathId: string,
  requestId: string
): Promise<AiPathRunRecord | null> => {
  try {
    await ensureIndexes();
    const db = await getMongoDb();
    const doc = await db.collection<RunDocument>(RUNS_COLLECTION).findOne({
      pathId,
      'meta.requestId': requestId,
    });
    return doc ? toRunRecord(doc) : null;
  } catch (error) {
    throw databaseError('Failed to get run by request ID.', error, {
      collection: RUNS_COLLECTION,
      pathId,
      requestId,
    });
  }
};

/**
 * Lists events for a specific run, with optional filtering for time or sequence.
 */
export const listRunEvents = async (
  runId: string,
  options: AiPathRunEventListOptions = {}
): Promise<AiPathRunEventRecord[]> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const filter: Record<string, unknown> = { runId };

  const sinceValue = options.since ? new Date(options.since) : null;
  const since = sinceValue !== null && !Number.isNaN(sinceValue.getTime()) ? sinceValue : null;

  const afterDateValue = options.after?.createdAt ? new Date(options.after.createdAt) : null;
  const afterDate =
    afterDateValue !== null && !Number.isNaN(afterDateValue.getTime()) ? afterDateValue : null;
  const afterId =
    typeof options.after?.id === 'string' && options.after.id.trim().length > 0
      ? options.after.id.trim()
      : null;

  if (afterDate !== null && afterId !== null) {
    filter['$or'] = [
      { createdAt: { $gt: afterDate } },
      {
        createdAt: afterDate,
        $or: [{ _id: { $gt: afterId } }, { id: { $gt: afterId } }],
      },
    ];
  } else if (since !== null) {
    filter['createdAt'] = { $gt: since };
  }

  const cursor = db
    .collection<EventDocument>(EVENTS_COLLECTION)
    .find(filter)
    .sort({ createdAt: 1, _id: 1 });

  if (typeof options.limit === 'number') {
    cursor.limit(options.limit);
  }
  const docs = await cursor.toArray();

  return docs.map(toEventRecord);
};

/**
 * Lists all nodes for a specific AI Path run.
 */
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

/**
 * Lists nodes updated after a certain timestamp for synchronization.
 */
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

/**
 * Lists AI Path runs based on dynamic filters.
 */
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
    .sort({ createdAt: -1 })
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
