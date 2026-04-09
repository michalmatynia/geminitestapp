/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { syncMongoSources } from './mongo-source-sync';

describe('mongo-source-sync', () => {
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
    expect(result.archivePath).toContain('mongo-sync-cloud_to_local-');
    expect(result.logPath).toContain('mongo-sync-cloud_to_local-');
    expect(result.syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mocks.recordMongoSourceSync).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'cloud_to_local',
        source: 'cloud',
        target: 'local',
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
    expect(mocks.execFileAsync).not.toHaveBeenCalled();
  });
});
