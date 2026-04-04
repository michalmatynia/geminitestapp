import { describe, expect, it, beforeEach, vi } from 'vitest';

const {
  getShippingGroupRepositoryMock,
  getCategoryRepositoryMock,
  shippingGroupRepositoryMock,
  categoryRepositoryMock,
} = vi.hoisted(() => {
  const shippingGroupRepositoryMock = {
    listShippingGroups: vi.fn(),
    findByName: vi.fn(),
    createShippingGroup: vi.fn(),
  };
  const categoryRepositoryMock = {
    listCategories: vi.fn(),
  };

  return {
    getShippingGroupRepositoryMock: vi.fn(async () => shippingGroupRepositoryMock),
    getCategoryRepositoryMock: vi.fn(async () => categoryRepositoryMock),
    shippingGroupRepositoryMock,
    categoryRepositoryMock,
  };
});

vi.mock('@/features/products/server', () => ({
  getShippingGroupRepository: getShippingGroupRepositoryMock,
  getCategoryRepository: getCategoryRepositoryMock,
}));

import {
  GET_handler,
  POST_handler,
  productShippingGroupCreateSchema,
  querySchema,
} from './handler';

describe('product shipping groups handler module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shippingGroupRepositoryMock.listShippingGroups.mockResolvedValue([]);
    shippingGroupRepositoryMock.findByName.mockResolvedValue(null);
    shippingGroupRepositoryMock.createShippingGroup.mockImplementation(async (data) => ({
      id: 'shipping-group-1',
      ...data,
    }));
    categoryRepositoryMock.listCategories.mockResolvedValue([
      { id: 'category-jewellery', name: 'Jewellery', parentId: null },
      { id: 'category-rings', name: 'Rings', parentId: 'category-jewellery' },
    ]);
  });

  it('exports the supported handlers and schemas', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof POST_handler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
    expect(typeof productShippingGroupCreateSchema.safeParse).toBe('function');
  });

  it('rejects overlapping category auto-assign rules on create', async () => {
    shippingGroupRepositoryMock.listShippingGroups.mockResolvedValue([
      {
        id: 'shipping-group-existing',
        name: 'Jewellery 7 EUR',
        description: null,
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 7,
        autoAssignCategoryIds: ['category-jewellery'],
      },
    ]);

    await expect(
      POST_handler(
        {} as never,
        {
          body: {
            name: 'Rings 5 EUR',
            description: null,
            catalogId: 'catalog-1',
            traderaShippingCondition: 'Buyer pays shipping',
            traderaShippingPriceEur: 5,
            autoAssignCategoryIds: ['category-rings'],
          },
        } as never
      )
    ).rejects.toMatchObject({
      message: 'This shipping group auto-assign rule overlaps with another shipping group in this catalog',
      httpStatus: 409,
    });

    expect(shippingGroupRepositoryMock.createShippingGroup).not.toHaveBeenCalled();
  });

  it('normalizes redundant descendant category rules on create', async () => {
    const response = await POST_handler(
      {} as never,
      {
        body: {
          name: 'Jewellery 7 EUR',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-jewellery', 'category-rings'],
        },
      } as never
    );

    expect(response).toBeInstanceOf(Response);
    expect(shippingGroupRepositoryMock.createShippingGroup).toHaveBeenCalledWith({
      name: 'Jewellery 7 EUR',
      description: null,
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 7,
      autoAssignCategoryIds: ['category-jewellery'],
      autoAssignCurrencyCodes: [],
    });
  });

  it('drops missing category rules on create', async () => {
    const response = await POST_handler(
      {} as never,
      {
        body: {
          name: 'Legacy Shipping Group',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-jewellery', 'category-missing'],
        },
      } as never
    );

    expect(response).toBeInstanceOf(Response);
    expect(shippingGroupRepositoryMock.createShippingGroup).toHaveBeenCalledWith({
      name: 'Legacy Shipping Group',
      description: null,
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 7,
      autoAssignCategoryIds: ['category-jewellery'],
      autoAssignCurrencyCodes: [],
    });
  });
});
