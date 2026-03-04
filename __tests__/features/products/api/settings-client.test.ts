import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCategories, getCategoriesFlat, getParameters } from '@/features/products/api/settings';
import { api } from '@/shared/lib/api-client';

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('product settings api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests fresh category trees and flat category lists for settings edits', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await getCategories('catalog-1');
    await getCategoriesFlat('catalog-1');

    expect(api.get).toHaveBeenNthCalledWith(
      1,
      '/api/v2/products/categories/tree',
      expect.objectContaining({
        params: {
          catalogId: 'catalog-1',
          fresh: 1,
        },
        cache: 'no-store',
      })
    );

    expect(api.get).toHaveBeenNthCalledWith(
      2,
      '/api/v2/products/categories',
      expect.objectContaining({
        params: {
          catalogId: 'catalog-1',
          fresh: 1,
        },
        cache: 'no-store',
      })
    );
  });

  it('requests fresh parameter lists so new parameters appear in draft and product forms', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    await getParameters('catalog-1');

    expect(api.get).toHaveBeenCalledWith(
      '/api/v2/products/parameters',
      expect.objectContaining({
        params: {
          catalogId: 'catalog-1',
          fresh: 1,
        },
        cache: 'no-store',
      })
    );
  });
});
