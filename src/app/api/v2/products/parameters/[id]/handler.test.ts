import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  getParameterRepositoryMock,
  getParameterByIdMock,
  findByNameMock,
  updateParameterMock,
  deleteParameterMock,
  invalidateAllMock,
} = vi.hoisted(() => ({
  getParameterRepositoryMock: vi.fn(),
  getParameterByIdMock: vi.fn(),
  findByNameMock: vi.fn(),
  updateParameterMock: vi.fn(),
  deleteParameterMock: vi.fn(),
  invalidateAllMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getParameterRepository: (...args: unknown[]) => getParameterRepositoryMock(...args),
}));

vi.mock('@/features/products/performance/cached-service', () => ({
  CachedProductService: {
    invalidateAll: (...args: unknown[]) => invalidateAllMock(...args),
  },
}));

import { DELETE_handler, PUT_handler } from './handler';

describe('products/parameters/[id] handler', () => {
  beforeEach(() => {
    getParameterRepositoryMock.mockReset();
    getParameterByIdMock.mockReset();
    findByNameMock.mockReset();
    updateParameterMock.mockReset();
    deleteParameterMock.mockReset();
    invalidateAllMock.mockReset();

    getParameterRepositoryMock.mockResolvedValue({
      getParameterById: getParameterByIdMock,
      findByName: findByNameMock,
      updateParameter: updateParameterMock,
      deleteParameter: deleteParameterMock,
    });
  });

  it('invalidates server-side products cache after parameter update', async () => {
    getParameterByIdMock.mockResolvedValue({
      id: 'param-1',
      catalogId: 'catalog-1',
      selectorType: 'text',
      optionLabels: [],
      name_en: 'Material',
      name_pl: null,
      name_de: null,
    });
    findByNameMock.mockResolvedValue(null);
    updateParameterMock.mockResolvedValue({
      id: 'param-1',
      catalogId: 'catalog-1',
      selectorType: 'text',
      optionLabels: [],
      name_en: 'Material updated',
      name_pl: null,
      name_de: null,
    });

    const response = await PUT_handler(
      new NextRequest('http://localhost/api/v2/products/parameters/param-1'),
      {
        body: {
          name_en: 'Material updated',
        },
      } as ApiHandlerContext,
      { id: 'param-1' }
    );

    expect(response.status).toBe(200);
    expect(updateParameterMock).toHaveBeenCalledWith('param-1', { name_en: 'Material updated' });
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
  });

  it('invalidates server-side products cache after parameter deletion', async () => {
    deleteParameterMock.mockResolvedValue(undefined);

    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/v2/products/parameters/param-1'),
      {} as ApiHandlerContext,
      { id: 'param-1' }
    );

    expect(response.status).toBe(200);
    expect(deleteParameterMock).toHaveBeenCalledWith('param-1');
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
  });
});
