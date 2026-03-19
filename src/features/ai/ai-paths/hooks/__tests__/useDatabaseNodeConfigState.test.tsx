/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROMPT_ENGINE_SETTINGS_KEY } from '@/shared/lib/prompt-engine/settings';

import { useDatabaseNodeConfigState } from '../useDatabaseNodeConfigState';

const state = vi.hoisted(() => ({
  selectedNode: null as Record<string, unknown> | null,
  nodes: [] as Array<Record<string, unknown>>,
  edges: [] as Array<Record<string, unknown>>,
  runtimeState: {} as Record<string, unknown>,
  pathDebugSnapshot: null as unknown,
  updaterSamples: {} as Record<string, { entityId?: string; json?: string } | undefined>,
  dbQueryPresets: [] as Array<Record<string, unknown>>,
  settingsMapData: new Map<string, string>(),
  schemaQueryResult: {
    data: {
      provider: 'mongodb',
      collections: [],
    },
    error: null as Error | null,
    isLoading: false,
    refetch: vi.fn(),
  },
}));

const mocks = vi.hoisted(() => ({
  updateSelectedNodeConfigMock: vi.fn(),
  toastMock: vi.fn(),
  handleFetchUpdaterSampleMock: vi.fn(),
  setDbQueryPresetsMock: vi.fn((next: Array<Record<string, unknown>>) => {
    state.dbQueryPresets = next;
  }),
  saveDbQueryPresetsMock: vi.fn(async () => undefined),
  updateQueryConfigMock: vi.fn(),
  handleRunQueryMock: vi.fn(),
  handleProviderChangeMock: vi.fn(),
  handleActionCategoryChangeMock: vi.fn(),
  applyActionConfigMock: vi.fn(),
  mappingStateValue: {
    updateMapping: vi.fn(),
    removeMapping: vi.fn(),
    addMapping: vi.fn(),
    mapInputsToTargets: vi.fn(),
  },
  createPresetIdMock: vi.fn(() => 'preset-new'),
  extractJsonPathEntriesMock: vi.fn(() => [{ path: 'profile.name' }, { path: 'profile.email' }]),
  dbSchemaMock: vi.fn(async () => ({ ok: true, data: state.schemaQueryResult.data })),
  resolveDbActionProviderMock: vi.fn(() => 'mongodb'),
  safeParseJsonMock: vi.fn((value: string) => {
    if (!value.trim()) {
      return { value: null, error: null };
    }
    return {
      value: {
        parsed: true,
      },
      error: null,
    };
  }),
  parsePromptEngineSettingsMock: vi.fn(() => ({ enabled: true, source: 'mock' })),
  createListQueryV2Mock: vi.fn(() => state.schemaQueryResult),
  createMutationV2Mock: vi.fn(),
  ConfirmationModalMock: vi.fn(() => null),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    ConfirmationModal: mocks.ConfirmationModalMock,
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => ({
    data: state.settingsMapData,
  }),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  createPresetId: () => mocks.createPresetIdMock(),
  extractJsonPathEntries: (...args: unknown[]) => mocks.extractJsonPathEntriesMock(...args),
  dbApi: {
    schema: (...args: unknown[]) => mocks.dbSchemaMock(...args),
  },
}));

vi.mock('@/shared/lib/ai-paths/core/utils/provider-actions', () => ({
  resolveDbActionProvider: (...args: unknown[]) => mocks.resolveDbActionProviderMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/core/utils/runtime', () => ({
  safeParseJson: (...args: unknown[]) => mocks.safeParseJsonMock(...args),
}));

vi.mock('@/shared/lib/prompt-engine/settings', () => ({
  PROMPT_ENGINE_SETTINGS_KEY: 'prompt_engine_settings',
  parsePromptEngineSettings: (...args: unknown[]) => mocks.parsePromptEngineSettingsMock(...args),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2:
    mocks.createListQueryV2Mock as typeof import('@/shared/lib/query-factories-v2').createListQueryV2,
  createMutationV2:
    mocks.createMutationV2Mock as typeof import('@/shared/lib/query-factories-v2').createMutationV2,
}));

vi.mock('../../components/AiPathConfigContext', () => ({
  useAiPathSelection: () => ({
    selectedNode: state.selectedNode,
  }),
  useAiPathGraph: () => ({
    nodes: state.nodes,
    edges: state.edges,
  }),
  useAiPathRuntime: () => ({
    runtimeState: state.runtimeState,
    pathDebugSnapshot: state.pathDebugSnapshot,
    updaterSamples: state.updaterSamples,
    handleFetchUpdaterSample: mocks.handleFetchUpdaterSampleMock,
  }),
  useAiPathOrchestrator: () => ({
    updateSelectedNodeConfig: mocks.updateSelectedNodeConfigMock,
    toast: mocks.toastMock,
  }),
  useAiPathPresets: () => ({
    dbQueryPresets: state.dbQueryPresets,
    setDbQueryPresets: mocks.setDbQueryPresetsMock,
    saveDbQueryPresets: mocks.saveDbQueryPresetsMock,
  }),
}));

vi.mock('../database-node/useDatabaseActionConfig', () => ({
  useDatabaseActionConfig: () => ({
    handleProviderChange: mocks.handleProviderChangeMock,
    handleActionCategoryChange: mocks.handleActionCategoryChangeMock,
    applyActionConfig: mocks.applyActionConfigMock,
  }),
}));

vi.mock('../database-node/useDatabaseMappingState', () => ({
  useDatabaseMappingState: () => mocks.mappingStateValue,
}));

vi.mock('../database-node/useDatabaseQueryExecution', () => ({
  useDatabaseQueryExecution: () => ({
    handleRunQuery: mocks.handleRunQueryMock,
    updateQueryConfig: mocks.updateQueryConfigMock,
  }),
}));

const selectedNodeId = 'db-node-1';

const buildDatabaseNode = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: selectedNodeId,
  type: 'database',
  config: {
    db_schema: {
      provider: 'mongodb',
    },
    database: {
      actionCategory: 'read',
      action: 'find',
      operation: 'query',
      presetId: 'custom',
      aiPrompt: 'Hello',
      query: {
        provider: 'auto',
        collection: 'products',
        mode: 'custom',
        preset: 'by_id',
        field: '_id',
        idType: 'string',
        queryTemplate: 'ABCD',
        limit: 20,
        sort: '',
        projection: '',
        single: false,
      },
      mappings: [{ targetPath: 'profile.name', sourcePort: 'bundle', sourcePath: 'name' }],
      schemaSnapshot: {
        version: 1,
      },
    },
  },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  state.selectedNode = buildDatabaseNode();
  state.nodes = [
    state.selectedNode,
    {
      id: 'parser-node-1',
      type: 'parser',
      config: {
        parser: {
          mappings: {
            sku: '$.sku',
            title: '$.title',
          },
        },
      },
    },
  ];
  state.edges = [
    {
      from: 'parser-node-1',
      fromPort: 'bundle',
      to: selectedNodeId,
    },
    {
      from: 'upstream-node-1',
      fromPort: 'customPort',
      to: selectedNodeId,
    },
  ];
  state.runtimeState = {
    inputs: {
      [selectedNodeId]: {
        entityId: 'product-123',
      },
    },
    outputs: {},
  };
  state.pathDebugSnapshot = { snapshot: true };
  state.updaterSamples = {};
  state.dbQueryPresets = [
    {
      id: 'preset-1',
      name: 'Preset One',
      queryTemplate: '{ "id": "{{value}}" }',
      updateTemplate: '',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'preset-2',
      name: 'Preset Two',
      queryTemplate: '{ "name": "{{value}}" }',
      updateTemplate: '',
      createdAt: '2026-03-02T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
    },
  ];
  state.settingsMapData = new Map([[PROMPT_ENGINE_SETTINGS_KEY, '{"enabled":true}']]);
  state.schemaQueryResult = {
    data: {
      provider: 'mongodb',
      collections: [],
    },
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  };
  mocks.dbSchemaMock.mockResolvedValue({ ok: true, data: state.schemaQueryResult.data });
  mocks.createListQueryV2Mock.mockImplementation(() => state.schemaQueryResult);
  mocks.createMutationV2Mock.mockImplementation((config: {
    mutationFn?: (variables: unknown) => Promise<unknown>;
    onSuccess?: (data: unknown, variables: unknown) => void | Promise<void>;
    onError?: (error: Error, variables: unknown) => void | Promise<void>;
  }) => ({
    isPending: false,
    mutate: async (variables: unknown) => {
      try {
        const data = config.mutationFn ? await config.mutationFn(variables) : undefined;
        await config.onSuccess?.(data, variables);
        return data;
      } catch (error) {
        await config.onError?.(error as Error, variables);
        throw error;
      }
    },
    mutateAsync: async (variables: unknown) => {
      try {
        const data = config.mutationFn ? await config.mutationFn(variables) : undefined;
        await config.onSuccess?.(data, variables);
        return data;
      } catch (error) {
        await config.onError?.(error as Error, variables);
        throw error;
      }
    },
  }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useDatabaseNodeConfigState', () => {
  it('derives prompt-engine settings, ports, bundle keys, snippets, and parsed sample paths', async () => {
    state.updaterSamples = {
      [selectedNodeId]: {
        entityId: 'product-123',
        json: '{"profile":{"name":"Ada"}}',
      },
    };
    state.selectedNode = buildDatabaseNode({
      config: {
        db_schema: {
          provider: 'mongodb',
        },
        database: {
          actionCategory: 'read',
          action: 'find',
          operation: 'query',
          presetId: 'custom',
          aiPrompt: 'Hello',
          query: {
            provider: 'auto',
            collection: 'products',
            mode: 'custom',
            preset: 'by_id',
            field: '_id',
            idType: 'string',
            queryTemplate: 'before ```js\nconst sample = 1;\n``` after',
            limit: 20,
            sort: '',
            projection: '',
            single: false,
          },
          mappings: [],
          schemaSnapshot: {
            version: 1,
          },
        },
      },
    });

    const { result } = renderHook(() => useDatabaseNodeConfigState());

    await waitFor(() => {
      expect(result.current.uniqueTargetPathOptions).toEqual(['profile.name', 'profile.email']);
    });

    expect(result.current.promptEngineSettings).toEqual({ enabled: true, source: 'mock' });
    expect(mocks.parsePromptEngineSettingsMock).toHaveBeenCalledWith('{"enabled":true}');
    expect(result.current.availablePorts).toEqual(['result', 'bundle', 'value', 'jobId', 'customPort']);
    expect(result.current.bundleKeys).toEqual(['sku', 'title']);
    expect(result.current.codeSnippets).toEqual(['const sample = 1;']);
    expect(result.current.parsedSampleError).toBeUndefined();
    expect(mocks.handleFetchUpdaterSampleMock).not.toHaveBeenCalled();
  });

  it('auto-fetches an updater sample once per detected entity + collection', async () => {
    const { rerender } = renderHook(() => useDatabaseNodeConfigState());

    await waitFor(() => {
      expect(mocks.handleFetchUpdaterSampleMock).toHaveBeenCalledWith(
        selectedNodeId,
        'products',
        'product-123',
        { notify: false }
      );
    });

    rerender();

    await waitFor(() => {
      expect(mocks.handleFetchUpdaterSampleMock).toHaveBeenCalledTimes(1);
    });
  });

  it('syncs schema and applies the success toast', async () => {
    const { result } = renderHook(() => useDatabaseNodeConfigState());

    await act(async () => {
      await result.current.handleSyncSchema();
    });

    expect(mocks.dbSchemaMock).toHaveBeenCalledTimes(1);
    expect(mocks.toastMock).toHaveBeenCalledWith('Schema synced', { variant: 'success' });
  });

  it('updates query templates through the custom path and presets path', async () => {
    const { result } = renderHook(() => useDatabaseNodeConfigState());

    const textArea = document.createElement('textarea');
    textArea.value = 'ABCD';
    textArea.setSelectionRange(1, 3);
    result.current.queryTemplateRef.current = textArea;

    act(() => {
      result.current.insertTemplateSnippet('{{value}}');
    });

    expect(mocks.updateQueryConfigMock).toHaveBeenCalledWith({
      mode: 'custom',
      queryTemplate: 'A{{value}}D',
    });

    act(() => {
      result.current.setSelectedAiQueryId('ai-query-1');
    });

    await waitFor(() => {
      expect(result.current.selectedAiQueryId).toBe('ai-query-1');
    });

    act(() => {
      result.current.applyQueryTemplateUpdate('{ "id": "{{value}}" }');
    });

    expect(mocks.updateSelectedNodeConfigMock).toHaveBeenCalledWith({
      database: expect.objectContaining({
        presetId: 'custom',
        query: expect.objectContaining({
          mode: 'custom',
          queryTemplate: '{ "id": "{{value}}" }',
        }),
      }),
    });

    await waitFor(() => {
      expect(result.current.selectedAiQueryId).toBe('');
    });
  });

  it('updates the update template and AI prompt placeholders for update actions', async () => {
    state.selectedNode = buildDatabaseNode({
      config: {
        db_schema: {
          provider: 'mongodb',
        },
        database: {
          actionCategory: 'update',
          action: 'updateMany',
          operation: 'update',
          presetId: 'custom',
          aiPrompt: 'Hello',
          updateTemplate: '{"status":"draft"}',
          query: {
            provider: 'auto',
            collection: 'products',
            mode: 'custom',
            preset: 'by_id',
            field: '_id',
            idType: 'string',
            queryTemplate: '{"id":"{{value}}"}',
            limit: 20,
            sort: '',
            projection: '',
            single: false,
          },
          mappings: [],
        },
      },
    });

    const { result } = renderHook(() => useDatabaseNodeConfigState());

    const aiPromptArea = document.createElement('textarea');
    aiPromptArea.value = 'Hello';
    aiPromptArea.setSelectionRange(5, 5);
    result.current.aiPromptRef.current = aiPromptArea;

    act(() => {
      result.current.applyQueryTemplateUpdate('{"status":"published"}');
      result.current.insertAiPromptPlaceholder('{{sku}}');
    });

    expect(mocks.updateSelectedNodeConfigMock).toHaveBeenNthCalledWith(1, {
      database: expect.objectContaining({
        updateTemplate: '{"status":"published"}',
      }),
    });
    expect(mocks.updateSelectedNodeConfigMock).toHaveBeenNthCalledWith(2, {
      database: expect.objectContaining({
        aiPrompt: 'Hello{{sku}}',
      }),
    });
    expect(mocks.updateQueryConfigMock).not.toHaveBeenCalled();
  });

  it('creates, renames, and deletes query presets', async () => {
    const { result } = renderHook(() => useDatabaseNodeConfigState());

    await act(async () => {
      await result.current.handleSaveQueryPreset('   ');
    });

    expect(mocks.toastMock).toHaveBeenCalledWith('Name required', { variant: 'error' });

    await act(async () => {
      await result.current.handleSaveQueryPreset('Saved Preset', { forceNew: true });
    });

    expect(mocks.setDbQueryPresetsMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'preset-new',
          name: 'Saved Preset',
          queryTemplate: 'ABCD',
        }),
      ])
    );
    expect(mocks.saveDbQueryPresetsMock).toHaveBeenCalled();
    expect(mocks.toastMock).toHaveBeenCalledWith('Saved', { variant: 'success' });
    expect(result.current.selectedQueryPresetId).toBe('preset-new');

    await act(async () => {
      await result.current.handleRenameQueryPreset('preset-1', 'Renamed Preset');
    });

    expect(mocks.saveDbQueryPresetsMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'preset-1',
          name: 'Renamed Preset',
        }),
      ])
    );

    act(() => {
      result.current.setSelectedQueryPresetId('preset-1');
    });

    await waitFor(() => {
      expect(result.current.selectedQueryPresetId).toBe('preset-1');
    });

    await act(async () => {
      await result.current.handleDeleteQueryPresetById('preset-1');
    });

    expect(mocks.saveDbQueryPresetsMock).toHaveBeenCalledWith(
      expect.not.arrayContaining([expect.objectContaining({ id: 'preset-1' })])
    );
    expect(result.current.selectedQueryPresetId).toBe('custom');
  });

  it('applies the query-by-id preset patch', () => {
    const { result } = renderHook(() => useDatabaseNodeConfigState());

    act(() => {
      result.current.applyDatabasePreset('query_by_id');
    });

    expect(mocks.updateSelectedNodeConfigMock).toHaveBeenCalledWith({
      database: expect.objectContaining({
        presetId: 'query_by_id',
        actionCategory: 'read',
        action: 'findOne',
        operation: 'query',
        entityType: 'product',
        query: expect.objectContaining({
          collection: 'products',
          preset: 'by_id',
          idType: 'string',
          queryTemplate: '{\n  "id": "{{value}}"\n}',
          single: true,
        }),
      }),
    });
  });
});
