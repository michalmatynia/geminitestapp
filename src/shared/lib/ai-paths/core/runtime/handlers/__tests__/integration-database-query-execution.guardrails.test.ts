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

  it('does not perform parameter-id fallback query', async () => {
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
