import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  deleteFileFromStorage: vi.fn(),
  deleteFromFastComet: vi.fn(),
  findAsset3DRepositoryAsset: vi.fn(),
  fsUnlink: vi.fn(),
  getAssets3DStorageSource: vi.fn(),
  getFileStorageSettings: vi.fn(),
  repositoryDeleteAsset3D: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    unlink: mocks.fsUnlink,
    writeFile: vi.fn(),
  },
}));

vi.mock('@/features/viewer3d/services/asset3d-repository', () => ({
  findAsset3DRepositoryAsset: (...args: unknown[]) =>
    mocks.findAsset3DRepositoryAsset(...args),
  getAsset3DRepository: vi.fn(),
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  deleteFileFromStorage: (...args: unknown[]) => mocks.deleteFileFromStorage(...args),
  getDiskPathFromPublicPath: (publicPath: string) => `/local${publicPath}`,
  getPublicPathFromStoredPath: (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).pathname;
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  },
  uploadToConfiguredStorage: vi.fn(),
}));

vi.mock('@/shared/lib/files/services/storage/file-storage-service', () => ({
  getFileStorageSettings: (...args: unknown[]) => mocks.getFileStorageSettings(...args),
}));

vi.mock('@/shared/lib/files/services/storage/fastcomet-storage-client', () => ({
  deleteFromFastComet: (...args: unknown[]) => mocks.deleteFromFastComet(...args),
}));

vi.mock('@/shared/lib/files/services/storage/storage-settings-service', () => ({
  getAssets3DStorageSource: (...args: unknown[]) => mocks.getAssets3DStorageSource(...args),
}));

vi.mock('@/shared/lib/files/services/storage/milkbar-fastcomet-public-html-mirror', () => ({
  getMilkbarFastCometPublicHtmlMirrorPath: (publicPath: string) =>
    `/mirror${publicPath}`,
  writeMilkbarFastCometPublicHtmlMirrorFile: vi.fn(),
}));

vi.mock('@/shared/lib/files/services/storage/milkbar-fastcomet-storage', () => ({
  resolveMilkbarFastCometStorageProfile: () => ({
    fastCometConfig: {
      baseUrl: 'https://uploads.milkbardesigners.com',
      deleteEndpoint: 'https://uploads.milkbardesigners.com/api/uploads/delete/index.php',
      resolveIp: '209.42.31.54',
      server: 'uploads.milkbardesigners.com',
      uploadEndpoint: 'https://uploads.milkbardesigners.com/api/uploads/index.php',
    },
    publicBaseUrl: 'https://uploads.milkbardesigners.com',
  }),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

import { deleteAsset3D } from './asset3dUploader';

const createAsset = (overrides: Partial<Asset3DRecord> = {}): Asset3DRecord => ({
  categoryId: null,
  createdAt: new Date('2026-05-20T00:00:00.000Z'),
  description: null,
  id: 'asset-1',
  name: 'Milkbar model',
  updatedAt: new Date('2026-05-20T00:00:00.000Z'),
  ...overrides,
});

describe('deleteAsset3D Milkbar FastComet cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fsUnlink.mockResolvedValue(undefined);
    mocks.getFileStorageSettings.mockResolvedValue({
      fastComet: {
        baseUrl: 'https://milkbardesigners.com',
        deleteEndpoint: 'https://milkbardesigners.com/api/uploads/delete/index.php',
        timeoutMs: 5_000,
        uploadEndpoint: 'https://milkbardesigners.com/api/uploads/index.php',
      },
      source: 'local',
    });
    mocks.repositoryDeleteAsset3D.mockResolvedValue(createAsset());
  });

  it('deletes moved Milkbar models from the uploads subdomain even when the stored URL is legacy', async () => {
    mocks.findAsset3DRepositoryAsset.mockResolvedValue({
      asset: createAsset({
        filepath: 'https://milkbardesigners.com/uploads/cms/models/moved.glb',
        metadata: {
          fastCometUploadStatus: 'completed',
          publicPath: '/uploads/cms/models/moved.glb',
          storageProfile: 'milkbarCms',
          storageSource: 'fastcomet',
        },
      }),
      repository: {
        deleteAsset3D: mocks.repositoryDeleteAsset3D,
      },
    });

    await expect(deleteAsset3D('asset-1')).resolves.toBe(true);

    expect(mocks.deleteFromFastComet).toHaveBeenCalledWith({
      filepath: 'https://uploads.milkbardesigners.com/uploads/cms/models/moved.glb',
      publicPath: '/uploads/cms/models/moved.glb',
      fastComet: expect.objectContaining({
        baseUrl: 'https://uploads.milkbardesigners.com',
        deleteEndpoint: 'https://uploads.milkbardesigners.com/api/uploads/delete/index.php',
        server: 'uploads.milkbardesigners.com',
      }),
    });
    expect(mocks.repositoryDeleteAsset3D).toHaveBeenCalledWith('asset-1');
  });
});
