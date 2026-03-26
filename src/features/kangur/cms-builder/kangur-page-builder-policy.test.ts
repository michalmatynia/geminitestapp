import { describe, expect, it } from 'vitest';

import { buildKangurPageBuilderPolicy } from './kangur-page-builder-policy';

describe('buildKangurPageBuilderPolicy', () => {
  it('hides 3D builder affordances on the Game screen', () => {
    expect(buildKangurPageBuilderPolicy('Game')).toEqual({
      hiddenBlockTypes: ['Model3D', 'Model3DElement'],
      hiddenSectionTypes: ['Model3DElement'],
      hiddenSettingsFieldTypes: ['asset3d'],
    });
  });

  it('leaves other Kangur screens unchanged', () => {
    expect(buildKangurPageBuilderPolicy('Lessons')).toEqual({});
  });
});
