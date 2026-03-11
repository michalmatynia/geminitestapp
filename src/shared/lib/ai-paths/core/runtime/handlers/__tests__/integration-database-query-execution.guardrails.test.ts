import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbQueryMock } = vi.hoisted(() => ({
  dbQueryMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  dbApi: {
    query: dbQueryMock,
  },
}));

import { executeDatabaseQuery } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution';

describe('executeDatabaseQuery guardrail metadata', () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  it('preserves querySource in dry-run bundle', async () => {
    const result = await executeDatabaseQuery({
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      queryConfig: {
        provider: 'auto',
        collection: 'products',
        mode: 'custom',
        preset: 'by_id',
        field: '_id',
        idType: 'string',
        queryTemplate: '{"id":"{{value}}"}',
        limit: 20,
        sort: '',
        projection: '',
        single: false,
      },
      query: { id: 'dry-id' },
      querySource: 'customTemplate',
      dryRun: true,
      aiPrompt: 'test',
    });

    expect(result['bundle']).toEqual(
      expect.objectContaining({
        querySource: 'customTemplate',
        query: { id: 'dry-id' },
      })
    );
  });

  it('preserves querySource in real execution bundle', async () => {
    dbQueryMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [{ id: 'abc' }],
        count: 1,
        requestedProvider: 'auto',
        resolvedProvider: 'mongodb',
        provider: 'mongodb',
        fallback: { provider: 'mongodb' },
      },
    });

    const result = await executeDatabaseQuery({
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      queryConfig: {
        provider: 'auto',
        collection: 'products',
        mode: 'custom',
        preset: 'by_id',
        field: '_id',
        idType: 'string',
        queryTemplate: '{"id":"{{value}}"}',
        limit: 20,
        sort: '',
        projection: '',
        single: false,
      },
      query: { id: 'abc' },
      querySource: 'input',
      dryRun: false,
      aiPrompt: 'test',
    });

    expect(result['bundle']).toEqual(
      expect.objectContaining({
        querySource: 'input',
        query: { id: 'abc' },
        resolvedProvider: 'mongodb',
      })
    );
    const bundle = result['bundle'] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(bundle, 'provider')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(bundle, 'providerFallback')).toBe(false);
  });

  it('does not derive resolvedProvider from legacy provider alias in query response metadata', async () => {
    dbQueryMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [{ id: 'xyz' }],
        count: 1,
        provider: 'mongodb',
      },
    });

    const result = await executeDatabaseQuery({
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      queryConfig: {
        provider: 'auto',
        collection: 'products',
        mode: 'custom',
        preset: 'by_id',
        field: '_id',
        idType: 'string',
        queryTemplate: '{"id":"{{value}}"}',
        limit: 20,
        sort: '',
        projection: '',
        single: false,
      },
      query: { id: 'xyz' },
      querySource: 'input',
      dryRun: false,
      aiPrompt: 'test',
    });

    const bundle = result['bundle'] as Record<string, unknown>;
    expect(bundle['requestedProvider']).toBe('auto');
    expect(bundle['resolvedProvider']).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(bundle, 'provider')).toBe(false);
  });

  it('performs parameter-id fallback query when catalog lookup resolves no parameter definitions', async () => {
    dbQueryMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [],
        count: 0,
        provider: 'mongodb',
      },
    });
    dbQueryMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [{ id: 'param-1', name_en: 'Material' }],
        count: 1,
        provider: 'mongodb',
      },
    });

    const result = await executeDatabaseQuery({
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      queryConfig: {
        provider: 'auto',
        collection: 'product_parameters',
        mode: 'custom',
        preset: 'by_id',
        field: 'id',
        idType: 'string',
        queryTemplate: '{"catalogId":"{{context.entity.catalogId}}"}',
        limit: 20,
        sort: '',
        projection: '',
        single: false,
      },
      query: { catalogId: '' },
      querySource: 'customTemplate',
      templateInputs: {
        context: {
          entity: {
            parameters: [{ parameterId: 'param-1' }],
          },
        },
      },
      dryRun: false,
      aiPrompt: 'test',
    });

    expect(dbQueryMock).toHaveBeenCalledTimes(2);
    expect(dbQueryMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        filter: {
          id: {
            $in: ['param-1'],
          },
        },
      })
    );
    expect(result['result']).toEqual([{ id: 'param-1', name_en: 'Material' }]);
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        querySource: 'customTemplate',
        query: { catalogId: '' },
        count: 1,
        fallback: expect.objectContaining({
          strategy: 'parameterId',
          count: 1,
          parameterIds: ['param-1'],
        }),
      })
    );
  });

  it('does not perform parameter-id fallback query when no product parameter ids are available', async () => {
    dbQueryMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [],
        count: 0,
        provider: 'mongodb',
      },
    });

    const result = await executeDatabaseQuery({
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      queryConfig: {
        provider: 'auto',
        collection: 'product_parameters',
        mode: 'custom',
        preset: 'by_id',
        field: 'id',
        idType: 'string',
        queryTemplate: '{"catalogId":"{{context.entity.catalogId}}"}',
        limit: 20,
        sort: '',
        projection: '',
        single: false,
      },
      query: { catalogId: '' },
      querySource: 'customTemplate',
      templateInputs: {
        context: {
          entity: {
            parameters: [],
          },
        },
      },
      dryRun: false,
      aiPrompt: 'test',
    });

    expect(dbQueryMock).toHaveBeenCalledTimes(1);
    expect(result['result']).toEqual([]);
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        querySource: 'customTemplate',
        query: { catalogId: '' },
        count: 0,
      })
    );
    const bundle = result['bundle'] as Record<string, unknown>;
    expect(bundle['fallback']).toBeUndefined();
  });
});
