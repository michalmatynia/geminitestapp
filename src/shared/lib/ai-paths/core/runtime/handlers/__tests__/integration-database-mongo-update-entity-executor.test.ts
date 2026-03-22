import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  entityUpdateMock,
  coerceArrayLikeMock,
  mergeParameterInferenceUpdatesMock,
  resolveObjectPathValueMock,
  toRecordMock,
  evaluateWriteOutcomeMock,
  resolveWriteOutcomePolicyMock,
} = vi.hoisted(() => ({
  entityUpdateMock: vi.fn(),
  coerceArrayLikeMock: vi.fn(),
  mergeParameterInferenceUpdatesMock: vi.fn(),
  resolveObjectPathValueMock: vi.fn(),
  toRecordMock: vi.fn(),
  evaluateWriteOutcomeMock: vi.fn(),
  resolveWriteOutcomePolicyMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  entityApi: {
    update: entityUpdateMock,
  },
}));

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/database-parameter-inference',
  () => ({
    coerceArrayLike: coerceArrayLikeMock,
    mergeParameterInferenceUpdates: mergeParameterInferenceUpdatesMock,
    resolveObjectPathValue: resolveObjectPathValueMock,
    toRecord: toRecordMock,
  })
);

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-write-guardrails',
  () => ({
    evaluateWriteOutcome: evaluateWriteOutcomeMock,
    resolveWriteOutcomePolicy: resolveWriteOutcomePolicyMock,
  })
);

import { executeMongoEntityUpdate } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-update-entity-executor';

describe('executeMongoEntityUpdate', () => {
  beforeEach(() => {
    entityUpdateMock.mockReset();
    coerceArrayLikeMock.mockReset();
    mergeParameterInferenceUpdatesMock.mockReset();
    resolveObjectPathValueMock.mockReset();
    toRecordMock.mockReset();
    evaluateWriteOutcomeMock.mockReset();
    resolveWriteOutcomePolicyMock.mockReset();

    coerceArrayLikeMock.mockImplementation((value: unknown) =>
      Array.isArray(value) ? value : value === undefined ? [] : [value]
    );
    mergeParameterInferenceUpdatesMock.mockReturnValue({
      applied: false,
      updates: { content_en: 'Updated text' },
    });
    resolveObjectPathValueMock.mockImplementation(
      (record: Record<string, unknown>, path: string) => record[path]
    );
    toRecordMock.mockImplementation((value: unknown) => value as Record<string, unknown>);
    resolveWriteOutcomePolicyMock.mockReturnValue('warn');
    evaluateWriteOutcomeMock.mockReturnValue({
      isZeroAffected: false,
      writeOutcome: {
        status: 'success',
        operation: 'update',
      },
    });
  });

  it('returns previous outputs when no update fields remain after parameter inference', async () => {
    mergeParameterInferenceUpdatesMock.mockReturnValue({
      applied: false,
      updates: {},
    });

    const prevOutputs = {
      result: { preserved: true },
    };

    const result = await executeMongoEntityUpdate({
      action: 'updateOne',
      node: { id: 'node-update' } as never,
      nodeInputs: {},
      prevOutputs,
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      dbConfig: {} as never,
      queryPayload: {},
      collection: 'products',
      templateInputs: {},
      debugPayload: { source: 'plan' },
      parameterTargetPath: 'content_en',
      updates: {},
      primaryTarget: 'content_en',
      updateDoc: null,
      resolveEntityId: vi.fn(() => 'prod-1'),
      aiPrompt: 'mongo prompt',
    });

    expect(entityUpdateMock).not.toHaveBeenCalled();
    expect(result).toBe(prevOutputs);
  });

  it('reports missing entity ids after applying merged parameter inference metadata', async () => {
    mergeParameterInferenceUpdatesMock.mockReturnValue({
      applied: true,
      updates: { content_en: 'Updated text' },
      meta: { hydrated: true },
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();
    const debugPayload = {
      source: 'plan',
      parameterInferenceGuard: {
        writePlan: {
          existing: true,
        },
      },
    };

    const result = await executeMongoEntityUpdate({
      action: 'updateOne',
      node: { id: 'node-update' } as never,
      nodeInputs: {},
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError,
      toast,
      dbConfig: {
        parameterInferenceGuard: {
          languageCode: 'en',
        },
      } as never,
      queryPayload: {
        provider: 'mongodb',
      },
      collection: 'products',
      templateInputs: { content_en: 'Updated text' },
      debugPayload,
      parameterTargetPath: 'content_en',
      updates: { content_en: 'Updated text' },
      primaryTarget: 'content_en',
      updateDoc: { $set: { content_en: 'Updated text' } },
      resolveEntityId: vi.fn(() => null),
      aiPrompt: 'mongo prompt',
    });

    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      {
        action: 'updateEntity',
        collection: 'products',
        nodeId: 'node-update',
        provider: 'mongodb',
      },
      'Database update skipped:'
    );
    expect(toast).toHaveBeenCalledWith('Database update skipped: missing entity ID.', {
      variant: 'error',
    });
    expect(entityUpdateMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      result: null,
      bundle: { error: 'Missing entity id' },
      debugPayload: {
        source: 'plan',
        parameterInferenceGuard: {
          writePlan: {
            existing: true,
            hydrated: true,
          },
        },
      },
      aiPrompt: 'mongo prompt',
    });
  });

  it('returns update failures and records execution after calling the entity api', async () => {
    entityUpdateMock.mockResolvedValue({
      ok: false,
      error: 'Update exploded',
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();
    const executed = { updater: new Set<string>() } as never;

    const result = await executeMongoEntityUpdate({
      action: 'updateOne',
      node: { id: 'node-update' } as never,
      nodeInputs: {},
      prevOutputs: {},
      executed,
      reportAiPathsError,
      toast,
      dbConfig: {
        mode: 'merge',
      } as never,
      queryPayload: {},
      collection: 'products',
      templateInputs: {},
      debugPayload: { source: 'plan' },
      parameterTargetPath: 'content_en',
      updates: { content_en: 'Updated text' },
      primaryTarget: 'content_en',
      updateDoc: { $set: { content_en: 'Updated text' } },
      resolveEntityId: vi.fn(() => 'prod-1'),
      aiPrompt: 'mongo prompt',
    });

    expect(entityUpdateMock).toHaveBeenCalledWith({
      entityType: 'product',
      entityId: 'prod-1',
      updates: { content_en: 'Updated text' },
      mode: 'merge',
    });
    expect(executed.updater.has('node-update')).toBe(true);
    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      { action: 'updateEntity', collection: 'products', nodeId: 'node-update' },
      'Database update failed:'
    );
    expect(toast).toHaveBeenCalledWith('Database update failed.', { variant: 'error' });
    expect(result).toEqual({
      result: null,
      bundle: { error: 'Update failed' },
      debugPayload: { source: 'plan' },
      aiPrompt: 'mongo prompt',
    });
  });

  it('returns updated content, writeOutcome, and parameter inference metadata on success', async () => {
    mergeParameterInferenceUpdatesMock.mockReturnValue({
      applied: true,
      updates: {
        content_en: 'Updated text',
        tags: ['one', 'two'],
      },
      meta: { hydrated: true },
    });
    entityUpdateMock.mockResolvedValue({
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

    const result = await executeMongoEntityUpdate({
      action: 'updateOne',
      node: { id: 'node-update-success' } as never,
      nodeInputs: { content_en: 'Previous text' },
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast,
      dbConfig: {
        parameterInferenceGuard: {
          languageCode: 'en',
        },
      } as never,
      queryPayload: {},
      collection: 'products',
      templateInputs: { content_en: 'Updated text' },
      debugPayload,
      parameterTargetPath: 'tags',
      updates: { content_en: 'Updated text' },
      primaryTarget: 'content_en',
      updateDoc: { $set: { content_en: 'Updated text' } },
      resolveEntityId: vi.fn(() => 'prod-1'),
      aiPrompt: 'mongo prompt',
    });

    expect(entityUpdateMock).toHaveBeenCalledWith({
      entityType: 'product',
      entityId: 'prod-1',
      updates: {
        content_en: 'Updated text',
        tags: ['one', 'two'],
      },
      mode: 'replace',
    });
    expect(toast).toHaveBeenCalledWith('Entity updated in products (2 rows).', {
      variant: 'success',
    });
    expect(debugPayload).toEqual({
      source: 'plan',
      parameterInferenceGuard: {
        writePlan: {
          hydrated: true,
        },
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
