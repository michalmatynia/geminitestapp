import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ProductWithImages } from '@/shared/contracts/products';

const mocks = vi.hoisted(() => {
  const repository = {
    getProducts: vi.fn(),
    countProducts: vi.fn(),
    getProductsWithCount: vi.fn(),
    getProductIds: vi.fn(),
    getProductById: vi.fn(),
    getProductBySku: vi.fn(),
    getProductsBySkus: vi.fn(),
    findProductsByBaseIds: vi.fn(),
    findProductByBaseId: vi.fn(),
    createProduct: vi.fn(),
    bulkCreateProducts: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    duplicateProduct: vi.fn(),
    getProductImages: vi.fn(),
    addProductImages: vi.fn(),
    replaceProductImages: vi.fn(),
    removeProductImage: vi.fn(),
    countProductsByImageFileId: vi.fn(),
    replaceProductCatalogs: vi.fn(),
    replaceProductCategory: vi.fn(),
    replaceProductTags: vi.fn(),
    replaceProductProducers: vi.fn(),
    replaceProductNotes: vi.fn(),
    bulkReplaceProductCatalogs: vi.fn(),
    bulkAddProductCatalogs: vi.fn(),
    bulkRemoveProductCatalogs: vi.fn(),
    createProductInTransaction: vi.fn(),
  };

  const imageRepository = {
    createImageFile: vi.fn(),
    getImageFileById: vi.fn(),
    listImageFiles: vi.fn(),
    findImageFilesByIds: vi.fn(),
    updateImageFilePath: vi.fn(),
    updateImageFileTags: vi.fn(),
    deleteImageFile: vi.fn(),
  };

  return {
    repository,
    imageRepository,
    getProductRepository: vi.fn(),
    getProductDataProvider: vi.fn(),
    validateProductCreate: vi.fn(),
    validateProductUpdate: vi.fn(),
    uploadFile: vi.fn(),
    getImageFileRepository: vi.fn(),
    deleteFileFromStorage: vi.fn(),
    logActivity: vi.fn(),
    logWarning: vi.fn(),
    logInfo: vi.fn(),
    captureException: vi.fn(),
  };
});

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: mocks.getProductRepository,
}));

vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: mocks.getProductDataProvider,
}));

vi.mock('@/shared/lib/products/validations', () => ({
  validateProductCreate: mocks.validateProductCreate,
  validateProductUpdate: mocks.validateProductUpdate,
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  uploadFile: mocks.uploadFile,
  getImageFileRepository: mocks.getImageFileRepository,
  deleteFileFromStorage: mocks.deleteFileFromStorage,
}));

vi.mock('@/shared/utils/observability/activity-service', () => ({
  logActivity: mocks.logActivity,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logWarning: mocks.logWarning,
    logInfo: mocks.logInfo,
    captureException: mocks.captureException,
  },
}));

import { productService } from '@/shared/lib/products/services/productService';

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
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

describe('productService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getProductDataProvider.mockResolvedValue('mongodb');
    mocks.getProductRepository.mockResolvedValue(mocks.repository);
    mocks.getImageFileRepository.mockResolvedValue(mocks.imageRepository);

    mocks.validateProductCreate.mockResolvedValue({
      success: true,
      data: { sku: 'SKU-1' },
    });
    mocks.validateProductUpdate.mockResolvedValue({
      success: true,
      data: {},
    });

    mocks.repository.getProducts.mockResolvedValue([]);
    mocks.repository.getProductById.mockResolvedValue(createProductRecord());
    mocks.repository.createProduct.mockResolvedValue(createProductRecord());
    mocks.repository.updateProduct.mockResolvedValue(createProductRecord());
    mocks.repository.duplicateProduct.mockResolvedValue(createProductRecord({ id: 'product-copy' }));
    mocks.repository.replaceProductImages.mockResolvedValue(undefined);
    mocks.repository.replaceProductCatalogs.mockResolvedValue(undefined);
    mocks.repository.replaceProductCategory.mockResolvedValue(undefined);
    mocks.repository.replaceProductTags.mockResolvedValue(undefined);
    mocks.repository.replaceProductProducers.mockResolvedValue(undefined);
    mocks.repository.replaceProductNotes.mockResolvedValue(undefined);
    mocks.repository.removeProductImage.mockResolvedValue(undefined);
    mocks.repository.countProductsByImageFileId.mockResolvedValue(1);

    mocks.uploadFile.mockResolvedValue({ id: 'uploaded-image-1' });
    mocks.imageRepository.getImageFileById.mockResolvedValue(null);
    mocks.imageRepository.deleteImageFile.mockResolvedValue(null);
    mocks.deleteFileFromStorage.mockResolvedValue(undefined);
    mocks.logActivity.mockResolvedValue(undefined);
    mocks.logWarning.mockResolvedValue(undefined);
    mocks.logInfo.mockResolvedValue(undefined);
    mocks.captureException.mockResolvedValue(undefined);
  });

  it('loads products through the provider-selected repository', async () => {
    const products = [createProductRecord({ id: 'product-1' }), createProductRecord({ id: 'product-2' })];
    mocks.repository.getProducts.mockResolvedValue(products);

    const result = await productService.getProducts({ search: 'desk', page: 2, pageSize: 12 });

    expect(mocks.getProductRepository).toHaveBeenCalledWith('mongodb');
    expect(mocks.repository.getProducts).toHaveBeenCalledWith({
      search: 'desk',
      page: 2,
      pageSize: 12,
    });
    expect(result).toEqual(products);
  });

  it('creates a product from FormData, uploads files, and applies parsed relations', async () => {
    const file = new File(['image-bytes'], 'create-upload.jpg', {
      type: 'image/jpeg',
    });
    const createdProduct = createProductRecord({ id: 'product-created', sku: 'NEW-SKU-123' });
    const refreshedProduct = createProductRecord({
      id: 'product-created',
      sku: 'NEW-SKU-123',
      images: [
        {
          id: 'product-image-1',
          productId: 'product-created',
          imageFileId: 'uploaded-image-1',
          order: 0,
          imageFile: { id: 'uploaded-image-1' },
        },
      ],
      catalogs: [{ catalogId: 'catalog-a' }, { catalogId: 'catalog-b' }],
    });

    mocks.validateProductCreate.mockResolvedValue({
      success: true,
      data: {
        name_en: 'New Product',
        sku: 'NEW-SKU-123',
      },
    });
    mocks.repository.createProduct.mockResolvedValue(createdProduct);
    mocks.repository.getProductById.mockResolvedValue(refreshedProduct);

    const formData = new FormData();
    formData.append('name_en', 'New Product');
    formData.append('sku', 'NEW-SKU-123');
    formData.append('catalogIds', 'catalog-a');
    formData.append('catalogIds', 'catalog-b');
    formData.append('images', file);

    const result = await productService.createProduct(formData);

    expect(mocks.repository.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name_en: 'New Product',
        sku: 'NEW-SKU-123',
        parameters: [],
      })
    );
    expect(mocks.uploadFile).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        category: 'products',
        provider: 'mongodb',
        sku: 'NEW-SKU-123',
        filenameOverride: 'create-upload.jpg',
      })
    );
    expect(mocks.repository.replaceProductCatalogs).toHaveBeenCalledWith('product-created', [
      'catalog-a',
      'catalog-b',
    ]);
    expect(mocks.repository.replaceProductImages).toHaveBeenCalledWith('product-created', [
      'uploaded-image-1',
    ]);
    expect(result).toEqual(refreshedProduct);
  });

  it('updates a product from FormData and preserves the provided image order', async () => {
    const existingProduct = createProductRecord({
      id: 'product-1',
      sku: 'IMG-ORDER',
      parameters: [{ parameterId: 'param-1', value: 'value-1' }],
    });
    const refreshedProduct = createProductRecord({
      id: 'product-1',
      sku: 'IMG-ORDER',
      images: [
        {
          id: 'product-image-b',
          productId: 'product-1',
          imageFileId: 'image-b',
          order: 0,
          imageFile: { id: 'image-b' },
        },
        {
          id: 'product-image-a',
          productId: 'product-1',
          imageFileId: 'image-a',
          order: 1,
          imageFile: { id: 'image-a' },
        },
      ],
      parameters: [{ parameterId: 'param-1', value: 'value-1' }],
    });

    mocks.repository.getProductById
      .mockResolvedValueOnce(existingProduct)
      .mockResolvedValueOnce(refreshedProduct);
    mocks.repository.updateProduct.mockResolvedValue(existingProduct);

    const formData = new FormData();
    formData.append('imageFileIds', 'image-b');
    formData.append('imageFileIds', 'image-a');

    const result = await productService.updateProduct('product-1', formData);

    expect(mocks.repository.updateProduct).toHaveBeenCalledWith('product-1', {});
    expect(mocks.repository.replaceProductImages).toHaveBeenCalledWith('product-1', [
      'image-b',
      'image-a',
    ]);
    expect(result.images.map((image) => image.imageFile.id)).toEqual(['image-b', 'image-a']);
  });

  it('keeps shared image files in storage when another product still references them', async () => {
    const imageFile: ImageFileRecord = {
      id: 'image-shared',
      filename: 'shared.jpg',
      filepath: '/uploads/products/shared.jpg',
      mimetype: 'image/jpeg',
      size: 100,
    };

    mocks.imageRepository.getImageFileById.mockResolvedValue(imageFile);
    mocks.repository.countProductsByImageFileId.mockResolvedValue(1);

    await productService.unlinkImageFromProduct('product-1', 'image-shared');

    expect(mocks.repository.removeProductImage).toHaveBeenCalledWith('product-1', 'image-shared');
    expect(mocks.deleteFileFromStorage).not.toHaveBeenCalled();
    expect(mocks.imageRepository.deleteImageFile).not.toHaveBeenCalled();
  });

  it('deletes orphaned image files when the removed link was the last reference', async () => {
    const imageFile: ImageFileRecord = {
      id: 'image-last',
      filename: 'last.jpg',
      filepath: '/uploads/products/last.jpg',
      mimetype: 'image/jpeg',
      size: 100,
    };

    mocks.imageRepository.getImageFileById.mockResolvedValue(imageFile);
    mocks.repository.countProductsByImageFileId.mockResolvedValue(0);

    await productService.unlinkImageFromProduct('product-1', 'image-last');

    expect(mocks.deleteFileFromStorage).toHaveBeenCalledWith('/uploads/products/last.jpg');
    expect(mocks.imageRepository.deleteImageFile).toHaveBeenCalledWith('image-last');
  });

  it('duplicates a product by SKU and reloads the duplicated record', async () => {
    const duplicatedRecord = createProductRecord({ id: 'product-copy', sku: 'NEW123' });
    const refreshedCopy = createProductRecord({
      id: 'product-copy',
      sku: 'NEW123',
      name_en: 'Original Product',
    });

    mocks.repository.duplicateProduct.mockResolvedValue(duplicatedRecord);
    mocks.repository.getProductById.mockResolvedValue(refreshedCopy);

    const result = await productService.duplicateProduct('product-1', 'NEW123');

    expect(mocks.repository.duplicateProduct).toHaveBeenCalledWith('product-1', 'NEW123');
    expect(mocks.repository.getProductById).toHaveBeenCalledWith('product-copy');
    expect(result).toEqual(refreshedCopy);
  });

  it('rejects duplication when SKU is blank', async () => {
    await expect(productService.duplicateProduct('product-1', '')).rejects.toThrow(
      'SKU is required'
    );

    expect(mocks.repository.duplicateProduct).not.toHaveBeenCalled();
  });
});
