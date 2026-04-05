import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const {
  getParameterRepositoryMock,
  listParametersMock,
  findByNameMock,
  createParameterMock,
  listParametersCachedMock,
  invalidateAllMock,
} = vi.hoisted(() => ({
  getParameterRepositoryMock: vi.fn(),
  listParametersMock: vi.fn(),
  findByNameMock: vi.fn(),
  createParameterMock: vi.fn(),
  listParametersCachedMock: vi.fn(),
  invalidateAllMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getParameterRepository: (...args: unknown[]) => getParameterRepositoryMock(...args),
  CachedProductService: {
    listParameters: (...args: unknown[]) => listParametersCachedMock(...args),
    invalidateAll: (...args: unknown[]) => invalidateAllMock(...args),
  },
}));

import { GET_handler, POST_handler } from './handler';

describe('products/parameters handler', () => {
  beforeEach(() => {
    getParameterRepositoryMock.mockReset();
    listParametersMock.mockReset();
    findByNameMock.mockReset();
    createParameterMock.mockReset();
    listParametersCachedMock.mockReset();
    invalidateAllMock.mockReset();

    getParameterRepositoryMock.mockResolvedValue({
      listParameters: listParametersMock,
      findByName: findByNameMock,
      createParameter: createParameterMock,
    });
  });

  it('uses cached parameter service by default', async () => {
    listParametersCachedMock.mockResolvedValue([{ id: 'param-1', catalogId: 'catalog-1' }]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/products/parameters?catalogId=catalog-1'),
      {
        query: { catalogId: 'catalog-1' },
      } as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    expect(listParametersCachedMock).toHaveBeenCalledWith({ catalogId: 'catalog-1' });
    expect(getParameterRepositoryMock).not.toHaveBeenCalled();
  });

  it('bypasses cached parameter service when fresh=1 is provided', async () => {
    listParametersMock.mockResolvedValue([{ id: 'param-1', catalogId: 'catalog-1' }]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/products/parameters?catalogId=catalog-1&fresh=1'),
      {
        query: { catalogId: 'catalog-1' },
      } as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    expect(getParameterRepositoryMock).toHaveBeenCalledTimes(1);
    expect(listParametersMock).toHaveBeenCalledWith({ catalogId: 'catalog-1' });
    expect(listParametersCachedMock).not.toHaveBeenCalled();
  });

  it('invalidates server-side products cache after parameter creation', async () => {
    findByNameMock.mockResolvedValue(null);
    createParameterMock.mockResolvedValue({
      id: 'param-2',
      catalogId: 'catalog-1',
      name_en: 'Material',
      selectorType: 'text',
      optionLabels: [],
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/v2/products/parameters'),
      {
        body: {
          name_en: 'Material',
          catalogId: 'catalog-1',
          selectorType: 'text',
          optionLabels: [],
        },
      } as ApiHandlerContext
    );

    expect(response.status).toBe(201);
    expect(createParameterMock).toHaveBeenCalled();
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
  });
});
