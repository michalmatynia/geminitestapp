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

import { handleDatabaseMongoCreateAction } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-create-action';

describe('handleDatabaseMongoCreateAction', () => {
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
        operation: 'insert',
      },
    });
  });

  it('returns guardrail output when the insert template is blocked', async () => {
    resolveWriteTemplateGuardrailMock.mockReturnValue({
      ok: false,
      message: 'Unsafe insert template.',
      guardrailMeta: {
        code: 'write-template-values',
        severity: 'error',
      },
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const result = await handleDatabaseMongoCreateAction({
      action: 'insertOne',
      node: { id: 'node-create' } as never,
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError,
      toast,
      resolvedInputs: {},
      dbConfig: {} as never,
      queryConfig: {
        queryTemplate: '{"title":"{{value}}"}',
      } as never,
      dryRun: false,
      collection: 'products',
      queryPayload: {},
      templateInputs: {
        value: 'Ada',
      },
      templateInputValue: 'Ada',
      parseJsonTemplate: vi.fn(),
      aiPrompt: 'mongo prompt',
    });

    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      {
        action: 'dbInsert',
        collection: 'products',
        nodeId: 'node-create',
        guardrailMeta: {
          code: 'write-template-values',
          severity: 'error',
        },
      },
      'Database insert blocked:'
    );
    expect(toast).toHaveBeenCalledWith('Unsafe insert template.', { variant: 'error' });
    expect(result).toEqual({
      guardrail: {
        aiPrompt: 'mongo prompt',
        message: 'Unsafe insert template.',
        guardrailMeta: {
          code: 'write-template-values',
          severity: 'error',
        },
      },
    });
  });

  it('rejects invalid template payloads and insertOne array payloads', async () => {
    const invalidTemplateToast = vi.fn();
    const invalidTemplateResult = await handleDatabaseMongoCreateAction({
      action: 'insertOne',
      node: { id: 'node-create' } as never,
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: invalidTemplateToast,
      resolvedInputs: {},
      dbConfig: {} as never,
      queryConfig: {
        queryTemplate: '{"title":"{{value}}"}',
      } as never,
      dryRun: false,
      collection: 'products',
      queryPayload: {},
      templateInputs: {},
      templateInputValue: 'Ada',
      parseJsonTemplate: vi.fn(() => 'not-json'),
      aiPrompt: 'mongo prompt',
    });

    expect(invalidTemplateToast).toHaveBeenCalledWith('Insert template must be valid JSON.', {
      variant: 'error',
    });
    expect(invalidTemplateResult).toEqual({
      result: null,
      bundle: { error: 'Invalid insert template' },
      aiPrompt: 'mongo prompt',
    });

    const invalidPayloadToast = vi.fn();
    const invalidPayloadResult = await handleDatabaseMongoCreateAction({
      action: 'insertOne',
      node: { id: 'node-create' } as never,
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: invalidPayloadToast,
      resolvedInputs: {},
      dbConfig: {} as never,
      queryConfig: {
        queryTemplate: '[{"title":"Ada"}]',
      } as never,
      dryRun: false,
      collection: 'products',
      queryPayload: {},
      templateInputs: {},
      templateInputValue: null,
      parseJsonTemplate: vi.fn(() => [{ title: 'Ada' }]),
      aiPrompt: 'mongo prompt',
    });

    expect(invalidPayloadToast).toHaveBeenCalledWith('insertOne requires a single JSON object.', {
      variant: 'error',
    });
    expect(invalidPayloadResult).toEqual({
      result: null,
      bundle: { error: 'Invalid payload' },
      aiPrompt: 'mongo prompt',
    });
  });

  it('returns previous outputs for already executed nodes and dry-run bundles for new nodes', async () => {
    const prevOutputs = {
      result: { preserved: true },
    };

    const skippedResult = await handleDatabaseMongoCreateAction({
      action: 'insertOne',
      node: { id: 'node-create' } as never,
      prevOutputs,
      executed: { updater: new Set(['node-create']) } as never,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      resolvedInputs: {
        bundle: { title: 'Ada' },
      },
      dbConfig: {
        writeSource: 'bundle',
      } as never,
      queryConfig: {} as never,
      dryRun: false,
      collection: 'products',
      queryPayload: {},
      templateInputs: {},
      templateInputValue: null,
      parseJsonTemplate: vi.fn(),
      aiPrompt: 'mongo prompt',
    });

    expect(skippedResult).toBe(prevOutputs);

    const executed = { updater: new Set<string>() } as never;
    const dryRunResult = await handleDatabaseMongoCreateAction({
      action: 'insertMany',
      node: { id: 'node-create' } as never,
      prevOutputs: {},
      executed,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      resolvedInputs: {},
      dbConfig: {} as never,
      queryConfig: {
        queryTemplate: '[{"title":"Ada"}]',
      } as never,
      dryRun: true,
      collection: 'products',
      queryPayload: {},
      templateInputs: {},
      templateInputValue: null,
      parseJsonTemplate: vi.fn(() => [{ title: 'Ada' }]),
      aiPrompt: 'mongo prompt',
    });

    expect(dryRunResult).toEqual({
      result: [{ title: 'Ada' }],
      bundle: {
        dryRun: true,
        action: 'insertMany',
        collection: 'products',
        payload: [{ title: 'Ada' }],
      },
      aiPrompt: 'mongo prompt',
    });
    expect(executed.updater.has('node-create')).toBe(true);
  });

  it('reports insert failures and returns successful insert payloads with writeOutcome metadata', async () => {
    dbActionMock.mockResolvedValueOnce({
      ok: false,
      error: 'Insert exploded',
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const failureResult = await handleDatabaseMongoCreateAction({
      action: 'insertOne',
      node: { id: 'node-create' } as never,
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError,
      toast,
      resolvedInputs: {
        bundle: { title: 'Ada' },
      },
      dbConfig: {
        writeSource: 'bundle',
      } as never,
      queryConfig: {} as never,
      dryRun: false,
      collection: 'products',
      queryPayload: {
        provider: 'mongodb',
      },
      templateInputs: {},
      templateInputValue: null,
      parseJsonTemplate: vi.fn(),
      aiPrompt: 'mongo prompt',
    });

    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      { action: 'dbInsert', collection: 'products', nodeId: 'node-create' },
      'Database insert failed:'
    );
    expect(toast).toHaveBeenCalledWith('Insert exploded', { variant: 'error' });
    expect(failureResult).toEqual({
      result: null,
      bundle: { error: 'Insert failed' },
      aiPrompt: 'mongo prompt',
    });

    dbActionMock.mockResolvedValueOnce({
      ok: true,
      data: {
        insertedId: 'record-1',
        insertedCount: 2,
      },
    });

    const successToast = vi.fn();
    const successResult = await handleDatabaseMongoCreateAction({
      action: 'insertMany',
      node: { id: 'node-create-success' } as never,
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: successToast,
      resolvedInputs: {},
      dbConfig: {} as never,
      queryConfig: {
        queryTemplate: '[{"title":"Ada"},{"title":"Grace"}]',
      } as never,
      dryRun: false,
      collection: 'products',
      queryPayload: {
        provider: 'mongodb',
        collectionMap: { product: 'products' },
      },
      templateInputs: {},
      templateInputValue: null,
      parseJsonTemplate: vi.fn(() => [{ title: 'Ada' }, { title: 'Grace' }]),
      aiPrompt: 'mongo prompt',
    });

    expect(dbActionMock).toHaveBeenLastCalledWith({
      provider: 'mongodb',
      collectionMap: { product: 'products' },
      action: 'insertMany',
      collection: 'products',
      documents: [{ title: 'Ada' }, { title: 'Grace' }],
    });
    expect(successToast).toHaveBeenCalledWith('Entity created in products (2 rows).', {
      variant: 'success',
    });
    expect(successResult).toEqual({
      result: {
        insertedId: 'record-1',
        insertedCount: 2,
      },
      bundle: {
        insertedId: 'record-1',
        insertedCount: 2,
        writeOutcome: {
          status: 'success',
          operation: 'insert',
        },
      },
      writeOutcome: {
        status: 'success',
        operation: 'insert',
      },
      aiPrompt: 'mongo prompt',
    });
  });
});
