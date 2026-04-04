import { describe, expect, it } from 'vitest';

import * as viewer3dIndex from './index';

describe('viewer3d index barrel', () => {
  it('continues exposing the viewer3d page entrypoints', () => {
    expect(viewer3dIndex).toHaveProperty('Admin3DAssetsPage');
    expect(viewer3dIndex).toHaveProperty('Asset3DListPage');
  });
});
