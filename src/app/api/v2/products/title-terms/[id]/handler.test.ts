import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getTitleTermRepositoryMock,
  getTitleTermByIdMock,
  findByNameMock,
  updateTitleTermMock,
  deleteTitleTermMock,
} = vi.hoisted(() => ({
  getTitleTermRepositoryMock: vi.fn(),
  getTitleTermByIdMock: vi.fn(),
  findByNameMock: vi.fn(),
  updateTitleTermMock: vi.fn(),
  deleteTitleTermMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getTitleTermRepository: (...args: unknown[]) => getTitleTermRepositoryMock(...args),
}));

import { DELETE_handler, PUT_handler, titleTermUpdateSchema } from './handler';

describe('products/title-terms/[id] handler', () => {
  beforeEach(() => {
    getTitleTermRepositoryMock.mockReset();
    getTitleTermByIdMock.mockReset();
    findByNameMock.mockReset();
    updateTitleTermMock.mockReset();
    deleteTitleTermMock.mockReset();

    getTitleTermRepositoryMock.mockResolvedValue({
      getTitleTermById: getTitleTermByIdMock,
      findByName: findByNameMock,
      updateTitleTerm: updateTitleTermMock,
      deleteTitleTerm: deleteTitleTermMock,
    });
  });

  it('exports the update schema', () => {
    expect(typeof titleTermUpdateSchema.safeParse).toBe('function');
  });

  it('updates a title term using current catalog and type for duplicate checks', async () => {
    getTitleTermByIdMock.mockResolvedValue({
      id: 'term-1',
      catalogId: 'catalog-1',
      type: 'material',
      name: 'Metal',
      description: null,
      name_en: 'Metal',
      name_pl: 'Metal',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    findByNameMock.mockResolvedValue(null);
    updateTitleTermMock.mockResolvedValue({
      id: 'term-1',
      catalogId: 'catalog-1',
      type: 'material',
      name: 'Enamel Metal',
      description: null,
      name_en: 'Enamel Metal',
      name_pl: 'Metal emaliowany',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    const response = await PUT_handler(
      new NextRequest('http://localhost/api/v2/products/title-terms/term-1'),
      {
        body: {
          name_en: 'Enamel Metal',
          name_pl: 'Metal emaliowany',
        },
      } as ApiHandlerContext,
      { id: 'term-1' }
    );

    expect(response.status).toBe(200);
    expect(findByNameMock).toHaveBeenCalledWith('catalog-1', 'material', 'Enamel Metal');
    expect(updateTitleTermMock).toHaveBeenCalledWith('term-1', {
      name_en: 'Enamel Metal',
      name_pl: 'Metal emaliowany',
    });
  });

  it('rejects updates when the term does not exist', async () => {
    getTitleTermByIdMock.mockResolvedValue(null);

    await expect(
      PUT_handler(
        new NextRequest('http://localhost/api/v2/products/title-terms/missing'),
        {
          body: {
            name_en: 'Enamel Metal',
          },
        } as ApiHandlerContext,
        { id: 'missing' }
      )
    ).rejects.toMatchObject({
      httpStatus: 404,
      code: 'NOT_FOUND',
    });
  });

  it('deletes a title term by id', async () => {
    deleteTitleTermMock.mockResolvedValue(undefined);

    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/v2/products/title-terms/term-1'),
      {} as ApiHandlerContext,
      { id: 'term-1' }
    );

    expect(response.status).toBe(200);
    expect(deleteTitleTermMock).toHaveBeenCalledWith('term-1');
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});
