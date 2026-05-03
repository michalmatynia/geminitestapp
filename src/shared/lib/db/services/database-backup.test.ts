/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureMongoBackupsDirMock,
  getMongoConnectionUrlMock,
  getMongoDatabaseNameMock,
  getMongoDumpCommandMock,
  mongoExecFileAsyncMock,
  resolveMongoSourceConfigMock,
  writeFileMock,
  statMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  ensureMongoBackupsDirMock: vi.fn(),
  getMongoConnectionUrlMock: vi.fn(),
  getMongoDatabaseNameMock: vi.fn(),
  getMongoDumpCommandMock: vi.fn(),
  mongoExecFileAsyncMock: vi.fn(),
  resolveMongoSourceConfigMock: vi.fn(),
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
  ensureBackupsDir: ensureMongoBackupsDirMock,
  getMongoConnectionUrl: getMongoConnectionUrlMock,
  getMongoDatabaseName: getMongoDatabaseNameMock,
  getMongoDumpCommand: getMongoDumpCommandMock,
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
    getMongoDumpCommandMock.mockReturnValue('mongodump');
    ensureMongoBackupsDirMock.mockResolvedValue(undefined);
    resolveMongoSourceConfigMock.mockResolvedValue({
      source: 'cloud',
      configured: true,
      uri: 'mongodb+srv://cluster.example/app_cloud',
      dbName: 'app_cloud',
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

    expect(ensureMongoBackupsDirMock).toHaveBeenCalledTimes(1);
    expect(mongoExecFileAsyncMock).toHaveBeenCalledWith('mongodump', [
      '--uri',
      'mongodb://user:secret@localhost:27017/app',
      '--db',
      'app',
      expect.stringMatching(/^--archive=\/tmp\/backups\/app-backup-\d+\.archive$/),
      '--gzip',
    ]);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/\.archive\.log$/),
      expect.stringContaining('mongodb://user:***@localhost:27017/app')
    );
    expect(writeFileMock).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('secret')
    );
    expect(result).toMatchObject({
      message: 'Backup created',
      backupName: expect.stringMatching(/^app-backup-\d+\.archive$/),
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
      warning: 'permission denied',
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
      '--archive=/tmp/backups/app-cloud-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      '--gzip',
    ]);
    expect(result).toEqual({
      role: 'source',
      source: 'cloud',
      backupName: 'app-cloud-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      backupPath:
        '/tmp/backups/app-cloud-cloud-source-pre-sync-cloud-to-local-1712637000000.archive',
      logPath:
        '/tmp/backups/app-cloud-cloud-source-pre-sync-cloud-to-local-1712637000000.archive.log',
      createdAt: new Date(timestamp).toISOString(),
      warning: null,
    });
  });
});
