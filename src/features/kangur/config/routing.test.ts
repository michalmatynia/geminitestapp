import { describe, expect, it } from 'vitest';

import {
  appendKangurUrlParams,
  buildKangurEmbeddedBasePath,
  getKangurPublicAliasHref,
  getKangurPublicLaunchHref,
  getKangurCanonicalPublicHref,
  getKangurDedicatedAppHref,
  getKangurHomeHref,
  getKangurLaunchTarget,
  getKangurLoginHref,
  getKangurPageHref,
  getKangurInternalQueryParamKeys,
  getKangurInternalQueryParamName,
  normalizeKangurRequestedPath,
  readKangurLaunchIntent,
  readKangurUrlParam,
  resolveKangurFeaturePageRoute,
  resolveKangurPublicBasePathFromHref,
  resolveKangurPageKeyFromSlug,
  stripKangurLaunchIntent,
} from '@/features/kangur/config/routing';

describe('kangur routing config', () => {
  it('maps learner profile to profile slug', () => {
    expect(getKangurPageHref('LearnerProfile')).toBe('/kangur/profile');
    expect(resolveKangurPageKeyFromSlug('profile')).toBe('LearnerProfile');
    expect(resolveKangurPageKeyFromSlug('PROFILE')).toBe('LearnerProfile');
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

  it('resolves the feature page route without keeping the compatibility login slug in the path', () => {
    expect(resolveKangurFeaturePageRoute(['login'], '/')).toEqual({
      normalizedBasePath: '/',
      pageKey: 'Game',
      requestedPath: '/',
    });
    expect(resolveKangurFeaturePageRoute(['parent-dashboard'], '/admin/kangur')).toEqual({
      normalizedBasePath: '/admin/kangur',
      pageKey: 'ParentDashboard',
      requestedPath: '/admin/kangur/parent-dashboard',
    });
  });

  it('builds login hrefs for both root-owned and /kangur-owned public mounts', () => {
    expect(getKangurLoginHref('/', 'https://example.com/lessons?focus=division')).toBe(
      `/login?callbackUrl=${encodeURIComponent('https://example.com/lessons?focus=division')}`
    );
    expect(
      getKangurLoginHref('/kangur', 'https://example.com/kangur/lessons?focus=division')
    ).toBe(
      `/kangur/login?callbackUrl=${encodeURIComponent(
        'https://example.com/kangur/lessons?focus=division'
      )}`
    );
  });

  it('builds canonical root-owned hrefs for legacy /kangur alias routes', () => {
    expect(
      getKangurCanonicalPublicHref(['lessons'], {
        focus: 'division',
        categories: ['warmup', 'speed'],
      })
    ).toBe('/lessons?focus=division&categories=warmup&categories=speed');
    expect(getKangurCanonicalPublicHref(['login'], 'callbackUrl=%2Fkangur%2Flessons')).toBe(
      '/login?callbackUrl=%2Fkangur%2Flessons'
    );
  });

  it('builds explicit /kangur alias hrefs for mounted app routes', () => {
    expect(
      getKangurPublicAliasHref(['lessons'], {
        focus: 'division',
        categories: ['warmup', 'speed'],
      })
    ).toBe('/kangur/lessons?focus=division&categories=warmup&categories=speed');
    expect(getKangurPublicAliasHref()).toBe('/kangur');
  });

  it('maps supported public routes to dedicated app deep links', () => {
    expect(getKangurDedicatedAppHref()).toBe('kangur://');
    expect(getKangurDedicatedAppHref(['lessons'], { focus: 'division' })).toBe(
      'kangur://lessons?focus=division'
    );
    expect(getKangurDedicatedAppHref(['parent-dashboard'])).toBeNull();
    expect(getKangurDedicatedAppHref(['games'])).toBeNull();
    expect(getKangurDedicatedAppHref(['login'])).toBeNull();
  });

  it('falls back to the public web route when a dedicated app route is unavailable', () => {
    expect(getKangurDedicatedAppHref(['social-updates'])).toBeNull();
    expect(getKangurLaunchTarget('dedicated_app', ['social-updates'])).toEqual({
      route: 'dedicated_app',
      href: '/social-updates',
      fallbackHref: '/social-updates',
    });
  });

  it('resolves launch targets for both mobile web and dedicated app modes', () => {
    expect(getKangurLaunchTarget('web_mobile_view', ['lessons'], { focus: 'division' })).toEqual({
      route: 'web_mobile_view',
      href: '/lessons?focus=division',
      fallbackHref: '/lessons?focus=division',
    });
    expect(getKangurLaunchTarget('dedicated_app', ['duels'], { join: 'invite-1' })).toEqual({
      route: 'dedicated_app',
      href: 'kangur://duels?join=invite-1',
      fallbackHref: '/duels?join=invite-1',
    });
  });

  it('builds public launch hrefs that keep the web shell as the canonical route', () => {
    expect(getKangurPublicLaunchHref('web_mobile_view', ['lessons'], { focus: 'division' })).toBe(
      '/kangur/lessons?focus=division'
    );
    expect(getKangurPublicLaunchHref('dedicated_app', ['lessons'], { focus: 'division' })).toBe(
      '/kangur/lessons?focus=division&__kangurLaunch=dedicated_app'
    );
    expect(getKangurPublicLaunchHref('dedicated_app', ['games'])).toBe('/kangur/games');
    expect(getKangurPublicLaunchHref('dedicated_app', ['parent-dashboard'])).toBe(
      '/kangur/parent-dashboard'
    );
  });

  it('reads and strips launch-intent params without affecting learner params', () => {
    const searchParams = new URLSearchParams('focus=division&__kangurLaunch=dedicated_app');

    expect(readKangurLaunchIntent(searchParams)).toBe('dedicated_app');
    expect(stripKangurLaunchIntent(searchParams).toString()).toBe('focus=division');
  });

  it('resolves the public kangur base path from a return href', () => {
    expect(
      resolveKangurPublicBasePathFromHref('/lessons?focus=division', 'https://example.com')
    ).toBe('/');
    expect(
      resolveKangurPublicBasePathFromHref(
        'https://example.com/kangur/lessons?focus=division',
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
      'kangur-home-kangur-hero-screen',
      'kangur-home-kangur-hero-instanceId',
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
