import { describe, expect, it } from 'vitest';

import { buildKangurEmbeddedBasePath } from '@/features/kangur/config/routing';

import { toWebsiteHelpTargetHref } from './KangurAiTutorWidget.helpers';

describe('KangurAiTutorWidget helpers', () => {
  it('builds an anchor href for the Kangur home route target', () => {
    expect(
      toWebsiteHelpTargetHref('/kangur', {
        nodeId: 'flow:kangur:sign-in',
        label: 'Zaloguj się',
        route: '/',
        anchorId: 'kangur-primary-nav-login',
      })
    ).toBe('/kangur#kangur-primary-nav-login');
  });

  it('preserves nested routes and appends anchors when present', () => {
    expect(
      toWebsiteHelpTargetHref('/kangur', {
        nodeId: 'page:kangur:lessons',
        label: 'Lekcje',
        route: '/lessons',
        anchorId: 'kangur-lessons-list',
      })
    ).toBe('/kangur/lessons#kangur-lessons-list');
  });

  it('does not duplicate the base path for already-prefixed targets', () => {
    expect(
      toWebsiteHelpTargetHref('/kangur', {
        nodeId: 'page:kangur:lessons',
        label: 'Lekcje',
        route: '/kangur/lessons',
      })
    ).toBe('/kangur/lessons');
  });

  it('normalizes legacy /kangur lesson targets for localized root-owned mounts', () => {
    expect(
      toWebsiteHelpTargetHref('/en', {
        nodeId: 'page:kangur:lessons',
        label: 'Lessons',
        route: '/kangur/lessons?focus=division',
      })
    ).toBe('/en/lessons?focus=division');
  });

  it('maps lesson targets through embedded kangur routes instead of concatenating path segments', () => {
    const embeddedBasePath = buildKangurEmbeddedBasePath('/home?preview=1');

    expect(
      toWebsiteHelpTargetHref(embeddedBasePath, {
        nodeId: 'page:kangur:lessons',
        label: 'Lessons',
        route: '/lessons?focus=division',
        anchorId: 'kangur-lessons-list',
      })
    ).toBe('/home?preview=1&kangur=lessons&focus=division#kangur-lessons-list');
  });
});
