import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import {
  getPathSegments,
  matchCatchAllPattern,
  type CatchAllOptionalRoutePatternToken,
} from './catch-all-router';

describe('matchCatchAllPattern', () => {
  it('matches required literals and params', () => {
    const pattern: CatchAllOptionalRoutePatternToken[] = ['products', { param: 'productId' }];

    expect(matchCatchAllPattern(pattern, ['products', 'sku-1'])).toEqual({
      productId: 'sku-1',
    });
  });

  it('supports optional literals and optional params', () => {
    const pattern: CatchAllOptionalRoutePatternToken[] = [
      'products',
      { literal: 'featured', optional: true },
      { param: 'slug', optional: true },
    ];

    expect(matchCatchAllPattern(pattern, ['products'])).toEqual({});
    expect(matchCatchAllPattern(pattern, ['products', 'featured', 'clock'])).toEqual({
      slug: 'clock',
    });
    expect(matchCatchAllPattern(pattern, ['products', 'clock'])).toEqual({
      slug: 'clock',
    });
  });

  it('rejects missing required segments and extra unmatched segments', () => {
    const pattern: CatchAllOptionalRoutePatternToken[] = ['products', { param: 'productId' }];

    expect(matchCatchAllPattern(pattern, ['products'])).toBeNull();
    expect(matchCatchAllPattern(pattern, ['products', 'sku-1', 'extra'])).toBeNull();
    expect(matchCatchAllPattern(pattern, ['orders', 'sku-1'])).toBeNull();
  });
});

describe('getPathSegments', () => {
  it('returns only the segments underneath the configured base path', () => {
    const request = {
      nextUrl: new URL('https://example.com/api/kangur/results/latest'),
    } as NextRequest;

    expect(getPathSegments(request, '/api/kangur')).toEqual(['results', 'latest']);
  });

  it('returns an empty array when the request is outside the base path', () => {
    const request = {
      nextUrl: new URL('https://example.com/api/other/results/latest'),
    } as NextRequest;

    expect(getPathSegments(request, '/api/kangur')).toEqual([]);
  });
});
