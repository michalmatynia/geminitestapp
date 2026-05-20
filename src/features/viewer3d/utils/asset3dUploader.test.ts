import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveMilkbarFastCometModelUploadPublicPath } from './asset3dUploader';

describe('resolveMilkbarFastCometModelUploadPublicPath', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T21:20:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps FastComet-safe Milkbar model paths unchanged', () => {
    expect(
      resolveMilkbarFastCometModelUploadPublicPath({
        filename: '1747689600000-Project-model.glb',
        mimetype: 'model/gltf-binary',
        publicPath: '/uploads/cms/models/1747689600000-Project-model.glb',
      })
    ).toBe('/uploads/cms/models/1747689600000-Project-model.glb');
  });

  it('rewrites unsafe staged model paths to a FastComet-safe Milkbar path', () => {
    const publicPath = resolveMilkbarFastCometModelUploadPublicPath({
      filename: 'Living Room (Final).glb',
      mimetype: 'model/gltf-binary',
      publicPath: '/uploads/cms/models/Living Room (Final).glb',
    });

    expect(publicPath).toBe('/uploads/cms/models/1779225600000-Living-Room-Final.glb');
    expect(publicPath).toMatch(/^\/uploads\/cms\/models\/[A-Za-z0-9._/-]+$/);
  });
});
