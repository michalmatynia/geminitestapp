import { describe, expect, it } from 'vitest';

import { createKangurResultsHref } from './resultsHref';

describe('createKangurResultsHref', () => {
  it('builds a base results route by default', () => {
    expect(createKangurResultsHref()).toBe('/results');
  });

  it('builds a filtered results route for a score family', () => {
    expect(createKangurResultsHref({ family: 'logic' })).toEqual({
      pathname: '/results',
      params: {
        family: 'logic',
      },
    });
    expect(createKangurResultsHref({ family: 'time' })).toEqual({
      pathname: '/results',
      params: {
        family: 'time',
      },
    });
  });

  it('prefers operation filters when provided', () => {
    expect(
      createKangurResultsHref({
        family: 'logic',
        operation: 'logical_patterns',
      }),
    ).toEqual({
      pathname: '/results',
      params: {
        operation: 'logical_patterns',
      },
    });
  });
});
