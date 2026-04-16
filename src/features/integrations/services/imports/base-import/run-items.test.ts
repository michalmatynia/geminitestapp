import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchBaseProductByIdMock: vi.fn(),
  fetchBaseProductIdsMock: vi.fn(),
  checkBaseSkuExistsMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/imports/base-client', () => ({
  fetchBaseProductById: (...args: unknown[]) => mocks.fetchBaseProductByIdMock(...args),
  fetchBaseProductIds: (...args: unknown[]) => mocks.fetchBaseProductIdsMock(...args),
  checkBaseSkuExists: (...args: unknown[]) => mocks.checkBaseSkuExistsMock(...args),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: (...args: unknown[]) => mocks.getProductRepositoryMock(...args),
}));

import { resolveRunItems } from './run-items';

describe('resolveRunItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProducts: vi.fn().mockResolvedValue([]),
    });
  });

  it('resolves an exact Base Product ID target without applying unique-only filtering', async () => {
    mocks.fetchBaseProductByIdMock.mockResolvedValue({
      product_id: '9568407',
      id: '9568407',
    });

    const result = await resolveRunItems({
      token: 'token-1',
      inventoryId: 'inventory-1',
      uniqueOnly: true,
      directTarget: {
        type: 'base_product_id',
        value: '9568407',
      },
    });

    expect(result).toEqual({
      ids: ['9568407'],
      resolutionError: null,
    });
    expect(mocks.getProductRepositoryMock).not.toHaveBeenCalled();
  });

  it('resolves an exact SKU target to a Base product id', async () => {
    mocks.checkBaseSkuExistsMock.mockResolvedValue({
      exists: true,
      productId: '9568407',
    });

    const result = await resolveRunItems({
      token: 'token-1',
      inventoryId: 'inventory-1',
      uniqueOnly: true,
      directTarget: {
        type: 'sku',
        value: 'FOASW022',
      },
    });

    expect(result).toEqual({
      ids: ['9568407'],
      resolutionError: null,
    });
  });

  it('returns a clear resolution error when the exact SKU target is missing', async () => {
    mocks.checkBaseSkuExistsMock.mockResolvedValue({
      exists: false,
    });

    const result = await resolveRunItems({
      token: 'token-1',
      inventoryId: 'inventory-1',
      uniqueOnly: false,
      directTarget: {
        type: 'sku',
        value: 'FOASW022',
      },
    });

    expect(result).toEqual({
      ids: [],
      resolutionError: 'SKU FOASW022 was not found in the selected inventory.',
    });
  });
});
