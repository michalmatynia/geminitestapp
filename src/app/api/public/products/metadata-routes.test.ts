import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductCategory, ProductParameter } from '@/shared/contracts/products';

const {
  getParameterRepositoryMock,
  getCategoryRepositoryMock,
  getProductDataProviderMock,
  listParametersMock,
  listCategoriesMock,
} = vi.hoisted(() => ({
  getParameterRepositoryMock: vi.fn(),
  getCategoryRepositoryMock: vi.fn(),
  getProductDataProviderMock: vi.fn(),
  listParametersMock: vi.fn(),
  listCategoriesMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getParameterRepository: getParameterRepositoryMock,
  getCategoryRepository: getCategoryRepositoryMock,
  getProductDataProvider: getProductDataProviderMock,
}));

import { GET_handler as getPublicCategoriesHandler } from './categories/handler';
import { GET_handler as getPublicParametersHandler } from './parameters/handler';

const buildParameter = (overrides: Partial<ProductParameter> = {}): ProductParameter => ({
  id: 'param-1',
  name: 'Size',
  name_en: 'Size',
  name_pl: null,
  name_de: null,
  catalogId: 'catalog-1',
  selectorType: 'select',
  optionLabels: ['L', 'l', 'XL'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const buildCategory = (overrides: Partial<ProductCategory> = {}): ProductCategory => ({
  id: 'cat-1',
  name: 'Shirts',
  name_en: 'Shirts',
  name_pl: null,
  name_de: null,
  description: null,
  color: null,
  parentId: null,
  catalogId: 'catalog-1',
  sortIndex: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('public product metadata handlers', () => {
  beforeEach(() => {
    listParametersMock.mockReset();
    listCategoriesMock.mockReset();
    getParameterRepositoryMock.mockReset();
    getCategoryRepositoryMock.mockReset();
    getProductDataProviderMock.mockReset();

    getParameterRepositoryMock.mockResolvedValue({
      listParameters: listParametersMock,
    });
    getCategoryRepositoryMock.mockResolvedValue({
      listCategories: listCategoriesMock,
    });
    getProductDataProviderMock.mockResolvedValue('prisma');
  });

  it('returns normalized public parameters for a catalog', async () => {
    listParametersMock.mockResolvedValue([buildParameter()]);
    const request = new Request(
      'http://localhost/api/public/products/parameters?catalogId=catalog-1'
    );

    const response = await getPublicParametersHandler(
      request as Parameters<typeof getPublicParametersHandler>[0],
      { query: { catalogId: 'catalog-1' } } as Parameters<
        typeof getPublicParametersHandler
      >[1]
    );

    const payload = (await response.json()) as Array<{
      id: string;
      optionLabels: string[];
    }>;

    expect(payload).toEqual([
      expect.objectContaining({
        id: 'param-1',
        optionLabels: ['L', 'XL'],
      }),
    ]);
    expect(listParametersMock).toHaveBeenCalledWith({ catalogId: 'catalog-1' });
  });

  it('returns catalog-scoped public categories', async () => {
    listCategoriesMock.mockResolvedValue([
      buildCategory({ id: 'cat-1', name: 'Shirts' }),
      buildCategory({ id: 'cat-2', name: 'Pants' }),
    ]);
    const request = new Request(
      'http://localhost/api/public/products/categories?catalogId=catalog-1'
    );

    const response = await getPublicCategoriesHandler(
      request as Parameters<typeof getPublicCategoriesHandler>[0],
      { query: { catalogId: 'catalog-1' } } as Parameters<
        typeof getPublicCategoriesHandler
      >[1]
    );

    const payload = (await response.json()) as Array<{
      id: string;
      name: string;
      parentId: string | null;
    }>;

    expect(payload).toEqual([
      expect.objectContaining({ id: 'cat-1', name: 'Shirts', parentId: null }),
      expect.objectContaining({ id: 'cat-2', name: 'Pants', parentId: null }),
    ]);
    expect(getProductDataProviderMock).toHaveBeenCalledTimes(1);
    expect(getCategoryRepositoryMock).toHaveBeenCalledWith('prisma');
    expect(listCategoriesMock).toHaveBeenCalledWith({ catalogId: 'catalog-1' });
  });
});
