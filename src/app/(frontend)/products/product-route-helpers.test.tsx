import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ProductPublicPageMock } = vi.hoisted(() => ({
  ProductPublicPageMock: vi.fn(),
}));

vi.mock('@/app/(frontend)/products/[id]/ProductPublicPage', () => ({
  ProductPublicPage: ProductPublicPageMock,
}));

describe('product route helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    ProductPublicPageMock.mockReturnValue(null);
  });

  it('renders the canonical product route through the shared helper', async () => {
    const { default: ProductPage } = await import('@/app/(frontend)/products/[id]/page');

    const page = await ProductPage({
      params: Promise.resolve({ id: 'product-1' }),
    });

    expect(page).toEqual(
      expect.objectContaining({
        type: ProductPublicPageMock,
        props: {
          params: { id: 'product-1' },
          locale: undefined,
        },
      })
    );
  });

  it('renders the localized product route through the shared helper', async () => {
    const { default: LocalizedProductPage } = await import('@/app/[locale]/(frontend)/products/[id]/page');

    const page = await LocalizedProductPage({
      params: Promise.resolve({ locale: 'EN', id: 'product-2' }),
    });

    expect(page).toEqual(
      expect.objectContaining({
        type: ProductPublicPageMock,
        props: {
          params: { id: 'product-2' },
          locale: 'en',
        },
      })
    );
  });
});
