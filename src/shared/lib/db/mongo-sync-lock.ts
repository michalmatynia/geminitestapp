/**
 * MongoDB Sync Lock Manager
 * 
 * Implements a file-based locking mechanism to coordinate MongoDB synchronization
 * operations. This ensures that only one sync operation (import or export) runs
 * at a time for a given application or the entire system.
 * 
 * Features:
 * - Sync operation locking and coordination.
 * - Direction-based sync tracking (cloud-to-local vs local-to-cloud).
 * - Process ID (PID) awareness to detect crashed processes.
 * - Automatic pruning of stale or expired locks.
 * - Server-only execution to prevent client-side lock attempts.
 */

import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type {
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineMongoSyncDirection,
  DatabaseEngineMongoSyncInProgress,
  MongoSource,
} from '@/shared/contracts/database';
import { operationFailedError, resourceLockedError } from '@/shared/errors/app-error';
import { logger } from '@/shared/utils/logger';

/** Directory where MongoDB runtime artifacts like locks are stored. */
const mongoRuntimeDir = path.join(process.cwd(), 'mongo', 'runtime');

/** Path to the sync lock file. */
const mongoSyncLockPath = path.join(mongoRuntimeDir, 'sync.lock');

/** Maximum age for a lock before it is considered stale (30 minutes). */
const LOCK_MAX_AGE_MS = 30 * 60 * 1000;

/** Resolves source and target source identifiers based on sync direction. */
const resolveSyncEndpoints = (
  direction: DatabaseEngineMongoSyncDirection
): { source: MongoSource; target: MongoSource } =>
  direction === 'cloud_to_local'
    ? { source: 'cloud', target: 'local' }
    : { source: 'local', target: 'cloud' };

/** Formats application target for display. */
const formatMongoSyncApplicationTarget = (
  application: DatabaseEngineManagedMongoApplicationTarget
): string => (application === 'all' ? 'all apps' : application);

/** Type guard for sync direction. */
const isMongoSyncDirection = (
  value: unknown
): value is DatabaseEngineMongoSyncDirection =>
  value === 'cloud_to_local' || value === 'local_to_cloud';

/** Type guard for application target. */
const isMongoSyncApplicationTarget = (
  value: unknown
): value is DatabaseEngineManagedMongoApplicationTarget =>
  value === 'all' ||
  value === 'geminitestapp' ||
  value === 'studiq' ||
  value === 'cms-builder' ||
  value === 'products';

/** Internal payload structure for the lock file. */
type MongoSyncLockPayload = Pick<
  DatabaseEngineMongoSyncInProgress,
  'direction' | 'acquiredAt' | 'pid'
> & {
  application?: unknown;
};

/** Validates the structure of a lock file payload. */
const isValidMongoSyncLockPayload = (
  value: unknown
): value is MongoSyncLockPayload => {
  if (value === null || typeof value !== 'object') return false;

  const candidate = value as {
    direction?: unknown;
    acquiredAt?: unknown;
    pid?: unknown;
  };

  return (
    isMongoSyncDirection(candidate.direction) &&
    typeof candidate.acquiredAt === 'string' &&
    candidate.acquiredAt.length > 0 &&
    typeof candidate.pid === 'number' &&
    Number.isInteger(candidate.pid) &&
    candidate.pid >= 0
  );
};

/** Checks if a specific process ID is still active. */
const isPidRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode === 'EPERM') return true;
    return false;
  }
};

/** Reads and parses the sync lock file if it exists. */
const parseMongoSyncLock = async (): Promise<DatabaseEngineMongoSyncInProgress | null> => {
  try {
    const raw = await fs.readFile(mongoSyncLockPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isValidMongoSyncLockPayload(parsed)) {
      return null;
    }

    const { source, target } = resolveSyncEndpoints(parsed.direction);
    return {
      direction: parsed.direction,
      application: isMongoSyncApplicationTarget(parsed.application)
        ? parsed.application
        : 'all',
      source,
      target,
      acquiredAt: parsed.acquiredAt,
      pid: parsed.pid,
    };
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode === 'ENOENT') {
      return null;
    }
    throw operationFailedError('Failed to read MongoDB sync lock.', error);
  }
};

/** Determines if a lock has exceeded its maximum allowed age. */
const isMongoSyncLockExpired = (lock: DatabaseEngineMongoSyncInProgress): boolean => {
  const acquiredAtMs = Date.parse(lock.acquiredAt);
  if (!Number.isFinite(acquiredAtMs)) return true;
  return Date.now() - acquiredAtMs > LOCK_MAX_AGE_MS;
};

/** Removes a stale lock file and logs the event. */
const pruneMongoSyncLock = async (
  lock: DatabaseEngineMongoSyncInProgress,
  reason: 'pid_exited' | 'expired'
): Promise<void> => {
  await fs.rm(mongoSyncLockPath, { force: true }).catch(() => undefined);
  logger.warn('[mongo-sync-lock] Pruned stale MongoDB sync lock', {
    reason,
    application: lock.application,
    source: lock.source,
    target: lock.target,
    pid: lock.pid,
    acquiredAt: lock.acquiredAt,
  });
};

/**
 * Formats a descriptive error message when a sync lock is encountered.
 * 
 * @param lock - The existing lock metadata.
 * @returns Formatted message.
 */
export const formatMongoSyncLockMessage = (
  lock: DatabaseEngineMongoSyncInProgress
): string =>
  `MongoDB sync is already in progress for ${formatMongoSyncApplicationTarget(lock.application)}: ${lock.source} -> ${lock.target}. Started at ${lock.acquiredAt}.`;

/**
 * Reads the current sync lock status, optionally pruning stale locks.
 * 
 * @param options - Optional pruning behavior.
 * @returns The active sync metadata or null if no lock exists.
 */
export const readMongoSyncLock = async (
  options: { pruneStale?: boolean } = {}
): Promise<DatabaseEngineMongoSyncInProgress | null> => {
  const lock = await parseMongoSyncLock();
  if (!lock) {
    return null;
  }

  const isExpired = isMongoSyncLockExpired(lock);
  if (isExpired && options.pruneStale === true) {
    await pruneMongoSyncLock(lock, 'expired');
    return null;
  }

  if (isPidRunning(lock.pid)) {
    return lock;
  }

  if (options.pruneStale === true) {
    await pruneMongoSyncLock(lock, 'pid_exited');
  }

  return null;
};

/**
 * Attempts to acquire a sync lock for a specific direction and application.
 * 
 * @param direction - The direction of sync.
 * @param application - The application target.
 * @returns A release function to unlock.
 * @throws {ResourceLockedError} If a valid lock already exists.
 * @throws {OperationFailedError} If the lock file cannot be created.
 */
export const acquireMongoSyncLock = async (
  direction: DatabaseEngineMongoSyncDirection,
  application: DatabaseEngineManagedMongoApplicationTarget = 'all'
): Promise<() => Promise<void>> => {
  await fs.mkdir(mongoRuntimeDir, { recursive: true });

  const payload = JSON.stringify(
    {
      direction,
      application,
      acquiredAt: new Date().toISOString(),
      pid: process.pid,
    },
    null,
    2
  );

  /** Helper to attempt atomic file creation. */
  const tryAcquireLock = async (
    allowRetryAfterPrune: boolean
  ): Promise<Awaited<ReturnType<typeof fs.open>>> => {
    try {
      const lockHandle = await fs.open(mongoSyncLockPath, 'wx');
      await lockHandle.writeFile(payload, 'utf8');
      return lockHandle;
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode !== 'EEXIST') {
        throw operationFailedError('Failed to acquire MongoDB sync lock.', error);
      }

      const existingLock = await readMongoSyncLock({ pruneStale: true });
      if (existingLock) {
        throw resourceLockedError(formatMongoSyncLockMessage(existingLock), {
          syncInProgress: existingLock,
        });
      }

      // If we pruned a stale lock, try one more time.
      if (allowRetryAfterPrune) {
        return tryAcquireLock(false);
      }

      throw resourceLockedError('MongoDB sync is already in progress.');
    }
  };

  const lockHandle = await tryAcquireLock(true);

  return async () => {
    await lockHandle.close().catch(() => undefined);
    await fs.rm(mongoSyncLockPath, { force: true }).catch(() => undefined);
  };
};

export const testOnly = {
  mongoRuntimeDir,
  mongoSyncLockPath,
  isPidRunning,
  isMongoSyncLockExpired,
  LOCK_MAX_AGE_MS,
  parseMongoSyncLock,
  resolveSyncEndpoints,
};
