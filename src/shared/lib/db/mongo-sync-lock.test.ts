/**
 * @vitest-environment node
 */

import { promises as fs } from 'fs';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@/shared/utils/logger';

import { acquireMongoSyncLock, readMongoSyncLock, testOnly } from './mongo-sync-lock';

describe('mongo-sync-lock', () => {
  beforeEach(async () => {
    await fs.unlink(testOnly.mongoSyncLockPath).catch(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.unlink(testOnly.mongoSyncLockPath).catch(() => undefined);
  });

  it('prunes a live-pid sync lock after the maximum lock age', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    await fs.mkdir(path.dirname(testOnly.mongoSyncLockPath), { recursive: true });
    await fs.writeFile(
      testOnly.mongoSyncLockPath,
      JSON.stringify(
        {
          direction: 'local_to_cloud',
          acquiredAt: new Date(Date.now() - testOnly.LOCK_MAX_AGE_MS - 60_000).toISOString(),
          pid: process.pid,
        },
        null,
        2
      ),
      'utf8'
    );

    await expect(readMongoSyncLock({ pruneStale: true })).resolves.toBeNull();
    await expect(fs.access(testOnly.mongoSyncLockPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      '[mongo-sync-lock] Pruned stale MongoDB sync lock',
      expect.objectContaining({ reason: 'expired' })
    );
  });

  it('records the application target in the acquired sync lock', async () => {
    const release = await acquireMongoSyncLock('local_to_cloud', 'products');

    try {
      await expect(readMongoSyncLock()).resolves.toMatchObject({
        direction: 'local_to_cloud',
        application: 'products',
        source: 'local',
        target: 'cloud',
        pid: process.pid,
      });
    } finally {
      await release();
    }
  });
});
