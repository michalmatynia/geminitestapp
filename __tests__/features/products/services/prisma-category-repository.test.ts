import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    $transaction: mocks.transaction,
  },
}));

import { prismaCategoryRepository } from '@/shared/lib/products/services/category-repository/prisma-category-repository';

describe('prismaCategoryRepository.updateCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists parentId null when moving a category to the root', async () => {
    const now = new Date('2026-02-28T00:00:00.000Z');

    const tx = {
      productCategory: {
        findUnique: mocks.findUnique.mockResolvedValue({
          id: 'cat-1',
          catalogId: 'catalog-1',
          parentId: 'parent-1',
        }),
        findMany: mocks.findMany.mockResolvedValue([]),
        update: mocks.update
          .mockResolvedValueOnce({
            id: 'cat-1',
            name: 'Renamed',
            description: null,
            color: '#10b981',
            parentId: null,
            catalogId: 'catalog-1',
            sortIndex: 0,
            createdAt: now,
            updatedAt: now,
          })
          .mockResolvedValue({
            id: 'cat-1',
            name: 'Renamed',
            description: null,
            color: '#10b981',
            parentId: null,
            catalogId: 'catalog-1',
            sortIndex: 0,
            createdAt: now,
            updatedAt: now,
          }),
      },
    };

    mocks.transaction.mockImplementationOnce(async (callback) => await callback(tx as never));

    await prismaCategoryRepository.updateCategory('cat-1', {
      name: 'Renamed',
      parentId: null,
      catalogId: 'catalog-1',
    });

    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'cat-1' },
      data: expect.objectContaining({
        name: 'Renamed',
        parentId: null,
        catalogId: 'catalog-1',
      }),
    });
  });
});
