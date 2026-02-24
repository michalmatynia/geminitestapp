import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbActionMock } = vi.hoisted(() => ({
  dbActionMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/lib/api', () => ({
  dbApi: {
    action: dbActionMock,
  },
}));

import { handleDatabaseMongoDeleteAction } from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-mongo-delete-action';

const buildArgs = () =>
  ({
    action: 'deleteOne',
    node: { id: 'node-delete' },
    prevOutputs: {},
    executed: {
      notification: new Set(),
      updater: new Set(),
      http: new Set(),
      delay: new Set(),
      poll: new Set(),
      ai: new Set(),
      schema: new Set(),
      mapper: new Set(),
    },
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    dbConfig: {
      operation: 'delete',
      writeOutcomePolicy: {
        onZeroAffected: 'fail',
      },
    },
    dryRun: false,
    collection: 'products',
    filter: { id: 'product-1' },
    idType: 'string',
    queryPayload: { provider: 'auto', collection: 'products', query: { id: 'product-1' } },
    queryConfig: {
      provider: 'auto',
      collection: 'products',
      mode: 'custom',
      preset: 'by_id',
      field: 'id',
      idType: 'string',
      queryTemplate: '',
      limit: 1,
      sort: '',
      projection: '',
      single: true,
    },
    templateInputs: {},
    templateInputValue: null,
    aiPrompt: '',
  }) as any;

describe('handleDatabaseMongoDeleteAction', () => {
  beforeEach(() => {
    dbActionMock.mockReset();
  });

  it('throws when delete affects 0 records and policy is fail', async () => {
    dbActionMock.mockResolvedValue({
      ok: true,
      data: {
        deletedCount: 0,
      },
    });

    const args = buildArgs();
    await expect(handleDatabaseMongoDeleteAction(args)).rejects.toThrow(
      'affected 0 records',
    );
  });

  it('returns warning outcome when delete affects 0 records and policy is warn', async () => {
    dbActionMock.mockResolvedValue({
      ok: true,
      data: {
        deletedCount: 0,
      },
    });
    const args = buildArgs();
    args.dbConfig.writeOutcomePolicy.onZeroAffected = 'warn';

    const result = await handleDatabaseMongoDeleteAction(args);
    expect(result['writeOutcome']).toEqual(
      expect.objectContaining({
        status: 'warning',
        code: 'zero_affected',
      }),
    );
  });
});

