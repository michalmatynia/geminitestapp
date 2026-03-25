/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createProduct: vi.fn(),
  getProductRepository: vi.fn(),
  validateProductCreate: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: mocks.getProductRepository,
}));

vi.mock('@/shared/lib/products/validations', () => ({
  validateProductCreate: mocks.validateProductCreate,
}));

import { createMockProduct } from './productUtils';

describe('products productUtils', () => {
  beforeEach(() => {
    mocks.createProduct.mockReset();
    mocks.getProductRepository.mockReset().mockResolvedValue({
      createProduct: mocks.createProduct,
    });
    mocks.validateProductCreate.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T21:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('builds default mock product data, validates it, and creates the product', async () => {
    mocks.validateProductCreate.mockResolvedValueOnce({
      success: true,
      data: { sku: 'validated-sku', price: 250 },
    });
    mocks.createProduct.mockResolvedValueOnce({
      id: 'product-1',
      sku: 'validated-sku',
      price: 250,
    });

    const product = await createMockProduct({
      name_en: ' Custom EN ',
      price: '250',
      stock: 5,
      weight: 80,
      length: 30,
    });

    expect(mocks.validateProductCreate).toHaveBeenCalledWith({
      name_en: ' Custom EN ',
      name_pl: 'Mock Product (PL)',
      name_de: 'Mock Product (DE)',
      description_en: 'This is a mock product description (EN).',
      description_pl: 'This is a mock product description (PL).',
      description_de: 'This is a mock product description (DE).',
      price: 250,
      sku: 'MOCK-SKU-1774472400000-0.123456789',
      stock: 5,
      supplierName: 'Mock Supplier',
      supplierLink: 'https://mock.supplier.com',
      priceComment: 'Mock price comment',
      sizeLength: 10,
      sizeWidth: 10,
      weight: 80,
      length: 30,
    });
    expect(mocks.createProduct).toHaveBeenCalledWith({
      sku: 'validated-sku',
      price: 250,
    });
    expect(product).toEqual({
      id: 'product-1',
      sku: 'validated-sku',
      price: 250,
    });
  });

  it('throws a validation error when the generated mock payload is invalid', async () => {
    mocks.validateProductCreate.mockResolvedValueOnce({
      success: false,
      errors: [{ field: 'price', message: 'Price is invalid' }],
    });

    await expect(createMockProduct({ price: 'not-a-number' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message:
        'Mock product validation failed: [{"field":"price","message":"Price is invalid"}]',
      meta: {
        errors: [{ field: 'price', message: 'Price is invalid' }],
      },
    });
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });
});
