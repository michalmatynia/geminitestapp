import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

import { normalizeThemeSettings } from '@/shared/contracts/cms-theme';

const {
  getTranslationsMock,
  getCmsMenuSettingsMock,
  getCmsRepositoryMock,
  getCmsThemeSettingsMock,
  productServiceGetProductsMock,
  readOptionalServerAuthSessionMock,
  canPreviewDraftsMock,
  homeContentClientMock,
} = vi.hoisted(() => ({
  getTranslationsMock: vi.fn(),
  getCmsMenuSettingsMock: vi.fn(),
  getCmsRepositoryMock: vi.fn(),
  getCmsThemeSettingsMock: vi.fn(),
  productServiceGetProductsMock: vi.fn(),
  readOptionalServerAuthSessionMock: vi.fn(),
  canPreviewDraftsMock: vi.fn(),
  homeContentClientMock: vi.fn(() => null),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: getTranslationsMock,
}));

vi.mock('@/features/cms/server', () => ({
  getCmsMenuSettings: getCmsMenuSettingsMock,
  getCmsRepository: getCmsRepositoryMock,
  getCmsThemeSettings: getCmsThemeSettingsMock,
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProducts: productServiceGetProductsMock,
  },
}));

vi.mock('@/features/auth/server', () => ({
  readOptionalServerAuthSession: readOptionalServerAuthSessionMock,
}));

vi.mock('@/app/(frontend)/home/home-helpers', async () => {
  const actual = await vi.importActual<typeof import('@/app/(frontend)/home/home-helpers')>(
    '@/app/(frontend)/home/home-helpers'
  );

  return {
    ...actual,
    canPreviewDrafts: canPreviewDraftsMock,
  };
});

vi.mock('@/features/cms/public', () => ({
  HomeContentClient: homeContentClientMock,
}));

describe('HomeContent', () => {
  const withTiming = <T,>(_: string, fn: () => Promise<T>): Promise<T> => fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getTranslationsMock.mockResolvedValue((key: string) => key);
    getCmsMenuSettingsMock.mockResolvedValue({ showMenu: true });
    getCmsThemeSettingsMock.mockResolvedValue(normalizeThemeSettings({
      backgroundColor: '#ffffff',
      textColor: '#111111',
      borderColor: '#dddddd',
      accentColor: '#ff5500',
      primaryColor: '#ff5500',
      enableAnimations: true,
    }));
    productServiceGetProductsMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    canPreviewDraftsMock.mockResolvedValue(false);
  });

  it('skips auth session reads for published CMS homepages', async () => {
    getCmsRepositoryMock.mockResolvedValue({
      getPageBySlug: vi.fn().mockResolvedValue({
        status: 'published',
        showMenu: true,
        components: [],
      }),
    });

    const { HomeContent } = await import('@/app/(frontend)/home/HomeContent');

    const content = (await HomeContent({
      domainId: 'default-domain',
      slugs: [{ id: 'slug-1', slug: 'home', isDefault: true }],
      withTiming,
      locale: 'en',
    })) as ReactElement;

    expect(readOptionalServerAuthSessionMock).not.toHaveBeenCalled();
    expect(canPreviewDraftsMock).not.toHaveBeenCalled();
    expect(content.type).toBe(homeContentClientMock);
    expect(content.props).toEqual(
      expect.objectContaining({
        variant: 'cms',
        hasCmsContent: false,
      })
    );
  });

  it('reads auth only when the default CMS homepage is unpublished', async () => {
    getCmsRepositoryMock.mockResolvedValue({
      getPageBySlug: vi.fn().mockResolvedValue({
        status: 'draft',
        showMenu: true,
        components: [{ order: 2 }, { order: 1 }],
      }),
    });
    readOptionalServerAuthSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
    canPreviewDraftsMock.mockResolvedValue(true);

    const { HomeContent } = await import('@/app/(frontend)/home/HomeContent');

    const content = (await HomeContent({
      domainId: 'default-domain',
      slugs: [{ id: 'slug-1', slug: 'home', isDefault: true }],
      withTiming,
      locale: 'en',
    })) as ReactElement;

    expect(readOptionalServerAuthSessionMock).toHaveBeenCalledTimes(1);
    expect(canPreviewDraftsMock).toHaveBeenCalledWith({ user: { id: 'user-1' } });
    expect(content.type).toBe(homeContentClientMock);
    expect(content.props).toEqual(
      expect.objectContaining({
        variant: 'cms',
        hasCmsContent: true,
        rendererComponents: [{ order: 1 }, { order: 2 }],
      })
    );
  });
});
