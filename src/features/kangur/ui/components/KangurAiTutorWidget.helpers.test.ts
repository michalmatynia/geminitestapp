import { describe, expect, it } from 'vitest';

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
        nodeId: 'page:kangur:tests',
        label: 'Testy',
        route: '/kangur/tests',
      })
    ).toBe('/kangur/tests');
  });
});
