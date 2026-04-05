import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ActivityTypes } from '@/shared/constants/observability';

const {
  repositoryMock,
  shippingGroupRepositoryMock,
  categoryRepositoryMock,
  imageRepositoryMock,
  getProductRepositoryMock,
  getProductDataProviderMock,
  getShippingGroupRepositoryMock,
  getCategoryRepositoryMock,
  uploadFileMock,
  deleteFileFromStorageMock,
  getImageFileRepositoryMock,
  validateProductCreateMock,
  validateProductUpdateMock,
  logActivityMock,
  logWarningMock,
  logInfoMock,
  captureExceptionMock,
  withRetryMock,
} = vi.hoisted(() => ({
  repositoryMock: {
    getProducts: vi.fn(),
    countProducts: vi.fn(),
    getProductsWithCount: vi.fn(),
    createProduct: vi.fn(),
    bulkCreateProducts: vi.fn(),
    updateProduct: vi.fn(),
    getProductById: vi.fn(),
    getProductBySku: vi.fn(),
    getProductsBySkus: vi.fn(),
    findProductsByBaseIds: vi.fn(),
    duplicateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    addProductImages: vi.fn(),
    getProductImages: vi.fn(),
    removeProductImage: vi.fn(),
    countProductsByImageFileId: vi.fn(),
    replaceProductImages: vi.fn(),
    replaceProductCatalogs: vi.fn(),
    replaceProductCategory: vi.fn(),
    replaceProductTags: vi.fn(),
    replaceProductProducers: vi.fn(),
    replaceProductNotes: vi.fn(),
  },
  shippingGroupRepositoryMock: {
    listShippingGroups: vi.fn(),
    getShippingGroupById: vi.fn(),
  },
  categoryRepositoryMock: {
    listCategories: vi.fn(),
  },
  imageRepositoryMock: {
    getImageFileById: vi.fn(),
    deleteImageFile: vi.fn(),
  },
  getProductRepositoryMock: vi.fn(),
  getProductDataProviderMock: vi.fn(),
  getShippingGroupRepositoryMock: vi.fn(),
  getCategoryRepositoryMock: vi.fn(),
  uploadFileMock: vi.fn(),
  deleteFileFromStorageMock: vi.fn(),
  getImageFileRepositoryMock: vi.fn(),
  validateProductCreateMock: vi.fn(),
  validateProductUpdateMock: vi.fn(),
  logActivityMock: vi.fn(),
  logWarningMock: vi.fn(),
  logInfoMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  withRetryMock: vi.fn(async (callback: () => Promise<unknown>) => await callback()),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: getProductRepositoryMock,
}));

vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: getProductDataProviderMock,
}));

vi.mock('@/shared/lib/products/services/shipping-group-repository', () => ({
  getShippingGroupRepository: getShippingGroupRepositoryMock,
}));

vi.mock('@/shared/lib/products/services/category-repository', () => ({
  getCategoryRepository: getCategoryRepositoryMock,
}));

vi.mock('@/shared/lib/products/validations', () => ({
  validateProductCreate: validateProductCreateMock,
  validateProductUpdate: validateProductUpdateMock,
}));

vi.mock('@/shared/utils/observability/activity-service', () => ({
  logActivity: logActivityMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logWarning: logWarningMock,
    logInfo: logInfoMock,
    captureException: captureExceptionMock,
  },
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  deleteFileFromStorage: deleteFileFromStorageMock,
  uploadFile: uploadFileMock,
  getImageFileRepository: getImageFileRepositoryMock,
}));

vi.mock('@/shared/utils/retry', () => ({
  withRetry: withRetryMock,
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
    getShippingGroupRepositoryMock.mockResolvedValue(shippingGroupRepositoryMock);
    getCategoryRepositoryMock.mockResolvedValue(categoryRepositoryMock);
    getImageFileRepositoryMock.mockResolvedValue(imageRepositoryMock);
    logActivityMock.mockResolvedValue(undefined);

    repositoryMock.getProducts.mockResolvedValue([createProductRecord()]);
    repositoryMock.countProducts.mockResolvedValue(1);
    repositoryMock.getProductsWithCount.mockResolvedValue({
      products: [createProductRecord()],
      total: 1,
    });
    repositoryMock.createProduct.mockResolvedValue(createProductRecord());
    repositoryMock.bulkCreateProducts.mockResolvedValue(1);
    repositoryMock.updateProduct.mockResolvedValue(createProductRecord());
    repositoryMock.getProductById.mockResolvedValue(createProductRecord());
    repositoryMock.getProductBySku.mockResolvedValue(createProductRecord());
    repositoryMock.getProductsBySkus.mockResolvedValue([createProductRecord()]);
    repositoryMock.findProductsByBaseIds.mockResolvedValue([createProductRecord()]);
    repositoryMock.duplicateProduct.mockResolvedValue({ id: 'product-2' });
    repositoryMock.deleteProduct.mockResolvedValue(createProductRecord());
    repositoryMock.addProductImages.mockResolvedValue(undefined);
    repositoryMock.getProductImages.mockResolvedValue([
      {
        id: 'product-image-1',
        productId: 'product-1',
        imageFileId: 'image-file-1',
        order: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    repositoryMock.removeProductImage.mockResolvedValue(undefined);
    repositoryMock.countProductsByImageFileId.mockResolvedValue(0);
    repositoryMock.replaceProductImages.mockResolvedValue(undefined);
    repositoryMock.replaceProductCatalogs.mockResolvedValue(undefined);
    repositoryMock.replaceProductCategory.mockResolvedValue(undefined);
    repositoryMock.replaceProductTags.mockResolvedValue(undefined);
    repositoryMock.replaceProductProducers.mockResolvedValue(undefined);
    repositoryMock.replaceProductNotes.mockResolvedValue(undefined);
    shippingGroupRepositoryMock.listShippingGroups.mockResolvedValue([]);
    shippingGroupRepositoryMock.getShippingGroupById.mockResolvedValue(null);
    categoryRepositoryMock.listCategories.mockResolvedValue([]);
    imageRepositoryMock.getImageFileById.mockResolvedValue({
      id: 'image-file-1',
      filepath: '/uploads/product-1.png',
    });
    imageRepositoryMock.deleteImageFile.mockResolvedValue(undefined);
    uploadFileMock.mockResolvedValue({
      id: 'image-file-1',
    });
    deleteFileFromStorageMock.mockResolvedValue(undefined);
    logWarningMock.mockResolvedValue(undefined);
    logInfoMock.mockResolvedValue(undefined);
    captureExceptionMock.mockResolvedValue(undefined);
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

  it('preserves existing parameters when an empty array arrives without explicit clear intent', async () => {
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

    expect(updatePayload).toEqual(
      expect.objectContaining({
        parameters: [{ parameterId: 'param-1', value: 'value-1' }],
      })
    );
    expect(logWarningMock).toHaveBeenCalledTimes(1);
  });

  it('allows explicit parameter clearing when an override flag is present', async () => {
    validateProductUpdateMock.mockResolvedValue({
      success: true,
      data: { parameters: [] },
    });

    await productService.updateProduct('product-1', {
      parameters: [],
      forceClearParameters: true,
    });

    expect(repositoryMock.updateProduct).toHaveBeenCalledTimes(1);
    const [, updatePayload] = repositoryMock.updateProduct.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(updatePayload).toEqual(expect.objectContaining({ parameters: [] }));
    expect(logWarningMock).not.toHaveBeenCalled();
  });

  it('preserves implicit empty parameter clearing through the FormData update path', async () => {
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

    expect(updatePayload).toEqual(
      expect.objectContaining({
        parameters: [{ parameterId: 'param-1', value: 'value-1' }],
      })
    );
    expect(logWarningMock).toHaveBeenCalledTimes(1);
  });

  it('allows explicit parameter clearing through the FormData update path', async () => {
    validateProductUpdateMock.mockImplementation(async (data: unknown) => {
      expect(data).toEqual(expect.objectContaining({ parameters: '[]' }));
      return {
        success: true,
        data: { parameters: [] },
      };
    });

    const formData = new FormData();
    formData.append('parameters', '[]');
    formData.append('forceClearParameters', 'true');

    await productService.updateProduct('product-1', formData);

    expect(validateProductUpdateMock).toHaveBeenCalledTimes(1);

    expect(repositoryMock.updateProduct).toHaveBeenCalledTimes(1);
    const [, updatePayload] = repositoryMock.updateProduct.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(updatePayload).toEqual(expect.objectContaining({ parameters: [] }));
    expect(logWarningMock).not.toHaveBeenCalled();
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

  it('filters invalid entries during bulk create and normalizes payloads', async () => {
    validateProductCreateMock
      .mockResolvedValueOnce({
        success: true,
        data: {
          sku: 'SKU-1',
        },
      })
      .mockResolvedValueOnce({
        success: false,
        errors: [{ field: 'sku', message: 'missing' }],
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          sku: 'SKU-2',
          parameters: null,
          imageFileIds: ['img-1'],
        },
      });
    repositoryMock.bulkCreateProducts.mockResolvedValue(2);

    const created = await productService.bulkCreateProducts([
      { sku: 'SKU-1' } as any,
      { sku: '' } as any,
      { sku: 'SKU-2' } as any,
    ]);

    expect(created).toBe(2);
    expect(repositoryMock.bulkCreateProducts).toHaveBeenCalledWith([
      { sku: 'SKU-1', parameters: [], imageFileIds: undefined },
      { sku: 'SKU-2', parameters: [], imageFileIds: ['img-1'] },
    ]);
  });

  it('delegates read helpers to the repository layer', async () => {
    expect(await productService.getProducts({ published: true }, { provider: 'mongodb' as any })).toEqual([
      createProductRecord(),
    ]);
    expect(await productService.countProducts({ published: true }, { provider: 'mongodb' as any })).toBe(1);
    expect(
      await productService.getProductsWithCount({ published: true }, { provider: 'mongodb' as any })
    ).toEqual({
      products: [createProductRecord()],
      total: 1,
    });
    expect(await productService.getProductBySku('SKU-1', { provider: 'mongodb' as any })).toEqual(
      createProductRecord()
    );
    expect(await productService.getProductsBySkus(['SKU-1'], { provider: 'mongodb' as any })).toEqual([
      createProductRecord(),
    ]);
    expect(await productService.findProductsByBaseIds(['base-1'], { provider: 'mongodb' as any })).toEqual([
      createProductRecord(),
    ]);
    expect(await productService.findProductsByBaseIds([], { provider: 'mongodb' as any })).toEqual([]);
  });

  it('hydrates category-rule shipping groups onto read results', async () => {
    repositoryMock.getProducts.mockResolvedValue([
      createProductRecord({
        categoryId: 'category-rings',
        catalogId: 'catalog-1',
        shippingGroupId: null,
      }),
    ]);
    shippingGroupRepositoryMock.listShippingGroups.mockResolvedValue([
      {
        id: 'shipping-group-1',
        name: 'Jewellery 7 EUR',
        description: null,
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 7,
        autoAssignCategoryIds: ['category-jewellery'],
      },
    ]);
    categoryRepositoryMock.listCategories.mockResolvedValue([
      {
        id: 'category-jewellery',
        name: 'Jewellery',
        description: null,
        catalogId: 'catalog-1',
        parentId: null,
      },
      {
        id: 'category-rings',
        name: 'Rings',
        description: null,
        catalogId: 'catalog-1',
        parentId: 'category-jewellery',
      },
    ]);

    const [product] = await productService.getProducts(
      { published: true },
      { provider: 'mongodb' as any }
    );

    expect(product).toEqual(
      expect.objectContaining({
        shippingGroup: expect.objectContaining({
          id: 'shipping-group-1',
          name: 'Jewellery 7 EUR',
        }),
        shippingGroupSource: 'category_rule',
        shippingGroupResolutionReason: 'category_rule',
        shippingGroupMatchedCategoryRuleIds: ['category-jewellery'],
        shippingGroupMatchingGroupNames: ['Jewellery 7 EUR'],
      })
    );
  });

  it('prefers the manual shipping group over category rules on read helpers', async () => {
    repositoryMock.getProductById.mockResolvedValue(
      createProductRecord({
        shippingGroupId: 'shipping-group-manual',
        categoryId: 'category-rings',
        catalogId: 'catalog-1',
      })
    );
    shippingGroupRepositoryMock.listShippingGroups.mockResolvedValue([
      {
        id: 'shipping-group-1',
        name: 'Jewellery 7 EUR',
        description: null,
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 7,
        autoAssignCategoryIds: ['category-jewellery'],
      },
    ]);
    shippingGroupRepositoryMock.getShippingGroupById.mockResolvedValue({
      id: 'shipping-group-manual',
      name: 'Manual parcel',
      description: null,
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 5,
      autoAssignCategoryIds: [],
    });
    categoryRepositoryMock.listCategories.mockResolvedValue([
      {
        id: 'category-jewellery',
        name: 'Jewellery',
        description: null,
        catalogId: 'catalog-1',
        parentId: null,
      },
      {
        id: 'category-rings',
        name: 'Rings',
        description: null,
        catalogId: 'catalog-1',
        parentId: 'category-jewellery',
      },
    ]);

    const product = await productService.getProductById('product-1', {
      provider: 'mongodb' as any,
    });

    expect(product).toEqual(
      expect.objectContaining({
        shippingGroup: expect.objectContaining({
          id: 'shipping-group-manual',
          name: 'Manual parcel',
        }),
        shippingGroupSource: 'manual',
        shippingGroupResolutionReason: 'manual',
        shippingGroupMatchingGroupNames: ['Manual parcel'],
      })
    );
    expect(product).not.toHaveProperty('shippingGroupMatchedCategoryRuleIds');
  });

  it('hydrates ambiguous shipping-rule matches onto read results', async () => {
    repositoryMock.getProducts.mockResolvedValue([
      createProductRecord({
        categoryId: 'category-rings',
        catalogId: 'catalog-1',
        shippingGroupId: null,
      }),
    ]);
    shippingGroupRepositoryMock.listShippingGroups.mockResolvedValue([
      {
        id: 'shipping-group-1',
        name: 'Jewellery 7 EUR',
        description: null,
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 7,
        autoAssignCategoryIds: ['category-jewellery'],
      },
      {
        id: 'shipping-group-2',
        name: 'Rings 5 EUR',
        description: null,
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 5,
        autoAssignCategoryIds: ['category-rings'],
      },
    ]);
    categoryRepositoryMock.listCategories.mockResolvedValue([
      {
        id: 'category-jewellery',
        name: 'Jewellery',
        description: null,
        catalogId: 'catalog-1',
        parentId: null,
      },
      {
        id: 'category-rings',
        name: 'Rings',
        description: null,
        catalogId: 'catalog-1',
        parentId: 'category-jewellery',
      },
    ]);

    const [product] = await productService.getProducts(
      { published: true },
      { provider: 'mongodb' as any }
    );

    expect(product).toEqual(
      expect.objectContaining({
        shippingGroupResolutionReason: 'multiple_category_rules',
        shippingGroupMatchedCategoryRuleIds: ['category-jewellery', 'category-rings'],
        shippingGroupMatchingGroupNames: ['Jewellery 7 EUR', 'Rings 5 EUR'],
      })
    );
    expect(product).not.toHaveProperty('shippingGroup');
    expect(product).not.toHaveProperty('shippingGroupSource');
  });

  it('captures repository errors from getProducts', async () => {
    const failure = new Error('repo failed');
    repositoryMock.getProducts.mockRejectedValueOnce(failure);

    await expect(productService.getProducts({ published: true })).rejects.toThrow('repo failed');
    expect(captureExceptionMock).toHaveBeenCalledTimes(2);
    expect(captureExceptionMock).toHaveBeenLastCalledWith(
      failure,
      expect.objectContaining({
        service: 'product-service',
        action: 'getProducts',
        filters: { published: true },
      })
    );
  });

  it('duplicates products and reloads the duplicated record', async () => {
    repositoryMock.getProductById.mockResolvedValueOnce(createProductRecord({ id: 'product-2' }));

    const duplicated = await productService.duplicateProduct('product-1', 'SKU-2', {
      userId: 'user-1',
    });

    expect(repositoryMock.duplicateProduct).toHaveBeenCalledWith('product-1', 'SKU-2');
    expect(duplicated).toEqual(createProductRecord({ id: 'product-2' }));
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ActivityTypes.PRODUCT.DUPLICATED,
        userId: 'user-1',
      })
    );
  });

  it('rejects duplicateProduct without a usable sku', async () => {
    await expect(productService.duplicateProduct('product-1', '   ')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('deletes products and logs activity when the repository returns a record', async () => {
    const deleted = await productService.deleteProduct('product-1', { userId: 'user-1' });

    expect(deleted).toEqual(createProductRecord());
    expect(repositoryMock.deleteProduct).toHaveBeenCalledWith('product-1');
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ActivityTypes.PRODUCT.DELETED,
        userId: 'user-1',
      })
    );
  });

  it('uploads a product image and verifies the created relation', async () => {
    const file = new File(['binary'], 'image.png', { type: 'image/png' });

    const image = await productService.uploadProductImage('product-1', file);

    expect(uploadFileMock).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        category: 'products',
        provider: 'mongodb',
        sku: 'SKU-1',
        filenameOverride: 'image.png',
      })
    );
    expect(repositoryMock.addProductImages).toHaveBeenCalledWith('product-1', ['image-file-1']);
    expect(image).toEqual({
      id: 'product-image-1',
      productId: 'product-1',
      imageFileId: 'image-file-1',
      order: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('throws when uploaded image verification fails', async () => {
    const file = new File(['binary'], 'image.png', { type: 'image/png' });
    repositoryMock.getProductImages.mockResolvedValueOnce([]);

    await expect(productService.uploadProductImage('product-1', file)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('removes orphaned image files only when no product links remain', async () => {
    await productService.deleteProductImage('product-1', 'image-file-1');

    expect(repositoryMock.removeProductImage).toHaveBeenCalledWith('product-1', 'image-file-1');
    expect(repositoryMock.countProductsByImageFileId).toHaveBeenCalledWith('image-file-1');
    expect(deleteFileFromStorageMock).toHaveBeenCalledWith('/uploads/product-1.png');
    expect(imageRepositoryMock.deleteImageFile).toHaveBeenCalledWith('image-file-1');
  });

  it('leaves shared image files in storage when other products still reference them', async () => {
    repositoryMock.countProductsByImageFileId.mockResolvedValueOnce(2);

    await productService.deleteProductImage('product-1', 'image-file-1');

    expect(deleteFileFromStorageMock).not.toHaveBeenCalled();
    expect(imageRepositoryMock.deleteImageFile).not.toHaveBeenCalled();
  });
});
