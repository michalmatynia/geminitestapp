/**
 * @vitest-environment node
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getMongoDbMock,
  findOneMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  findOneMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

import {
  deleteFromConfiguredStorage,
  getFileStorageSettings,
  getPublicPathFromStoredPath,
  invalidateFileStorageSettingsCache,
  uploadBufferToFastComet,
  uploadToConfiguredStorage,
} from './file-storage-service';

const originalEnv = {
  MONGODB_URI: process.env['MONGODB_URI'],
  FILE_STORAGE_SOURCE: process.env['FILE_STORAGE_SOURCE'],
  FASTCOMET_STORAGE_BASE_URL: process.env['FASTCOMET_STORAGE_BASE_URL'],
  FASTCOMET_STORAGE_UPLOAD_URL: process.env['FASTCOMET_STORAGE_UPLOAD_URL'],
  FASTCOMET_STORAGE_DELETE_URL: process.env['FASTCOMET_STORAGE_DELETE_URL'],
  FASTCOMET_STORAGE_AUTH_TOKEN: process.env['FASTCOMET_STORAGE_AUTH_TOKEN'],
  FASTCOMET_STORAGE_KEEP_LOCAL_COPY: process.env['FASTCOMET_STORAGE_KEEP_LOCAL_COPY'],
  FASTCOMET_STORAGE_TIMEOUT_MS: process.env['FASTCOMET_STORAGE_TIMEOUT_MS'],
};

const createSettingsCollection = () => ({
  findOne: findOneMock,
});

describe('file-storage-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateFileStorageSettingsCache();
    process.env['MONGODB_URI'] = 'mongodb://unit-test';
    delete process.env['FILE_STORAGE_SOURCE'];
    delete process.env['FASTCOMET_STORAGE_BASE_URL'];
    delete process.env['FASTCOMET_STORAGE_UPLOAD_URL'];
    delete process.env['FASTCOMET_STORAGE_DELETE_URL'];
    delete process.env['FASTCOMET_STORAGE_AUTH_TOKEN'];
    delete process.env['FASTCOMET_STORAGE_KEEP_LOCAL_COPY'];
    delete process.env['FASTCOMET_STORAGE_TIMEOUT_MS'];
    findOneMock.mockResolvedValue(null);
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => createSettingsCollection()),
    });
    logWarningMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it('normalizes stored fastcomet settings and caches the result', async () => {
    findOneMock
      .mockResolvedValueOnce({ value: ' fastcomet ' })
      .mockResolvedValueOnce({
        value: JSON.stringify({
          baseUrl: 'https://files.example.test/',
          uploadEndpoint: 'https://files.example.test/upload/',
          deleteEndpoint: 'https://files.example.test/delete/',
          authToken: '  token-1  ',
          keepLocalCopy: 'false',
          timeoutMs: '999999',
        }),
      });

    const first = await getFileStorageSettings();
    const second = await getFileStorageSettings();

    expect(first).toEqual({
      source: 'fastcomet',
      fastComet: {
        baseUrl: 'https://files.example.test',
        uploadEndpoint: 'https://files.example.test/upload',
        deleteEndpoint: 'https://files.example.test/delete',
        authToken: 'token-1',
        keepLocalCopy: false,
        timeoutMs: 120000,
      },
    });
    expect(second).toBe(first);
    expect(findOneMock).toHaveBeenCalledTimes(2);
  });

  it('uploads to local storage when the configured source is local', async () => {
    const writeLocalCopy = vi.fn().mockResolvedValue(undefined);

    const result = await uploadToConfiguredStorage({
      buffer: Buffer.from('content'),
      filename: 'image.png',
      mimetype: 'image/png',
      publicPath: '/uploads/image.png',
      category: 'products',
      projectId: null,
      folder: null,
      writeLocalCopy,
    });

    expect(writeLocalCopy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      filepath: '/uploads/image.png',
      source: 'local',
      mirroredLocally: true,
    });
  });

  it('uploads to fastcomet and mirrors locally when configured', async () => {
    findOneMock
      .mockResolvedValueOnce({ value: 'fastcomet' })
      .mockResolvedValueOnce({
        value: JSON.stringify({
          baseUrl: 'https://files.example.test',
          uploadEndpoint: 'https://files.example.test/upload',
          keepLocalCopy: true,
          timeoutMs: 5000,
        }),
      });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ filepath: '/remote/image.png' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const writeLocalCopy = vi.fn().mockResolvedValue(undefined);

    const result = await uploadToConfiguredStorage({
      buffer: Buffer.from('content'),
      filename: 'image.png',
      mimetype: 'image/png',
      publicPath: '/uploads/image.png',
      category: 'products',
      projectId: 'project-1',
      folder: 'folder-a',
      writeLocalCopy,
    });

    expect(writeLocalCopy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      filepath: 'https://files.example.test/remote/image.png',
      source: 'fastcomet',
      mirroredLocally: true,
    });
  });

  it('uses the provided fastcomet config for direct uploads and falls back to baseUrl', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => null,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await uploadBufferToFastComet({
      buffer: Buffer.from('content'),
      filename: 'image.png',
      mimetype: 'image/png',
      publicPath: '/uploads/image.png',
      fastComet: {
        baseUrl: 'https://files.example.test',
        uploadEndpoint: 'https://files.example.test/upload',
        deleteEndpoint: null,
        authToken: 'token-1',
        keepLocalCopy: false,
        timeoutMs: 5000,
      },
    });

    expect(result).toBe('https://files.example.test/uploads/image.png');
  });

  it('derives public paths from stored local and remote filepaths', () => {
    expect(getPublicPathFromStoredPath('/uploads/a.png')).toBe('/uploads/a.png');
    expect(getPublicPathFromStoredPath('uploads/a.png')).toBe('/uploads/a.png');
    expect(getPublicPathFromStoredPath('https://files.example.test/uploads/a%20b.png')).toBe(
      '/uploads/a b.png'
    );
  });

  it('deletes only the local copy when remote deletion is not required', async () => {
    const deleteLocalCopy = vi.fn().mockResolvedValue(undefined);

    await deleteFromConfiguredStorage({
      filepath: '/uploads/image.png',
      deleteLocalCopy,
    });

    expect(deleteLocalCopy).toHaveBeenCalledWith('/uploads/image.png');
    expect(logWarningMock).not.toHaveBeenCalled();
  });

  it('logs and swallows remote deletion failures', async () => {
    findOneMock
      .mockResolvedValueOnce({ value: 'fastcomet' })
      .mockResolvedValueOnce({
        value: JSON.stringify({
          baseUrl: 'https://files.example.test',
          deleteEndpoint: 'https://files.example.test/delete',
          timeoutMs: 5000,
        }),
      });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    });
    vi.stubGlobal('fetch', fetchMock);
    const deleteLocalCopy = vi.fn().mockResolvedValue(undefined);

    await deleteFromConfiguredStorage({
      filepath: 'https://files.example.test/uploads/image.png',
      deleteLocalCopy,
    });

    expect(deleteLocalCopy).toHaveBeenCalledWith('/uploads/image.png');
    expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error));
    expect(logWarningMock).toHaveBeenCalledWith(
      'FastComet delete failed; continuing.',
      expect.objectContaining({
        service: 'file-storage-service',
        filepath: 'https://files.example.test/uploads/image.png',
      })
    );
  });
});
