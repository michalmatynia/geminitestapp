import 'server-only';

import prisma from '@/shared/lib/db/prisma';
import {
  DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
  type DatabaseEngineBackupSchedule,
  type DatabaseEngineBackupTargetSchedule,
  type DatabaseEngineBackupType,
} from '@/shared/lib/db/database-engine-constants';
import {
  getDatabaseEngineBackupSchedule,
  invalidateDatabaseEnginePolicyCache,
} from '@/shared/lib/db/database-engine-policy';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { enqueueProductAiJob } from '@/features/jobs/services/productAiService';
import { ErrorSystem } from '@/features/observability/server';

type TargetEvaluation = {
  dueNow: boolean;
  nextDueAt: string | null;
};

export type DatabaseBackupSchedulerTickResult = {
  checkedAt: string;
  schedulerEnabled: boolean;
  triggered: Array<{ dbType: DatabaseEngineBackupType; jobId: string }>;
  skipped: Array<{ dbType: DatabaseEngineBackupType; reason: string }>;
};

export type DatabaseEngineBackupSchedulerStatus = {
  timestamp: string;
  schedulerEnabled: boolean;
  lastCheckedAt: string | null;
  targets: {
    mongodb: DatabaseEngineBackupTargetSchedule & { dueNow: boolean };
    postgresql: DatabaseEngineBackupTargetSchedule & { dueNow: boolean };
  };
};

const LOG_SOURCE = 'database-backup-scheduler';
const SETTINGS_COLLECTION = 'settings';

const parseIsoDate = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseTimeUtc = (value: string): { hour: number; minute: number } => {
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number.parseInt(hourRaw ?? '', 10);
  const minute = Number.parseInt(minuteRaw ?? '', 10);
  return {
    hour: Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 0,
    minute: Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : 0,
  };
};

const setUtcTime = (date: Date, hour: number, minute: number): Date =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hour,
      minute,
      0,
      0,
    ),
  );

const addUtcDays = (date: Date, days: number): Date => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const computeNextDueAfter = (
  reference: Date,
  target: DatabaseEngineBackupTargetSchedule,
): Date => {
  const { hour, minute } = parseTimeUtc(target.timeUtc);

  if (target.cadence === 'weekly') {
    let candidate = setUtcTime(reference, hour, minute);
    for (let i = 0; i < 14; i += 1) {
      if (candidate.getUTCDay() === target.weekday && candidate.getTime() > reference.getTime()) {
        return candidate;
      }
      candidate = addUtcDays(candidate, 1);
    }
    return addUtcDays(setUtcTime(reference, hour, minute), 7);
  }

  const stepDays = target.cadence === 'every_n_days' ? Math.max(1, target.intervalDays) : 1;
  let candidate = setUtcTime(reference, hour, minute);
  while (candidate.getTime() <= reference.getTime()) {
    candidate = addUtcDays(candidate, stepDays);
  }
  return candidate;
};

const computeFirstDueForNow = (
  now: Date,
  target: DatabaseEngineBackupTargetSchedule,
): Date => {
  const { hour, minute } = parseTimeUtc(target.timeUtc);

  if (target.cadence === 'weekly') {
    const base = setUtcTime(now, hour, minute);
    const dayDelta = target.weekday - base.getUTCDay();
    return addUtcDays(base, dayDelta);
  }

  return setUtcTime(now, hour, minute);
};

export const evaluateBackupTargetSchedule = (
  target: DatabaseEngineBackupTargetSchedule,
  now: Date,
): TargetEvaluation => {
  if (!target.enabled) {
    return {
      dueNow: false,
      nextDueAt: target.nextDueAt,
    };
  }

  const reference = parseIsoDate(target.lastQueuedAt) ?? parseIsoDate(target.lastRunAt);
  if (reference) {
    const nextDue = computeNextDueAfter(reference, target);
    return {
      dueNow: now.getTime() >= nextDue.getTime(),
      nextDueAt: nextDue.toISOString(),
    };
  }

  const firstDue = computeFirstDueForNow(now, target);
  return {
    dueNow: now.getTime() >= firstDue.getTime(),
    nextDueAt: firstDue.toISOString(),
  };
};

const persistBackupSchedule = async (schedule: DatabaseEngineBackupSchedule): Promise<void> => {
  const value = JSON.stringify(schedule);
  let wrotePrisma = false;
  let wroteMongo = false;

  if (process.env['DATABASE_URL']) {
    try {
      await prisma.setting.upsert({
        where: { key: DATABASE_ENGINE_BACKUP_SCHEDULE_KEY },
        update: { value },
        create: { key: DATABASE_ENGINE_BACKUP_SCHEDULE_KEY, value },
      });
      wrotePrisma = true;
    } catch {
      wrotePrisma = false;
    }
  }

  if (process.env['MONGODB_URI']) {
    try {
      const mongo = await getMongoDb();
      const now = new Date();
      await mongo.collection(SETTINGS_COLLECTION).updateOne(
        { key: DATABASE_ENGINE_BACKUP_SCHEDULE_KEY },
        {
          $set: { value, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
      wroteMongo = true;
    } catch {
      wroteMongo = false;
    }
  }

  if (!wrotePrisma && !wroteMongo) {
    throw new Error('No settings store available to persist backup schedule.');
  }

  invalidateDatabaseEnginePolicyCache();
};

const enqueueScheduledBackup = async (dbType: DatabaseEngineBackupType): Promise<string> => {
  const job = await enqueueProductAiJob('system', 'db_backup', {
    dbType,
    entityType: 'system',
    source: 'database_backup_scheduler',
  });

  try {
    const queueModule = await import('@/features/jobs/workers/productAiQueue');
    queueModule.startProductAiJobQueue();
    void queueModule
      .enqueueProductAiJobToQueue(job.id, job.productId, job.type, job.payload)
      .catch((error: unknown) => {
        void ErrorSystem.captureException(error, {
          service: LOG_SOURCE,
          context: {
            dbType,
            jobId: job.id,
            action: 'enqueueScheduledBackupRuntimeQueue',
          },
        });
      });
  } catch (error: unknown) {
    void ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      context: {
        dbType,
        jobId: job.id,
        action: 'importProductAiQueue',
      },
    });
  }

  return job.id;
};

const targetKeys: DatabaseEngineBackupType[] = ['mongodb', 'postgresql'];

export async function tickDatabaseBackupScheduler(now = new Date()): Promise<DatabaseBackupSchedulerTickResult> {
  const checkedAt = now.toISOString();
  const schedule = await getDatabaseEngineBackupSchedule();
  let nextSchedule: DatabaseEngineBackupSchedule = {
    ...schedule,
    mongodb: { ...schedule.mongodb },
    postgresql: { ...schedule.postgresql },
  };
  const result: DatabaseBackupSchedulerTickResult = {
    checkedAt,
    schedulerEnabled: schedule.schedulerEnabled,
    triggered: [],
    skipped: [],
  };
  let changed = false;

  for (const dbType of targetKeys) {
    const currentTarget = nextSchedule[dbType];
    const evaluated = evaluateBackupTargetSchedule(currentTarget, now);

    if (currentTarget.nextDueAt !== evaluated.nextDueAt) {
      nextSchedule = {
        ...nextSchedule,
        [dbType]: {
          ...currentTarget,
          nextDueAt: evaluated.nextDueAt,
        },
      };
      changed = true;
    }

    if (!schedule.schedulerEnabled) {
      result.skipped.push({ dbType, reason: 'scheduler_disabled' });
      continue;
    }

    if (!currentTarget.enabled) {
      result.skipped.push({ dbType, reason: 'target_disabled' });
      continue;
    }

    if (!evaluated.dueNow) {
      result.skipped.push({ dbType, reason: 'not_due' });
      continue;
    }

    try {
      const jobId = await enqueueScheduledBackup(dbType);
      const nextDueAt = computeNextDueAfter(now, currentTarget).toISOString();
      nextSchedule = {
        ...nextSchedule,
        lastCheckedAt: checkedAt,
        [dbType]: {
          ...currentTarget,
          lastQueuedAt: checkedAt,
          lastStatus: 'queued',
          lastJobId: jobId,
          lastError: null,
          nextDueAt,
        },
      };
      changed = true;
      result.triggered.push({ dbType, jobId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      nextSchedule = {
        ...nextSchedule,
        lastCheckedAt: checkedAt,
        [dbType]: {
          ...currentTarget,
          lastStatus: 'failed',
          lastError: message,
        },
      };
      changed = true;
      result.skipped.push({ dbType, reason: 'enqueue_failed' });
      await ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        context: { dbType, action: 'enqueueScheduledBackup' },
      });
    }
  }

  if (changed) {
    await persistBackupSchedule(nextSchedule);
  }

  return result;
}

const updateBackupScheduleForTarget = async (
  dbType: DatabaseEngineBackupType,
  updater: (target: DatabaseEngineBackupTargetSchedule, now: Date) => DatabaseEngineBackupTargetSchedule,
): Promise<void> => {
  const now = new Date();
  const checkedAt = now.toISOString();
  const schedule = await getDatabaseEngineBackupSchedule();
  const currentTarget = schedule[dbType];
  const nextTarget = updater({ ...currentTarget }, now);
  const nextSchedule: DatabaseEngineBackupSchedule = {
    ...schedule,
    lastCheckedAt: checkedAt,
    mongodb: dbType === 'mongodb' ? nextTarget : { ...schedule.mongodb },
    postgresql: dbType === 'postgresql' ? nextTarget : { ...schedule.postgresql },
  };

  if (JSON.stringify(nextSchedule) === JSON.stringify(schedule)) return;
  await persistBackupSchedule(nextSchedule);
};

export async function markDatabaseBackupJobRunning(
  dbType: DatabaseEngineBackupType,
  jobId: string,
): Promise<void> {
  await updateBackupScheduleForTarget(dbType, (target, now) => ({
    ...target,
    lastQueuedAt: target.lastQueuedAt ?? now.toISOString(),
    lastStatus: 'running',
    lastJobId: jobId,
    lastError: null,
  }));
}

export async function markDatabaseBackupJobQueued(
  dbType: DatabaseEngineBackupType,
  jobId: string,
): Promise<void> {
  await updateBackupScheduleForTarget(dbType, (target, now) => ({
    ...target,
    lastQueuedAt: now.toISOString(),
    lastStatus: 'queued',
    lastJobId: jobId,
    lastError: null,
    nextDueAt: computeNextDueAfter(now, target).toISOString(),
  }));
}

export async function markDatabaseBackupJobSucceeded(
  dbType: DatabaseEngineBackupType,
  jobId: string,
): Promise<void> {
  await updateBackupScheduleForTarget(dbType, (target, now) => ({
    ...target,
    lastQueuedAt: target.lastQueuedAt ?? now.toISOString(),
    lastRunAt: now.toISOString(),
    lastStatus: 'success',
    lastJobId: jobId,
    lastError: null,
    nextDueAt: computeNextDueAfter(now, target).toISOString(),
  }));
}

export async function markDatabaseBackupJobFailed(
  dbType: DatabaseEngineBackupType,
  jobId: string,
  errorMessage: string,
): Promise<void> {
  await updateBackupScheduleForTarget(dbType, (target, now) => ({
    ...target,
    lastQueuedAt: target.lastQueuedAt ?? now.toISOString(),
    lastStatus: 'failed',
    lastJobId: jobId,
    lastError: errorMessage,
    nextDueAt: computeNextDueAfter(now, target).toISOString(),
  }));
}

export async function getDatabaseBackupSchedulerStatus(
  now = new Date(),
): Promise<DatabaseEngineBackupSchedulerStatus> {
  const schedule = await getDatabaseEngineBackupSchedule();
  const mongoEvaluation = evaluateBackupTargetSchedule(schedule.mongodb, now);
  const postgresEvaluation = evaluateBackupTargetSchedule(schedule.postgresql, now);

  return {
    timestamp: now.toISOString(),
    schedulerEnabled: schedule.schedulerEnabled,
    lastCheckedAt: schedule.lastCheckedAt,
    targets: {
      mongodb: {
        ...schedule.mongodb,
        nextDueAt: mongoEvaluation.nextDueAt,
        dueNow:
          schedule.schedulerEnabled &&
          schedule.mongodb.enabled &&
          mongoEvaluation.dueNow,
      },
      postgresql: {
        ...schedule.postgresql,
        nextDueAt: postgresEvaluation.nextDueAt,
        dueNow:
          schedule.schedulerEnabled &&
          schedule.postgresql.enabled &&
          postgresEvaluation.dueNow,
      },
    },
  };
}
