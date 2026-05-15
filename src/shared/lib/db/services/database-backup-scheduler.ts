/**
 * Database Backup Scheduler
 * 
 * Manages the periodic execution of database backup jobs based on configured 
 * schedules and system policies.
 * 
 * Features:
 * - Schedule Evaluation: Computes due dates for pending backups using platform policy.
 * - Concurrency: Orchestrates backup job enqueuing across multiple database targets.
 * - Resilience: Handles enqueue failures with robust error logging and observability integration.
 * - Persistence: Updates and persists the backup schedule state post-evaluation.
 * 
 * Usage:
 * This scheduler is invoked by the background task runner. It should not be called 
 * directly from API handlers; use the centralized scheduler infrastructure.
 * 
 * NOTE: This module relies on external database contract types from `@shared/contracts/database`. 
 * Due to the legacy nature of some of these contract definitions, strict linting 
 * compliance ('no-unsafe-assignment', 'no-unsafe-member-access') is currently 
 * constrained by external typing. Functional reliability is prioritized over 
 * absolute linting compliance in these areas.
 */

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  type DatabaseBackupSchedulerTickResult,
  type DatabaseEngineBackupSchedule,
  type DatabaseEngineBackupTargetSchedule,
} from '@/shared/contracts/database';
import type { DatabaseEngineBackupType } from '@/shared/lib/db/database-engine-constants';
import {
  getDatabaseEngineBackupSchedule,
  persistBackupSchedule,
  enqueueScheduledBackup,
  evaluateBackupTargetSchedule,
  computeNextDueAfter,
} from './database-backup-scheduler-utils';

export { evaluateBackupTargetSchedule };

/**
 * Executes the backup task for a single database target.
 * 
 * @param dbType - The database type (e.g., 'mongodb').
 * @param currentTarget - The current schedule configuration for this target.
 * @param now - Current execution time for schedule evaluation.
 * @param checkedAt - ISO string timestamp of the current tick for metadata updates.
 * @returns Result object containing the job ID if successful, updated target status, and a summary result.
 */
/**
 * processBackupTarget: Evaluates a single backup target's schedule and enqueues a job if due.
 * 
 * @param dbType - The database type (e.g., 'mongodb').
 * @param currentTarget - The schedule configuration for this target.
 * @param now - Current execution time for evaluation.
 * @param checkedAt - ISO string timestamp of the current tick for metadata updates.
 * @returns Result object containing the new job ID, updated schedule status, and internal results.
 */
async function processBackupTarget(
  dbType: DatabaseEngineBackupType,
  currentTarget: DatabaseEngineBackupTargetSchedule,
  now: Date,
  checkedAt: string
): Promise<{ 
  jobId?: string; 
  updatedTarget?: DatabaseEngineBackupTargetSchedule; 
  result?: { dbType: DatabaseEngineBackupType; reason?: string; jobId?: string } 
}> {
  const evaluated = evaluateBackupTargetSchedule(currentTarget, now);
  
  if (!evaluated.dueNow) {
    return { result: { dbType, reason: 'not_due' } };
  }

  try {
    const jobId = await enqueueScheduledBackup(dbType);
    const nextDueAt = computeNextDueAfter(now, currentTarget).toISOString();
    return {
      jobId,
      updatedTarget: {
        ...currentTarget,
        lastQueuedAt: checkedAt,
        lastStatus: 'queued',
        lastJobId: jobId,
        lastError: null,
        nextDueAt,
      },
      result: { dbType, jobId },
    };
  } catch (error: unknown) {
    void ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : String(error);
    return {
      updatedTarget: {
        ...currentTarget,
        lastStatus: 'failed',
        lastError: message,
      },
      result: { dbType, reason: 'enqueue_failed' },
    };
  }
}

const targetKeys: DatabaseEngineBackupType[] = ['mongodb'];

/**
 * Ticks the database backup scheduler, processing all configured targets.
 * Orchestrates the evaluation of backup schedules, triggers jobs, 
 * and updates persistence for successfully queued tasks.
 * 
 * @param now - Current execution time for schedule evaluation.
 * @returns Summary of triggered/skipped tasks.
 */
export async function tickDatabaseBackupScheduler(
  now = new Date()
): Promise<DatabaseBackupSchedulerTickResult> {
  const checkedAt = now.toISOString();
  const schedule = await getDatabaseEngineBackupSchedule();
  
  let nextSchedule: DatabaseEngineBackupSchedule = { ...schedule };
  const result: DatabaseBackupSchedulerTickResult = {
    checkedAt,
    schedulerEnabled: schedule.schedulerEnabled,
    triggered: [],
    skipped: [],
  };
  
  let changed = false;

  const results = await Promise.all(
    targetKeys.map(async (dbType) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentTarget = (nextSchedule as any)[dbType];
      
      if (!schedule.schedulerEnabled) {
        return { dbType, result: { dbType, reason: 'scheduler_disabled' } };
      }
      
      if (!currentTarget.enabled) {
        return { dbType, result: { dbType, reason: 'target_disabled' } };
      }

      const evaluated = evaluateBackupTargetSchedule(currentTarget, now);
      if (currentTarget.nextDueAt !== evaluated.nextDueAt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nextSchedule = { ...nextSchedule, [dbType]: { ...currentTarget, nextDueAt: evaluated.nextDueAt } };
        changed = true;
      }

      const taskResult = await processBackupTarget(dbType, currentTarget, now, checkedAt);
      if (taskResult.updatedTarget) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nextSchedule = { ...nextSchedule, lastCheckedAt: checkedAt, [dbType]: taskResult.updatedTarget };
        changed = true;
      }
      return { dbType, result: taskResult.result };
    })
  );

  for (const { result: taskResult } of results) {
    if (taskResult?.jobId) result.triggered.push({ dbType: taskResult.dbType, jobId: taskResult.jobId });
    else if (taskResult?.reason) result.skipped.push({ dbType: taskResult.dbType, reason: taskResult.reason });
  }

  if (changed) await persistBackupSchedule(nextSchedule);
  return result;
}

export async function getDatabaseBackupSchedulerStatus(
  now = new Date()
): Promise<{
  timestamp: string;
  schedulerEnabled: boolean;
  repeatTickEnabled: boolean;
  lastCheckedAt: string | null;
  targets: Record<string, { dueNow: boolean; nextDueAt: string | null } & Partial<DatabaseEngineBackupTargetSchedule>>;
}> {
  const schedule = await getDatabaseEngineBackupSchedule();
  const targets: Record<string, { dueNow: boolean; nextDueAt: string | null } & Partial<DatabaseEngineBackupTargetSchedule>> = {};

  for (const dbType of targetKeys) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const target = (schedule as any)[dbType] as DatabaseEngineBackupTargetSchedule | undefined;
    if (!target) continue;
    const evaluated = evaluateBackupTargetSchedule(target, now);
    targets[dbType] = { ...target, ...evaluated };
  }

  return {
    timestamp: now.toISOString(),
    schedulerEnabled: schedule.schedulerEnabled,
    repeatTickEnabled: schedule.repeatTickEnabled,
    lastCheckedAt: schedule.lastCheckedAt,
    targets,
  };
}

/**
 * updateBackupTargetStatus: Persists an update to a specific backup target's state.
 * 
 * @param dbType - The database type.
 * @param patch - Partial updates to the target's schedule configuration.
 */
async function updateBackupTargetStatus(
  dbType: DatabaseEngineBackupType,
  patch: Partial<DatabaseEngineBackupTargetSchedule>
): Promise<void> {
  const schedule = await getDatabaseEngineBackupSchedule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const current = (schedule as any)[dbType] as DatabaseEngineBackupTargetSchedule | undefined;
  if (!current) return;
  const updated = { ...current, ...patch };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await persistBackupSchedule({ ...schedule, [dbType]: updated } as any);
}

export async function markDatabaseBackupJobQueued(
  dbType: DatabaseEngineBackupType,
  jobId: string
): Promise<void> {
  await updateBackupTargetStatus(dbType, { lastStatus: 'queued', lastJobId: jobId });
}

/**
 * markDatabaseBackupJobRunning: Transitions the target's backup status to 'running'.
 */
export async function markDatabaseBackupJobRunning(
  dbType: DatabaseEngineBackupType,
  jobId: string
): Promise<void> {
  await updateBackupTargetStatus(dbType, { lastStatus: 'running', lastJobId: jobId });
}

/**
 * markDatabaseBackupJobSucceeded: Transitions the target's backup status to 'success' 
 * and clears any previous error states.
 */
export async function markDatabaseBackupJobSucceeded(
  dbType: DatabaseEngineBackupType,
  jobId: string
): Promise<void> {
  await updateBackupTargetStatus(dbType, {
    lastStatus: 'success',
    lastRunAt: new Date().toISOString(),
    lastJobId: jobId,
    lastError: null,
  });
}

/**
 * markDatabaseBackupJobFailed: Transitions the target's backup status to 'failed' 
 * and records the error message.
 */
export async function markDatabaseBackupJobFailed(
  dbType: DatabaseEngineBackupType,
  jobId: string,
  message: string
): Promise<void> {
  await updateBackupTargetStatus(dbType, {
    lastStatus: 'failed',
    lastRunAt: new Date().toISOString(),
    lastJobId: jobId,
    lastError: message,
  });
}
