import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { describe, expect, it } from 'vitest';

import {
  resolveEffectiveModel3DSlotViewMode,
  resolveModel3DSlotSources,
} from './milkbar-model-slot-state';

const createAsset = (overrides: Partial<Asset3DRecord> = {}): Asset3DRecord => ({
  categoryId: null,
  createdAt: new Date('2026-05-19T00:00:00.000Z'),
  description: null,
  id: 'asset-1',
  name: 'Milkbar model',
  updatedAt: new Date('2026-05-19T00:00:00.000Z'),
  ...overrides,
});

describe('milkbar model slot state', () => {
  it('does not expose FastComet before a local model has been published', () => {
    const sources = resolveModel3DSlotSources({
      assetId: 'asset-1',
      asset: createAsset({
        filepath: '/uploads/cms/models/local-model.glb',
        metadata: { publicPath: '/uploads/cms/models/local-model.glb', storageProfile: 'milkbarCms' },
      }),
      isMissing: false,
      modelUrl: '',
    });

    expect(sources.uploadUrl).toBe('/api/assets3d/asset-1/file');
    expect(sources.fastCometUrl).toBe('');
    expect(resolveEffectiveModel3DSlotViewMode('fastcomet', sources)).toBe('upload');
  });

  it('does not expose a FastComet link for a saved local model path without confirmed remote upload', () => {
    const sources = resolveModel3DSlotSources({
      assetId: 'asset-1',
      asset: createAsset({
        filepath: '/uploads/cms/models/local-model.glb',
        metadata: { publicPath: '/uploads/cms/models/local-model.glb', storageProfile: 'milkbarCms' },
      }),
      isMissing: false,
      modelUrl: '/uploads/cms/models/local-model.glb',
    });

    expect(sources.uploadUrl).toBe('/api/assets3d/asset-1/file');
    expect(sources.fastCometUrl).toBe('');
    expect(resolveEffectiveModel3DSlotViewMode('fastcomet', sources)).toBe('upload');
  });

  it('exposes a FastComet link when a saved CMS model URL is already on the uploads host', () => {
    const sources = resolveModel3DSlotSources({
      assetId: '',
      asset: undefined,
      isMissing: false,
      modelUrl: 'https://uploads.milkbardesigners.com/uploads/cms/models/local-model.glb',
    });

    expect(sources.fastCometUrl).toBe(
      'https://uploads.milkbardesigners.com/uploads/cms/models/local-model.glb'
    );
    expect(resolveEffectiveModel3DSlotViewMode('fastcomet', sources)).toBe('fastcomet');
  });

  it('exposes a FastComet link immediately from an uploaded FastComet asset record', () => {
    const sources = resolveModel3DSlotSources({
      assetId: 'asset-1',
      asset: createAsset({
        filepath: 'https://uploads.milkbardesigners.com/uploads/cms/models/model.glb',
        metadata: {
          fastCometUploadStatus: 'completed',
          fastCometVerifiedAt: '2026-05-19T00:00:00.000Z',
          publicPath: '/uploads/cms/models/model.glb',
          storageProfile: 'milkbarCms',
          storageSource: 'fastcomet',
        },
      }),
      isMissing: false,
      modelUrl: '',
    });

    expect(sources.fastCometUrl).toBe(
      'https://uploads.milkbardesigners.com/uploads/cms/models/model.glb'
    );
  });

  it('does not expose stale completed FastComet metadata without public URL verification', () => {
    const sources = resolveModel3DSlotSources({
      assetId: 'asset-1',
      asset: createAsset({
        filepath: 'https://uploads.milkbardesigners.com/uploads/cms/models/model.glb',
        metadata: {
          fastCometUploadStatus: 'completed',
          publicPath: '/uploads/cms/models/model.glb',
          storageProfile: 'milkbarCms',
          storageSource: 'fastcomet',
        },
      }),
      isMissing: false,
      modelUrl: '',
    });

    expect(sources.fastCometUrl).toBe('');
    expect(resolveEffectiveModel3DSlotViewMode('fastcomet', sources)).toBe('upload');
  });

  it('does not build a localhost-relative FastComet link from a bad base URL override', () => {
    const original = process.env['NEXT_PUBLIC_MILKBAR_FASTCOMET_PUBLIC_BASE_URL'];
    process.env['NEXT_PUBLIC_MILKBAR_FASTCOMET_PUBLIC_BASE_URL'] =
      '/admin/page-manager/milkbardesigners';

    try {
      const sources = resolveModel3DSlotSources({
        assetId: 'asset-1',
        asset: createAsset({
          filepath: '/uploads/cms/models/model.glb',
          metadata: {
            fastCometUploadStatus: 'completed',
            fastCometVerifiedAt: '2026-05-19T00:00:00.000Z',
            publicPath: '/uploads/cms/models/model.glb',
            storageProfile: 'milkbarCms',
            storageSource: 'fastcomet',
          },
        }),
        isMissing: false,
        modelUrl: '',
      });

      expect(sources.fastCometUrl).toBe(
        'https://uploads.milkbardesigners.com/uploads/cms/models/model.glb'
      );
    } finally {
      if (original === undefined) {
        delete process.env['NEXT_PUBLIC_MILKBAR_FASTCOMET_PUBLIC_BASE_URL'];
      } else {
        process.env['NEXT_PUBLIC_MILKBAR_FASTCOMET_PUBLIC_BASE_URL'] = original;
      }
    }
  });
});
