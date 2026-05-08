/**
 * MongoDB Sync Lock Manager
 * 
 * File-based locking mechanism for MongoDB synchronization operations.
 * Provides:
 * - Sync operation locking and coordination
 * - Direction-based sync tracking (import/export)
 * - In-progress sync state management
 * - File system-based lock persistence
 * - Server-only sync coordination
 */

import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type {
  DatabaseEngineMongoSyncDirection,
  DatabaseEngineMongoSyncInProgress,
  MongoSource,
} from '@/shared/contracts/database';
import { operationFailedError, resourceLockedError } from '@/shared/errors/app-error';
import { logger } from '@/shared/utils/logger';

const mongoRuntimeDir = path.join(process.cwd(), 'mongo', 'runtime');
const mongoSyncLockPath = path.join(mongoRuntimeDir, 'sync.lock');
const LOCK_MAX_AGE_MS = 30 * 60 * 1000;

const resolveSyncEndpoints = (
  direction: DatabaseEngineMongoSyncDirection
): { source: MongoSource; target: MongoSource } =>
  direction === 'cloud_to_local'
    ? { source: 'cloud', target: 'local' }
    : { source: 'local', target: 'cloud' };

const isMongoSyncDirection = (
  value: unknown
): value is DatabaseEngineMongoSyncDirection =>
  value === 'cloud_to_local' || value === 'local_to_cloud';

const isValidMongoSyncLockPayload = (
  value: unknown
): value is Pick<DatabaseEngineMongoSyncInProgress, 'direction' | 'acquiredAt' | 'pid'> => {
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

const isMongoSyncLockExpired = (lock: DatabaseEngineMongoSyncInProgress): boolean => {
  const acquiredAtMs = Date.parse(lock.acquiredAt);
  if (!Number.isFinite(acquiredAtMs)) return true;
  return Date.now() - acquiredAtMs > LOCK_MAX_AGE_MS;
};

const pruneMongoSyncLock = async (
  lock: DatabaseEngineMongoSyncInProgress,
  reason: 'pid_exited' | 'expired'
): Promise<void> => {
  await fs.rm(mongoSyncLockPath, { force: true }).catch(() => undefined);
  logger.warn('[mongo-sync-lock] Pruned stale MongoDB sync lock', {
    reason,
    source: lock.source,
    target: lock.target,
    pid: lock.pid,
    acquiredAt: lock.acquiredAt,
  });
};

export const formatMongoSyncLockMessage = (
  lock: DatabaseEngineMongoSyncInProgress
): string =>
  `MongoDB sync is already in progress: ${lock.source} -> ${lock.target}. Started at ${lock.acquiredAt}.`;

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

export const acquireMongoSyncLock = async (
  direction: DatabaseEngineMongoSyncDirection
): Promise<() => Promise<void>> => {
  await fs.mkdir(mongoRuntimeDir, { recursive: true });

  const payload = JSON.stringify(
    {
      direction,
      acquiredAt: new Date().toISOString(),
      pid: process.pid,
    },
    null,
    2
  );

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
