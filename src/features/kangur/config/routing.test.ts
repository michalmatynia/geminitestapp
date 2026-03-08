import { describe, expect, it } from 'vitest';

import {
  appendKangurUrlParams,
  buildKangurEmbeddedBasePath,
  getKangurCanonicalPublicHref,
  getKangurHomeHref,
  getKangurLoginHref,
  getKangurPageHref,
  getKangurInternalQueryParamKeys,
  getKangurInternalQueryParamName,
  normalizeKangurRequestedPath,
  readKangurUrlParam,
  resolveKangurPublicBasePathFromHref,
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

  it('uses the main Kangur page behind the compatibility login slug', () => {
    expect(resolveKangurPageKeyFromSlug('login')).toBe('Game');
    expect(resolveKangurPageKeyFromSlug('LOGIN')).toBe('Game');
  });

  it('uses the canonical Kangur home path for home navigation', () => {
    const embeddedBasePath = buildKangurEmbeddedBasePath('/home?preview=1');

    expect(getKangurHomeHref('/')).toBe('/');
    expect(getKangurHomeHref('/kangur')).toBe('/kangur');
    expect(getKangurHomeHref(embeddedBasePath)).toBe('/home?preview=1');
  });

  it('builds login hrefs for both root-owned and /kangur-owned public mounts', () => {
    expect(getKangurLoginHref('/', 'https://example.com/tests?focus=division')).toBe(
      `/login?callbackUrl=${encodeURIComponent('https://example.com/tests?focus=division')}`
    );
    expect(getKangurLoginHref('/kangur', 'https://example.com/kangur/tests?focus=division')).toBe(
      `/kangur/login?callbackUrl=${encodeURIComponent(
        'https://example.com/kangur/tests?focus=division'
      )}`
    );
  });

  it('builds canonical root-owned hrefs for legacy /kangur alias routes', () => {
    expect(
      getKangurCanonicalPublicHref(['tests'], {
        focus: 'division',
        categories: ['warmup', 'speed'],
      })
    ).toBe('/tests?focus=division&categories=warmup&categories=speed');
    expect(getKangurCanonicalPublicHref(['login'], 'callbackUrl=%2Fkangur%2Ftests')).toBe(
      '/login?callbackUrl=%2Fkangur%2Ftests'
    );
  });

  it('resolves the public kangur base path from a return href', () => {
    expect(resolveKangurPublicBasePathFromHref('/tests?focus=division', 'https://example.com')).toBe(
      '/'
    );
    expect(
      resolveKangurPublicBasePathFromHref(
        'https://example.com/kangur/tests?focus=division',
        'https://example.com'
      )
    ).toBe('/kangur');
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
