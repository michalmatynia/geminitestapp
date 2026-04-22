import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getShippingGroupRepositoryMock,
  getCategoryRepositoryMock,
  shippingGroupRepositoryMock,
  categoryRepositoryMock,
} = vi.hoisted(() => {
  const shippingGroupRepositoryMock = {
    getShippingGroupById: vi.fn(),
    findByName: vi.fn(),
    updateShippingGroup: vi.fn(),
    listShippingGroups: vi.fn(),
    deleteShippingGroup: vi.fn(),
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

import { deleteHandler, putHandler, productShippingGroupUpdateSchema } from './handler';

describe('product shipping groups by-id handler module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shippingGroupRepositoryMock.getShippingGroupById.mockResolvedValue({
      id: 'shipping-group-2',
      name: 'Rings 5 EUR',
      description: null,
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 5,
      autoAssignCategoryIds: [],
    });
    shippingGroupRepositoryMock.findByName.mockResolvedValue(null);
    shippingGroupRepositoryMock.updateShippingGroup.mockImplementation(async (id, data) => ({
      id,
      name: 'Rings 5 EUR',
      description: null,
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 5,
      autoAssignCategoryIds: [],
      ...data,
    }));
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
      { id: 'category-jewellery', name: 'Jewellery', parentId: null },
      { id: 'category-rings', name: 'Rings', parentId: 'category-jewellery' },
    ]);
  });

  it('exports the supported handlers and schema', () => {
    expect(typeof putHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
    expect(typeof productShippingGroupUpdateSchema.safeParse).toBe('function');
  });

  it('rejects overlapping category auto-assign rules on update when rule scope changes', async () => {
    await expect(
      putHandler(
        {} as never,
        {
          body: {
            autoAssignCategoryIds: ['category-rings'],
          },
        } as never,
        { id: 'shipping-group-2' }
      )
    ).rejects.toMatchObject({
      message: 'This shipping group auto-assign rule overlaps with another shipping group in this catalog',
      httpStatus: 409,
    });

    expect(shippingGroupRepositoryMock.updateShippingGroup).not.toHaveBeenCalled();
  });

  it('allows unrelated updates even if an older overlapping rule exists', async () => {
    shippingGroupRepositoryMock.getShippingGroupById.mockResolvedValue({
      id: 'shipping-group-2',
      name: 'Rings 5 EUR',
      description: null,
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 5,
      autoAssignCategoryIds: ['category-rings'],
    });

    const response = await putHandler(
      {} as never,
      {
        body: {
          traderaShippingPriceEur: 6,
        },
      } as never,
      { id: 'shipping-group-2' }
    );

    expect(response).toBeInstanceOf(Response);
    expect(shippingGroupRepositoryMock.updateShippingGroup).toHaveBeenCalledWith(
      'shipping-group-2',
      { traderaShippingPriceEur: 6 }
    );
    expect(categoryRepositoryMock.listCategories).not.toHaveBeenCalled();
  });

  it('normalizes redundant descendant category rules on update', async () => {
    shippingGroupRepositoryMock.listShippingGroups.mockResolvedValue([]);

    const response = await putHandler(
      {} as never,
      {
        body: {
          autoAssignCategoryIds: ['category-jewellery', 'category-rings'],
        },
      } as never,
      { id: 'shipping-group-2' }
    );

    expect(response).toBeInstanceOf(Response);
    expect(shippingGroupRepositoryMock.updateShippingGroup).toHaveBeenCalledWith(
      'shipping-group-2',
      {
        autoAssignCategoryIds: ['category-jewellery'],
      }
    );
  });

  it('drops missing category rules on update', async () => {
    shippingGroupRepositoryMock.listShippingGroups.mockResolvedValue([]);

    const response = await putHandler(
      {} as never,
      {
        body: {
          autoAssignCategoryIds: ['category-jewellery', 'category-missing'],
        },
      } as never,
      { id: 'shipping-group-2' }
    );

    expect(response).toBeInstanceOf(Response);
    expect(shippingGroupRepositoryMock.updateShippingGroup).toHaveBeenCalledWith(
      'shipping-group-2',
      {
        autoAssignCategoryIds: ['category-jewellery'],
      }
    );
  });

  it('deletes a shipping group by id', async () => {
    const response = await deleteHandler({} as never, {} as never, {
      id: 'shipping-group-2',
    });

    expect(response).toBeInstanceOf(Response);
    expect(shippingGroupRepositoryMock.deleteShippingGroup).toHaveBeenCalledWith(
      'shipping-group-2'
    );
  });
});
