import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buildMongoUpdatePlanMock,
  executeMongoEntityUpdateMock,
  executeMongoCollectionUpdateMock,
} = vi.hoisted(() => ({
  buildMongoUpdatePlanMock: vi.fn(),
  executeMongoEntityUpdateMock: vi.fn(),
  executeMongoCollectionUpdateMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-mongo-update-plan', () => ({
  buildMongoUpdatePlan: buildMongoUpdatePlanMock,
}));

vi.mock('@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-mongo-update-entity-executor', () => ({
  executeMongoEntityUpdate: executeMongoEntityUpdateMock,
}));

vi.mock('@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-mongo-update-collection-executor', () => ({
  executeMongoCollectionUpdate: executeMongoCollectionUpdateMock,
}));

import { handleDatabaseMongoUpdateAction } from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-mongo-update-action';

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
    executeMongoEntityUpdateMock.mockReset();
    executeMongoCollectionUpdateMock.mockReset();
    buildMongoUpdatePlanMock.mockResolvedValue(basePlan);
    executeMongoEntityUpdateMock.mockResolvedValue({ result: { ok: true } });
    executeMongoCollectionUpdateMock.mockResolvedValue({ result: { ok: true } });
  });

  const baseArgs = {
    actionCategory: 'update' as const,
    action: 'updateOne' as const,
    node: { id: 'node-update-params' },
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
    },
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
    await handleDatabaseMongoUpdateAction(baseArgs as any);

    expect(executeMongoCollectionUpdateMock).toHaveBeenCalledTimes(1);
    expect(executeMongoEntityUpdateMock).not.toHaveBeenCalled();
  });

  it('uses entity update executor for mapping payload mode', async () => {
    const args = {
      ...baseArgs,
      dbConfig: {
        ...baseArgs.dbConfig,
        updatePayloadMode: 'mapping' as const,
      },
    };
      
    await handleDatabaseMongoUpdateAction(args as any);
      
    expect(executeMongoEntityUpdateMock).toHaveBeenCalledTimes(1);
      
    expect(executeMongoCollectionUpdateMock).not.toHaveBeenCalled();
  });
});
