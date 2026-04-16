/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

const mocks = vi.hoisted(() => ({
  getMongoSourceState: vi.fn(async () => ({
    timestamp: '2026-04-09T04:00:00.000Z',
    activeSource: 'local',
    defaultSource: 'local',
    lastSync: null,
    local: {
      source: 'local',
      configured: true,
      dbName: 'app_local',
      maskedUri: 'mongodb://localhost:27017/app_local',
      isActive: true,
      usesLegacyEnv: false,
      reachable: true,
      healthError: null,
    },
    cloud: {
      source: 'cloud',
      configured: true,
      dbName: 'app_cloud',
      maskedUri: 'mongodb+srv://cluster.example/app_cloud',
      isActive: false,
      usesLegacyEnv: false,
      reachable: true,
      healthError: null,
    },
    canSwitch: true,
    canSync: true,
    syncIssue: null,
  })),
  resolveMongoSourceConfig: vi.fn(),
  createMongoSourceBackup: vi.fn(),
  recordMongoSourceSync: vi.fn(async () => undefined),
  execFileAsync: vi.fn(),
  getMongoDumpCommand: vi.fn(() => 'mongodump'),
  getMongoRestoreCommand: vi.fn(() => 'mongorestore'),
}));

vi.mock('@/shared/lib/db/mongo-source', () => ({
  getMongoSourceState: mocks.getMongoSourceState,
  getMongoSyncIssue: vi.fn((sourceConfig, targetConfig) => {
    if (sourceConfig.uri === targetConfig.uri && sourceConfig.dbName === targetConfig.dbName) {
      return 'MongoDB source sync is disabled because "local" and "cloud" point to the same URI and database.';
    }
    return null;
  }),
  recordMongoSourceSync: mocks.recordMongoSourceSync,
  resolveMongoSourceConfig: mocks.resolveMongoSourceConfig,
}));

vi.mock('@/shared/lib/db/utils/mongo', () => ({
  execFileAsync: mocks.execFileAsync,
  getMongoDumpCommand: mocks.getMongoDumpCommand,
  getMongoRestoreCommand: mocks.getMongoRestoreCommand,
}));

vi.mock('@/shared/lib/db/services/database-backup', () => ({
  createMongoSourceBackup: mocks.createMongoSourceBackup,
}));

import { syncMongoSources } from './mongo-source-sync';

describe('mongo-source-sync', () => {
  const syncLockPath = path.join(process.cwd(), 'mongo', 'runtime', 'sync.lock');

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMongoSourceState.mockResolvedValue({
      timestamp: '2026-04-09T04:00:00.000Z',
      activeSource: 'local',
      defaultSource: 'local',
      lastSync: null,
      local: {
        source: 'local',
        configured: true,
        dbName: 'app_local',
        maskedUri: 'mongodb://localhost:27017/app_local',
        isActive: true,
        usesLegacyEnv: false,
        reachable: true,
        healthError: null,
      },
      cloud: {
        source: 'cloud',
        configured: true,
        dbName: 'app_cloud',
        maskedUri: 'mongodb+srv://cluster.example/app_cloud',
        isActive: false,
        usesLegacyEnv: false,
        reachable: true,
        healthError: null,
      },
      canSwitch: true,
      canSync: true,
      syncIssue: null,
    });
    process.env['NODE_ENV'] = 'test';
    mocks.createMongoSourceBackup.mockImplementation(async ({ source, role, direction, timestamp }) => ({
      role,
      source,
      backupName: `${source}-${role}-pre-sync-${direction}.archive`,
      backupPath: `/tmp/backups/${source}-${role}-pre-sync-${direction}.archive`,
      logPath: `/tmp/backups/${source}-${role}-pre-sync-${direction}.archive.log`,
      createdAt:
        typeof timestamp === 'number'
          ? new Date(timestamp).toISOString()
          : '2026-04-09T04:30:00.000Z',
      warning: null,
    }));
  });

  afterEach(async () => {
    await fs.unlink(syncLockPath).catch(() => undefined);
  });

  it('rejects sync when local and cloud resolve to the same Mongo target', async () => {
    mocks.resolveMongoSourceConfig.mockResolvedValue({
      configured: true,
      source: 'local',
      uri: 'mongodb://localhost:27017/app_local',
      dbName: 'app_local',
    });

    await expect(syncMongoSources('local_to_cloud')).rejects.toThrow(
      /point to the same URI and database/i
    );
    expect(mocks.execFileAsync).not.toHaveBeenCalled();
    expect(mocks.recordMongoSourceSync).not.toHaveBeenCalled();
  });

  it('rejects sync when another Mongo source sync is already in progress', async () => {
    await fs.mkdir(path.dirname(syncLockPath), { recursive: true });
    await fs.writeFile(
      syncLockPath,
      JSON.stringify(
        {
          direction: 'local_to_cloud',
          acquiredAt: '2026-04-16T00:38:12.443Z',
          pid: process.pid,
        },
        null,
        2
      ),
      'utf8'
    );

    await expect(syncMongoSources('cloud_to_local')).rejects.toThrow(
      'MongoDB sync is already in progress: local -> cloud. Started at 2026-04-16T00:38:12.443Z.'
    );
    expect(mocks.execFileAsync).not.toHaveBeenCalled();
    expect(mocks.recordMongoSourceSync).not.toHaveBeenCalled();
  });

  it('records sync metadata after a successful sync', async () => {
    mocks.resolveMongoSourceConfig
      .mockResolvedValueOnce({
        configured: true,
        source: 'cloud',
        uri: 'mongodb+srv://cluster.example/app_cloud',
        dbName: 'app_cloud',
      })
      .mockResolvedValueOnce({
        configured: true,
        source: 'local',
        uri: 'mongodb://localhost:27017/app_local',
        dbName: 'app_local',
      });
    mocks.execFileAsync
      .mockResolvedValueOnce({ stdout: 'dump ok', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'restore ok', stderr: '' });

    const result = await syncMongoSources('cloud_to_local');

    expect(result.success).toBe(true);
    expect(result.direction).toBe('cloud_to_local');
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(1, {
      source: 'cloud',
      role: 'source',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(2, {
      source: 'local',
      role: 'target',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(result.preSyncBackups).toHaveLength(2);
    expect(result.archivePath).toContain('mongo-sync-cloud_to_local-');
    expect(result.logPath).toContain('mongo-sync-cloud_to_local-');
    expect(result.syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mocks.recordMongoSourceSync).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'cloud_to_local',
        source: 'cloud',
        target: 'local',
        preSyncBackups: expect.arrayContaining([
          expect.objectContaining({ role: 'source', source: 'cloud' }),
          expect.objectContaining({ role: 'target', source: 'local' }),
        ]),
      })
    );
  });

  it('rejects sync when a Mongo target is already known to be unreachable', async () => {
    mocks.getMongoSourceState.mockResolvedValue({
      timestamp: '2026-04-09T04:00:00.000Z',
      activeSource: 'local',
      defaultSource: 'local',
      lastSync: null,
      local: {
        source: 'local',
        configured: true,
        dbName: 'app_local',
        maskedUri: 'mongodb://localhost:27017/app_local',
        isActive: true,
        usesLegacyEnv: false,
        reachable: true,
        healthError: null,
      },
      cloud: {
        source: 'cloud',
        configured: true,
        dbName: 'app_cloud',
        maskedUri: 'mongodb+srv://cluster.example/app_cloud',
        isActive: false,
        usesLegacyEnv: false,
        reachable: false,
        healthError: 'cloud ping failed',
      },
      canSwitch: true,
      canSync: false,
      syncIssue:
        'MongoDB source sync is disabled because "cloud" is unreachable: cloud ping failed',
    });

    await expect(syncMongoSources('cloud_to_local')).rejects.toThrow(
      /"cloud" is unreachable: cloud ping failed/i
    );
    expect(mocks.resolveMongoSourceConfig).not.toHaveBeenCalled();
    expect(mocks.createMongoSourceBackup).not.toHaveBeenCalled();
    expect(mocks.execFileAsync).not.toHaveBeenCalled();
  });

  it('aborts sync before transfer when a pre-sync backup fails', async () => {
    mocks.resolveMongoSourceConfig
      .mockResolvedValueOnce({
        configured: true,
        source: 'local',
        uri: 'mongodb://localhost:27017/app_local',
        dbName: 'app_local',
      })
      .mockResolvedValueOnce({
        configured: true,
        source: 'cloud',
        uri: 'mongodb+srv://cluster.example/app_cloud',
        dbName: 'app_cloud',
      });
    mocks.createMongoSourceBackup.mockReset();
    mocks.createMongoSourceBackup.mockRejectedValueOnce(new Error('backup failed'));

    await expect(syncMongoSources('local_to_cloud')).rejects.toThrow('backup failed');
    expect(mocks.execFileAsync).not.toHaveBeenCalled();
    expect(mocks.recordMongoSourceSync).not.toHaveBeenCalled();
  });
});
