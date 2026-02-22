import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  countProducts,
  createProduct,
  getProductById,
  getProducts,
  getProductsWithCount,
  updateProduct,
} from '@/features/products/api/products';
import { api } from '@/shared/lib/api-client';

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('products api client timeouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses extended read timeout for product list request', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    await getProducts({});

    expect(api.get).toHaveBeenCalledWith(
      '/api/products',
      expect.objectContaining({ timeout: 60_000 })
    );
  });

  it('uses extended read timeout for count and paged requests', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ count: 7 })
      .mockResolvedValueOnce({ products: [], total: 0 });

    await countProducts({});
    await getProductsWithCount({});

    expect(api.get).toHaveBeenNthCalledWith(
      1,
      '/api/products/count',
      expect.objectContaining({ timeout: 60_000 })
    );
    expect(api.get).toHaveBeenNthCalledWith(
      2,
      '/api/products/paged',
      expect.objectContaining({ timeout: 60_000 })
    );
  });

  it('uses extended write timeout for create and update requests', async () => {
    const formData = new FormData();
    vi.mocked(api.post).mockResolvedValueOnce({ id: 'created' });
    vi.mocked(api.put).mockResolvedValueOnce({ id: 'updated' });

    await createProduct(formData);
    await updateProduct('product-1', formData);

    expect(api.post).toHaveBeenCalledWith(
      '/api/products',
      formData,
      expect.objectContaining({ timeout: 60_000 })
    );
    expect(api.put).toHaveBeenCalledWith(
      '/api/products/product-1',
      formData,
      expect.objectContaining({ timeout: 60_000 })
    );
  });

  it('uses extended read timeout for single product request', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ id: 'product-1' });

    await getProductById('product-1');

    expect(api.get).toHaveBeenCalledWith(
      '/api/products/product-1',
      expect.objectContaining({ timeout: 60_000 })
    );
  });
});
