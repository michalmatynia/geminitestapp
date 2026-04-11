import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getParameterRepositoryMock,
  getParameterByIdMock,
  findByNameMock,
  updateParameterMock,
  deleteParameterMock,
  invalidateAllMock,
  getMongoDbMock,
} = vi.hoisted(() => ({
  getParameterRepositoryMock: vi.fn(),
  getParameterByIdMock: vi.fn(),
  findByNameMock: vi.fn(),
  updateParameterMock: vi.fn(),
  deleteParameterMock: vi.fn(),
  invalidateAllMock: vi.fn(),
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getParameterRepository: (...args: unknown[]) => getParameterRepositoryMock(...args),
  CachedProductService: {
    invalidateAll: (...args: unknown[]) => invalidateAllMock(...args),
  },
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
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
    getMongoDbMock.mockReset();

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
      linkedTitleTermType: 'material',
    });
    findByNameMock.mockResolvedValue(null);
    updateParameterMock.mockResolvedValue({
      id: 'param-1',
      catalogId: 'catalog-1',
      selectorType: 'text',
      optionLabels: [],
      name_en: 'Materiał updated',
      name_pl: null,
      name_de: null,
      linkedTitleTermType: 'material',
    });

    const response = await PUT_handler(
      new NextRequest('http://localhost/api/v2/products/parameters/param-1'),
      {
        body: {
          name_en: 'Materiał updated',
          linkedTitleTermType: 'theme',
        },
      } as ApiHandlerContext,
      { id: 'param-1' }
    );

    expect(response.status).toBe(200);
    expect(updateParameterMock).toHaveBeenCalledWith('param-1', {
      name_en: 'Materiał updated',
      linkedTitleTermType: 'theme',
    });
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
  });

  it('invalidates server-side products cache after parameter deletion', async () => {
    getParameterByIdMock.mockResolvedValue({
      id: 'canonical-param-id',
      catalogId: 'catalog-1',
      selectorType: 'text',
      optionLabels: [],
      name_en: 'Material',
      name_pl: null,
      name_de: null,
      linkedTitleTermType: 'material',
    });
    deleteParameterMock.mockResolvedValue(undefined);
    const productsUpdateManyMock = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    const productDraftsUpdateManyMock = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    getMongoDbMock.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'products') return { updateMany: productsUpdateManyMock };
        if (name === 'product_drafts') return { updateMany: productDraftsUpdateManyMock };
        throw new Error(`Unexpected collection: ${name}`);
      },
    });

    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/v2/products/parameters/param-legacy-id'),
      {} as ApiHandlerContext,
      { id: 'param-legacy-id' }
    );

    expect(response.status).toBe(200);
    expect(deleteParameterMock).toHaveBeenCalledWith('canonical-param-id');
    expect(productsUpdateManyMock).toHaveBeenCalledWith(
      { 'parameters.parameterId': 'canonical-param-id' },
      {
        $pull: {
          parameters: {
            parameterId: 'canonical-param-id',
          },
        },
      }
    );
    expect(productDraftsUpdateManyMock).toHaveBeenCalledWith(
      { 'parameters.parameterId': 'canonical-param-id' },
      {
        $pull: {
          parameters: {
            parameterId: 'canonical-param-id',
          },
        },
      }
    );
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
  });

  it('throws not found for missing parameter on deletion', async () => {
    getParameterByIdMock.mockResolvedValue(null);
    await expect(
      DELETE_handler(
        new NextRequest('http://localhost/api/v2/products/parameters/missing-id'),
        {} as ApiHandlerContext,
        { id: 'missing-id' }
      )
    ).rejects.toThrow('Parameter not found');

    expect(deleteParameterMock).not.toHaveBeenCalled();
  });
});
