import { describe, expect, it } from 'vitest';

import { createKangurPracticeHref } from './practiceHref';

describe('createKangurPracticeHref', () => {
  it('builds a practice route for a concrete operation', () => {
    expect(createKangurPracticeHref('logical_patterns')).toEqual({
      pathname: '/practice',
      params: {
        operation: 'logical_patterns',
      },
    });
  });
});
