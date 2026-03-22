import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  dbActionMock,
  resolveWriteTemplateGuardrailMock,
  createWriteTemplateGuardrailOutputMock,
  evaluateWriteOutcomeMock,
  resolveWriteOutcomePolicyMock,
} = vi.hoisted(() => ({
  dbActionMock: vi.fn(),
  resolveWriteTemplateGuardrailMock: vi.fn(),
  createWriteTemplateGuardrailOutputMock: vi.fn((input: unknown) => ({
    guardrail: input,
  })),
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
    createWriteTemplateGuardrailOutput: createWriteTemplateGuardrailOutputMock,
    evaluateWriteOutcome: evaluateWriteOutcomeMock,
    resolveWriteTemplateGuardrail: resolveWriteTemplateGuardrailMock,
    resolveWriteOutcomePolicy: resolveWriteOutcomePolicyMock,
  })
);

import { handleDatabaseMongoDeleteAction } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-delete-action';

describe('handleDatabaseMongoDeleteAction', () => {
  beforeEach(() => {
    dbActionMock.mockReset();
    resolveWriteTemplateGuardrailMock.mockReset();
    createWriteTemplateGuardrailOutputMock.mockClear();
    evaluateWriteOutcomeMock.mockReset();
    resolveWriteOutcomePolicyMock.mockReset();

    resolveWriteTemplateGuardrailMock.mockReturnValue({ ok: true });
    resolveWriteOutcomePolicyMock.mockReturnValue('warn');
    evaluateWriteOutcomeMock.mockReturnValue({
      isZeroAffected: false,
      writeOutcome: {
        status: 'success',
        operation: 'delete',
      },
    });
  });

  it('returns guardrail output when delete templates are blocked', async () => {
    resolveWriteTemplateGuardrailMock.mockReturnValue({
      ok: false,
      message: 'Unsafe delete filter.',
      guardrailMeta: {
        code: 'write-template-values',
        severity: 'error',
      },
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const result = await handleDatabaseMongoDeleteAction({
      action: 'deleteOne',
      node: { id: 'node-delete' } as never,
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError,
      toast,
      dbConfig: {} as never,
      dryRun: false,
      collection: 'products',
      filter: { id: 'prod-1' },
      idType: 'string',
      queryPayload: {},
      queryConfig: {
        queryTemplate: '{"id":"{{value}}"}',
      } as never,
      templateInputs: {
        value: 'prod-1',
      },
      templateInputValue: 'prod-1',
      aiPrompt: 'mongo prompt',
    });

    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      {
        action: 'dbDelete',
        collection: 'products',
        nodeId: 'node-delete',
        guardrailMeta: {
          code: 'write-template-values',
          severity: 'error',
        },
      },
      'Database delete blocked:'
    );
    expect(toast).toHaveBeenCalledWith('Unsafe delete filter.', { variant: 'error' });
    expect(result).toEqual({
      guardrail: {
        aiPrompt: 'mongo prompt',
        message: 'Unsafe delete filter.',
        guardrailMeta: {
          code: 'write-template-values',
          severity: 'error',
        },
      },
    });
  });

  it('returns previous outputs for already executed nodes and a dry-run bundle for new nodes', async () => {
    const prevOutputs = {
      result: { preserved: true },
    };

    const skippedResult = await handleDatabaseMongoDeleteAction({
      action: 'deleteOne',
      node: { id: 'node-delete' } as never,
      prevOutputs,
      executed: { updater: new Set(['node-delete']) } as never,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      dbConfig: {} as never,
      dryRun: false,
      collection: 'products',
      filter: { id: 'prod-1' },
      idType: 'string',
      queryPayload: {},
      queryConfig: {} as never,
      templateInputs: {},
      templateInputValue: null,
      aiPrompt: 'mongo prompt',
    });

    expect(skippedResult).toBe(prevOutputs);

    const executed = { updater: new Set<string>() } as never;
    const dryRunResult = await handleDatabaseMongoDeleteAction({
      action: 'deleteMany',
      node: { id: 'node-delete' } as never,
      prevOutputs: {},
      executed,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      dbConfig: {} as never,
      dryRun: true,
      collection: 'products',
      filter: { status: 'draft' },
      idType: 'string',
      queryPayload: {},
      queryConfig: {} as never,
      templateInputs: {},
      templateInputValue: null,
      aiPrompt: 'mongo prompt',
    });

    expect(dryRunResult).toEqual({
      result: { dryRun: true, action: 'deleteMany', collection: 'products', filter: { status: 'draft' } },
      bundle: {
        dryRun: true,
        writeOutcome: {
          status: 'success',
          operation: 'delete',
        },
      },
      writeOutcome: {
        status: 'success',
        operation: 'delete',
      },
      aiPrompt: 'mongo prompt',
    });
    expect(executed.updater.has('node-delete')).toBe(true);
  });

  it('returns delete failures and successful delete results with writeOutcome metadata', async () => {
    dbActionMock.mockResolvedValueOnce({
      ok: false,
      error: 'Delete exploded',
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const failureResult = await handleDatabaseMongoDeleteAction({
      action: 'deleteOne',
      node: { id: 'node-delete' } as never,
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError,
      toast,
      dbConfig: {} as never,
      dryRun: false,
      collection: 'products',
      filter: { id: 'prod-1' },
      idType: 'string',
      queryPayload: {
        provider: 'mongodb',
      },
      queryConfig: {} as never,
      templateInputs: {},
      templateInputValue: null,
      aiPrompt: 'mongo prompt',
    });

    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      { action: 'dbDelete', collection: 'products', nodeId: 'node-delete' },
      'Database delete failed:'
    );
    expect(toast).toHaveBeenCalledWith('Delete exploded', { variant: 'error' });
    expect(failureResult).toEqual({
      result: null,
      bundle: { error: 'Delete failed' },
      aiPrompt: 'mongo prompt',
    });

    dbActionMock.mockResolvedValueOnce({
      ok: true,
      data: {
        deletedCount: 2,
      },
    });

    const successToast = vi.fn();
    const successResult = await handleDatabaseMongoDeleteAction({
      action: 'deleteMany',
      node: { id: 'node-delete-success' } as never,
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: successToast,
      dbConfig: {} as never,
      dryRun: false,
      collection: 'products',
      filter: { status: 'draft' },
      idType: 'string',
      queryPayload: {
        provider: 'mongodb',
        collectionMap: { product: 'products' },
      },
      queryConfig: {} as never,
      templateInputs: {},
      templateInputValue: null,
      aiPrompt: 'mongo prompt',
    });

    expect(dbActionMock).toHaveBeenLastCalledWith({
      provider: 'mongodb',
      collectionMap: { product: 'products' },
      action: 'deleteMany',
      collection: 'products',
      filter: { status: 'draft' },
      idType: 'string',
    });
    expect(successToast).toHaveBeenCalledWith('Delete completed.', { variant: 'success' });
    expect(successResult).toEqual({
      result: { deletedCount: 2 },
      bundle: {
        deletedCount: 2,
        writeOutcome: {
          status: 'success',
          operation: 'delete',
        },
      },
      writeOutcome: {
        status: 'success',
        operation: 'delete',
      },
      aiPrompt: 'mongo prompt',
    });
  });
});
