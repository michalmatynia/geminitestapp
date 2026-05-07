/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureMongoBackupsDirMock,
  getMongoConnectionUrlMock,
  getMongoDatabaseNameMock,
  getMongoDumpCommandMock,
  getCmsBuilderMongoConnectionUrlMock,
  getCmsBuilderMongoDatabaseNameMock,
  getProductsMongoConnectionUrlMock,
  getProductsMongoDatabaseNameMock,
  getStudiqMongoConnectionUrlMock,
  getStudiqMongoDatabaseNameMock,
  mongoExecFileAsyncMock,
  resolveMongoSourceConfigMock,
  resolveCmsBuilderMongoSourceConfigMock,
  resolveProductsMongoSourceConfigMock,
  resolveStudiqMongoSourceConfigMock,
  writeFileMock,
  rmMock,
  statMock,
  statfsMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  ensureMongoBackupsDirMock: vi.fn(),
  getMongoConnectionUrlMock: vi.fn(),
  getMongoDatabaseNameMock: vi.fn(),
  getMongoDumpCommandMock: vi.fn(),
  getCmsBuilderMongoConnectionUrlMock: vi.fn(),
  getCmsBuilderMongoDatabaseNameMock: vi.fn(),
  getProductsMongoConnectionUrlMock: vi.fn(),
  getProductsMongoDatabaseNameMock: vi.fn(),
  getStudiqMongoConnectionUrlMock: vi.fn(),
  getStudiqMongoDatabaseNameMock: vi.fn(),
  mongoExecFileAsyncMock: vi.fn(),
  resolveMongoSourceConfigMock: vi.fn(),
  resolveCmsBuilderMongoSourceConfigMock: vi.fn(),
  resolveProductsMongoSourceConfigMock: vi.fn(),
  resolveStudiqMongoSourceConfigMock: vi.fn(),
  writeFileMock: vi.fn(),
  rmMock: vi.fn(),
  statMock: vi.fn(),
  statfsMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('fs', () => ({
  promises: {
    writeFile: writeFileMock,
    rm: rmMock,
    stat: statMock,
    statfs: statfsMock,
  },
}));

vi.mock('@/shared/lib/db/utils/mongo', () => ({
  backupsDir: '/tmp/backups',
  buildMongoBackupName: (application: string, archiveName: string) =>
    `${application}/${archiveName}`,
  ensureBackupsDir: ensureMongoBackupsDirMock,
  getMongoConnectionUrl: getMongoConnectionUrlMock,
  getMongoDatabaseName: getMongoDatabaseNameMock,
  getMongoDumpCommand: getMongoDumpCommandMock,
  getCmsBuilderMongoConnectionUrl: getCmsBuilderMongoConnectionUrlMock,
  getCmsBuilderMongoDatabaseName: getCmsBuilderMongoDatabaseNameMock,
  getProductsMongoConnectionUrl: getProductsMongoConnectionUrlMock,
  getProductsMongoDatabaseName: getProductsMongoDatabaseNameMock,
  getStudiqMongoConnectionUrl: getStudiqMongoConnectionUrlMock,
  getStudiqMongoDatabaseName: getStudiqMongoDatabaseNameMock,
  resolveCmsBuilderMongoSourceConfig: resolveCmsBuilderMongoSourceConfigMock,
  resolveProductsMongoSourceConfig: resolveProductsMongoSourceConfigMock,
  resolveStudiqMongoSourceConfig: resolveStudiqMongoSourceConfigMock,
  execFileAsync: mongoExecFileAsyncMock,
}));

vi.mock('@/shared/lib/db/mongo-source', () => ({
  resolveMongoSourceConfig: resolveMongoSourceConfigMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

import { createMongoBackup, createMongoSourceBackup } from './database-backup';

const originalNodeEnv = process.env['NODE_ENV'];

describe('database-backup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['NODE_ENV'] = 'development';
    getMongoConnectionUrlMock.mockReturnValue('mongodb://localhost:27017/app');
    getMongoDatabaseNameMock.mockReturnValue('app');
    getStudiqMongoConnectionUrlMock.mockReturnValue('mongodb://localhost:27018/studiq_local');
    getStudiqMongoDatabaseNameMock.mockReturnValue('studiq_local');
    getCmsBuilderMongoConnectionUrlMock.mockReturnValue(
      'mongodb://localhost:27019/cms_builder_local'
    );
    getCmsBuilderMongoDatabaseNameMock.mockReturnValue('cms_builder_local');
    getProductsMongoConnectionUrlMock.mockReturnValue('mongodb://localhost:27020/products_local');
    getProductsMongoDatabaseNameMock.mockReturnValue('products_local');
    getMongoDumpCommandMock.mockReturnValue('mongodump');
    ensureMongoBackupsDirMock.mockResolvedValue(undefined);
    resolveMongoSourceConfigMock.mockResolvedValue({
      source: 'cloud',
      configured: true,
      uri: 'mongodb+srv://cluster.example/app_cloud',
      dbName: 'app_cloud',
      usesLegacyEnv: false,
    });
    resolveStudiqMongoSourceConfigMock.mockReturnValue({
      source: 'cloud',
      configured: true,
      uri: 'mongodb+srv://cluster.example/studiq_cloud',
      dbName: 'studiq_cloud',
      usesLegacyEnv: false,
    });
    resolveCmsBuilderMongoSourceConfigMock.mockReturnValue({
      source: 'cloud',
      configured: true,
      uri: 'mongodb+srv://cluster.example/cms_builder_cloud',
      dbName: 'cms_builder_cloud',
      usesLegacyEnv: false,
    });
    resolveProductsMongoSourceConfigMock.mockReturnValue({
      source: 'cloud',
      configured: true,
      uri: 'mongodb+srv://cluster.example/products_cloud',
      dbName: 'products_cloud',
      usesLegacyEnv: false,
    });
    writeFileMock.mockResolvedValue(undefined);
    rmMock.mockResolvedValue(undefined);
    statMock.mockResolvedValue(null);
    statfsMock.mockResolvedValue({ bavail: 10 * 1024 * 1024, bsize: 1024 });
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = originalNodeEnv;
    }
  });

  it('creates a successful mongo backup and writes the execution log', async () => {
    getMongoConnectionUrlMock.mockReturnValue('mongodb://user:secret@localhost:27017/app');
    mongoExecFileAsyncMock.mockResolvedValue({
      stdout: 'backup stdout',
      stderr: '',
    });

    const result = await createMongoBackup();

    expect(ensureMongoBackupsDirMock).toHaveBeenCalledTimes(4);
    expect(mongoExecFileAsyncMock).toHaveBeenNthCalledWith(1, 'mongodump', [
      '--uri',
      'mongodb://user:secret@localhost:27017/app',
      '--db',
      'app',
      expect.stringMatching(/^--archive=\/tmp\/backups\/geminitestapp\/app-backup-\d+\.archive$/),
      '--gzip',
    ]);
    expect(mongoExecFileAsyncMock).toHaveBeenNthCalledWith(2, 'mongodump', [
      '--uri',
      'mongodb://localhost:27018/studiq_local',
      '--db',
      'studiq_local',
      expect.stringMatching(
        /^--archive=\/tmp\/backups\/studiq\/studiq_local-backup-\d+\.archive$/
      ),
      '--gzip',
    ]);
    expect(mongoExecFileAsyncMock).toHaveBeenNthCalledWith(3, 'mongodump', [
      '--uri',
      'mongodb://localhost:27019/cms_builder_local',
      '--db',
      'cms_builder_local',
      expect.stringMatching(
        /^--archive=\/tmp\/backups\/cms-builder\/cms_builder_local-backup-\d+\.archive$/
      ),
      '--gzip',
    ]);
    expect(mongoExecFileAsyncMock).toHaveBeenNthCalledWith(4, 'mongodump', [
      '--uri',
      'mongodb://localhost:27020/products_local',
      '--db',
      'products_local',
      expect.stringMatching(
        /^--archive=\/tmp\/backups\/products\/products_local-backup-\d+\.archive$/
      ),
      '--gzip',
    ]);
    expect(writeFileMock).toHaveBeenCalledTimes(4);
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/\.archive\.log$/),
      expect.stringContaining('mongodb://user:***@localhost:27017/app')
    );
    expect(writeFileMock).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('secret')
    );
    expect(result).toMatchObject({
      message: 'Backups created',
      backupName: expect.stringMatching(/^geminitestapp\/app-backup-\d+\.archive$/),
      log: expect.stringContaining('backup stdout'),
    });
  });

  it('returns a warning result when the archive exists after a failed dump', async () => {
    mongoExecFileAsyncMock.mockRejectedValue({
      message: 'dump failed',
      cause: {
        stdout: '',
        stderr: 'permission denied',
      },
    });
    statMock.mockResolvedValue({ size: 128 });

    const result = await createMongoBackup();

    expect(captureExceptionMock).toHaveBeenCalled();
    expect(result).toMatchObject({
      message: 'Backup created with warnings',
      warning: expect.stringContaining('permission denied'),
      log: expect.stringContaining('permission denied'),
    });
  });

  it('rejects before invoking mongo tooling when the backup target is low on disk space', async () => {
    statfsMock.mockResolvedValue({ bavail: 1, bsize: 1024 });

    await expect(createMongoBackup()).rejects.toThrow(/not enough disk space/i);

    expect(mongoExecFileAsyncMock).not.toHaveBeenCalled();
  });

  it('removes partial archives when mongodump fails because the disk is full', async () => {
    mongoExecFileAsyncMock.mockRejectedValue({
      message: 'dump failed',
      cause: {
        stdout: '',
        stderr: 'no space left on device',
      },
    });
    statMock.mockResolvedValue({ size: 128 });

    await expect(createMongoBackup()).rejects.toThrow(/failed to create mongodb backup/i);

    expect(rmMock).toHaveBeenCalledWith(expect.stringMatching(/app-backup-\d+\.archive$/), {
      force: true,
    });
    expect(rmMock).toHaveBeenCalledWith(expect.stringMatching(/app-backup-\d+\.archive\.log$/), {
      force: true,
    });
  });

  it('rejects backups in production before invoking mongo tooling', async () => {
    process.env['NODE_ENV'] = 'production';

    await expect(createMongoBackup()).rejects.toThrow(/disabled in production/i);
    expect(ensureMongoBackupsDirMock).not.toHaveBeenCalled();
    expect(mongoExecFileAsyncMock).not.toHaveBeenCalled();
  });

  it('creates an explicit source backup for Mongo sync workflows', async () => {
    mongoExecFileAsyncMock.mockResolvedValue({
      stdout: 'backup stdout',
      stderr: '',
    });
    const timestamp = 1712637000000;

    const result = await createMongoSourceBackup({
      source: 'cloud',
      role: 'source',
      direction: 'cloud_to_local',
      timestamp,
    });

    expect(resolveMongoSourceConfigMock).toHaveBeenCalledWith('cloud');
    expect(mongoExecFileAsyncMock).toHaveBeenCalledWith('mongodump', [
      '--uri',
      'mongodb+srv://cluster.example/app_cloud',
      '--db',
      'app_cloud',
      '--archive=/tmp/backups/geminitestapp/app-cloud-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      '--gzip',
    ]);
    expect(result).toEqual({
      application: 'geminitestapp',
      role: 'source',
      source: 'cloud',
      backupName: 'geminitestapp/app-cloud-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      backupPath:
        '/tmp/backups/geminitestapp/app-cloud-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      logPath:
        '/tmp/backups/geminitestapp/app-cloud-cloud-source-pre-sync-cloud-to-local-1712637000000.archive.log',
      createdAt: new Date(timestamp).toISOString(),
      warning: null,
    });
  });

  it('creates a StudiQ source backup in the StudiQ backup folder for sync workflows', async () => {
    mongoExecFileAsyncMock.mockResolvedValue({
      stdout: 'backup stdout',
      stderr: '',
    });
    const timestamp = 1712637000000;

    const result = await createMongoSourceBackup({
      application: 'studiq',
      source: 'cloud',
      role: 'source',
      direction: 'cloud_to_local',
      timestamp,
    });

    expect(resolveStudiqMongoSourceConfigMock).toHaveBeenCalledWith('cloud');
    expect(mongoExecFileAsyncMock).toHaveBeenCalledWith('mongodump', [
      '--uri',
      'mongodb+srv://cluster.example/studiq_cloud',
      '--db',
      'studiq_cloud',
      '--archive=/tmp/backups/studiq/studiq-cloud-studiq-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      '--gzip',
    ]);
    expect(result).toEqual({
      application: 'studiq',
      role: 'source',
      source: 'cloud',
      backupName:
        'studiq/studiq-cloud-studiq-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      backupPath:
        '/tmp/backups/studiq/studiq-cloud-studiq-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      logPath:
        '/tmp/backups/studiq/studiq-cloud-studiq-cloud-source-pre-sync-cloud-to-local-1712637000000.archive.log',
      createdAt: new Date(timestamp).toISOString(),
      warning: null,
    });
  });

  it('creates a CMS Builder source backup in the CMS Builder backup folder for sync workflows', async () => {
    mongoExecFileAsyncMock.mockResolvedValue({
      stdout: 'backup stdout',
      stderr: '',
    });
    const timestamp = 1712637000000;

    const result = await createMongoSourceBackup({
      application: 'cms-builder',
      source: 'cloud',
      role: 'source',
      direction: 'cloud_to_local',
      timestamp,
    });

    expect(resolveCmsBuilderMongoSourceConfigMock).toHaveBeenCalledWith('cloud');
    expect(mongoExecFileAsyncMock).toHaveBeenCalledWith('mongodump', [
      '--uri',
      'mongodb+srv://cluster.example/cms_builder_cloud',
      '--db',
      'cms_builder_cloud',
      '--archive=/tmp/backups/cms-builder/cms-builder-cloud-cms-builder-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      '--gzip',
    ]);
    expect(result).toEqual({
      application: 'cms-builder',
      role: 'source',
      source: 'cloud',
      backupName:
        'cms-builder/cms-builder-cloud-cms-builder-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      backupPath:
        '/tmp/backups/cms-builder/cms-builder-cloud-cms-builder-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      logPath:
        '/tmp/backups/cms-builder/cms-builder-cloud-cms-builder-cloud-source-pre-sync-cloud-to-local-1712637000000.archive.log',
      createdAt: new Date(timestamp).toISOString(),
      warning: null,
    });
  });

  it('creates a Products source backup in the Products backup folder for sync workflows', async () => {
    mongoExecFileAsyncMock.mockResolvedValue({
      stdout: 'backup stdout',
      stderr: '',
    });
    const timestamp = 1712637000000;

    const result = await createMongoSourceBackup({
      application: 'products',
      source: 'cloud',
      role: 'source',
      direction: 'cloud_to_local',
      timestamp,
    });

    expect(resolveProductsMongoSourceConfigMock).toHaveBeenCalledWith('cloud');
    expect(mongoExecFileAsyncMock).toHaveBeenCalledWith('mongodump', [
      '--uri',
      'mongodb+srv://cluster.example/products_cloud',
      '--db',
      'products_cloud',
      '--archive=/tmp/backups/products/products-cloud-products-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      '--gzip',
    ]);
    expect(result).toEqual({
      application: 'products',
      role: 'source',
      source: 'cloud',
      backupName:
        'products/products-cloud-products-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      backupPath:
        '/tmp/backups/products/products-cloud-products-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      logPath:
        '/tmp/backups/products/products-cloud-products-cloud-source-pre-sync-cloud-to-local-1712637000000.archive.log',
      createdAt: new Date(timestamp).toISOString(),
      warning: null,
    });
  });
});
