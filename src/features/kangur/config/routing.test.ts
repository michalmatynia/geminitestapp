import { describe, expect, it } from 'vitest';

import {
  appendKangurUrlParams,
  buildKangurEmbeddedBasePath,
  getKangurHomeHref,
  getKangurPageHref,
  getKangurInternalQueryParamKeys,
  getKangurInternalQueryParamName,
  normalizeKangurRequestedPath,
  readKangurUrlParam,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';

describe('kangur routing config', () => {
  it('maps learner profile to profile slug', () => {
    expect(getKangurPageHref('LearnerProfile')).toBe('/kangur/profile');
    expect(resolveKangurPageKeyFromSlug('profile')).toBe('LearnerProfile');
    expect(resolveKangurPageKeyFromSlug('PROFILE')).toBe('LearnerProfile');
  });

  it('maps tests to the public tests slug', () => {
    expect(getKangurPageHref('Tests')).toBe('/kangur/tests');
    expect(resolveKangurPageKeyFromSlug('tests')).toBe('Tests');
    expect(resolveKangurPageKeyFromSlug('TESTS')).toBe('Tests');
  });

  it('uses the canonical Kangur home path for home navigation', () => {
    const embeddedBasePath = buildKangurEmbeddedBasePath('/home?preview=1');

    expect(getKangurHomeHref('/kangur')).toBe('/kangur');
    expect(getKangurHomeHref(embeddedBasePath)).toBe('/home?preview=1');
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
      appendKangurUrlParams(
        getKangurPageHref('Lessons', embeddedBasePath),
        {
          focus: 'division',
        },
        embeddedBasePath
      )
    ).toBe('/home?preview=1&kangur=lessons&focus=division');
  });

  it('namespaces embedded cms query params when a block scope key is provided', () => {
    const embeddedBasePath = buildKangurEmbeddedBasePath('/home?preview=1', 'home-kangur-hero');

    expect(getKangurPageHref('Lessons', embeddedBasePath)).toBe(
      '/home?preview=1&kangur-home-kangur-hero=lessons'
    );
    expect(
      appendKangurUrlParams(
        getKangurPageHref('Lessons', embeddedBasePath),
        { focus: 'division' },
        embeddedBasePath
      )
    ).toBe(
      '/home?preview=1&kangur-home-kangur-hero=lessons&kangur-home-kangur-hero-focus=division'
    );
    expect(normalizeKangurRequestedPath(['parent-dashboard'], embeddedBasePath)).toBe(
      '/home?preview=1&kangur-home-kangur-hero=parent-dashboard'
    );
    expect(getKangurInternalQueryParamName('focus', embeddedBasePath)).toBe(
      'kangur-home-kangur-hero-focus'
    );
    expect(getKangurInternalQueryParamKeys(embeddedBasePath)).toEqual([
      'kangur-home-kangur-hero',
      'kangur-home-kangur-hero-focus',
      'kangur-home-kangur-hero-quickStart',
      'kangur-home-kangur-hero-operation',
      'kangur-home-kangur-hero-difficulty',
      'kangur-home-kangur-hero-categories',
      'kangur-home-kangur-hero-count',
    ]);
    expect(
      readKangurUrlParam(
        new URLSearchParams(
          'kangur-home-kangur-hero=lessons&kangur-home-kangur-hero-focus=division'
        ),
        'focus',
        embeddedBasePath
      )
    ).toBe('division');
  });

  it('falls back to legacy unscoped query params for scoped embedded routes', () => {
    const embeddedBasePath = buildKangurEmbeddedBasePath('/home?preview=1', 'home-kangur-hero');
    const legacySearchParams = new URLSearchParams('kangur=lessons&focus=division');

    expect(readKangurUrlParam(legacySearchParams, 'kangur', embeddedBasePath)).toBe('lessons');
    expect(readKangurUrlParam(legacySearchParams, 'focus', embeddedBasePath)).toBe('division');
  });
});
