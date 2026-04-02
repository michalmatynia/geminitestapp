/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buildSlugMetadataMock,
  frontendPublicOwnerKangurShellMock,
  resolveFrontPageSelectionMock,
  getKangurStorefrontInitialStateMock,
  getTranslationsMock,
  loadSlugRenderDataMock,
  notFoundMock,
  permanentRedirectMock,
  redirectMock,
  renderCmsPageMock,
  resolveSlugToPageMock,
} = vi.hoisted(() => ({
  buildSlugMetadataMock: vi.fn(),
  frontendPublicOwnerKangurShellMock: vi.fn(),
  resolveFrontPageSelectionMock: vi.fn(),
  getKangurStorefrontInitialStateMock: vi.fn(),
  getTranslationsMock: vi.fn(),
  loadSlugRenderDataMock: vi.fn(),
  notFoundMock: vi.fn(),
  permanentRedirectMock: vi.fn(),
  redirectMock: vi.fn(),
  renderCmsPageMock: vi.fn(),
  resolveSlugToPageMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
  permanentRedirect: permanentRedirectMock,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: getTranslationsMock,
}));

vi.mock('@/app/(frontend)/home/home-helpers', () => ({
  resolveFrontPageSelection: resolveFrontPageSelectionMock,
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurStorefrontInitialState: getKangurStorefrontInitialStateMock,
}));

vi.mock('@/features/kangur/public', () => ({
  FrontendPublicOwnerKangurShell: ({
    embeddedOverride,
    initialAppearance,
  }: {
    embeddedOverride?: boolean;
    initialAppearance?: {
      mode?: string;
      themeSettings?: Record<string, unknown>;
    };
  }) => {
    frontendPublicOwnerKangurShellMock({ embeddedOverride, initialAppearance });
    return <div data-testid='kangur-root-login-shell'>Kangur root login shell</div>;
  },
}));

vi.mock('@/app/(frontend)/cms/render', () => ({
  renderCmsPage: renderCmsPageMock,
}));

vi.mock('@/app/(frontend)/cms/slug-page-data', () => ({
  buildSlugMetadata: buildSlugMetadataMock,
  loadSlugRenderData: loadSlugRenderDataMock,
  resolveSlugToPage: resolveSlugToPageMock,
}));

describe('canonical login route helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'mongo',
      fallbackReason: null,
    });
    getTranslationsMock.mockImplementation(async (...args: unknown[]) => {
      const localeArg =
        args.length === 1 && typeof args[0] === 'object' && args[0] !== null
          ? (args[0] as { locale?: string }).locale ?? 'default'
          : 'default';
      return (key: string) => `${localeArg}:${key}`;
    });
    getKangurStorefrontInitialStateMock.mockResolvedValue({
      initialMode: 'default',
      initialThemeSettings: {
        themePreset: 'premium',
      },
    });
    renderCmsPageMock.mockReturnValue(<div data-testid='cms-login-page'>CMS login page</div>);
    buildSlugMetadataMock.mockReturnValue({ title: 'CMS login title' });
    notFoundMock.mockImplementation(() => {
      throw new Error('notFound');
    });
  });

  it('renders the Kangur shell on the canonical public login route when Kangur owns home', async () => {
    const { renderCanonicalLoginRoute } = await import('@/app/(frontend)/route-helpers/login-route-helpers');

    render(await renderCanonicalLoginRoute());

    expect(screen.getByTestId('kangur-root-login-shell')).toBeInTheDocument();
    expect(frontendPublicOwnerKangurShellMock).toHaveBeenCalledWith({
      embeddedOverride: false,
      initialAppearance: {
        mode: 'default',
        themeSettings: {
          themePreset: 'premium',
        },
      },
    });
    expect(resolveSlugToPageMock).not.toHaveBeenCalled();
  });

  it('renders the localized CMS login page when CMS owns the public frontend', async () => {
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'cms',
      publicOwner: 'cms',
      redirectPath: null,
      source: 'mongo',
      fallbackReason: null,
    });
    resolveSlugToPageMock.mockResolvedValue({
      id: 'page-login',
      name: 'Login',
    });
    loadSlugRenderDataMock.mockResolvedValue({
      id: 'render-data-login',
    });

    const { renderCanonicalLoginRoute } = await import('@/app/(frontend)/route-helpers/login-route-helpers');

    render(await renderCanonicalLoginRoute({ locale: 'en' }));

    expect(resolveSlugToPageMock).toHaveBeenCalledWith(['login'], { locale: 'en' });
    expect(loadSlugRenderDataMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'page-login' }),
      { locale: 'en' }
    );
    expect(renderCmsPageMock).toHaveBeenCalledWith({ id: 'render-data-login' });
    expect(screen.getByTestId('cms-login-page')).toBeInTheDocument();
  });

  it('builds Kangur login metadata for the root-owned canonical route', async () => {
    const { generateCanonicalLoginMetadata } = await import('@/app/(frontend)/route-helpers/login-route-helpers');

    await expect(generateCanonicalLoginMetadata({ locale: 'en' })).resolves.toEqual({
      title: 'en:loginTitle',
    });

    expect(resolveSlugToPageMock).not.toHaveBeenCalled();
  });

  it('falls back to CMS page metadata when CMS owns the canonical login route', async () => {
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'cms',
      publicOwner: 'cms',
      redirectPath: null,
      source: 'mongo',
      fallbackReason: null,
    });
    resolveSlugToPageMock.mockResolvedValue({
      id: 'page-login',
      name: 'Login',
    });

    const { generateCanonicalLoginMetadata } = await import('@/app/(frontend)/route-helpers/login-route-helpers');

    await expect(generateCanonicalLoginMetadata()).resolves.toEqual({
      title: 'CMS login title',
    });

    expect(resolveSlugToPageMock).toHaveBeenCalledWith(['login'], undefined);
    expect(buildSlugMetadataMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'page-login' })
    );
  });
});
