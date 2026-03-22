import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbActionMock } = vi.hoisted(() => ({
  dbActionMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  dbApi: {
    action: dbActionMock,
  },
}));

import { handleDatabaseMongoReadAction } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-read-action';

describe('handleDatabaseMongoReadAction', () => {
  beforeEach(() => {
    dbActionMock.mockReset();
  });

  it('rejects distinct reads without a distinct field and invalid aggregate pipelines', async () => {
    const missingFieldToast = vi.fn();
    const missingFieldResult = await handleDatabaseMongoReadAction({
      action: 'distinct',
      collection: 'products',
      filter: {},
      projection: undefined,
      sort: undefined,
      limit: undefined,
      idType: undefined,
      distinctField: undefined,
      queryPayload: {},
      queryConfig: {} as never,
      dryRun: false,
      templateInputs: {},
      parseJsonTemplate: vi.fn(),
      toast: missingFieldToast,
      aiPrompt: 'mongo prompt',
    });

    expect(missingFieldToast).toHaveBeenCalledWith('Distinct requires a field name.', {
      variant: 'error',
    });
    expect(missingFieldResult).toEqual({
      result: null,
      bundle: { error: 'Missing distinct field' },
      aiPrompt: 'mongo prompt',
    });

    const invalidPipelineToast = vi.fn();
    const invalidPipelineResult = await handleDatabaseMongoReadAction({
      action: 'aggregate',
      collection: 'products',
      filter: {},
      projection: undefined,
      sort: undefined,
      limit: undefined,
      idType: undefined,
      distinctField: undefined,
      queryPayload: {},
      queryConfig: {
        queryTemplate: '[{"$match":{"id":"{{value}}"}}]',
      } as never,
      dryRun: false,
      templateInputs: {},
      parseJsonTemplate: vi.fn(() => ({ nope: true })),
      toast: invalidPipelineToast,
      aiPrompt: 'mongo prompt',
    });

    expect(invalidPipelineToast).toHaveBeenCalledWith(
      'Aggregation pipeline must be a JSON array.',
      { variant: 'error' }
    );
    expect(invalidPipelineResult).toEqual({
      result: null,
      bundle: { error: 'Invalid pipeline' },
      aiPrompt: 'mongo prompt',
    });
  });

  it('supports aggregate dry runs and aggregate execution results', async () => {
    const dryRunResult = await handleDatabaseMongoReadAction({
      action: 'aggregate',
      collection: 'products',
      filter: {},
      projection: undefined,
      sort: undefined,
      limit: undefined,
      idType: undefined,
      distinctField: undefined,
      queryPayload: {},
      queryConfig: {
        queryTemplate: '[{"$match":{"status":"draft"}}]',
      } as never,
      dryRun: true,
      templateInputs: {},
      parseJsonTemplate: vi.fn(() => [{ $match: { status: 'draft' } }]),
      toast: vi.fn(),
      aiPrompt: 'mongo prompt',
    });

    expect(dryRunResult).toEqual({
      result: [{ $match: { status: 'draft' } }],
      bundle: {
        dryRun: true,
        action: 'aggregate',
        collection: 'products',
        pipeline: [{ $match: { status: 'draft' } }],
      },
      aiPrompt: 'mongo prompt',
    });

    dbActionMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [{ id: 'prod-1' }, { id: 'prod-2' }],
        count: 2,
      },
    });

    const successResult = await handleDatabaseMongoReadAction({
      action: 'aggregate',
      collection: 'products',
      filter: {},
      projection: undefined,
      sort: undefined,
      limit: undefined,
      idType: undefined,
      distinctField: undefined,
      queryPayload: {
        provider: 'mongodb',
        collectionMap: { product: 'products' },
      },
      queryConfig: {
        queryTemplate: '[{"$match":{"status":"draft"}}]',
      } as never,
      dryRun: false,
      templateInputs: {},
      parseJsonTemplate: vi.fn(() => [{ $match: { status: 'draft' } }]),
      toast: vi.fn(),
      aiPrompt: 'mongo prompt',
    });

    expect(dbActionMock).toHaveBeenCalledWith({
      provider: 'mongodb',
      action: 'aggregate',
      collection: 'products',
      collectionMap: { product: 'products' },
      pipeline: [{ $match: { status: 'draft' } }],
    });
    expect(successResult).toEqual({
      result: [{ id: 'prod-1' }, { id: 'prod-2' }],
      bundle: {
        count: 2,
        collection: 'products',
      },
      aiPrompt: 'mongo prompt',
    });
  });

  it('handles non-aggregate dry runs, failures, and successful reads', async () => {
    const dryRunResult = await handleDatabaseMongoReadAction({
      action: 'find',
      collection: 'products',
      filter: { status: 'draft' },
      projection: { id: 1 },
      sort: { createdAt: -1 },
      limit: 10,
      idType: 'string',
      distinctField: undefined,
      queryPayload: {},
      queryConfig: {} as never,
      dryRun: true,
      templateInputs: {},
      parseJsonTemplate: vi.fn(),
      toast: vi.fn(),
      aiPrompt: 'mongo prompt',
    });

    expect(dryRunResult).toEqual({
      result: { status: 'draft' },
      bundle: {
        dryRun: true,
        action: 'find',
        collection: 'products',
        filter: { status: 'draft' },
        projection: { id: 1 },
        sort: { createdAt: -1 },
        limit: 10,
      },
      aiPrompt: 'mongo prompt',
    });

    dbActionMock.mockResolvedValueOnce({
      ok: false,
      error: 'Read exploded',
    });

    const failureToast = vi.fn();
    const failureResult = await handleDatabaseMongoReadAction({
      action: 'find',
      collection: 'products',
      filter: { status: 'draft' },
      projection: undefined,
      sort: undefined,
      limit: undefined,
      idType: undefined,
      distinctField: undefined,
      queryPayload: {},
      queryConfig: {} as never,
      dryRun: false,
      templateInputs: {},
      parseJsonTemplate: vi.fn(),
      toast: failureToast,
      aiPrompt: 'mongo prompt',
    });

    expect(failureToast).toHaveBeenCalledWith('Read exploded', { variant: 'error' });
    expect(failureResult).toEqual({
      result: null,
      bundle: { error: 'Read failed' },
      aiPrompt: 'mongo prompt',
    });

    dbActionMock.mockResolvedValueOnce({
      ok: true,
      data: {
        item: { id: 'prod-1' },
      },
    });

    const successToast = vi.fn();
    const successResult = await handleDatabaseMongoReadAction({
      action: 'findOne',
      collection: 'products',
      filter: { id: 'prod-1' },
      projection: undefined,
      sort: undefined,
      limit: undefined,
      idType: 'string',
      distinctField: undefined,
      queryPayload: {
        provider: 'mongodb',
      },
      queryConfig: {} as never,
      dryRun: false,
      templateInputs: {},
      parseJsonTemplate: vi.fn(),
      toast: successToast,
      aiPrompt: 'mongo prompt',
    });

    expect(successToast).toHaveBeenCalledWith(
      'Database query succeeded for products (1 result).',
      { variant: 'success' }
    );
    expect(successResult).toEqual({
      result: { id: 'prod-1' },
      bundle: {
        count: 1,
        collection: 'products',
        filter: { id: 'prod-1' },
      },
      aiPrompt: 'mongo prompt',
    });
  });
});
