/**
 * AI Path Run Repository - CRUD Operations
 * 
 * This module provides core Create, Read, Update, and Delete (CRUD) operations 
 * for AI Path runs within the MongoDB repository.
 */

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { randomUUID } from 'node:crypto';
import type { AiPathRunCreateInput, AiPathRunRecord, AiPathRunUpdate, AiPathRunListOptions, AiPathRunStatus } from '@/shared/contracts/ai-paths';
import {
  ensureIndexes,
  EVENTS_COLLECTION,
  NODES_COLLECTION,
  RUNS_COLLECTION,
  toRunRecord,
  type EventDocument,
  type NodeDocument,
  type RunDocument,
} from './repository-shared';
import {
  appendRunIdConstraint,
  buildRunFilter,
  resolveRunIdsForNodeFilter,
} from './repository-shared';

/**
 * Creates a new AI Path run record.
 * 
 * @param {AiPathRunCreateInput} input - The input data for the new run.
 * @returns {Promise<AiPathRunRecord>} The newly created run record.
 */
export const createRun = async (input: AiPathRunCreateInput): Promise<AiPathRunRecord> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const id = randomUUID();
  const document: RunDocument = {
    _id: id,
    id,
    userId: input.userId ?? null,
    pathId: input.pathId ?? null,
    pathName: input.pathName ?? null,
    status: input.status ?? 'queued',
    triggerEvent: input.triggerEvent ?? null,
    triggerNodeId: input.triggerNodeId ?? null,
    triggerContext: input.triggerContext ?? null,
    graph: (input.graph as Record<string, unknown>) ?? null,
    runtimeState: (input.runtimeState as Record<string, unknown>) ?? null,
    meta: input.meta ?? null,
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? null,
    errorMessage: null,
    retryCount: input.retryCount ?? 0,
    maxAttempts: input.maxAttempts ?? 3,
    nextRetryAt: input.nextRetryAt ? new Date(input.nextRetryAt) : null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };

  await db.collection<RunDocument>(RUNS_COLLECTION).insertOne(document);
  return toRunRecord(document);
};

/**
 * Deletes an AI Path run and its associated nodes and events.
 * 
 * @param {string} runId - The ID of the run to delete.
 * @returns {Promise<boolean>} True if the run was found and deleted, false otherwise.
 */
export const deleteRun = async (runId: string): Promise<boolean> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const doc = await db
    .collection<RunDocument>(RUNS_COLLECTION)
    .findOneAndDelete({ $or: [{ _id: runId }, { id: runId }] });
    
  if (doc === null) return false;

  const effectiveRunId = doc.id ?? doc._id;
  await Promise.all([
    db.collection<NodeDocument>(NODES_COLLECTION).deleteMany({ runId: effectiveRunId }),
    db.collection<EventDocument>(EVENTS_COLLECTION).deleteMany({ runId: effectiveRunId }),
  ]);
  return true;
};

/**
 * Deletes multiple AI Path runs based on provided filters.
 * 
 * @param {AiPathRunListOptions} [options] - Filters to identify runs for deletion.
 * @returns {Promise<{ count: number }>} The count of deleted runs.
 */
export const deleteRuns = async (
  options: AiPathRunListOptions = {}
): Promise<{ count: number }> => {
  await ensureIndexes();
  const db = await getMongoDb();
  let filter = buildRunFilter(options);
  const nodeId = options.nodeId?.trim();

  if (nodeId !== undefined && nodeId !== '') {
    const runIdsForNode = await resolveRunIdsForNodeFilter(db, nodeId);
    if (runIdsForNode.length === 0) return { count: 0 };
    filter = appendRunIdConstraint(filter, runIdsForNode);
  }

  const runDocs = await db
    .collection<RunDocument>(RUNS_COLLECTION)
    .find(filter, { projection: { _id: 1, id: 1 } })
    .toArray();

  if (runDocs.length === 0) return { count: 0 };

  const runIds = runDocs
    .map((doc: RunDocument) => doc.id ?? doc._id)
    .filter((value): value is string => typeof value === 'string' && value !== '');
    
  if (runIds.length === 0) return { count: 0 };

  const [runDelete] = await Promise.all([
    db.collection<RunDocument>(RUNS_COLLECTION).deleteMany({
      $or: [{ _id: { $in: runIds } }, { id: { $in: runIds } }],
    }),
    db.collection<NodeDocument>(NODES_COLLECTION).deleteMany({ runId: { $in: runIds } }),
    db.collection<EventDocument>(EVENTS_COLLECTION).deleteMany({ runId: { $in: runIds } }),
  ]);

  return { count: runDelete.deletedCount };
};

/**
 * Updates an existing AI Path run record.
 * 
 * @param {string} runId - The ID of the run to update.
 * @param {AiPathRunUpdate} data - The updated data.
 * @returns {Promise<AiPathRunRecord>} The updated run record.
 */
export const updateRun = async (runId: string, data: AiPathRunUpdate): Promise<AiPathRunRecord> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const updateData: Record<string, unknown> = { ...data, updatedAt: now };

  const dateFields: Array<keyof typeof updateData> = ['nextRetryAt', 'startedAt', 'finishedAt'];
  for (const field of dateFields) {
    const value = updateData[field];
    if (typeof value === 'string') {
      updateData[field] = new Date(value);
    }
  }

  const collection = db.collection<RunDocument>(RUNS_COLLECTION);
  const result = await collection.findOneAndUpdate(
    { $or: [{ _id: runId }, { id: runId }] },
    { $set: updateData },
    { returnDocument: 'after' }
  );

  if (!result) {
    // Run with the specified ID does not exist in the database
    throw new Error('Run not found');
  }
  return toRunRecord(result);
};

/**
 * Updates an AI Path run only if its current status is among the expected values.
 * Useful for state transitions (e.g., only update running runs).
 * 
 * @param {string} runId - The ID of the run to update.
 * @param {string[]} expectedStatuses - Allowed current statuses.
 * @param {AiPathRunUpdate} data - The updated data.
 * @returns {Promise<AiPathRunRecord | null>} The updated record or null if status mismatch.
 */
export const updateRunIfStatus = async (
  runId: string,
  expectedStatuses: string[],
  data: AiPathRunUpdate
): Promise<AiPathRunRecord | null> => {
  await ensureIndexes();
  const statuses = expectedStatuses.filter((s): s is string => typeof s === 'string' && s.length > 0);
  if (statuses.length === 0) return null;
  
  const db = await getMongoDb();
  const now = new Date();
  const updateData: Record<string, unknown> = { ...data, updatedAt: now };

  const dateFields: Array<keyof typeof updateData> = ['nextRetryAt', 'startedAt', 'finishedAt'];
  for (const field of dateFields) {
    const value = updateData[field];
    if (typeof value === 'string') {
      updateData[field] = new Date(value);
    }
  }

  const collection = db.collection<RunDocument>(RUNS_COLLECTION);
  const result = (await collection.findOneAndUpdate(
    {
      $or: [{ _id: runId }, { id: runId }],
      status: { $in: statuses },
    },
    { $set: updateData },
    { returnDocument: 'after' }
  )) as RunDocument | null;

  return result !== null ? toRunRecord(result) : null;
};

/**
 * Finalizes the run state (e.g., marking as completed/failed) with associated error metadata.
 * 
 * @param {string} runId - The ID of the run to finalize.
 * @param {AiPathRunStatus} status - The final status.
 * @param {Object} [options] - Finalization details.
 * @param {string | null} [options.errorMessage] - Any final error message.
 * @param {string | null} [options.finishedAt] - The ISO string for finalization time.
 */
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
