import { describe, expect, it } from 'vitest';

import { createKangurPlanHref } from './planHref';

describe('createKangurPlanHref', () => {
  it('returns the daily plan route', () => {
    expect(createKangurPlanHref()).toBe('/plan');
  });
});
