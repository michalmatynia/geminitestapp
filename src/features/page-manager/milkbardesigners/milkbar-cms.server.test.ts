import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MilkbarCmsUpdateInput, MilkbarProjectCmsRecord } from './milkbar-cms.types';
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

import {
  buildMilkbarProjectUpdateDocument,
  pruneMissingMilkbarModelAssetReferences,
  uploadMilkbarCmsFilesToFastCometOnSave,
} from './milkbar-cms.server';

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

const buildProject = (
  overrides: Partial<MilkbarProjectCmsRecord> = {}
): MilkbarProjectCmsRecord => ({
  cameraPosition: { x: 20, y: 15, z: 20 },
  cameraTarget: { x: 0, y: 6, z: 0 },
  city: 'Amsterdam',
  code: 'MBD-001',
  country: 'NL',
  description: 'Project description.',
  name: 'Helios Tower',
  order: 0,
  projectType: 'Mixed-Use Tower',
  stats: [],
  status: 'published',
  ...overrides,
});

describe('pruneMissingMilkbarModelAssetReferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAsset3DFromLookupRepositories.mockImplementation(async (assetId: string) =>
      assetId === 'asset-present'
        ? {
            id: assetId,
            name: 'Present model',
            description: null,
            categoryId: null,
            filepath: '/uploads/cms/models/present.glb',
            fileUrl: '/uploads/cms/models/present.glb',
            metadata: {
              publicPath: '/uploads/cms/models/present.glb',
              storageProfile: 'milkbarCms',
            },
          }
        : null
    );
  });

  it('removes stale missing asset references before saving the CMS payload', async () => {
    const input: MilkbarCmsUpdateInput = {
      localizedContent: {
        ...DEFAULT_MILKBAR_LOCALIZED_CONTENT,
        en: {
          ...DEFAULT_MILKBAR_LOCALIZED_CONTENT.en,
          hero: {
            ...DEFAULT_MILKBAR_LOCALIZED_CONTENT.en.hero,
            modelAssetId: 'asset-missing',
            modelUrl: '/api/assets3d/asset-missing/file',
          },
          drawing: {
            ...DEFAULT_MILKBAR_LOCALIZED_CONTENT.en.drawing,
            interiorModelAssetId: 'asset-present',
            interiorModelUrl: '/api/assets3d/asset-present/file',
          },
        },
      },
      pageSettings: DEFAULT_MILKBAR_PAGE_SETTINGS,
      projects: [
        buildProject({
          code: 'MBD-001',
          modelUrl: '/api/assets3d/asset-missing/file',
        }),
        buildProject({
          code: 'MBD-002',
          modelAssetId: 'asset-present',
          modelUrl: '/api/assets3d/asset-present/file',
        }),
        buildProject({
          code: 'MBD-003',
          modelUrl: 'https://example.com/model.glb',
        }),
      ],
      services: [],
    };

    const pruned = await pruneMissingMilkbarModelAssetReferences(input);

    expect(pruned.localizedContent.en.hero).not.toHaveProperty('modelAssetId');
    expect(pruned.localizedContent.en.hero).not.toHaveProperty('modelUrl');
    expect(pruned.localizedContent.en.drawing).toMatchObject({
      interiorModelAssetId: 'asset-present',
      interiorModelUrl: '/api/assets3d/asset-present/file',
    });
    expect(pruned.projects[0]).not.toHaveProperty('modelAssetId');
    expect(pruned.projects[0]).not.toHaveProperty('modelUrl');
    expect(pruned.projects[1]).toMatchObject({
      modelAssetId: 'asset-present',
      modelUrl: '/api/assets3d/asset-present/file',
    });
    expect(pruned.projects[2]).toMatchObject({
      modelUrl: 'https://example.com/model.glb',
    });
  });
});

describe('buildMilkbarProjectUpdateDocument', () => {
  const now = new Date('2026-05-19T20:00:00.000Z');

  it('unsets saved model fields when a project model slot has been cleared', () => {
    const update = buildMilkbarProjectUpdateDocument(buildProject(), now);

    expect(update.$unset).toEqual({
      modelAssetId: '',
      modelUrl: '',
    });
    expect(update.$set).not.toHaveProperty('modelAssetId');
    expect(update.$set).not.toHaveProperty('modelUrl');
  });

  it('keeps model fields when a project model slot is assigned', () => {
    const update = buildMilkbarProjectUpdateDocument(
      buildProject({
        modelAssetId: 'asset-1',
        modelUrl: '/api/assets3d/asset-1/file',
      }),
      now
    );

    expect(update.$unset).toBeUndefined();
    expect(update.$set).toMatchObject({
      modelAssetId: 'asset-1',
      modelUrl: '/api/assets3d/asset-1/file',
    });
  });
});
