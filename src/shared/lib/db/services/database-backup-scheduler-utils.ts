import 'server-only';

import {
  getDatabaseEngineBackupSchedule,
  invalidateDatabaseEnginePolicyCache,
} from '@/shared/lib/db/database-engine-policy';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { DATABASE_ENGINE_BACKUP_SCHEDULE_KEY } from '@/shared/lib/db/database-engine-constants';
import { enqueueProductAiJob } from '@/shared/lib/products/services/productAiService';
import { getRegisteredQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type {
  DatabaseEngineBackupSchedule,
  DatabaseEngineBackupTargetSchedule,
} from '@/shared/contracts/database';
import type { DatabaseEngineBackupType } from '@/shared/lib/db/database-engine-constants';

export { getDatabaseEngineBackupSchedule };

export async function persistBackupSchedule(schedule: DatabaseEngineBackupSchedule): Promise<void> {
  const db = await getMongoDb();
  await db.collection('settings').updateOne(
    { key: DATABASE_ENGINE_BACKUP_SCHEDULE_KEY },
    { $set: { key: DATABASE_ENGINE_BACKUP_SCHEDULE_KEY, value: JSON.stringify(schedule) } },
    { upsert: true }
  );
  invalidateDatabaseEnginePolicyCache();
}

const PRODUCT_AI_QUEUE_NAME = 'product-ai';

export async function enqueueScheduledBackup(dbType: DatabaseEngineBackupType): Promise<string> {
  const job = await enqueueProductAiJob('system', 'db_backup', {
    dbType,
    entityType: 'system',
    source: 'database_backup_scheduler',
  });

  const queue = getRegisteredQueue(PRODUCT_AI_QUEUE_NAME);
  if (!queue) {
    void ErrorSystem.logWarning(
      '[database-backup-scheduler] product-ai queue not found in registry',
      { jobId: job.id, service: 'database-backup-scheduler' }
    );
    throw new Error('[database-backup-scheduler] product-ai queue not found');
  }

  await queue.enqueue({
    jobId: job.id,
    productId: 'system',
    type: 'db_backup',
    payload: { dbType, entityType: 'system', source: 'database_backup_scheduler' },
  });
  queue.startWorker();

  return job.id;
}

function parseTimeUtc(timeUtc: string): { hours: number; minutes: number } {
  const parts = timeUtc.split(':');
  return { hours: Number(parts[0] ?? 0), minutes: Number(parts[1] ?? 0) };
}

function dateAtTimeUtc(date: Date, timeUtc: string): Date {
  const { hours, minutes } = parseTimeUtc(timeUtc);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function computeNextDueAtFromTarget(
  target: DatabaseEngineBackupTargetSchedule,
  now: Date
): string | null {
  const { cadence, intervalDays, weekday, timeUtc, lastQueuedAt } = target;

  if (cadence === 'weekly') {
    const nowDay = now.getUTCDay();
    if (nowDay === weekday) {
      return dateAtTimeUtc(now, timeUtc).toISOString();
    }
    let daysUntil = (weekday - nowDay + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    return dateAtTimeUtc(addDays(now, daysUntil), timeUtc).toISOString();
  }

  const interval = cadence === 'daily' ? 1 : intervalDays;

  if (lastQueuedAt) {
    const lastQueued = new Date(lastQueuedAt);
    return dateAtTimeUtc(addDays(lastQueued, interval), timeUtc).toISOString();
  }

  return dateAtTimeUtc(now, timeUtc).toISOString();
}

export function evaluateBackupTargetSchedule(
  target: DatabaseEngineBackupTargetSchedule,
  now: Date
): { dueNow: boolean; nextDueAt: string | null } {
  if (!target.enabled) {
    return { dueNow: false, nextDueAt: target.nextDueAt };
  }

  const nextDueAt = computeNextDueAtFromTarget(target, now);
  if (!nextDueAt) {
    return { dueNow: false, nextDueAt: null };
  }

  return { dueNow: now >= new Date(nextDueAt), nextDueAt };
}

export function computeNextDueAfter(now: Date, target: DatabaseEngineBackupTargetSchedule): Date {
  const { cadence, intervalDays, weekday, timeUtc } = target;

  if (cadence === 'weekly') {
    const nowDay = now.getUTCDay();
    let daysUntil = (weekday - nowDay + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    return dateAtTimeUtc(addDays(now, daysUntil), timeUtc);
  }

  const interval = cadence === 'daily' ? 1 : intervalDays;
  return dateAtTimeUtc(addDays(now, interval), timeUtc);
}
