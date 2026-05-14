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
  resolveArchMongoSourceConfig: vi.fn((source: 'local' | 'cloud') =>
    source === 'local'
      ? {
          source,
          configured: true,
          uri: 'mongodb://localhost:27022/arch_web_local',
          dbName: 'arch_web_local',
          usesLegacyEnv: false,
        }
      : {
          source,
          configured: true,
          uri: 'mongodb+srv://cluster.example/arch_web',
          dbName: 'arch_web',
          usesLegacyEnv: false,
        }
  ),
  resolveStudiqMongoSourceConfig: vi.fn((source: 'local' | 'cloud') =>
    source === 'local'
      ? {
          source,
          configured: true,
          uri: 'mongodb://localhost:27018/studiq_local',
          dbName: 'studiq_local',
          usesLegacyEnv: false,
        }
      : {
          source,
          configured: true,
          uri: 'mongodb+srv://cluster.example/studiq_cloud',
          dbName: 'studiq_cloud',
          usesLegacyEnv: false,
        }
  ),
  resolveCmsBuilderMongoSourceConfig: vi.fn((source: 'local' | 'cloud') =>
    source === 'local'
      ? {
          source,
          configured: true,
          uri: 'mongodb://localhost:27019/cms_builder_local',
          dbName: 'cms_builder_local',
          usesLegacyEnv: false,
        }
      : {
          source,
          configured: true,
          uri: 'mongodb+srv://cluster.example/cms_builder_cloud',
          dbName: 'cms_builder_cloud',
          usesLegacyEnv: false,
        }
  ),
  resolveEcommerceMongoSourceConfig: vi.fn((source: 'local' | 'cloud') =>
    source === 'local'
      ? {
          source,
          configured: true,
          uri: 'mongodb://localhost:27021/ecom_local',
          dbName: 'ecom_local',
          usesLegacyEnv: false,
        }
      : {
          source,
          configured: true,
          uri: 'mongodb+srv://cluster.example/ecom_cloud',
          dbName: 'ecom_cloud',
          usesLegacyEnv: false,
        }
  ),
  getManagedMongoSyncControls: vi.fn(async () => ({})),
  verifyMongoSourceParity: vi.fn(async ({ source, target, sourceDbName, targetDbName }) => ({
    status: 'passed',
    verifiedAt: '2026-04-09T04:31:00.000Z',
    source,
    target,
    sourceDbName,
    targetDbName,
    sourceCollections: 2,
    targetCollections: 2,
    collectionsCompared: 2,
    mismatches: [],
    collections: [],
  })),
  execFileAsync: vi.fn(),
  dropDatabase: vi.fn(async () => undefined),
  mongoAdminCommand: vi.fn(async () => ({ ok: 1 })),
  mongoClientClose: vi.fn(async () => undefined),
  mongoClientConnect: vi.fn(async () => undefined),
  getMongoDb: vi.fn(),
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
  MONGO_BACKUP_APPLICATIONS: ['geminitestapp', 'studiq', 'cms-builder', 'products', 'arch'],
  execFileAsync: mocks.execFileAsync,
  getMongoDumpCommand: mocks.getMongoDumpCommand,
  getMongoRestoreCommand: mocks.getMongoRestoreCommand,
  resolveArchMongoSourceConfig: mocks.resolveArchMongoSourceConfig,
  resolveCmsBuilderMongoSourceConfig: mocks.resolveCmsBuilderMongoSourceConfig,
  resolveEcommerceMongoSourceConfig: mocks.resolveEcommerceMongoSourceConfig,
  resolveStudiqMongoSourceConfig: mocks.resolveStudiqMongoSourceConfig,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

vi.mock('@/shared/lib/db/managed-mongo-sync-controls', () => ({
  getManagedMongoSyncControls: mocks.getManagedMongoSyncControls,
  getManagedMongoApplicationSyncControl: vi.fn((controls, application) => ({
    disabled: controls[application]?.disabled === true,
    reason: controls[application]?.reason ?? null,
    updatedAt: controls[application]?.updatedAt ?? null,
  })),
}));

vi.mock('mongodb', () => ({
  MongoClient: vi.fn(function MongoClient() {
    return {
      close: mocks.mongoClientClose,
      connect: mocks.mongoClientConnect,
      db: vi.fn(() => ({
        admin: () => ({
          command: mocks.mongoAdminCommand,
        }),
        dropDatabase: mocks.dropDatabase,
      })),
    };
  }),
}));

vi.mock('@/shared/lib/db/services/database-backup', () => ({
  createMongoSourceBackup: mocks.createMongoSourceBackup,
}));

vi.mock('@/shared/lib/db/services/mongo-source-parity', () => ({
  verifyMongoSourceParity: mocks.verifyMongoSourceParity,
}));

import { syncMongoSources, testOnly } from './mongo-source-sync';

describe('mongo-source-sync', () => {
  const syncLockPath = path.join(process.cwd(), 'mongo', 'runtime', 'sync.lock');

  beforeEach(async () => {
    await fs.unlink(syncLockPath).catch(() => undefined);
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
    mocks.resolveMongoSourceConfig.mockImplementation(async (source: 'local' | 'cloud') =>
      source === 'local'
        ? {
            configured: true,
            source,
            uri: 'mongodb://localhost:27017/app_local',
            dbName: 'app_local',
            usesLegacyEnv: false,
          }
        : {
            configured: true,
            source,
            uri: 'mongodb+srv://cluster.example/app_cloud',
            dbName: 'app_cloud',
            usesLegacyEnv: false,
          }
    );
    mocks.resolveArchMongoSourceConfig.mockImplementation((source: 'local' | 'cloud') =>
      source === 'local'
        ? {
            source,
            configured: true,
            uri: 'mongodb://localhost:27022/arch_web_local',
            dbName: 'arch_web_local',
            usesLegacyEnv: false,
          }
        : {
            source,
            configured: true,
            uri: 'mongodb+srv://cluster.example/arch_web',
            dbName: 'arch_web',
            usesLegacyEnv: false,
          }
    );
    mocks.resolveStudiqMongoSourceConfig.mockImplementation((source: 'local' | 'cloud') =>
      source === 'local'
        ? {
            source,
            configured: true,
            uri: 'mongodb://localhost:27018/studiq_local',
            dbName: 'studiq_local',
            usesLegacyEnv: false,
          }
        : {
            source,
            configured: true,
            uri: 'mongodb+srv://cluster.example/studiq_cloud',
            dbName: 'studiq_cloud',
            usesLegacyEnv: false,
          }
    );
    mocks.resolveCmsBuilderMongoSourceConfig.mockImplementation((source: 'local' | 'cloud') =>
      source === 'local'
        ? {
            source,
            configured: true,
            uri: 'mongodb://localhost:27019/cms_builder_local',
            dbName: 'cms_builder_local',
            usesLegacyEnv: false,
          }
        : {
            source,
            configured: true,
            uri: 'mongodb+srv://cluster.example/cms_builder_cloud',
            dbName: 'cms_builder_cloud',
            usesLegacyEnv: false,
          }
    );
    mocks.resolveEcommerceMongoSourceConfig.mockImplementation((source: 'local' | 'cloud') =>
      source === 'local'
        ? {
            source,
            configured: true,
            uri: 'mongodb://localhost:27021/ecom_local',
            dbName: 'ecom_local',
            usesLegacyEnv: false,
          }
        : {
            source,
            configured: true,
            uri: 'mongodb+srv://cluster.example/ecom_cloud',
            dbName: 'ecom_cloud',
            usesLegacyEnv: false,
          }
    );
    mocks.getManagedMongoSyncControls.mockResolvedValue({});
    mocks.getMongoDb.mockResolvedValue({ dropDatabase: mocks.dropDatabase });
    mocks.execFileAsync.mockResolvedValue({ stdout: 'mongo tool ok', stderr: '' });
    mocks.mongoAdminCommand.mockResolvedValue({ ok: 1 });
    mocks.mongoClientClose.mockResolvedValue(undefined);
    mocks.mongoClientConnect.mockResolvedValue(undefined);
    mocks.verifyMongoSourceParity.mockImplementation(
      async ({ source, target, sourceDbName, targetDbName }) => ({
        status: 'passed',
        verifiedAt: '2026-04-09T04:31:00.000Z',
        source,
        target,
        sourceDbName,
        targetDbName,
        sourceCollections: 2,
        targetCollections: 2,
        collectionsCompared: 2,
        mismatches: [],
        collections: [],
      })
    );
    mocks.createMongoSourceBackup.mockImplementation(async ({ application = 'geminitestapp', source, role, direction, timestamp }) => ({
      application,
      role,
      source,
      backupName: `${application}-${source}-${role}-pre-sync-${direction}.archive`,
      backupPath: `/tmp/backups/${application}-${source}-${role}-pre-sync-${direction}.archive`,
      logPath: `/tmp/backups/${application}-${source}-${role}-pre-sync-${direction}.archive.log`,
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

  it('passes all-application pre-flight when every scoped endpoint is reachable', async () => {
    await expect(
      testOnly.assertAllApplicationsSyncReady('all', 'local_to_cloud')
    ).resolves.toBeUndefined();
    expect(mocks.mongoClientConnect).toHaveBeenCalledTimes(10);
  });

  it('reports a single per-app pre-flight configuration failure', async () => {
    mocks.resolveEcommerceMongoSourceConfig.mockImplementation((source: 'local' | 'cloud') =>
      source === 'local'
        ? {
            source,
            configured: true,
            uri: 'mongodb://localhost:27021/ecom_local',
            dbName: 'ecom_local',
            usesLegacyEnv: false,
          }
        : {
            source,
            configured: false,
            uri: null,
            dbName: null,
            usesLegacyEnv: false,
          }
    );

    await expect(
      testOnly.assertAllApplicationsSyncReady('products', 'local_to_cloud')
    ).rejects.toThrow(/Ecommerce MongoDB source "cloud" is not configured/i);
  });

  it('builds database-neutral restore URIs for namespace-remapped restores', () => {
    expect(testOnly.buildMongoNamespaceRestoreUri('mongodb://localhost:27021/ecom_local')).toBe(
      'mongodb://localhost:27021'
    );
    expect(
      testOnly.buildMongoNamespaceRestoreUri(
        'mongodb://user:secret@localhost:27021/ecom_local?replicaSet=rs0'
      )
    ).toBe('mongodb://user:secret@localhost:27021?replicaSet=rs0&authSource=ecom_local');
    expect(
      testOnly.buildMongoNamespaceRestoreUri(
        'mongodb+srv://user:secret@cluster.example/products_db?retryWrites=true'
      )
    ).toBe(
      'mongodb+srv://user:secret@cluster.example?retryWrites=true&authSource=products_db'
    );
  });

  it('collects multiple pre-flight failures before throwing', async () => {
    mocks.resolveStudiqMongoSourceConfig.mockImplementation((source: 'local' | 'cloud') =>
      source === 'local'
        ? {
            source,
            configured: true,
            uri: 'mongodb://localhost:27018/studiq_local',
            dbName: 'studiq_local',
            usesLegacyEnv: false,
          }
        : {
            source,
            configured: false,
            uri: null,
            dbName: null,
            usesLegacyEnv: false,
          }
    );
    mocks.resolveCmsBuilderMongoSourceConfig.mockImplementation((source: 'local' | 'cloud') =>
      source === 'local'
        ? {
            source,
            configured: true,
            uri: 'mongodb://localhost:27019/cms_builder_local',
            dbName: 'cms_builder_local',
            usesLegacyEnv: false,
          }
        : {
            source,
            configured: false,
            uri: null,
            dbName: null,
            usesLegacyEnv: false,
          }
    );

    await expect(
      testOnly.assertAllApplicationsSyncReady('all', 'local_to_cloud')
    ).rejects.toThrow(/StudiQ MongoDB source "cloud" is not configured[\s\S]*CMS Builder MongoDB source "cloud" is not configured/i);
  });

  it('rejects sync when another Mongo source sync is already in progress', async () => {
    const acquiredAt = new Date().toISOString();
    await fs.mkdir(path.dirname(syncLockPath), { recursive: true });
    await fs.writeFile(
      syncLockPath,
      JSON.stringify(
        {
          direction: 'local_to_cloud',
          acquiredAt,
          pid: process.pid,
        },
        null,
        2
      ),
      'utf8'
    );

    await expect(syncMongoSources('cloud_to_local')).rejects.toThrow(
      `MongoDB sync is already in progress for all apps: local -> cloud. Started at ${acquiredAt}.`
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
    const result = await syncMongoSources('cloud_to_local');

    expect(result.success).toBe(true);
    expect(result.direction).toBe('cloud_to_local');
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(1, {
      application: 'geminitestapp',
      source: 'cloud',
      role: 'source',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(2, {
      application: 'geminitestapp',
      source: 'local',
      role: 'target',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(3, {
      application: 'studiq',
      source: 'cloud',
      role: 'source',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(4, {
      application: 'studiq',
      source: 'local',
      role: 'target',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(5, {
      application: 'cms-builder',
      source: 'cloud',
      role: 'source',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(6, {
      application: 'cms-builder',
      source: 'local',
      role: 'target',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(7, {
      application: 'products',
      source: 'cloud',
      role: 'source',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(8, {
      application: 'products',
      source: 'local',
      role: 'target',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(9, {
      application: 'arch',
      source: 'cloud',
      role: 'source',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(mocks.createMongoSourceBackup).toHaveBeenNthCalledWith(10, {
      application: 'arch',
      source: 'local',
      role: 'target',
      direction: 'cloud_to_local',
      timestamp: expect.any(Number),
    });
    expect(result.preSyncBackups).toHaveLength(10);
    expect(result.applicationTransfers).toHaveLength(5);
    expect(result.archivePath).toContain('mongo-sync-cloud_to_local-');
    expect(result.logPath).toContain('mongo-sync-cloud_to_local-');
    expect(result.verification?.status).toBe('passed');
    expect(result.syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mocks.execFileAsync).toHaveBeenCalledTimes(10);
    expect(mocks.execFileAsync).toHaveBeenNthCalledWith(
      10,
      'mongorestore',
      expect.arrayContaining([
        '--uri',
        'mongodb://localhost:27022',
        '--nsFrom',
        'arch_web.*',
        '--nsTo',
        'arch_web_local.*',
      ])
    );
    expect(mocks.dropDatabase).toHaveBeenCalledTimes(5);
    expect(mocks.verifyMongoSourceParity).toHaveBeenNthCalledWith(1, {
      source: 'cloud',
      target: 'local',
      sourceDbName: 'app_cloud',
      targetDbName: 'app_local',
      sourceUri: 'mongodb+srv://cluster.example/app_cloud',
      targetUri: 'mongodb://localhost:27017/app_local',
      excludedCollections: [],
    });
    expect(mocks.verifyMongoSourceParity).toHaveBeenNthCalledWith(2, {
      source: 'cloud',
      target: 'local',
      sourceDbName: 'studiq_cloud',
      targetDbName: 'studiq_local',
      sourceUri: 'mongodb+srv://cluster.example/studiq_cloud',
      targetUri: 'mongodb://localhost:27018/studiq_local',
      excludedCollections: [],
    });
    expect(mocks.verifyMongoSourceParity).toHaveBeenNthCalledWith(3, {
      source: 'cloud',
      target: 'local',
      sourceDbName: 'cms_builder_cloud',
      targetDbName: 'cms_builder_local',
      sourceUri: 'mongodb+srv://cluster.example/cms_builder_cloud',
      targetUri: 'mongodb://localhost:27019/cms_builder_local',
      excludedCollections: [],
    });
    expect(mocks.verifyMongoSourceParity).toHaveBeenNthCalledWith(4, {
      source: 'cloud',
      target: 'local',
      sourceDbName: 'ecom_cloud',
      targetDbName: 'ecom_local',
      sourceUri: 'mongodb+srv://cluster.example/ecom_cloud',
      targetUri: 'mongodb://localhost:27021/ecom_local',
      excludedCollections: ['settings'],
    });
    expect(mocks.verifyMongoSourceParity).toHaveBeenNthCalledWith(5, {
      source: 'cloud',
      target: 'local',
      sourceDbName: 'arch_web',
      targetDbName: 'arch_web_local',
      sourceUri: 'mongodb+srv://cluster.example/arch_web',
      targetUri: 'mongodb://localhost:27022/arch_web_local',
      excludedCollections: [],
    });
    expect(mocks.recordMongoSourceSync).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'cloud_to_local',
        source: 'cloud',
        target: 'local',
        verification: expect.objectContaining({ status: 'passed' }),
        applicationTransfers: expect.arrayContaining([
          expect.objectContaining({ application: 'geminitestapp' }),
          expect.objectContaining({ application: 'studiq' }),
          expect.objectContaining({ application: 'cms-builder' }),
          expect.objectContaining({ application: 'products' }),
          expect.objectContaining({ application: 'arch' }),
        ]),
        preSyncBackups: expect.arrayContaining([
          expect.objectContaining({ application: 'geminitestapp', role: 'source', source: 'cloud' }),
          expect.objectContaining({ application: 'geminitestapp', role: 'target', source: 'local' }),
          expect.objectContaining({ application: 'studiq', role: 'source', source: 'cloud' }),
          expect.objectContaining({ application: 'studiq', role: 'target', source: 'local' }),
          expect.objectContaining({ application: 'cms-builder', role: 'source', source: 'cloud' }),
          expect.objectContaining({ application: 'cms-builder', role: 'target', source: 'local' }),
          expect.objectContaining({ application: 'products', role: 'source', source: 'cloud' }),
          expect.objectContaining({ application: 'products', role: 'target', source: 'local' }),
          expect.objectContaining({ application: 'arch', role: 'source', source: 'cloud' }),
          expect.objectContaining({ application: 'arch', role: 'target', source: 'local' }),
        ]),
      })
    );
  });

  it('skips disabled applications when syncing all managed MongoDB apps', async () => {
    mocks.getManagedMongoSyncControls.mockResolvedValue({
      geminitestapp: {
        disabled: true,
        reason: 'Main app sync is too large for routine cloud synchronization.',
        updatedAt: '2026-05-14T18:01:13.926Z',
      },
    });

    const result = await syncMongoSources('cloud_to_local');

    expect(result.success).toBe(true);
    expect(result.applicationTransfers.map((transfer) => transfer.application)).toEqual([
      'studiq',
      'cms-builder',
      'products',
      'arch',
    ]);
    expect(result.preSyncBackups).toHaveLength(8);
    expect(mocks.createMongoSourceBackup).toHaveBeenCalledTimes(8);
    expect(
      mocks.createMongoSourceBackup.mock.calls.some(
        ([params]) => params.application === 'geminitestapp'
      )
    ).toBe(false);
    expect(mocks.execFileAsync).toHaveBeenCalledTimes(8);
    expect(mocks.dropDatabase).toHaveBeenCalledTimes(4);
    expect(mocks.verifyMongoSourceParity).toHaveBeenCalledTimes(4);
    expect(mocks.recordMongoSourceSync).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationTransfers: expect.not.arrayContaining([
          expect.objectContaining({ application: 'geminitestapp' }),
        ]),
        preSyncBackups: expect.not.arrayContaining([
          expect.objectContaining({ application: 'geminitestapp' }),
        ]),
      })
    );
  });

  it('rejects targeted sync when the managed MongoDB app is disabled', async () => {
    mocks.getManagedMongoSyncControls.mockResolvedValue({
      products: {
        disabled: true,
        reason: 'Paused for maintenance.',
        updatedAt: '2026-05-14T18:01:13.926Z',
      },
    });

    await expect(syncMongoSources('local_to_cloud', 'products')).rejects.toThrow(
      /Ecommerce MongoDB sync is temporarily disabled in Database Engine/i
    );
    expect(mocks.createMongoSourceBackup).not.toHaveBeenCalled();
    expect(mocks.execFileAsync).not.toHaveBeenCalled();
    expect(mocks.recordMongoSourceSync).not.toHaveBeenCalled();
  });

  it('fails sync and skips success metadata when post-restore parity verification fails', async () => {
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
    mocks.execFileAsync
      .mockResolvedValueOnce({ stdout: 'dump ok', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'restore ok', stderr: '' });
    mocks.verifyMongoSourceParity.mockResolvedValueOnce({
      status: 'failed',
      verifiedAt: '2026-04-09T04:31:00.000Z',
      source: 'local',
      target: 'cloud',
      sourceDbName: 'app_local',
      targetDbName: 'app_cloud',
      sourceCollections: 1,
      targetCollections: 1,
      collectionsCompared: 1,
      mismatches: ['Collection "products" document mismatch: count 3 != 2.'],
      collections: [],
    });

    await expect(syncMongoSources('local_to_cloud')).rejects.toThrow(
      /sync verification failed/i
    );
    expect(mocks.verifyMongoSourceParity).toHaveBeenCalled();
    expect(mocks.recordMongoSourceSync).not.toHaveBeenCalled();
  });

  it('restores the target pre-sync backup when mongorestore fails', async () => {
    const restoreFailure = new Error('restore failed');
    (restoreFailure as { cause?: { stdout: string; stderr: string } }).cause = {
      stdout: '',
      stderr: 'bad restore',
    };
    mocks.execFileAsync
      .mockResolvedValueOnce({ stdout: 'dump ok', stderr: '' })
      .mockRejectedValueOnce(restoreFailure)
      .mockResolvedValueOnce({ stdout: 'recovery ok', stderr: '' });

    await expect(syncMongoSources('local_to_cloud', 'products')).rejects.toThrow(
      /target database was recovered from pre-sync backup/i
    );

    expect(mocks.execFileAsync).toHaveBeenCalledTimes(3);
    expect(mocks.dropDatabase).toHaveBeenCalledTimes(2);
    const recoveryRestoreCall = mocks.execFileAsync.mock.calls[2];
    expect(recoveryRestoreCall?.[0]).toBe('mongorestore');
    expect(recoveryRestoreCall?.[1]).toEqual(
      expect.arrayContaining([
        '--uri',
        'mongodb+srv://cluster.example/ecom_cloud',
        '--archive=/tmp/backups/products-cloud-target-pre-sync-local_to_cloud.archive',
        '--gzip',
        '--drop',
        '--stopOnError',
      ])
    );
    expect(mocks.recordMongoSourceSync).not.toHaveBeenCalled();
  });

  it('labels restore failures that also fail automatic recovery', async () => {
    const restoreFailure = new Error('restore failed');
    const recoveryFailure = new Error('recovery failed');
    mocks.execFileAsync
      .mockResolvedValueOnce({ stdout: 'dump ok', stderr: '' })
      .mockRejectedValueOnce(restoreFailure)
      .mockRejectedValueOnce(recoveryFailure);

    await expect(syncMongoSources('local_to_cloud', 'products')).rejects.toThrow(
      /automatic recovery failed\. Manual restore required from: \/tmp\/backups\/products-cloud-target-pre-sync-local_to_cloud\.archive/i
    );
    expect(mocks.execFileAsync).toHaveBeenCalledTimes(3);
    expect(mocks.recordMongoSourceSync).not.toHaveBeenCalled();
  });

  it('redacts MongoDB credentials in sync command logs', async () => {
    mocks.resolveMongoSourceConfig.mockImplementation(async (source: 'local' | 'cloud') =>
      source === 'local'
        ? {
            configured: true,
            source,
            uri: 'mongodb://local-user:local-secret@localhost:27017/app_local',
            dbName: 'app_local',
            usesLegacyEnv: false,
          }
        : {
            configured: true,
            source,
            uri: 'mongodb+srv://cloud-user:cloud-secret@cluster.example/app_cloud',
            dbName: 'app_cloud',
            usesLegacyEnv: false,
          }
    );
    mocks.execFileAsync
      .mockResolvedValueOnce({ stdout: 'dump ok', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'restore ok', stderr: '' });

    const result = await syncMongoSources('local_to_cloud');
    const log = await fs.readFile(result.logPath!, 'utf8');

    expect(log).toContain('mongodb://local-user:***@localhost:27017/app_local');
    expect(log).toContain(
      'mongodb+srv://cloud-user:***@cluster.example?authSource=app_cloud'
    );
    expect(log).not.toContain('local-secret');
    expect(log).not.toContain('cloud-secret');
  });

  it('rejects sync before locking when pre-flight cannot reach a Mongo target', async () => {
    mocks.mongoClientConnect.mockRejectedValueOnce(new Error('cloud ping failed'));

    await expect(syncMongoSources('cloud_to_local')).rejects.toThrow(
      /cloud MongoDB source is unreachable: cloud ping failed/i
    );
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
