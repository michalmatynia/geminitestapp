import { beforeEach, describe, expect, it, vi } from 'vitest';

const { buildMongoUpdatePlanMock, executeMongoCollectionUpdateMock } = vi.hoisted(() => ({
  buildMongoUpdatePlanMock: vi.fn(),
  executeMongoCollectionUpdateMock: vi.fn(),
}));

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-update-plan',
  () => ({
    buildMongoUpdatePlan: buildMongoUpdatePlanMock,
  })
);

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-update-collection-executor',
  () => ({
    executeMongoCollectionUpdate: executeMongoCollectionUpdateMock,
  })
);

import { handleDatabaseMongoUpdateAction } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-update-action';
import type { HandleDatabaseMongoUpdateActionInput } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-update-action';
import type { AiNode, DatabaseConfig } from '@/shared/contracts/ai-paths';

const basePlan = {
  plan: {
    resolvedFilter: { id: 'product-1' },
    debugPayload: {},
    parameterTargetPath: 'parameters',
    updates: {
      parameters: [{ parameterId: 'param-1', value: 'value-1' }],
    },
    primaryTarget: 'parameters',
    updateDoc: {
      $set: {
        parameters: [{ parameterId: 'param-1', value: 'value-1' }],
      },
    },
  },
};

describe('handleDatabaseMongoUpdateAction', () => {
  beforeEach(() => {
    buildMongoUpdatePlanMock.mockReset();
    executeMongoCollectionUpdateMock.mockReset();
    buildMongoUpdatePlanMock.mockResolvedValue(basePlan);
    executeMongoCollectionUpdateMock.mockResolvedValue({ result: { ok: true } });
  });

  const baseArgs: HandleDatabaseMongoUpdateActionInput = {
    actionCategory: 'update' as const,
    action: 'updateOne' as const,
    node: { id: 'node-update-params' } as AiNode,
    nodeInputs: {},
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
    simulationEntityType: 'product',
    simulationEntityId: 'product-1',
    resolvedInputs: {
      entityId: 'product-1',
      entityType: 'product',
      productId: 'product-1',
    },
    nodeInputPorts: ['value', 'result', 'entityId'],
    dbConfig: {
      operation: 'update' as const,
      mode: 'replace' as const,
      entityType: 'product',
      updatePayloadMode: 'custom' as const,
      mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
    } as DatabaseConfig,
    queryConfig: {
      provider: 'auto' as const,
      collection: 'products',
      mode: 'custom' as const,
      preset: 'by_id' as const,
      field: 'id',
      idType: 'string' as const,
      queryTemplate: '{"id":"{{entityId}}"}',
      limit: 1,
      sort: '',
      projection: '',
      single: true,
    },
    dryRun: false,
    templateInputs: {},
    queryPayload: {
      provider: 'auto',
      collection: 'products',
      query: { id: 'product-1' },
      limit: 1,
      single: true,
      idType: 'string',
    },
    collection: 'products',
    filter: { id: 'product-1' },
    idType: 'string',
    updateTemplate: '{"$set":{"parameters":{{value}}}}',
    parseJsonTemplate: vi.fn(),
    ensureExistingParameterTemplateContext: vi.fn(async () => {}),
    aiPrompt: '',
  };

  it('uses collection update executor for custom payload mode', async () => {
    await handleDatabaseMongoUpdateAction(baseArgs);

    expect(executeMongoCollectionUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('blocks unsupported payload mode with explicit guardrail error', async () => {
    const args = {
      ...baseArgs,
      dbConfig: {
        ...baseArgs.dbConfig,
        updatePayloadMode: 'invalid_mode' as any,
      },
    };

    const result = await handleDatabaseMongoUpdateAction(
      args as HandleDatabaseMongoUpdateActionInput
    );

    expect(executeMongoCollectionUpdateMock).not.toHaveBeenCalled();
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        guardrail: 'update-mode-explicit-only',
      })
    );
  });
});
