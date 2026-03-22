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

describe('handleDatabaseMongoUpdateAction', () => {
  beforeEach(() => {
    buildMongoUpdatePlanMock.mockReset();
    executeMongoCollectionUpdateMock.mockReset();
  });

  it('returns short-circuit plan outputs without executing the collection update', async () => {
    buildMongoUpdatePlanMock.mockResolvedValue({
      output: {
        result: null,
        bundle: { error: 'Blocked' },
      },
    });

    const result = await handleDatabaseMongoUpdateAction({
      actionCategory: 'update',
      action: 'updateOne',
      node: { id: 'node-update' } as never,
      nodeInputs: {},
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      nodeInputPorts: [],
      dbConfig: {} as never,
      queryConfig: {} as never,
      dryRun: false,
      templateInputs: {},
      queryPayload: {},
      collection: 'products',
      filter: { id: 'prod-1' },
      idType: 'string',
      updateTemplate: '',
      parseJsonTemplate: vi.fn(),
      ensureExistingParameterTemplateContext: vi.fn(),
      aiPrompt: 'mongo prompt',
    });

    expect(result).toEqual({
      result: null,
      bundle: { error: 'Blocked' },
    });
    expect(executeMongoCollectionUpdateMock).not.toHaveBeenCalled();
  });

  it('returns previous outputs for already executed nodes and dry-run bundles for new nodes', async () => {
    buildMongoUpdatePlanMock.mockResolvedValue({
      plan: {
        resolvedFilter: { id: 'prod-1' },
        debugPayload: { source: 'plan' },
        parameterTargetPath: 'content_en',
        updates: { content_en: 'updated' },
        primaryTarget: 'prod-1',
        updateDoc: {
          $set: {
            content_en: 'updated',
          },
        },
      },
    });

    const prevOutputs = {
      result: { preserved: true },
    };

    const skippedResult = await handleDatabaseMongoUpdateAction({
      actionCategory: 'update',
      action: 'updateOne',
      node: { id: 'node-update' } as never,
      nodeInputs: {},
      prevOutputs,
      executed: { updater: new Set(['node-update']) } as never,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      nodeInputPorts: [],
      dbConfig: {} as never,
      queryConfig: {} as never,
      dryRun: false,
      templateInputs: {},
      queryPayload: {},
      collection: 'products',
      filter: { id: 'prod-1' },
      idType: 'string',
      updateTemplate: '',
      parseJsonTemplate: vi.fn(),
      ensureExistingParameterTemplateContext: vi.fn(),
      aiPrompt: 'mongo prompt',
    });

    expect(skippedResult).toBe(prevOutputs);

    const executed = { updater: new Set<string>() } as never;
    const dryRunResult = await handleDatabaseMongoUpdateAction({
      actionCategory: 'update',
      action: 'updateOne',
      node: { id: 'node-update' } as never,
      nodeInputs: {},
      prevOutputs: {},
      executed,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      nodeInputPorts: [],
      dbConfig: {} as never,
      queryConfig: {} as never,
      dryRun: true,
      templateInputs: {},
      queryPayload: {},
      collection: 'products',
      filter: { id: 'prod-1' },
      idType: 'string',
      updateTemplate: '',
      parseJsonTemplate: vi.fn(),
      ensureExistingParameterTemplateContext: vi.fn(),
      aiPrompt: 'mongo prompt',
    });

    expect(dryRunResult).toEqual({
      result: {
        $set: {
          content_en: 'updated',
        },
      },
      bundle: {
        dryRun: true,
        action: 'updateOne',
        collection: 'products',
        filter: { id: 'prod-1' },
        update: {
          $set: {
            content_en: 'updated',
          },
        },
      },
      debugPayload: { source: 'plan' },
      aiPrompt: 'mongo prompt',
    });
    expect(executed.updater.has('node-update')).toBe(true);
  });

  it('blocks unsupported update modes and delegates supported plans to the collection executor', async () => {
    buildMongoUpdatePlanMock.mockResolvedValue({
      plan: {
        resolvedFilter: { id: 'prod-1' },
        debugPayload: { source: 'plan' },
        parameterTargetPath: 'content_en',
        updates: { content_en: 'updated' },
        primaryTarget: 'prod-1',
        updateDoc: {
          $set: {
            content_en: 'updated',
          },
        },
      },
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const blockedResult = await handleDatabaseMongoUpdateAction({
      actionCategory: 'update',
      action: 'updateOne',
      node: { id: 'node-update' } as never,
      nodeInputs: {},
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError,
      toast,
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      nodeInputPorts: [],
      dbConfig: {
        updatePayloadMode: 'legacy',
      } as never,
      queryConfig: {} as never,
      dryRun: false,
      templateInputs: {},
      queryPayload: {},
      collection: 'products',
      filter: { id: 'prod-1' },
      idType: 'string',
      updateTemplate: '',
      parseJsonTemplate: vi.fn(),
      ensureExistingParameterTemplateContext: vi.fn(),
      aiPrompt: 'mongo prompt',
    });

    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      {
        action: 'dbUpdateGuardrail',
        nodeId: 'node-update',
        updatePayloadMode: 'legacy',
      },
      'Database update blocked:'
    );
    expect(toast).toHaveBeenCalledWith(
      'Unsupported update mode. Configure explicit filter and update document or use mappings.',
      { variant: 'error' }
    );
    expect(blockedResult).toEqual({
      result: null,
      bundle: {
        error: 'Unsupported update mode. Configure explicit filter and update document or use mappings.',
        guardrail: 'update-mode-explicit-only',
      },
      debugPayload: {
        source: 'plan',
        guardrail: 'update-mode-explicit-only',
      },
      aiPrompt: 'mongo prompt',
    });

    executeMongoCollectionUpdateMock.mockResolvedValue({
      result: { updated: true },
    });

    const delegatedResult = await handleDatabaseMongoUpdateAction({
      actionCategory: 'update',
      action: 'updateOne',
      node: { id: 'node-update-delegate' } as never,
      nodeInputs: { value: 'Ada' },
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: { value: 'Ada' },
      nodeInputPorts: ['value'],
      dbConfig: {
        updatePayloadMode: 'custom',
      } as never,
      queryConfig: {} as never,
      dryRun: false,
      templateInputs: {},
      queryPayload: { provider: 'mongodb' },
      collection: 'products',
      filter: { id: 'prod-1' },
      idType: 'string',
      updateTemplate: '',
      parseJsonTemplate: vi.fn(),
      ensureExistingParameterTemplateContext: vi.fn(),
      aiPrompt: 'mongo prompt',
    });

    expect(executeMongoCollectionUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'updateOne',
        collection: 'products',
        queryPayload: { provider: 'mongodb' },
        resolvedFilter: { id: 'prod-1' },
        updateDoc: {
          $set: {
            content_en: 'updated',
          },
        },
        debugPayload: { source: 'plan' },
        aiPrompt: 'mongo prompt',
      })
    );
    expect(delegatedResult).toEqual({
      result: { updated: true },
    });
  });
});
