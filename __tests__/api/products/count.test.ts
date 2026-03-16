import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getProductCount: vi.fn(),
}));

vi.mock('@/features/products/performance', () => ({
  CachedProductService: {
    getProductCount: mocks.getProductCount,
  },
}));

import { GET } from '@/app/api/v2/products/count/route-handler';

describe('Products Count API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the total count from CachedProductService', async () => {
    mocks.getProductCount.mockResolvedValue(10);

    const res = await GET(new NextRequest('http://localhost/api/products/count'));
    const data = (await res.json()) as { count: number };

    expect(res.status).toBe(200);
    expect(data.count).toBe(10);
    expect(mocks.getProductCount).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });
  });
});
