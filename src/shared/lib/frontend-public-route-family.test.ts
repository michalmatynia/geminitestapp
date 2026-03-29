import { describe, expect, it } from 'vitest';

import { resolveFrontendPublicRouteFamily } from './frontend-public-route-family';

describe('resolveFrontendPublicRouteFamily', () => {
  it('resolves CMS storefront routes as cms', () => {
    expect(
      resolveFrontendPublicRouteFamily({
        pathname: '/en/about',
        publicOwner: 'cms',
      })
    ).toBe('cms');
  });

  it('resolves preview routes separately from StudiQ', () => {
    expect(
      resolveFrontendPublicRouteFamily({
        pathname: '/en/preview/page-42',
        publicOwner: 'cms',
      })
    ).toBe('preview');
  });

  it('resolves product routes separately from StudiQ', () => {
    expect(
      resolveFrontendPublicRouteFamily({
        pathname: '/en/products/sku-123',
        publicOwner: 'cms',
      })
    ).toBe('products');
  });

  it('resolves Kangur-owned root routes as studiq', () => {
    expect(
      resolveFrontendPublicRouteFamily({
        pathname: '/en',
        publicOwner: 'kangur',
      })
    ).toBe('studiq');
  });

  it('treats explicit Kangur aliases as studiq even when the public owner falls back to cms', () => {
    expect(
      resolveFrontendPublicRouteFamily({
        pathname: '/en/kangur/library',
        publicOwner: 'cms',
      })
    ).toBe('studiq');
  });
});
