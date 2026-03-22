import { describe, expect, it } from 'vitest';

import {
  resolveKangurMobileActionHref,
  resolveKangurMobileWebsiteHelpHref,
} from './resolveKangurMobileActionHref';

describe('resolveKangurMobileActionHref', () => {
  it('maps lesson actions into focused lesson links', () => {
    expect(
      resolveKangurMobileActionHref({
        page: 'Lessons',
        query: {
          focus: 'adding',
        },
      }),
    ).toEqual({
      pathname: '/lessons',
      params: {
        focus: 'adding',
      },
    });
  });

  it('keeps generic game actions on the practice route by default', () => {
    expect(
      resolveKangurMobileActionHref({
        page: 'Game',
        query: {
          operation: 'adding',
        },
      }),
    ).toEqual({
      pathname: '/practice',
      params: {
        operation: 'addition',
      },
    });
  });

  it('sends game actions to competition when the route prefers the competition flow', () => {
    expect(
      resolveKangurMobileActionHref(
        {
          page: 'Game',
          query: {
            focus: 'full_test_2024',
          },
        },
        {
          gameTarget: 'competition',
        },
      ),
    ).toEqual({
      pathname: '/competition',
      params: {
        mode: 'full_test_2024',
      },
    });
  });

  it('maps parent dashboard actions into the parent route', () => {
    expect(
      resolveKangurMobileActionHref({
        page: 'ParentDashboard',
      }),
    ).toEqual('/parent');
  });
});

describe('resolveKangurMobileWebsiteHelpHref', () => {
  it('maps help routes to the mobile competition route when requested', () => {
    expect(
      resolveKangurMobileWebsiteHelpHref(
        {
          route: '/game',
        },
        {
          gameTarget: 'competition',
        },
      ),
    ).toEqual('/competition');
  });

  it('maps lesson help routes to the lesson catalog', () => {
    expect(
      resolveKangurMobileWebsiteHelpHref({
        route: '/lessons?focus=clock',
      }),
    ).toEqual({
      pathname: '/lessons',
      params: {
        focus: 'clock',
      },
    });
  });

  it('maps parent dashboard help routes into the parent route', () => {
    expect(
      resolveKangurMobileWebsiteHelpHref({
        route: '/parent-dashboard',
      }),
    ).toEqual('/parent');
  });
});
