import { describe, expect, it } from 'vitest';

import * as viewer3dPublic from './public';

describe('viewer3d public barrel', () => {
  it('keeps the shared viewer3d barrel free of admin page exports', () => {
    expect(viewer3dPublic).not.toHaveProperty('Admin3DAssetsPage');
    expect(viewer3dPublic).not.toHaveProperty('Asset3DListPage');
  });

  it('continues exposing the client-safe viewer and query hooks', () => {
    expect(viewer3dPublic).toHaveProperty('Viewer3D');
    expect(viewer3dPublic).toHaveProperty('Asset3DPreviewModal');
    expect(viewer3dPublic).toHaveProperty('useAssets3D');
    expect(viewer3dPublic).toHaveProperty('useAsset3DById');
    expect(viewer3dPublic).toHaveProperty('useAsset3DCategories');
    expect(viewer3dPublic).toHaveProperty('useAsset3DTags');
  });
});
