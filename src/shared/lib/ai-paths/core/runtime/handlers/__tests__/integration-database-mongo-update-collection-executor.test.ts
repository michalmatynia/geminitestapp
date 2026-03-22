import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbActionMock, evaluateWriteOutcomeMock, resolveWriteOutcomePolicyMock } = vi.hoisted(() => ({
  dbActionMock: vi.fn(),
  evaluateWriteOutcomeMock: vi.fn(),
  resolveWriteOutcomePolicyMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  dbApi: {
    action: dbActionMock,
  },
}));

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-write-guardrails',
  () => ({
    evaluateWriteOutcome: evaluateWriteOutcomeMock,
    resolveWriteOutcomePolicy: resolveWriteOutcomePolicyMock,
  })
);

import { executeMongoCollectionUpdate } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-update-collection-executor';

describe('executeMongoCollectionUpdate', () => {
  beforeEach(() => {
    dbActionMock.mockReset();
    evaluateWriteOutcomeMock.mockReset();
    resolveWriteOutcomePolicyMock.mockReset();

    resolveWriteOutcomePolicyMock.mockReturnValue('warn');
    evaluateWriteOutcomeMock.mockReturnValue({
      isZeroAffected: false,
      writeOutcome: {
        status: 'success',
        operation: 'update',
      },
    });
  });

  it('returns an error bundle when updateOne is missing a query filter', async () => {
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const result = await executeMongoCollectionUpdate({
      action: 'updateOne',
      node: { id: 'node-update' } as never,
      nodeInputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError,
      toast,
      dbConfig: {} as never,
      queryPayload: { provider: 'mongodb' },
      collection: 'products',
      idType: 'string',
      debugPayload: { source: 'plan' },
      parameterTargetPath: 'content_en',
      updates: { content_en: 'Updated text' },
      primaryTarget: 'content_en',
      resolvedFilter: {},
      updateDoc: { $set: { content_en: 'Updated text' } },
      aiPrompt: 'mongo prompt',
    });

    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      {
        action: 'dbUpdate',
        collection: 'products',
        nodeId: 'node-update',
        provider: 'mongodb',
      },
      'Database update skipped:'
    );
    expect(toast).toHaveBeenCalledWith('Database update skipped: missing query filter.', {
      variant: 'error',
    });
    expect(dbActionMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      result: null,
      bundle: { error: 'Missing query filter' },
      debugPayload: { source: 'plan' },
      aiPrompt: 'mongo prompt',
    });
  });

  it('returns trimmed database errors and marks the node as executed', async () => {
    dbActionMock.mockResolvedValue({
      ok: false,
      error: '  Update exploded  ',
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();
    const executed = { updater: new Set<string>() } as never;

    const result = await executeMongoCollectionUpdate({
      action: 'findOneAndUpdate',
      node: { id: 'node-update' } as never,
      nodeInputs: {},
      executed,
      reportAiPathsError,
      toast,
      dbConfig: {} as never,
      queryPayload: {
        provider: 'mongodb',
        collectionMap: { product: 'products' },
      },
      collection: 'products',
      idType: 'string',
      debugPayload: { source: 'plan' },
      parameterTargetPath: 'content_en',
      updates: { content_en: 'Updated text' },
      primaryTarget: 'content_en',
      resolvedFilter: { id: 'prod-1' },
      updateDoc: { $set: { content_en: 'Updated text' } },
      aiPrompt: 'mongo prompt',
    });

    expect(dbActionMock).toHaveBeenCalledWith({
      provider: 'mongodb',
      collectionMap: { product: 'products' },
      action: 'findOneAndUpdate',
      collection: 'products',
      filter: { id: 'prod-1' },
      update: { $set: { content_en: 'Updated text' } },
      idType: 'string',
      returnDocument: 'after',
    });
    expect(executed.updater.has('node-update')).toBe(true);
    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      { action: 'dbUpdate', collection: 'products', nodeId: 'node-update' },
      'Database update failed:'
    );
    expect(toast).toHaveBeenCalledWith('Update exploded', { variant: 'error' });
    expect(result).toEqual({
      result: null,
      bundle: { error: 'Update exploded' },
      debugPayload: { source: 'plan' },
      aiPrompt: 'mongo prompt',
    });
  });

  it('throws when the write outcome marks a zero-affected update as failed', async () => {
    dbActionMock.mockResolvedValue({
      ok: true,
      data: { modifiedCount: 0 },
    });
    evaluateWriteOutcomeMock.mockReturnValue({
      isZeroAffected: true,
      writeOutcome: {
        status: 'failed',
        operation: 'update',
        message: 'No rows updated.',
      },
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    await expect(
      executeMongoCollectionUpdate({
        action: 'updateOne',
        node: { id: 'node-update' } as never,
        nodeInputs: {},
        executed: { updater: new Set<string>() } as never,
        reportAiPathsError,
        toast,
        dbConfig: {} as never,
        queryPayload: {},
        collection: 'products',
        idType: undefined,
        debugPayload: { source: 'plan' },
        parameterTargetPath: 'content_en',
        updates: { content_en: 'Updated text' },
        primaryTarget: 'content_en',
        resolvedFilter: { id: 'prod-1' },
        updateDoc: { $set: { content_en: 'Updated text' } },
        aiPrompt: 'mongo prompt',
      })
    ).rejects.toThrow('No rows updated.');

    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        action: 'dbWriteOutcome',
        collection: 'products',
        nodeId: 'node-update',
      }),
      'Database update failed:'
    );
    expect(toast).toHaveBeenCalledWith('No rows updated.', { variant: 'error' });
  });

  it('returns update data, content, and debug write metadata on success', async () => {
    dbActionMock.mockResolvedValue({
      ok: true,
      data: {
        modifiedCount: 2,
        acknowledged: true,
      },
    });

    const toast = vi.fn();
    const debugPayload = {
      source: 'plan',
      parameterInferenceGuard: {},
    };

    const result = await executeMongoCollectionUpdate({
      action: 'updateOne',
      node: { id: 'node-update-success' } as never,
      nodeInputs: { content_en: 'Previous text' },
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast,
      dbConfig: {} as never,
      queryPayload: {},
      collection: 'products',
      idType: undefined,
      debugPayload,
      parameterTargetPath: 'tags',
      updates: {
        tags: ['a', 'b'],
        content_en: 'Updated text',
      },
      primaryTarget: 'content_en',
      resolvedFilter: { id: 'prod-1' },
      updateDoc: { $set: { content_en: 'Updated text' } },
      aiPrompt: 'mongo prompt',
    });

    expect(toast).toHaveBeenCalledWith('Entity updated in products (2 rows).', {
      variant: 'success',
    });
    expect(debugPayload).toEqual({
      source: 'plan',
      parameterInferenceGuard: {
        written: {
          targetPath: 'tags',
          count: 2,
          modifiedCount: 2,
        },
      },
    });
    expect(result).toEqual({
      content_en: 'Updated text',
      result: {
        modifiedCount: 2,
        acknowledged: true,
      },
      bundle: {
        modifiedCount: 2,
        acknowledged: true,
        writeOutcome: {
          status: 'success',
          operation: 'update',
        },
      },
      debugPayload,
      writeOutcome: {
        status: 'success',
        operation: 'update',
      },
      aiPrompt: 'mongo prompt',
    });
  });
});
