import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

const {
  repositoryMock,
  getProductRepositoryMock,
  getProductDataProviderMock,
  validateProductCreateMock,
  validateProductUpdateMock,
  logActivityMock,
} = vi.hoisted(() => ({
  repositoryMock: {
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    getProductById: vi.fn(),
    replaceProductImages: vi.fn(),
    replaceProductCatalogs: vi.fn(),
    replaceProductCategory: vi.fn(),
    replaceProductTags: vi.fn(),
    replaceProductProducers: vi.fn(),
    replaceProductNotes: vi.fn(),
  },
  getProductRepositoryMock: vi.fn(),
  getProductDataProviderMock: vi.fn(),
  validateProductCreateMock: vi.fn(),
  validateProductUpdateMock: vi.fn(),
  logActivityMock: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: getProductRepositoryMock,
}));

vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: getProductDataProviderMock,
}));

vi.mock('@/shared/lib/products/validations', () => ({
  validateProductCreate: validateProductCreateMock,
  validateProductUpdate: validateProductUpdateMock,
}));

vi.mock('@/shared/utils/observability/activity-service', () => ({
  logActivity: logActivityMock,
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  deleteFileFromStorage: vi.fn(),
  uploadFile: vi.fn(),
  getImageFileRepository: vi.fn(),
}));

import { productService } from './productService';

const createProductRecord = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Product 1', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 1,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: null,
    catalogId: '',
    tags: [],
    producers: [],
    images: [],
    catalogs: [],
    parameters: [{ parameterId: 'param-1', value: 'value-1' }],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

describe('productService parameter normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getProductDataProviderMock.mockResolvedValue('mongodb');
    getProductRepositoryMock.mockResolvedValue(repositoryMock);
    logActivityMock.mockResolvedValue(undefined);

    repositoryMock.createProduct.mockResolvedValue(createProductRecord());
    repositoryMock.updateProduct.mockResolvedValue(createProductRecord());
    repositoryMock.getProductById.mockResolvedValue(createProductRecord());
    repositoryMock.replaceProductImages.mockResolvedValue(undefined);
    repositoryMock.replaceProductCatalogs.mockResolvedValue(undefined);
    repositoryMock.replaceProductCategory.mockResolvedValue(undefined);
    repositoryMock.replaceProductTags.mockResolvedValue(undefined);
    repositoryMock.replaceProductProducers.mockResolvedValue(undefined);
    repositoryMock.replaceProductNotes.mockResolvedValue(undefined);
  });

  it('preserves parameters when update payload omits parameters', async () => {
    validateProductUpdateMock.mockResolvedValue({
      success: true,
      data: { price: 42 },
    });

    await productService.updateProduct('product-1', { price: 42 });

    expect(repositoryMock.updateProduct).toHaveBeenCalledTimes(1);
    const [, updatePayload] = repositoryMock.updateProduct.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(updatePayload).toEqual(expect.objectContaining({ price: 42 }));
    expect(Object.prototype.hasOwnProperty.call(updatePayload, 'parameters')).toBe(false);
  });

  it('allows explicit parameter clearing when parameters is an empty array', async () => {
    validateProductUpdateMock.mockResolvedValue({
      success: true,
      data: { parameters: [] },
    });

    await productService.updateProduct('product-1', { parameters: [] });

    expect(repositoryMock.updateProduct).toHaveBeenCalledTimes(1);
    const [, updatePayload] = repositoryMock.updateProduct.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(updatePayload).toEqual(expect.objectContaining({ parameters: [] }));
  });

  it('preserves explicit parameter clearing through the FormData update path', async () => {
    validateProductUpdateMock.mockImplementation(async (data: unknown) => {
      expect(data).toEqual(expect.objectContaining({ parameters: '[]' }));
      return {
      success: true,
      data: { parameters: [] },
    };
    });

    const formData = new FormData();
    formData.append('parameters', '[]');

    await productService.updateProduct('product-1', formData);

    expect(validateProductUpdateMock).toHaveBeenCalledTimes(1);

    expect(repositoryMock.updateProduct).toHaveBeenCalledTimes(1);
    const [, updatePayload] = repositoryMock.updateProduct.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(updatePayload).toEqual(expect.objectContaining({ parameters: [] }));
  });

  it('defaults create payload parameters to an empty array when omitted', async () => {
    validateProductCreateMock.mockResolvedValue({
      success: true,
      data: {
        sku: 'SKU-NEW',
      },
    });

    await productService.createProduct({ sku: 'SKU-NEW' });

    expect(repositoryMock.createProduct).toHaveBeenCalledTimes(1);
    const [createPayload] = repositoryMock.createProduct.mock.calls[0] as [Record<string, unknown>];

    expect(createPayload).toEqual(expect.objectContaining({ sku: 'SKU-NEW', parameters: [] }));
  });
});
