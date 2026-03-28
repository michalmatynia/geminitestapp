import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileMock = vi.hoisted(() => vi.fn());
const mkdirMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

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
    default: {
      ...actual,
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
  ensureBackupsDir,
  execFileAsync,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoDumpCommand,
  getMongoRestoreCommand,
  isTransientMongoConnectionError,
} from '@/shared/lib/db/utils/mongo';

describe('shared db mongo utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env['MONGODB_URI'];
    delete process.env['MONGODB_DB'];
    delete process.env['MONGODUMP_PATH'];
    delete process.env['MONGORESTORE_PATH'];
  });

  it('creates the backups directory inside the repo mongo backup folder', async () => {
    await ensureBackupsDir();

    expect(mkdirMock).toHaveBeenCalledWith(backupsDir, { recursive: true });
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

  it('throws configuration errors when required mongo env vars are missing', () => {
    expect(() => getMongoConnectionUrl()).toThrow('MONGODB_URI is not set.');
    expect(() => getMongoDatabaseName()).toThrow('MONGODB_DB is not set.');
  });

  it('wraps execFile success output', async () => {
    execFileMock.mockImplementation(
      (
        _command: string,
        _args: string[],
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(null, 'stdout-data', 'stderr-data');
      }
    );

    await expect(execFileAsync('mongodump', ['--help'])).resolves.toEqual({
      stdout: 'stdout-data',
      stderr: 'stderr-data',
    });
  });

  it('wraps execFile failures and preserves stdout/stderr on the error cause', async () => {
    execFileMock.mockImplementation(
      (
        _command: string,
        _args: string[],
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
    expect(() => assertValidBackupName('backup.txt')).toThrow('Invalid backup file type.');
    expect(() => assertValidBackupName('../backup.archive')).toThrow('Invalid backup name.');
  });

  it('detects transient mongo connectivity errors', () => {
    const error = new Error('querySrv ECONNREFUSED _mongodb._tcp.cluster0.example.mongodb.net');
    error.name = 'MongoServerSelectionError';

    expect(isTransientMongoConnectionError(error)).toBe(true);
    expect(isTransientMongoConnectionError(new Error('settings schema mismatch'))).toBe(false);
    expect(isTransientMongoConnectionError('ECONNREFUSED')).toBe(false);
  });
});
