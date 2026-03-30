import { describe, expect, it } from 'vitest';

import {
  hasKangurCmsRuntimeScreen,
  resolveKangurCmsScreenKey,
} from './runtime-screen-presence';

describe('runtime-screen-presence', () => {
  it('maps Kangur page keys to CMS runtime screen keys', () => {
    expect(resolveKangurCmsScreenKey('Game')).toBe('Game');
    expect(resolveKangurCmsScreenKey('Lessons')).toBe('Lessons');
    expect(resolveKangurCmsScreenKey('LearnerProfile')).toBe('LearnerProfile');
    expect(resolveKangurCmsScreenKey('ParentDashboard')).toBe('ParentDashboard');
    expect(resolveKangurCmsScreenKey('GamesLibrary')).toBeNull();
  });

  it('reports whether the raw project contains the requested screen', () => {
    const rawProject = JSON.stringify({
      screens: {
        Game: { components: [] },
        Lessons: { components: [{ id: 'screen-1' }] },
        LearnerProfile: { components: [] },
        ParentDashboard: { components: [] },
      },
    });

    expect(hasKangurCmsRuntimeScreen(rawProject, 'Game')).toBe(true);
    expect(hasKangurCmsRuntimeScreen(rawProject, 'Lessons')).toBe(true);
    expect(hasKangurCmsRuntimeScreen(rawProject, 'LearnerProfile')).toBe(true);
    expect(hasKangurCmsRuntimeScreen(rawProject, 'GamesLibrary')).toBe(false);
    expect(hasKangurCmsRuntimeScreen(null, 'Lessons')).toBe(false);
    expect(hasKangurCmsRuntimeScreen('{', 'Lessons')).toBe(false);
  });
});
