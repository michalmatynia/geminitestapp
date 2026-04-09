/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = {
  MONGODB_URI: process.env['MONGODB_URI'],
  MONGODB_DB: process.env['MONGODB_DB'],
  MONGODB_LOCAL_URI: process.env['MONGODB_LOCAL_URI'],
  MONGODB_LOCAL_DB: process.env['MONGODB_LOCAL_DB'],
  MONGODB_CLOUD_URI: process.env['MONGODB_CLOUD_URI'],
  MONGODB_CLOUD_DB: process.env['MONGODB_CLOUD_DB'],
  MONGODB_ACTIVE_SOURCE_DEFAULT: process.env['MONGODB_ACTIVE_SOURCE_DEFAULT'],
  MONGODB_ACTIVE_SOURCE_FILE: process.env['MONGODB_ACTIVE_SOURCE_FILE'],
};

describe('mongo-source', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/app';
    process.env['MONGODB_DB'] = 'app';
    process.env['MONGODB_LOCAL_URI'] = 'mongodb://localhost:27017/app_local';
    process.env['MONGODB_LOCAL_DB'] = 'app_local';
    process.env['MONGODB_CLOUD_URI'] = 'mongodb+srv://cluster.example/app_cloud';
    process.env['MONGODB_CLOUD_DB'] = 'app_cloud';
    process.env['MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'local';
    process.env['MONGODB_ACTIVE_SOURCE_FILE'] = '/tmp/geminitestapp-mongo-source-test.json';
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
    await fs.unlink('/tmp/geminitestapp-mongo-source-test.json').catch(() => undefined);
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
  });

  it('persists and applies the selected active Mongo source', async () => {
    const module = await import('./mongo-source');

    await module.setActiveMongoSource('cloud');
    const state = await module.getMongoSourceState();

    expect(process.env['MONGODB_URI']).toBe('mongodb+srv://cluster.example/app_cloud');
    expect(process.env['MONGODB_DB']).toBe('app_cloud');
    expect(state.activeSource).toBe('cloud');
    expect(state.cloud.isActive).toBe(true);
    expect(state.local.isActive).toBe(false);
  });
});
