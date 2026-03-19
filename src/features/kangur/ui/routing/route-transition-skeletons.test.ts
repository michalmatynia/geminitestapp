import { describe, expect, it } from 'vitest';

import { resolveKangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';

describe('resolveKangurRouteTransitionSkeletonVariant', () => {
  it('resolves localized lessons routes against the public Kangur base path', () => {
    expect(
      resolveKangurRouteTransitionSkeletonVariant({
        basePath: '/',
        href: '/en/lessons',
      })
    ).toBe('lessons-library');
  });

  it('keeps lessons focus skeletons for localized routes with focus params', () => {
    expect(
      resolveKangurRouteTransitionSkeletonVariant({
        basePath: '/',
        href: '/de/lessons?focus=fractions',
      })
    ).toBe('lessons-focus');
  });

  it('resolves localized Kangur alias routes against the /kangur base path', () => {
    expect(
      resolveKangurRouteTransitionSkeletonVariant({
        basePath: '/kangur',
        href: '/en/kangur/tests',
      })
    ).toBe('lessons-library');
  });
});
