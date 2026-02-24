import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveDatabaseInputsMock,
  handleDatabaseMongoActionMock,
  handleDatabaseStandardOperationMock,
  prepareDatabaseTemplateContextMock,
  getCachedSchemaMock,
} = vi.hoisted(() => ({
  resolveDatabaseInputsMock: vi.fn(),
  handleDatabaseMongoActionMock: vi.fn(),
  handleDatabaseStandardOperationMock: vi.fn(),
  prepareDatabaseTemplateContextMock: vi.fn(),
  getCachedSchemaMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-input-resolution', () => ({
  resolveDatabaseInputs: resolveDatabaseInputsMock,
}));

vi.mock('@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-mongo-actions', () => ({
  handleDatabaseMongoAction: handleDatabaseMongoActionMock,
}));

vi.mock('@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-operations', () => ({
  handleDatabaseStandardOperation: handleDatabaseStandardOperationMock,
}));

vi.mock('@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-template-context', () => ({
  prepareDatabaseTemplateContext: prepareDatabaseTemplateContextMock,
}));

vi.mock('@/features/ai/ai-paths/lib/core/runtime/handlers/integration-schema-handler', () => ({
  getCachedSchema: getCachedSchemaMock,
}));

import { handleDatabase } from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-handler';

describe('handleDatabase', () => {
  const reportAiPathsError = vi.fn();
  const toast = vi.fn();

  beforeEach(() => {
    resolveDatabaseInputsMock.mockReset();
    handleDatabaseMongoActionMock.mockReset();
    handleDatabaseStandardOperationMock.mockReset();
    prepareDatabaseTemplateContextMock.mockReset();
    getCachedSchemaMock.mockReset();
    reportAiPathsError.mockReset();
    toast.mockReset();

    resolveDatabaseInputsMock.mockReturnValue({});
    prepareDatabaseTemplateContextMock.mockReturnValue({
      templateInputValue: null,
      templateInputs: {},
      templateContext: {},
      aiPrompt: '',
      ensureExistingParameterTemplateContext: vi.fn(async () => {}),
    });
    getCachedSchemaMock.mockResolvedValue({ ok: true, data: { collections: [] } });
  });

  it('throws when a write operation returns an error payload', async () => {
    const mongoResult = {
      result: null,
      bundle: { error: 'Record not found' },
    };
    handleDatabaseMongoActionMock.mockResolvedValue(mongoResult);

    let caughtError: unknown = null;
    try {
      await handleDatabase({
        node: {
          id: 'node-db',
          type: 'database',
          title: 'Database Query',
          inputs: [],
          outputs: [],
          description: '',
          position: { x: 0, y: 0 },
          config: {
            database: {
              operation: 'update',
              useMongoActions: true,
              actionCategory: 'update',
              action: 'updateOne',
            },
          },
        } as any,
        nodeInputs: {},
        prevOutputs: {},
        executed: {} as any,
        reportAiPathsError,
        toast,
        fetchEntityCached: vi.fn(),
        simulationEntityType: null,
        simulationEntityId: null,
        triggerContext: {},
        fallbackEntityId: null,
        strictFlowMode: true,
        runMeta: null,
      } as any);
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toContain('Record not found');
    expect((caughtError as { nodeOutput?: unknown }).nodeOutput).toEqual(
      mongoResult
    );

    expect(reportAiPathsError).toHaveBeenCalled();
  });

  it('does not throw for query operations with error payloads', async () => {
    handleDatabaseStandardOperationMock.mockResolvedValue({
      result: null,
      bundle: { error: 'Query failed' },
    });

    const result = await handleDatabase({
      node: {
        id: 'node-db-query',
        type: 'database',
        title: 'Database Query',
        inputs: [],
        outputs: [],
        description: '',
        position: { x: 0, y: 0 },
        config: {
          database: {
            operation: 'query',
          },
        },
      } as any,
      nodeInputs: {},
      prevOutputs: {},
      executed: {} as any,
      reportAiPathsError,
      toast,
      fetchEntityCached: vi.fn(),
      simulationEntityType: null,
      simulationEntityId: null,
      triggerContext: {},
      fallbackEntityId: null,
      strictFlowMode: true,
      runMeta: null,
    } as any);

    expect(result).toEqual(
      expect.objectContaining({
        bundle: expect.objectContaining({
          error: 'Query failed',
        }),
      })
    );
  });

  it('throws when a write operation returns a fatal guardrail-flagged error', async () => {
    const mongoResult = {
      result: null,
      bundle: {
        error: 'Mapping-based update mode is disabled. Configure an explicit query filter and explicit update document.',
        guardrail: 'update-mode-explicit-only',
        guardrailMeta: {
          code: 'write-template-values',
          severity: 'error',
          message:
            'Database write blocked. Template inputs must be connected and non-empty (unparseable JSON tokens: {{result.parameters}}).',
          unparseableTokens: ['result.parameters'],
        },
      },
      guardrailMeta: {
        code: 'write-template-values',
        severity: 'error',
        message:
          'Database write blocked. Template inputs must be connected and non-empty (unparseable JSON tokens: {{result.parameters}}).',
        unparseableTokens: ['result.parameters'],
      },
      writeOutcome: {
        status: 'failed',
        code: 'write_template_values',
      },
    };
    handleDatabaseMongoActionMock.mockResolvedValue(mongoResult);

    let caughtError: unknown = null;
    try {
      await handleDatabase({
        node: {
          id: 'node-db-guardrail',
          type: 'database',
          title: 'Database Update',
          inputs: [],
          outputs: [],
          description: '',
          position: { x: 0, y: 0 },
          config: {
            database: {
              operation: 'update',
              useMongoActions: true,
              actionCategory: 'update',
              action: 'updateOne',
            },
          },
        } as any,
        nodeInputs: {},
        prevOutputs: {},
        executed: {} as any,
        reportAiPathsError,
        toast,
        fetchEntityCached: vi.fn(),
        simulationEntityType: null,
        simulationEntityId: null,
        triggerContext: {},
        fallbackEntityId: null,
        strictFlowMode: true,
        runMeta: null,
      } as any);
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toContain(
      'Mapping-based update mode is disabled'
    );
    expect((caughtError as { nodeOutput?: unknown }).nodeOutput).toEqual(
      mongoResult
    );
  });

  it('does not throw when write outcome is warning only', async () => {
    handleDatabaseMongoActionMock.mockResolvedValue({
      result: { matchedCount: 0, modifiedCount: 0 },
      bundle: {
        error: '0 rows affected',
        guardrail: 'zero-affected',
      },
      writeOutcome: {
        status: 'warning',
        code: 'zero_affected',
        message: '0 rows affected',
      },
    });

    const result = await handleDatabase({
      node: {
        id: 'node-db-warning',
        type: 'database',
        title: 'Database Update Warning',
        inputs: [],
        outputs: [],
        description: '',
        position: { x: 0, y: 0 },
        config: {
          database: {
            operation: 'update',
            useMongoActions: true,
            actionCategory: 'update',
            action: 'updateOne',
          },
        },
      } as any,
      nodeInputs: {},
      prevOutputs: {},
      executed: {} as any,
      reportAiPathsError,
      toast,
      fetchEntityCached: vi.fn(),
      simulationEntityType: null,
      simulationEntityId: null,
      triggerContext: {},
      fallbackEntityId: null,
      strictFlowMode: true,
      runMeta: null,
    } as any);

    expect(result).toEqual(
      expect.objectContaining({
        writeOutcome: expect.objectContaining({
          status: 'warning',
        }),
      }),
    );
  });

  it('throws when query-mode config returns write-action error payload', async () => {
    handleDatabaseStandardOperationMock.mockResolvedValue({
      result: null,
      bundle: { error: 'Record not found' },
      debugPayload: {
        mode: 'mongo',
        actionCategory: 'update',
        action: 'updateOne',
      },
    });

    await expect(
      handleDatabase({
        node: {
          id: 'node-db-write-like',
          type: 'database',
          title: 'Database Query',
          inputs: [],
          outputs: [],
          description: '',
          position: { x: 0, y: 0 },
          config: {
            database: {
              operation: 'query',
            },
          },
        } as any,
        nodeInputs: {},
        prevOutputs: {},
        executed: {} as any,
        reportAiPathsError,
        toast,
        fetchEntityCached: vi.fn(),
        simulationEntityType: null,
        simulationEntityId: null,
        triggerContext: {},
        fallbackEntityId: null,
        strictFlowMode: true,
        runMeta: null,
      } as any)
    ).rejects.toThrow('Record not found');
  });
});
