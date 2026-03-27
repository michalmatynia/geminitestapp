import { describe, expect, it } from 'vitest';

import * as kangurPublic from './public';

describe('kangur public barrel', () => {
  it('exposes the frontend shell and layout exports used by app routes', () => {
    expect(kangurPublic.FrontendPublicOwnerProvider).toBeDefined();
    expect(kangurPublic.FrontendPublicOwnerKangurShell).toBeDefined();
    expect(kangurPublic.KangurFeatureRouteShell).toBeDefined();
    expect(kangurPublic.KangurSSRSkeleton).toBeDefined();
    expect(kangurPublic.KangurSurfaceClassSync).toBeDefined();
    expect(kangurPublic.KangurStandardPageLayout).toBeDefined();
    expect(kangurPublic.KangurServerShell).toBeDefined();
    expect(kangurPublic.FrontendPublicOwnerShellClient).toBeDefined();
  });

  it('exposes the public routing helpers used by frontend alias and login routes', () => {
    expect(kangurPublic.getKangurPublicAliasHref).toBeTypeOf('function');
    expect(kangurPublic.getKangurCanonicalPublicHref).toBeTypeOf('function');
    expect(kangurPublic.getKangurHomeHref).toBeTypeOf('function');
  });

  it('exposes the shared frontend chrome helpers used by loading, error, and kangur shell routes', () => {
    expect(kangurPublic.FrontendRouteLoadingFallback).toBeDefined();
    expect(kangurPublic.KangurStorefrontAppearanceProvider).toBeDefined();
    expect(kangurPublic.KangurSurfaceClassSync).toBeDefined();
    expect(kangurPublic.KangurStandardPageLayout).toBeDefined();
    expect(kangurPublic.logKangurClientError).toBeTypeOf('function');
  });

  it('exposes the admin settings entry point used by admin Kangur routes', () => {
    expect(kangurPublic.AdminKangurSettingsPage).toBeDefined();
    expect(kangurPublic.AdminKangurPageShell).toBeDefined();
  });
});
