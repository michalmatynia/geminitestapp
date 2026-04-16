import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getTitleTermRepositoryMock,
  listTitleTermsMock,
  findByNameMock,
  createTitleTermMock,
} = vi.hoisted(() => ({
  getTitleTermRepositoryMock: vi.fn(),
  listTitleTermsMock: vi.fn(),
  findByNameMock: vi.fn(),
  createTitleTermMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getTitleTermRepository: (...args: unknown[]) => getTitleTermRepositoryMock(...args),
}));

import { GET_handler, POST_handler, querySchema } from './handler';

describe('products/title-terms handler', () => {
  beforeEach(() => {
    getTitleTermRepositoryMock.mockReset();
    listTitleTermsMock.mockReset();
    findByNameMock.mockReset();
    createTitleTermMock.mockReset();

    getTitleTermRepositoryMock.mockResolvedValue({
      listTitleTerms: listTitleTermsMock,
      findByName: findByNameMock,
      createTitleTerm: createTitleTermMock,
    });
  });

  it('exports the query schema', () => {
    expect(typeof querySchema.safeParse).toBe('function');
  });

  it('lists title terms with normalized query values', async () => {
    listTitleTermsMock.mockResolvedValue([
      {
        id: 'term-1',
        name: 'Metal',
        description: null,
        catalogId: 'catalog-1',
        type: 'material',
        name_en: 'Metal',
        name_pl: 'Metal',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/products/title-terms?search=%20metal%20'),
      {
        query: {
          catalogId: 'catalog-1',
          type: 'material',
        },
      } as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    expect(listTitleTermsMock).toHaveBeenCalledWith({
      catalogId: 'catalog-1',
      type: 'material',
      search: 'metal',
    });
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'term-1',
        type: 'material',
        name_en: 'Metal',
      }),
    ]);
  });

  it('creates a title term and defaults missing polish translation to null', async () => {
    findByNameMock.mockResolvedValue(null);
    createTitleTermMock.mockResolvedValue({
      id: 'term-2',
      name: '4 cm',
      description: null,
      catalogId: 'catalog-1',
      type: 'size',
      name_en: '4 cm',
      name_pl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/v2/products/title-terms'),
      {
        body: {
          catalogId: 'catalog-1',
          type: 'size',
          name_en: '4 cm',
        },
      } as ApiHandlerContext
    );

    expect(response.status).toBe(201);
    expect(findByNameMock).toHaveBeenCalledWith('catalog-1', 'size', '4 cm');
    expect(createTitleTermMock).toHaveBeenCalledWith({
      catalogId: 'catalog-1',
      type: 'size',
      name_en: '4 cm',
      name_pl: null,
    });
  });

  it('rejects duplicate title terms within the same catalog and type', async () => {
    findByNameMock.mockResolvedValue({
      id: 'term-existing',
      catalogId: 'catalog-1',
      type: 'size',
      name: '4 cm',
      description: null,
      name_en: '4 cm',
      name_pl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    await expect(
      POST_handler(new NextRequest('http://localhost/api/v2/products/title-terms'), {
        body: {
          catalogId: 'catalog-1',
          type: 'size',
          name_en: '4 cm',
        },
      } as ApiHandlerContext)
    ).rejects.toMatchObject({
      httpStatus: 409,
      code: 'CONFLICT',
    });
    expect(createTitleTermMock).not.toHaveBeenCalled();
  });
});
