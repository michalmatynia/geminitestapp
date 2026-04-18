import { beforeEach, describe, expect, it, vi } from 'vitest';

import { normalizeThemeSettings } from '@/shared/contracts/cms-theme';

const {
  cmsPageShellMock,
  getCmsMenuSettingsMock,
  getCmsThemeSettingsMock,
  getProductByIdMock,
  getTranslationsMock,
  notFoundMock,
  permanentRedirectMock,
  readOptionalRequestHeadersMock,
  redirectMock,
  resolveCmsDomainFromHeadersMock,
} = vi.hoisted(() => ({
  cmsPageShellMock: vi.fn(() => null),
  getCmsMenuSettingsMock: vi.fn(),
  getCmsThemeSettingsMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  getTranslationsMock: vi.fn(),
  notFoundMock: vi.fn(),
  permanentRedirectMock: vi.fn(),
  readOptionalRequestHeadersMock: vi.fn(),
  redirectMock: vi.fn(),
  resolveCmsDomainFromHeadersMock: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: getTranslationsMock,
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  permanentRedirect: permanentRedirectMock,
  redirect: redirectMock,
}));

vi.mock('@/features/cms/public', () => ({
  CmsPageShell: cmsPageShellMock,
}));

vi.mock('@/features/cms/server', () => ({
  getCmsMenuSettings: getCmsMenuSettingsMock,
  getCmsThemeSettings: getCmsThemeSettingsMock,
  resolveCmsDomainFromHeaders: resolveCmsDomainFromHeadersMock,
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductById: getProductByIdMock,
  },
}));

vi.mock('@/shared/lib/request/optional-headers', () => ({
  readOptionalRequestHeaders: readOptionalRequestHeadersMock,
}));

describe('ProductPublicPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getTranslationsMock.mockResolvedValue((key: string, values?: { count?: number }) => {
      if (key === 'available') {
        return `Available ${values?.count ?? 0}`;
      }

      return key;
    });
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      name: 'Green Mushroom',
      name_en: 'Green Mushroom',
      name_pl: '',
      name_de: '',
      description: 'Gaming pin',
      description_en: 'Gaming pin',
      description_pl: '',
      description_de: '',
      images: [],
      imageLinks: [],
      price: 12.5,
      priceComment: null,
      stock: 3,
      supplierName: 'Pin Supplier',
      tags: [],
      category: undefined,
    } as never);
    readOptionalRequestHeadersMock.mockResolvedValue(
      new Headers([['host', '127.0.0.1:3000']])
    );
    resolveCmsDomainFromHeadersMock.mockResolvedValue({
      id: 'default-domain',
      name: 'Default domain',
      domain: '127.0.0.1',
      aliasOf: null,
      createdAt: '1970-01-01T00:00:00.000Z',
      updatedAt: '1970-01-01T00:00:00.000Z',
    });
    getCmsThemeSettingsMock.mockResolvedValue(
      normalizeThemeSettings({
        backgroundColor: '#ffffff',
        textColor: '#111111',
        borderColor: '#dddddd',
        accentColor: '#ff5500',
        primaryColor: '#ff5500',
        enableAnimations: true,
      })
    );
    getCmsMenuSettingsMock.mockResolvedValue({ showMenu: true });
  });

  it('resolves request headers before loading cached CMS menu settings', async () => {
    const callOrder: string[] = [];

    readOptionalRequestHeadersMock.mockImplementation(async () => {
      callOrder.push('headers');
      return new Headers([['host', '127.0.0.1:3000']]);
    });
    resolveCmsDomainFromHeadersMock.mockImplementation(async (headers: Headers | null) => {
      callOrder.push(`domain:${headers?.get('host') ?? 'missing'}`);
      return {
        id: 'default-domain',
        name: 'Default domain',
        domain: '127.0.0.1',
        aliasOf: null,
        createdAt: '1970-01-01T00:00:00.000Z',
        updatedAt: '1970-01-01T00:00:00.000Z',
      };
    });
    getCmsThemeSettingsMock.mockImplementation(async () => {
      callOrder.push('theme');
      return normalizeThemeSettings({
        backgroundColor: '#ffffff',
        textColor: '#111111',
        borderColor: '#dddddd',
        accentColor: '#ff5500',
        primaryColor: '#ff5500',
        enableAnimations: true,
      });
    });
    getCmsMenuSettingsMock.mockImplementation(async (domainId: string, locale: string) => {
      callOrder.push(`menu:${domainId}:${locale}`);
      return { showMenu: true };
    });

    const { ProductPublicPage } = await import('@/app/(frontend)/products/ProductPublicPage');

    const page = await ProductPublicPage({
      params: { id: 'product-1' },
      locale: 'EN',
    });

    expect(readOptionalRequestHeadersMock).toHaveBeenCalledTimes(1);
    expect(resolveCmsDomainFromHeadersMock).toHaveBeenCalledWith(expect.any(Headers));
    expect(getCmsMenuSettingsMock).toHaveBeenCalledWith('default-domain', 'en');
    expect(callOrder.indexOf('domain:127.0.0.1:3000')).toBeLessThan(
      callOrder.indexOf('menu:default-domain:en')
    );
    expect(page).toEqual(
      expect.objectContaining({
        type: cmsPageShellMock,
        props: expect.objectContaining({
          menu: { showMenu: true },
        }),
      })
    );
  });
});
