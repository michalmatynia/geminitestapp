import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { deleteCategoryMock, getCategoryRepositoryMock, invalidateAllMock } = vi.hoisted(() => ({
  deleteCategoryMock: vi.fn(),
  getCategoryRepositoryMock: vi.fn(),
  invalidateAllMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  CachedProductService: {
    invalidateAll: (...args: unknown[]) => invalidateAllMock(...args),
  },
  getCategoryRepository: (...args: unknown[]) => getCategoryRepositoryMock(...args),
}));

import { deleteHandler, getHandler, putHandler, productCategoryUpdateSchema } from './handler';

describe('product categories by-id handler module', () => {
  beforeEach(() => {
    deleteCategoryMock.mockReset();
    getCategoryRepositoryMock.mockReset();
    invalidateAllMock.mockReset();

    getCategoryRepositoryMock.mockResolvedValue({
      deleteCategory: deleteCategoryMock,
    });
  });

  it('exports the supported handlers and schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof putHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
    expect(typeof productCategoryUpdateSchema.safeParse).toBe('function');
  });

  it('delegates delete to the repository and invalidates product caches', async () => {
    deleteCategoryMock.mockResolvedValue(undefined);

    const response = await deleteHandler(
      new NextRequest('http://localhost/api/v2/products/categories/category-1'),
      {} as ApiHandlerContext,
      { id: 'category-1' }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(deleteCategoryMock).toHaveBeenCalledWith('category-1');
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
  });
});
