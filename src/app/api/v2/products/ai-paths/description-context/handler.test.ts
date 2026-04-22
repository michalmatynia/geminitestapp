import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductParameter } from '@/shared/contracts/products/parameters';

const {
  getParameterRepositoryMock,
  getCategoryRepositoryMock,
  listParametersMock,
  listCategoriesMock,
} = vi.hoisted(() => ({
  getParameterRepositoryMock: vi.fn(),
  getCategoryRepositoryMock: vi.fn(),
  listParametersMock: vi.fn(),
  listCategoriesMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getParameterRepository: getParameterRepositoryMock,
  getCategoryRepository: getCategoryRepositoryMock,
}));

import { getHandler } from './handler';

const buildParameter = (overrides: Partial<ProductParameter> = {}): ProductParameter => ({
  id: 'param-1',
  name: 'Size',
  name_en: 'Size',
  name_pl: 'Rozmiar',
  name_de: 'Groesse',
  catalogId: 'catalog-1',
  selectorType: 'select',
  optionLabels: ['M', 'm', 'L'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const buildCategory = (overrides: Partial<ProductCategory> = {}): ProductCategory => ({
  id: 'cat-1',
  name: 'Shirts',
  name_en: 'Shirts',
  name_pl: 'Koszule',
  name_de: 'Hemden',
  description: null,
  color: null,
  parentId: null,
  catalogId: 'catalog-1',
  sortIndex: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('products ai-paths description-context handler', () => {
  beforeEach(() => {
    listParametersMock.mockReset();
    listCategoriesMock.mockReset();
    getParameterRepositoryMock.mockReset();
    getCategoryRepositoryMock.mockReset();

    getParameterRepositoryMock.mockResolvedValue({
      listParameters: listParametersMock,
    });
    getCategoryRepositoryMock.mockResolvedValue({
      listCategories: listCategoriesMock,
    });
  });

  it('returns parameters and categories by default for a catalog', async () => {
    listParametersMock.mockResolvedValue([buildParameter()]);
    listCategoriesMock.mockResolvedValue([
      buildCategory({ id: 'cat-1', name_en: 'Shirts' }),
      buildCategory({ id: 'cat-2', name_en: 'Pants' }),
    ]);

    const request = new Request(
      'http://localhost/api/v2/products/ai-paths/description-context?catalogId=catalog-1&categoryId=cat-2'
    );

    const response = await getHandler(
      request as Parameters<typeof getHandler>[0],
      {
        query: { catalogId: 'catalog-1', categoryId: 'cat-2', includeCategories: true },
      } as Parameters<typeof getHandler>[1]
    );

    const payload = (await response.json()) as {
      categoryName: string | null;
      parameters: Array<{ optionLabels: string[] }>;
      categories: Array<{ id: string }>;
    };

    expect(payload.categoryName).toBe('Pants');
    expect(payload.parameters[0]?.optionLabels).toEqual(['M', 'L']);
    expect(payload.categories.map((entry) => entry.id)).toEqual(['cat-1', 'cat-2']);
    expect(listParametersMock).toHaveBeenCalledWith({ catalogId: 'catalog-1' });
    expect(listCategoriesMock).toHaveBeenCalledWith({ catalogId: 'catalog-1' });
  });

  it('keeps categoryName resolution when includeCategories is disabled', async () => {
    listParametersMock.mockResolvedValue([buildParameter()]);
    listCategoriesMock.mockResolvedValue([buildCategory({ id: 'cat-1', name_en: 'Shirts' })]);

    const request = new Request(
      'http://localhost/api/v2/products/ai-paths/description-context?catalogId=catalog-1&categoryId=cat-1&includeCategories=false'
    );

    const response = await getHandler(
      request as Parameters<typeof getHandler>[0],
      {
        query: { catalogId: 'catalog-1', categoryId: 'cat-1', includeCategories: false },
      } as Parameters<typeof getHandler>[1]
    );

    const payload = (await response.json()) as {
      categoryName: string | null;
      categories: unknown[];
    };

    expect(payload.categoryName).toBe('Shirts');
    expect(payload.categories).toEqual([]);
    expect(listCategoriesMock).toHaveBeenCalledWith({ catalogId: 'catalog-1' });
  });

  it('returns an empty payload when catalogId is missing', async () => {
    const request = new Request(
      'http://localhost/api/v2/products/ai-paths/description-context?categoryId=cat-1'
    );

    const response = await getHandler(
      request as Parameters<typeof getHandler>[0],
      {
        query: { catalogId: undefined, categoryId: 'cat-1', includeCategories: true },
      } as Parameters<typeof getHandler>[1]
    );

    const payload = (await response.json()) as {
      catalogId: string | null;
      categoryId: string | null;
      categories: unknown[];
      parameters: unknown[];
    };

    expect(payload.catalogId).toBeNull();
    expect(payload.categoryId).toBe('cat-1');
    expect(payload.parameters).toEqual([]);
    expect(payload.categories).toEqual([]);
    expect(listParametersMock).not.toHaveBeenCalled();
    expect(listCategoriesMock).not.toHaveBeenCalled();
  });
});
