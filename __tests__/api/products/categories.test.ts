import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCategoryTree: vi.fn(),
}));

vi.mock('@/features/products/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/products/server')>();
  return {
    ...actual,
    CachedProductService: {
      getCategoryTree: mocks.getCategoryTree,
    },
    getProductDataProvider: vi.fn().mockResolvedValue('mongodb'),
    getCategoryRepository: vi.fn().mockResolvedValue({
      getCategoryTree: mocks.getCategoryTree,
    }),
  };
});

import { GET as GET_TREE } from '@/app/api/v2/products/categories/tree/route';

describe('Product Categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns categories as a tree', async () => {
    mocks.getCategoryTree.mockResolvedValue([
      {
        id: '1',
        name: 'Parent',
        catalogId: 'cat1',
        children: [{ id: '2', name: 'Child', catalogId: 'cat1', children: [] }],
      },
    ]);

    const res = await GET_TREE(
      new NextRequest('http://localhost/api/products/categories/tree?catalogId=cat1')
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('1');
    expect(data[0].children).toHaveLength(1);
    expect(mocks.getCategoryTree).toHaveBeenCalledWith('cat1');
  });
});
