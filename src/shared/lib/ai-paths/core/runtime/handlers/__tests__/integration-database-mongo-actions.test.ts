import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getUnsupportedProviderActionMessageMock,
  buildDbQueryPayloadMock,
  handleDatabaseMongoReadActionMock,
  handleDatabaseMongoCreateActionMock,
  handleDatabaseMongoUpdateActionMock,
  handleDatabaseMongoDeleteActionMock,
} = vi.hoisted(() => ({
  getUnsupportedProviderActionMessageMock: vi.fn(),
  buildDbQueryPayloadMock: vi.fn(),
  handleDatabaseMongoReadActionMock: vi.fn(),
  handleDatabaseMongoCreateActionMock: vi.fn(),
  handleDatabaseMongoUpdateActionMock: vi.fn(),
  handleDatabaseMongoDeleteActionMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/core/utils/provider-actions', () => ({
  getUnsupportedProviderActionMessage: getUnsupportedProviderActionMessageMock,
}));

vi.mock('@/shared/lib/ai-paths/core/runtime/handlers/../utils', () => ({
  buildDbQueryPayload: buildDbQueryPayloadMock,
}));

vi.mock('@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-read-action', () => ({
  handleDatabaseMongoReadAction: handleDatabaseMongoReadActionMock,
}));

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-create-action',
  () => ({
    handleDatabaseMongoCreateAction: handleDatabaseMongoCreateActionMock,
  })
);

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-update-action',
  () => ({
    handleDatabaseMongoUpdateAction: handleDatabaseMongoUpdateActionMock,
  })
);

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-delete-action',
  () => ({
    handleDatabaseMongoDeleteAction: handleDatabaseMongoDeleteActionMock,
  })
);

import { handleDatabaseMongoAction } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-actions';

describe('handleDatabaseMongoAction', () => {
  beforeEach(() => {
    getUnsupportedProviderActionMessageMock.mockReset();
    buildDbQueryPayloadMock.mockReset();
    handleDatabaseMongoReadActionMock.mockReset();
    handleDatabaseMongoCreateActionMock.mockReset();
    handleDatabaseMongoUpdateActionMock.mockReset();
    handleDatabaseMongoDeleteActionMock.mockReset();

    getUnsupportedProviderActionMessageMock.mockReturnValue(null);
    buildDbQueryPayloadMock.mockReturnValue({
      provider: 'mongodb',
      collection: 'products',
      filter: { id: 'prod-1' },
      projection: { id: 1 },
      sort: { createdAt: -1 },
      limit: 5,
      idType: 'string',
    });
  });

  it('returns an error bundle for unsupported provider actions', async () => {
    getUnsupportedProviderActionMessageMock.mockReturnValue('Mongo provider cannot do that.');
    const toast = vi.fn();

    const result = await handleDatabaseMongoAction({
      node: { id: 'node-1' } as never,
      nodeInputs: {},
      prevOutputs: {},
      executed: {} as never,
      reportAiPathsError: vi.fn(),
      toast,
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      nodeInputPorts: [],
      dbConfig: {
        actionCategory: 'read',
        action: 'find',
      } as never,
      queryConfig: {} as never,
      dryRun: false,
      templateInputValue: null,
      templateInputs: {},
      templateContext: {},
      aiPrompt: 'mongo prompt',
      ensureExistingParameterTemplateContext: vi.fn(),
    });

    expect(toast).toHaveBeenCalledWith('Mongo provider cannot do that.', { variant: 'error' });
    expect(result).toEqual({
      result: null,
      bundle: {
        error: 'Unsupported provider action',
        provider: 'mongodb',
        action: 'find',
      },
      aiPrompt: 'mongo prompt',
    });
  });

  it('dispatches read actions to the read handler with parsed query payload details', async () => {
    handleDatabaseMongoReadActionMock.mockResolvedValue({ result: { rows: [] } });

    const result = await handleDatabaseMongoAction({
      node: { id: 'node-1' } as never,
      nodeInputs: {},
      prevOutputs: {},
      executed: {} as never,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      nodeInputPorts: [],
      dbConfig: {
        actionCategory: 'read',
        action: 'find',
      } as never,
      queryConfig: {} as never,
      dryRun: false,
      templateInputValue: 'Ada',
      templateInputs: {
        value: 'Ada',
      },
      templateContext: {},
      aiPrompt: 'mongo prompt',
      ensureExistingParameterTemplateContext: vi.fn(),
    });

    expect(handleDatabaseMongoReadActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'find',
        collection: 'products',
        filter: { id: 'prod-1' },
        projection: { id: 1 },
        sort: { createdAt: -1 },
        limit: 5,
        idType: 'string',
        aiPrompt: 'mongo prompt',
      })
    );
    const parseJsonTemplate = handleDatabaseMongoReadActionMock.mock.calls[0]?.[0]
      ?.parseJsonTemplate as (template: string) => unknown;
    expect(parseJsonTemplate('{"title":"{{value}}"}')).toEqual({ title: 'Ada' });
    expect(result).toEqual({ result: { rows: [] } });
  });

  it('dispatches create, update, delete, and unknown categories to the correct handlers', async () => {
    handleDatabaseMongoCreateActionMock.mockResolvedValue({ result: { created: true } });
    handleDatabaseMongoUpdateActionMock.mockResolvedValue({ result: { updated: true } });
    handleDatabaseMongoDeleteActionMock.mockResolvedValue({ result: { deleted: true } });

    const commonInput = {
      node: { id: 'node-1' } as never,
      nodeInputs: {},
      prevOutputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      nodeInputPorts: [],
      queryConfig: {} as never,
      dryRun: false,
      templateInputValue: 'Ada',
      templateInputs: { value: 'Ada' },
      templateContext: {},
      aiPrompt: 'mongo prompt',
      ensureExistingParameterTemplateContext: vi.fn(),
    };

    await handleDatabaseMongoAction({
      ...commonInput,
      dbConfig: {
        actionCategory: 'create',
        action: 'insertOne',
      } as never,
    });
    await handleDatabaseMongoAction({
      ...commonInput,
      dbConfig: {
        actionCategory: 'update',
        action: 'updateOne',
      } as never,
    });
    await handleDatabaseMongoAction({
      ...commonInput,
      dbConfig: {
        actionCategory: 'delete',
        action: 'deleteOne',
      } as never,
    });
    const nullResult = await handleDatabaseMongoAction({
      ...commonInput,
      dbConfig: {
        actionCategory: 'other',
        action: 'find',
      } as never,
    });

    expect(handleDatabaseMongoCreateActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'insertOne',
        collection: 'products',
      })
    );
    expect(handleDatabaseMongoUpdateActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'updateOne',
        collection: 'products',
        updateTemplate: '',
      })
    );
    expect(handleDatabaseMongoDeleteActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'deleteOne',
        collection: 'products',
      })
    );
    expect(nullResult).toBeNull();
  });
});
