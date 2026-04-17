import { describe, expect, it } from 'vitest';

import { resolvePlaywrightActionRunsHref } from './action-runs-links';

describe('resolvePlaywrightActionRunsHref', () => {
  it('returns the action-runs root when no filters are provided', () => {
    expect(resolvePlaywrightActionRunsHref({})).toBe('/admin/playwright/action-runs');
  });

  it('builds action-runs filter links from the provided params', () => {
    expect(
      resolvePlaywrightActionRunsHref({
        actionId: 'draft-action-1',
        runtimeKey: 'tradera_standard_list',
        selectorProfile: 'profile-market-a',
      })
    ).toBe(
      '/admin/playwright/action-runs?actionId=draft-action-1&runtimeKey=tradera_standard_list&selectorProfile=profile-market-a'
    );
  });

  it('drops empty values and encodes reserved characters', () => {
    expect(
      resolvePlaywrightActionRunsHref({
        actionId: '  ',
        runtimeKey: 'draft/action',
        selectorProfile: 'profile?x=1',
      })
    ).toBe(
      '/admin/playwright/action-runs?runtimeKey=draft%2Faction&selectorProfile=profile%3Fx%3D1'
    );
  });
});
