import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileMock = vi.hoisted(() => vi.fn());
const existsSyncMock = vi.hoisted(() => vi.fn(() => true));
const mkdirMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const readFileSyncMock = vi.hoisted(() => vi.fn(() => JSON.stringify({ workspaces: [] })));

vi.mock('server-only', () => ({}));
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    default: {
      ...actual,
      execFile: execFileMock,
    },
    execFile: execFileMock,
  };
});
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: existsSyncMock,
    readFileSync: readFileSyncMock,
    default: {
      ...actual,
      existsSync: existsSyncMock,
      readFileSync: readFileSyncMock,
      promises: {
        ...actual.promises,
        mkdir: mkdirMock,
      },
    },
    promises: {
      ...actual.promises,
      mkdir: mkdirMock,
    },
  };
});

import {
  assertValidBackupName,
  backupsDir,
  buildMongoBackupName,
  ensureBackupsDir,
  execFileAsync,
  resolveEcommerceMongoSourceConfig,
  getMongoBackupApplication,
  getMongoBackupPath,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoDumpCommand,
  getMongoRestoreCommand,
  isTransientMongoConnectionError,
  resolveCmsBuilderMongoSourceConfig,
  resolveProductsMongoSourceConfig,
  resolveStudiqMongoSourceConfig,
} from '@/shared/lib/db/utils/mongo';

describe('shared db mongo utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env['MONGODB_URI'];
    delete process.env['MONGODB_DB'];
    delete process.env['MONGODB_LOCAL_URI'];
    delete process.env['MONGODB_LOCAL_DB'];
    delete process.env['MONGODB_CLOUD_URI'];
    delete process.env['MONGODB_CLOUD_DB'];
    delete process.env['MONGODB_ACTIVE_SOURCE_DEFAULT'];
    delete process.env['MONGODUMP_PATH'];
    delete process.env['MONGORESTORE_PATH'];
    delete process.env['STUDIQ_MONGODB_URI'];
    delete process.env['STUDIQ_MONGODB_DB'];
    delete process.env['STUDIQ_MONGODB_LOCAL_URI'];
    delete process.env['STUDIQ_MONGODB_LOCAL_DB'];
    delete process.env['STUDIQ_MONGODB_CLOUD_URI'];
    delete process.env['STUDIQ_MONGODB_CLOUD_DB'];
    delete process.env['CMS_BUILDER_MONGODB_URI'];
    delete process.env['CMS_BUILDER_MONGODB_DB'];
    delete process.env['CMS_BUILDER_MONGODB_LOCAL_URI'];
    delete process.env['CMS_BUILDER_MONGODB_LOCAL_DB'];
    delete process.env['CMS_BUILDER_MONGODB_CLOUD_URI'];
    delete process.env['CMS_BUILDER_MONGODB_CLOUD_DB'];
    delete process.env['PRODUCTS_MONGODB_URI'];
    delete process.env['PRODUCTS_MONGODB_DB'];
    delete process.env['PRODUCTS_MONGODB_LOCAL_URI'];
    delete process.env['PRODUCTS_MONGODB_LOCAL_DB'];
    delete process.env['PRODUCTS_MONGODB_CLOUD_URI'];
    delete process.env['PRODUCTS_MONGODB_CLOUD_DB'];
    delete process.env['ECOM_MONGODB_URI'];
    delete process.env['ECOM_MONGODB_DB'];
    delete process.env['ECOM_MONGODB_LOCAL_URI'];
    delete process.env['ECOM_MONGODB_LOCAL_DB'];
    delete process.env['ECOM_MONGODB_CLOUD_URI'];
    delete process.env['ECOM_MONGODB_CLOUD_DB'];
    delete process.env['MONGODB_ECOM_URI'];
    delete process.env['MONGODB_ECOM_DB'];
    delete process.env['MONGODB_ECOM_LOCAL_URI'];
    delete process.env['MONGODB_ECOM_LOCAL_DB'];
    delete process.env['MONGODB_ECOM_CLOUD_URI'];
    delete process.env['MONGODB_ECOM_CLOUD_DB'];
  });

  it('creates the neutral backup directory and application subfolders', async () => {
    await ensureBackupsDir();

    expect(mkdirMock).toHaveBeenCalledWith(backupsDir, { recursive: true });
    expect(mkdirMock).toHaveBeenCalledWith(
      expect.stringContaining('geminitestapp'),
      { recursive: true }
    );
    expect(mkdirMock).toHaveBeenCalledWith(expect.stringContaining('studiq'), {
      recursive: true,
    });
    expect(mkdirMock).toHaveBeenCalledWith(expect.stringContaining('cms-builder'), {
      recursive: true,
    });
    expect(mkdirMock).toHaveBeenCalledWith(expect.stringContaining('products'), {
      recursive: true,
    });
  });

  it('reads mongo env values and falls back to default binaries', () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/app';
    process.env['MONGODB_DB'] = 'geminitestapp';

    expect(getMongoConnectionUrl()).toBe('mongodb://localhost:27017/app');
    expect(getMongoDatabaseName()).toBe('geminitestapp');
    expect(getMongoDumpCommand()).toBe('mongodump');
    expect(getMongoRestoreCommand()).toBe('mongorestore');

    process.env['MONGODUMP_PATH'] = '/opt/bin/mongodump';
    process.env['MONGORESTORE_PATH'] = '/opt/bin/mongorestore';

    expect(getMongoDumpCommand()).toBe('/opt/bin/mongodump');
    expect(getMongoRestoreCommand()).toBe('/opt/bin/mongorestore');
  });

  it('uses split local and cloud mongo env values for the main application', () => {
    process.env['MONGODB_LOCAL_URI'] = 'mongodb://localhost:27017/app_local';
    process.env['MONGODB_LOCAL_DB'] = 'app_local';
    process.env['MONGODB_CLOUD_URI'] = 'mongodb+srv://cluster.example/app_cloud';
    process.env['MONGODB_CLOUD_DB'] = 'app_cloud';

    expect(getMongoConnectionUrl()).toBe('mongodb://localhost:27017/app_local');
    expect(getMongoDatabaseName()).toBe('app_local');

    process.env['MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'cloud';

    expect(getMongoConnectionUrl()).toBe('mongodb+srv://cluster.example/app_cloud');
    expect(getMongoDatabaseName()).toBe('app_cloud');
  });

  it('throws configuration errors when required mongo env vars are missing', () => {
    expect(() => getMongoConnectionUrl()).toThrow('MONGODB_URI or MONGODB_LOCAL_URI is not set.');
    expect(() => getMongoDatabaseName()).toThrow('MONGODB_DB or MONGODB_LOCAL_DB is not set.');
  });

  it('resolves dedicated StudiQ local and cloud source config', () => {
    process.env['STUDIQ_MONGODB_LOCAL_URI'] = 'mongodb://localhost:27018/studiq_local';
    process.env['STUDIQ_MONGODB_LOCAL_DB'] = 'studiq_local';
    process.env['STUDIQ_MONGODB_CLOUD_URI'] = 'mongodb+srv://cluster.example/?authSource=admin';
    process.env['STUDIQ_MONGODB_CLOUD_DB'] = 'studiq_db';

    expect(resolveStudiqMongoSourceConfig('local')).toMatchObject({
      source: 'local',
      configured: true,
      uri: 'mongodb://localhost:27018/studiq_local',
      dbName: 'studiq_local',
      usesLegacyEnv: false,
    });
    expect(resolveStudiqMongoSourceConfig('cloud')).toMatchObject({
      source: 'cloud',
      configured: true,
      uri: 'mongodb+srv://cluster.example/?authSource=admin',
      dbName: 'studiq_db',
      usesLegacyEnv: false,
    });
  });

  it('resolves dedicated CMS Builder local and cloud source config', () => {
    process.env['CMS_BUILDER_MONGODB_LOCAL_URI'] =
      'mongodb://localhost:27019/cms_builder_local';
    process.env['CMS_BUILDER_MONGODB_LOCAL_DB'] = 'cms_builder_local';
    process.env['CMS_BUILDER_MONGODB_CLOUD_URI'] =
      'mongodb+srv://cluster.example/?authSource=admin';
    process.env['CMS_BUILDER_MONGODB_CLOUD_DB'] = 'cms_builder_db';

    expect(resolveCmsBuilderMongoSourceConfig('local')).toMatchObject({
      source: 'local',
      configured: true,
      uri: 'mongodb://localhost:27019/cms_builder_local',
      dbName: 'cms_builder_local',
      usesLegacyEnv: false,
    });
    expect(resolveCmsBuilderMongoSourceConfig('cloud')).toMatchObject({
      source: 'cloud',
      configured: true,
      uri: 'mongodb+srv://cluster.example/?authSource=admin',
      dbName: 'cms_builder_db',
      usesLegacyEnv: false,
    });
  });

  it('resolves Products local and cloud source config', () => {
    process.env['PRODUCTS_MONGODB_LOCAL_URI'] = 'mongodb://localhost:27017/app';
    process.env['PRODUCTS_MONGODB_LOCAL_DB'] = 'app';
    process.env['PRODUCTS_MONGODB_CLOUD_URI'] =
      'mongodb+srv://cluster.example/?authSource=admin';
    process.env['PRODUCTS_MONGODB_CLOUD_DB'] = 'products_db';

    expect(resolveProductsMongoSourceConfig('local')).toMatchObject({
      source: 'local',
      configured: true,
      uri: 'mongodb://localhost:27017/app',
      dbName: 'app',
      usesLegacyEnv: false,
    });
    expect(resolveProductsMongoSourceConfig('cloud')).toMatchObject({
      source: 'cloud',
      configured: true,
      uri: 'mongodb+srv://cluster.example/?authSource=admin',
      dbName: 'products_db',
      usesLegacyEnv: false,
    });
  });

  it('resolves Ecommerce local and cloud source config for Database Engine sync', () => {
    process.env['ECOM_MONGODB_LOCAL_URI'] = 'mongodb://localhost:27021/ecom_local';
    process.env['ECOM_MONGODB_LOCAL_DB'] = 'ecom_local';
    process.env['ECOM_MONGODB_CLOUD_URI'] =
      'mongodb+srv://cluster.example/?authSource=admin';
    process.env['ECOM_MONGODB_CLOUD_DB'] = 'ecom_db';

    expect(resolveEcommerceMongoSourceConfig('local')).toMatchObject({
      source: 'local',
      configured: true,
      uri: 'mongodb://localhost:27021/ecom_local',
      dbName: 'ecom_local',
      usesLegacyEnv: false,
    });
    expect(resolveEcommerceMongoSourceConfig('cloud')).toMatchObject({
      source: 'cloud',
      configured: true,
      uri: 'mongodb+srv://cluster.example/?authSource=admin',
      dbName: 'ecom_db',
      usesLegacyEnv: false,
    });
  });

  it('falls back to the legacy Products cloud config for Ecommerce cloud sync', () => {
    process.env['PRODUCTS_MONGODB_CLOUD_URI'] =
      'mongodb+srv://cluster.example/?authSource=admin';
    process.env['PRODUCTS_MONGODB_CLOUD_DB'] = 'products_db';

    expect(resolveEcommerceMongoSourceConfig('local')).toMatchObject({
      source: 'local',
      configured: true,
      uri: 'mongodb://127.0.0.1:27021/ecom_local',
      dbName: 'ecom_local',
      usesLegacyEnv: false,
    });
    expect(resolveEcommerceMongoSourceConfig('cloud')).toMatchObject({
      source: 'cloud',
      configured: true,
      uri: 'mongodb+srv://cluster.example/?authSource=admin',
      dbName: 'products_db',
      usesLegacyEnv: true,
    });
  });

  it('wraps execFile success output', async () => {
    execFileMock.mockImplementation(
      (
        _command: string,
        _args: string[],
        _options: { maxBuffer: number },
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(null, 'stdout-data', 'stderr-data');
      }
    );

    await expect(execFileAsync('mongodump', ['--help'])).resolves.toEqual({
      stdout: 'stdout-data',
      stderr: 'stderr-data',
    });
    expect(execFileMock).toHaveBeenCalledWith(
      'mongodump',
      ['--help'],
      { maxBuffer: 128 * 1024 * 1024 },
      expect.any(Function)
    );
  });

  it('wraps execFile failures and preserves stdout/stderr on the error cause', async () => {
    execFileMock.mockImplementation(
      (
        _command: string,
        _args: string[],
        _options: { maxBuffer: number },
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(new Error('mongodump failed'), 'partial-stdout', 'partial-stderr');
      }
    );

    await expect(execFileAsync('mongodump', ['--archive'])).rejects.toMatchObject({
      message: 'mongodump failed',
      cause: {
        stdout: 'partial-stdout',
        stderr: 'partial-stderr',
      },
    });
  });

  it('validates backup archive names', () => {
    expect(() => assertValidBackupName('backup-2026-03-25.archive')).not.toThrow();
    expect(() => assertValidBackupName('geminitestapp/backup-2026-03-25.archive')).not.toThrow();
    expect(() => assertValidBackupName('studiq/studiq-local-backup.archive')).not.toThrow();
    expect(() => assertValidBackupName('cms-builder/cms-builder-local-backup.archive')).not.toThrow();
    expect(() => assertValidBackupName('products/products-local-backup.archive')).not.toThrow();
    expect(() => assertValidBackupName('backup.txt')).toThrow('Invalid backup file type for');
    expect(() => assertValidBackupName('../backup.archive')).toThrow('Invalid backup name');
    expect(() => assertValidBackupName('other/backup.archive')).toThrow(
      'Invalid backup application folder'
    );
    expect(buildMongoBackupName('studiq', 'studiq-local-backup.archive')).toBe(
      'studiq/studiq-local-backup.archive'
    );
    expect(getMongoBackupApplication('studiq/studiq-local-backup.archive')).toBe('studiq');
    expect(getMongoBackupApplication('cms-builder/cms-builder-local-backup.archive')).toBe(
      'cms-builder'
    );
    expect(getMongoBackupApplication('products/products-local-backup.archive')).toBe('products');
    expect(getMongoBackupApplication('legacy-backup.archive')).toBe('geminitestapp');
    expect(getMongoBackupPath('geminitestapp/app-backup.archive')).toContain(
      'geminitestapp/app-backup.archive'
    );
  });

  it('detects transient mongo connectivity errors', () => {
    const error = new Error('querySrv ECONNREFUSED _mongodb._tcp.cluster0.example.mongodb.net');
    error.name = 'MongoServerSelectionError';

    expect(isTransientMongoConnectionError(error)).toBe(true);
    expect(isTransientMongoConnectionError(new Error('settings schema mismatch'))).toBe(false);
    expect(isTransientMongoConnectionError('ECONNREFUSED')).toBe(false);
  });
});
