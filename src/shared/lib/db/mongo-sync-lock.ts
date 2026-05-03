import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type {
  DatabaseEngineMongoSyncDirection,
  DatabaseEngineMongoSyncInProgress,
  MongoSource,
} from '@/shared/contracts/database';
import { operationFailedError, resourceLockedError } from '@/shared/errors/app-error';

const mongoRuntimeDir = path.join(process.cwd(), 'mongo', 'runtime');
const mongoSyncLockPath = path.join(mongoRuntimeDir, 'sync.lock');

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

  if (isPidRunning(lock.pid)) {
    return lock;
  }

  if (options.pruneStale) {
    await fs.rm(mongoSyncLockPath, { force: true }).catch(() => undefined);
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
  parseMongoSyncLock,
  resolveSyncEndpoints,
};
