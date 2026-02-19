import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbQueryMock } = vi.hoisted(() => ({
  dbQueryMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/lib/api', () => ({
  dbApi: {
    query: dbQueryMock,
  },
}));

import { executeDatabaseQuery } from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-query-execution';

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
      templateInputs: {},
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
      query: { id: 'abc' },
      querySource: 'input',
      dryRun: false,
      templateInputs: {},
      aiPrompt: 'test',
    });

    expect(result['bundle']).toEqual(
      expect.objectContaining({
        querySource: 'input',
        query: { id: 'abc' },
        provider: 'mongodb',
      })
    );
  });

  it('uses parameter-id fallback when catalog query is empty', async () => {
    dbQueryMock
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [],
          count: 0,
          provider: 'mongodb',
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [{ id: 'param-1', label: 'Color' }],
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
      dryRun: false,
      templateInputs: {
        context: {
          entity: {
            catalogId: '',
            parameters: [{ parameterId: 'param-1' }],
          },
        },
      },
      aiPrompt: 'test',
    });

    expect(dbQueryMock).toHaveBeenCalledTimes(2);
    expect(dbQueryMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'product_parameters',
        query: { id: { $in: ['param-1'] } },
      })
    );
    expect(result['result']).toEqual([{ id: 'param-1', label: 'Color' }]);
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        querySource: 'customTemplate',
        query: { id: { $in: ['param-1'] } },
      })
    );
    const bundle = result['bundle'] as Record<string, unknown>;
    const fallback = bundle['fallback'] as Record<string, unknown> | undefined;
    expect(fallback).toEqual(
      expect.objectContaining({
        used: true,
        reason: 'catalogId_missing',
        by: 'product_parameter_ids',
      })
    );
  });

  it('does not run parameter-id fallback when disabled by strict flow mode', async () => {
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
      dryRun: false,
      templateInputs: {
        context: {
          entity: {
            catalogId: '',
            parameters: [{ parameterId: 'param-1' }],
          },
        },
      },
      aiPrompt: 'test',
      allowParameterDefinitionFallback: false,
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
