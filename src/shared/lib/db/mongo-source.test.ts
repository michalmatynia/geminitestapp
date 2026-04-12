/**
 * @vitest-environment node
 */
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(async () => ({
    admin: () => ({
      command: vi.fn(async () => ({ ok: 1 })),
    }),
  })),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

const ORIGINAL_ENV = {
  MONGODB_URI: process.env['MONGODB_URI'],
  MONGODB_DB: process.env['MONGODB_DB'],
  MONGODB_LOCAL_URI: process.env['MONGODB_LOCAL_URI'],
  MONGODB_LOCAL_DB: process.env['MONGODB_LOCAL_DB'],
  MONGODB_CLOUD_URI: process.env['MONGODB_CLOUD_URI'],
  MONGODB_CLOUD_DB: process.env['MONGODB_CLOUD_DB'],
  MONGODB_ACTIVE_SOURCE_DEFAULT: process.env['MONGODB_ACTIVE_SOURCE_DEFAULT'],
};

describe('mongo-source', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getMongoDb.mockResolvedValue({
      admin: () => ({
        command: vi.fn(async () => ({ ok: 1 })),
      }),
    });
    delete process.env['MONGODB_URI'];
    delete process.env['MONGODB_DB'];
    process.env['MONGODB_LOCAL_URI'] = 'mongodb://localhost:27017/app_local';
    process.env['MONGODB_LOCAL_DB'] = 'app_local';
    process.env['MONGODB_CLOUD_URI'] = 'mongodb+srv://cluster.example/app_cloud';
    process.env['MONGODB_CLOUD_DB'] = 'app_cloud';
    process.env['MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'local';
  });

  afterEach(async () => {
    Object.entries(ORIGINAL_ENV).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });

    const { promises: fs } = await import('fs');
    await fs
      .unlink(path.join(process.cwd(), 'mongo', 'runtime', 'last-sync.json'))
      .catch(() => undefined);
  });

  it('resolves explicit local and cloud MongoDB sources', async () => {
    const module = await import('./mongo-source');

    expect(module.__testOnly.getMongoSourceConfig('local')).toMatchObject({
      configured: true,
      dbName: 'app_local',
      usesLegacyEnv: false,
    });
    expect(module.__testOnly.getMongoSourceConfig('cloud')).toMatchObject({
      configured: true,
      dbName: 'app_cloud',
      usesLegacyEnv: false,
    });
    expect(module.getMongoSyncIssue(
      module.__testOnly.getMongoSourceConfig('local'),
      module.__testOnly.getMongoSourceConfig('cloud')
    )).toBeNull();
    expect(mocks.getMongoDb).not.toHaveBeenCalled();
  });

  it('applies the env-selected active Mongo source', async () => {
    process.env['MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'cloud';

    const module = await import('./mongo-source');
    const state = await module.getMongoSourceState();

    expect(process.env['MONGODB_URI']).toBe('mongodb+srv://cluster.example/app_cloud');
    expect(process.env['MONGODB_DB']).toBe('app_cloud');
    expect(state.activeSource).toBe('cloud');
    expect(state.cloud.isActive).toBe(true);
    expect(state.local.isActive).toBe(false);
    expect(state.canSync).toBe(true);
    expect(state.syncIssue).toBeNull();
    expect(state.local.reachable).toBe(true);
    expect(state.cloud.reachable).toBe(true);
  });

  it('surfaces persisted last-sync metadata in Mongo source state', async () => {
    const module = await import('./mongo-source');

    await module.recordMongoSourceSync({
      direction: 'cloud_to_local',
      source: 'cloud',
      target: 'local',
      syncedAt: '2026-04-09T04:30:00.000Z',
      archivePath: '/tmp/mongo-sync.archive',
      logPath: '/tmp/mongo-sync.log',
    });
    const state = await module.getMongoSourceState();

    expect(state.lastSync).toEqual({
      direction: 'cloud_to_local',
      source: 'cloud',
      target: 'local',
      syncedAt: '2026-04-09T04:30:00.000Z',
      preSyncBackups: [],
      archivePath: '/tmp/mongo-sync.archive',
      logPath: '/tmp/mongo-sync.log',
    });
  });

  it('flags sync as unsafe when local and cloud resolve to the same target', async () => {
    process.env['MONGODB_CLOUD_URI'] = 'mongodb://localhost:27017/app_local';
    process.env['MONGODB_CLOUD_DB'] = 'app_local';

    const module = await import('./mongo-source');
    const state = await module.getMongoSourceState();

    expect(state.canSync).toBe(false);
    expect(state.syncIssue).toContain('point to the same URI and database');
  });

  it('marks a source as unreachable when ping fails', async () => {
    mocks.getMongoDb
      .mockResolvedValueOnce({
        admin: () => ({
          command: vi.fn(async () => ({ ok: 1 })),
        }),
      })
      .mockRejectedValueOnce(new Error('cloud ping failed'));

    const module = await import('./mongo-source');
    const state = await module.getMongoSourceState();

    expect(state.local.reachable).toBe(true);
    expect(state.cloud.reachable).toBe(false);
    expect(state.cloud.healthError).toBe('cloud ping failed');
    expect(state.canSync).toBe(false);
    expect(state.syncIssue).toBe(
      'MongoDB source sync is disabled because "cloud" is unreachable: cloud ping failed'
    );
  });

  it('throws when the env-selected Mongo source is not configured', async () => {
    delete process.env['MONGODB_CLOUD_URI'];
    delete process.env['MONGODB_CLOUD_DB'];
    process.env['MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'cloud';

    await expect(import('./mongo-source')).rejects.toThrow(
      'MongoDB source "cloud" is not configured. Set MONGODB_CLOUD_URI.'
    );
  });

  it('throws when a preferred Mongo source is requested but not configured', async () => {
    delete process.env['MONGODB_CLOUD_URI'];
    delete process.env['MONGODB_CLOUD_DB'];
    delete process.env['MONGODB_ACTIVE_SOURCE_DEFAULT'];

    const module = await import('./mongo-source');

    await expect(module.resolveMongoSourceConfig('cloud')).rejects.toThrow(
      'MongoDB source "cloud" is not configured. Set MONGODB_CLOUD_URI.'
    );
  });
});
