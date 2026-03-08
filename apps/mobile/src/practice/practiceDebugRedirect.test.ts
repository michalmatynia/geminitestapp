import { describe, expect, it } from 'vitest';

import {
  createKangurPracticeDebugRedirectHref,
  resolveKangurPracticeDebugRedirectTarget,
} from './practiceDebugRedirect';

describe('resolveKangurPracticeDebugRedirectTarget', () => {
  it('accepts the supported dev redirect targets', () => {
    expect(resolveKangurPracticeDebugRedirectTarget('results')).toBe('results');
    expect(resolveKangurPracticeDebugRedirectTarget('home')).toBe('home');
    expect(resolveKangurPracticeDebugRedirectTarget(['leaderboard'])).toBe(
      'leaderboard',
    );
    expect(resolveKangurPracticeDebugRedirectTarget('plan')).toBe('plan');
    expect(resolveKangurPracticeDebugRedirectTarget('profile')).toBe('profile');
  });

  it('returns null for unsupported values', () => {
    expect(resolveKangurPracticeDebugRedirectTarget(null)).toBeNull();
    expect(resolveKangurPracticeDebugRedirectTarget(undefined)).toBeNull();
    expect(resolveKangurPracticeDebugRedirectTarget('')).toBeNull();
    expect(resolveKangurPracticeDebugRedirectTarget('practice')).toBeNull();
  });
});

describe('createKangurPracticeDebugRedirectHref', () => {
  it('maps results to the operation-scoped results route', () => {
    expect(
      createKangurPracticeDebugRedirectHref({
        operation: 'clock',
        target: 'results',
      }),
    ).toEqual({
      pathname: '/results',
      params: {
        operation: 'clock',
      },
    });
  });

  it('maps the other supported targets to their direct routes', () => {
    expect(
      createKangurPracticeDebugRedirectHref({
        operation: 'clock',
        target: 'home',
      }),
    ).toEqual({
      pathname: '/',
      params: {
        debugProofOperation: 'clock',
      },
    });
    expect(
      createKangurPracticeDebugRedirectHref({
        operation: 'clock',
        target: 'leaderboard',
      }),
    ).toBe('/leaderboard');
    expect(
      createKangurPracticeDebugRedirectHref({
        operation: 'clock',
        target: 'profile',
      }),
    ).toBe('/profile');
    expect(
      createKangurPracticeDebugRedirectHref({
        operation: 'clock',
        target: 'plan',
      }),
    ).toBe('/plan');
  });
});
