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
  getStudiqMongoConnectionUrlMock,
  getStudiqMongoDatabaseNameMock,
  mongoExecFileAsyncMock,
  resolveMongoSourceConfigMock,
  resolveCmsBuilderMongoSourceConfigMock,
  resolveStudiqMongoSourceConfigMock,
  writeFileMock,
  statMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  ensureMongoBackupsDirMock: vi.fn(),
  getMongoConnectionUrlMock: vi.fn(),
  getMongoDatabaseNameMock: vi.fn(),
  getMongoDumpCommandMock: vi.fn(),
  getCmsBuilderMongoConnectionUrlMock: vi.fn(),
  getCmsBuilderMongoDatabaseNameMock: vi.fn(),
  getStudiqMongoConnectionUrlMock: vi.fn(),
  getStudiqMongoDatabaseNameMock: vi.fn(),
  mongoExecFileAsyncMock: vi.fn(),
  resolveMongoSourceConfigMock: vi.fn(),
  resolveCmsBuilderMongoSourceConfigMock: vi.fn(),
  resolveStudiqMongoSourceConfigMock: vi.fn(),
  writeFileMock: vi.fn(),
  statMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('fs', () => ({
  promises: {
    writeFile: writeFileMock,
    stat: statMock,
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
  getStudiqMongoConnectionUrl: getStudiqMongoConnectionUrlMock,
  getStudiqMongoDatabaseName: getStudiqMongoDatabaseNameMock,
  resolveCmsBuilderMongoSourceConfig: resolveCmsBuilderMongoSourceConfigMock,
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
    writeFileMock.mockResolvedValue(undefined);
    statMock.mockResolvedValue(null);
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

    expect(ensureMongoBackupsDirMock).toHaveBeenCalledTimes(3);
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
        /^--archive=\/tmp\/backups\/cms-builder\/cms-builder-local-backup-\d+\.archive$/
      ),
      '--gzip',
    ]);
    expect(writeFileMock).toHaveBeenCalledTimes(3);
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
});
