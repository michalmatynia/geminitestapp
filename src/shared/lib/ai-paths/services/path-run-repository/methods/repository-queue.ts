/**
 * AI Path Run Repository - Queue Operations
 * 
 * This module provides operations for managing the AI Path run queue,
 * including state transitions (queued to running), queue health metrics, 
 * and cleanup of stale tasks.
 */

import type { AiPathRunQueueStatsOptions, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  buildQueueStatsFilter,
  ensureIndexes,
  RUNS_COLLECTION,
  toDate,
  toRunRecord,
  type RunDocument,
} from './repository-shared';

/**
 * Finds the next available queued run ID based on priority (createdAt).
 * 
 * @returns {Promise<string | null>} The run ID or null if none queued.
 */
export const findNextQueuedRunId = async (): Promise<string | null> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const next = await db.collection<RunDocument>(RUNS_COLLECTION).findOne(
    { status: 'queued', $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }] },
    {
      projection: { _id: 1, id: 1 },
      sort: { createdAt: 1 },
    }
  );

  return next ? next.id ?? next._id : null;
};

/**
 * Atomically transitions a run from 'queued' to 'running'.
 * 
 * @param {string} runId - The run ID to claim.
 * @returns {Promise<AiPathRunRecord | null>} The updated record or null if claim failed.
 */
export const claimRunForProcessing = async (runId: string): Promise<AiPathRunRecord | null> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const result = await db.collection<RunDocument>(RUNS_COLLECTION).findOneAndUpdate(
    {
      $and: [
        { $or: [{ _id: runId }, { id: runId }] },
        { status: 'queued' },
        { $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }] },
      ],
    },
    { $set: { status: 'running', startedAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );

  return result ? toRunRecord(result) : null;
};

/**
 * Retrieves aggregate statistics about the queue.
 * 
 * @param {AiPathRunQueueStatsOptions} [options] - Filters for queue stats.
 * @returns {Promise<{ queuedCount: number; oldestQueuedAt: Date | null }>} Count and oldest item timestamp.
 */
export const getQueueStats = async (
  options: AiPathRunQueueStatsOptions = {}
): Promise<{ queuedCount: number; oldestQueuedAt: Date | null }> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const filter = buildQueueStatsFilter(options);
  const [queuedCount, oldest] = await Promise.all([
    db.collection<RunDocument>(RUNS_COLLECTION).countDocuments(filter),
    db
      .collection<RunDocument>(RUNS_COLLECTION)
      .find(filter, { projection: { createdAt: 1 } })
      .sort({ createdAt: 1 })
      .limit(1)
      .next(),
  ]);

  return { queuedCount, oldestQueuedAt: toDate(oldest?.createdAt) };
};

/**
 * Finds and marks 'running' runs as 'failed' if they have exceeded the maximum allowed age.
 * 
 * @param {number} maxAgeMs - The maximum duration (ms) a run can remain in 'running' status.
 * @returns {Promise<{ count: number }>} The count of runs transitioned to failed.
 */
export const markStaleRunningRuns = async (
  maxAgeMs: number
): Promise<{ count: number }> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const cutoff = new Date(Date.now() - maxAgeMs);
  const result = await db.collection<RunDocument>(RUNS_COLLECTION).updateMany(
    {
      status: 'running',
      $or: [
        { startedAt: { $lt: cutoff } },
        {
          $and: [
            {
              $or: [{ startedAt: null }, { startedAt: { $exists: false } }],
            },
            {
              $or: [
                { updatedAt: { $lt: cutoff } },
                {
                  $and: [
                    { $or: [{ updatedAt: { $exists: false } }] },
                    { createdAt: { $lt: cutoff } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      $set: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: 'Run marked failed due to stale running state.',
      },
    }
  );

  return { count: result.modifiedCount };
};
