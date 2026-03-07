import { describe, expect, it } from 'vitest';

import {
  appendKangurUrlParams,
  buildKangurEmbeddedBasePath,
  getKangurPageHref,
  normalizeKangurRequestedPath,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';

describe('kangur routing config', () => {
  it('maps learner profile to profile slug', () => {
    expect(getKangurPageHref('LearnerProfile')).toBe('/kangur/profile');
    expect(resolveKangurPageKeyFromSlug('profile')).toBe('LearnerProfile');
    expect(resolveKangurPageKeyFromSlug('PROFILE')).toBe('LearnerProfile');
  });

  it('builds embedded host-page links for cms-mounted kangur routes', () => {
    const embeddedBasePath = buildKangurEmbeddedBasePath('/home?preview=1');

    expect(getKangurPageHref('Lessons', embeddedBasePath)).toBe('/home?preview=1&kangur=lessons');
    expect(getKangurPageHref('Game', embeddedBasePath)).toBe('/home?preview=1&kangur=game');
    expect(normalizeKangurRequestedPath(['parent-dashboard'], embeddedBasePath)).toBe(
      '/home?preview=1&kangur=parent-dashboard'
    );
  });

  it('merges kangur query params without dropping host-page params', () => {
    const embeddedBasePath = buildKangurEmbeddedBasePath('/home?preview=1');

    expect(
      appendKangurUrlParams(getKangurPageHref('Lessons', embeddedBasePath), {
        focus: 'division',
      })
    ).toBe('/home?preview=1&kangur=lessons&focus=division');
  });
});
