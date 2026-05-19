import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MilkbarCmsUpdateInput } from './milkbar-cms.types';
import {
  DEFAULT_MILKBAR_LOCALIZED_CONTENT,
  DEFAULT_MILKBAR_PAGE_SETTINGS,
} from './milkbar-cms.types';

const mocks = vi.hoisted(() => ({
  getAsset3DFromLookupRepositories: vi.fn(),
  getCmsBuilderImageFileRepository: vi.fn(),
  uploadCmsFastCometMediaInRedisRuntime: vi.fn(),
  uploadMilkbarAsset3DInRedisRuntime: vi.fn(),
}));

vi.mock('@/features/viewer3d/server', () => ({
  getAsset3DFromLookupRepositories: mocks.getAsset3DFromLookupRepositories,
}));

vi.mock('@/features/viewer3d/workers/milkbarAsset3DFastCometUploadQueue', () => ({
  uploadMilkbarAsset3DInRedisRuntime: mocks.uploadMilkbarAsset3DInRedisRuntime,
}));

vi.mock('@/features/cms/workers/cmsFastCometMediaUploadQueue', () => ({
  uploadCmsFastCometMediaInRedisRuntime: mocks.uploadCmsFastCometMediaInRedisRuntime,
}));

vi.mock('@/shared/lib/files/services/image-file-repository', () => ({
  getCmsBuilderImageFileRepository: mocks.getCmsBuilderImageFileRepository,
}));

import { uploadMilkbarCmsFilesToFastCometOnSave } from './milkbar-cms.server';

const buildInput = (): MilkbarCmsUpdateInput => ({
  localizedContent: {
    ...DEFAULT_MILKBAR_LOCALIZED_CONTENT,
    en: {
      ...DEFAULT_MILKBAR_LOCALIZED_CONTENT.en,
      hero: {
        ...DEFAULT_MILKBAR_LOCALIZED_CONTENT.en.hero,
        modelAssetId: 'asset-fastcomet',
      },
      drawing: {
        ...DEFAULT_MILKBAR_LOCALIZED_CONTENT.en.drawing,
        thumbImages: [
          '/uploads/cms/visualisation/local-drawing.png',
          '/uploads/cms/visualisation/fastcomet-drawing.png',
        ],
        interiorModelAssetId: 'asset-local',
      },
    },
  },
  pageSettings: DEFAULT_MILKBAR_PAGE_SETTINGS,
  projects: [],
  services: [],
});

describe('uploadMilkbarCmsFilesToFastCometOnSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCmsBuilderImageFileRepository.mockResolvedValue({
      listImageFiles: vi.fn().mockResolvedValue([
        {
          id: 'image-local',
          filename: 'local-drawing.png',
          filepath: '/uploads/cms/visualisation/local-drawing.png',
          mimetype: 'image/png',
          metadata: {
            publicPath: '/uploads/cms/visualisation/local-drawing.png',
            storageSource: 'local',
          },
          size: 10,
          storageProvider: 'local',
        },
        {
          id: 'image-fastcomet',
          filename: 'fastcomet-drawing.png',
          filepath: 'https://uploads.milkbardesigners.com/uploads/cms/visualisation/fastcomet-drawing.png',
          mimetype: 'image/png',
          metadata: {
            publicPath: '/uploads/cms/visualisation/fastcomet-drawing.png',
            storageSource: 'fastcomet',
          },
          size: 10,
          storageProvider: 'fastcomet',
        },
      ]),
    });
    mocks.getAsset3DFromLookupRepositories.mockImplementation(async (assetId: string) => {
      if (assetId === 'asset-local') {
        return {
          id: assetId,
          name: 'Local model',
          description: null,
          categoryId: null,
          filepath: '/uploads/cms/models/local.glb',
          fileUrl: '/uploads/cms/models/local.glb',
          metadata: {
            publicPath: '/uploads/cms/models/local.glb',
            storageProfile: 'milkbarCms',
            storageSource: 'local',
          },
        };
      }
      return {
        id: assetId,
        name: 'FastComet model',
        description: null,
        categoryId: null,
        filepath: 'https://uploads.milkbardesigners.com/uploads/cms/models/fastcomet.glb',
        fileUrl: 'https://uploads.milkbardesigners.com/uploads/cms/models/fastcomet.glb',
        metadata: {
          publicPath: '/uploads/cms/models/fastcomet.glb',
          storageProfile: 'milkbarCms',
          storageSource: 'fastcomet',
        },
      };
    });
  });

  it('uploads only local Milkbar CMS images and 3D assets to FastComet on save', async () => {
    await uploadMilkbarCmsFilesToFastCometOnSave(buildInput());

    expect(mocks.uploadCmsFastCometMediaInRedisRuntime).toHaveBeenCalledTimes(1);
    expect(mocks.uploadCmsFastCometMediaInRedisRuntime).toHaveBeenCalledWith({
      folder: 'visualisation',
      imageFileId: 'image-local',
      mimetype: 'image/png',
      publicPath: '/uploads/cms/visualisation/local-drawing.png',
      requestedAt: expect.any(String),
    });
    expect(mocks.uploadMilkbarAsset3DInRedisRuntime).toHaveBeenCalledTimes(1);
    expect(mocks.uploadMilkbarAsset3DInRedisRuntime).toHaveBeenCalledWith({
      assetId: 'asset-local',
      requestedAt: expect.any(String),
    });
  });
});
