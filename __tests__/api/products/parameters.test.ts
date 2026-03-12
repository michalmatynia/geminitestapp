import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listParameters: vi.fn(),
  findByName: vi.fn(),
  createParameter: vi.fn(),
}));

vi.mock('@/features/products/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/products/server')>();
  return {
    ...actual,
    CachedProductService: {
      listParameters: mocks.listParameters,
      invalidateAll: vi.fn(),
    },
    getParameterRepository: vi.fn().mockResolvedValue({
      listParameters: mocks.listParameters,
      findByName: mocks.findByName,
      createParameter: mocks.createParameter,
    }),
  };
});

import { GET } from '@/app/api/v2/products/parameters/route';

describe('Product Parameters API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parameters for a given catalogId', async () => {
    mocks.listParameters.mockResolvedValue([
      {
        id: 'param-1',
        name: 'Param 1',
        name_en: 'Param 1',
        catalogId: 'cat1',
      },
    ]);

    const res = await GET(
      new NextRequest('http://localhost/api/products/parameters?catalogId=cat1')
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(mocks.listParameters).toHaveBeenCalledWith({ catalogId: 'cat1' });
  });
});
