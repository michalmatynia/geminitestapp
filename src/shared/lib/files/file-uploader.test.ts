/**
 * @vitest-environment node
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { captureExceptionMock, findOneMock, getMongoDbMock, logWarningMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  findOneMock: vi.fn(),
  getMongoDbMock: vi.fn(),
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

import { deleteFileFromStorage } from './file-uploader';
import { uploadsRoot } from './server-constants';
import { invalidateFileStorageSettingsCache } from './services/storage/file-storage-service';

const testFolder = path.join(uploadsRoot, 'products', 'delete-file-cleanup-test');
const testFile = path.join(testFolder, 'image.webp');

describe('deleteFileFromStorage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    invalidateFileStorageSettingsCache();
    findOneMock.mockResolvedValue(null);
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({ findOne: findOneMock })),
    });

    await fs.rm(testFolder, { recursive: true, force: true });
    await fs.mkdir(testFolder, { recursive: true });
    await fs.writeFile(testFile, 'image');
  });

  afterEach(async () => {
    invalidateFileStorageSettingsCache();
    await fs.rm(testFolder, { recursive: true, force: true });
  });

  it('removes the local file and its empty upload folder', async () => {
    await deleteFileFromStorage('/uploads/products/delete-file-cleanup-test/image.webp');

    await expect(fs.stat(testFile)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(testFolder)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
