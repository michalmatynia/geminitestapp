/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAiPathsPresets } from './useAiPathsPresets';

const state = vi.hoisted(() => ({
  graphNodes: [] as Array<Record<string, unknown>>,
  graphEdges: [] as Array<Record<string, unknown>>,
  presetsState: {
    clusterPresets: [] as Array<Record<string, unknown>>,
    dbQueryPresets: [] as Array<Record<string, unknown>>,
    dbNodePresets: [] as Array<Record<string, unknown>>,
    editingPresetId: null as string | null,
    presetDraft: {
      name: '',
      description: '',
      bundlePorts: '',
      template: '',
    },
    presetsModalOpen: false,
    presetsJson: '',
    expandedPaletteGroups: new Set<string>(),
    paletteCollapsed: false,
  },
  persistenceHandlers: {} as Record<string, unknown>,
}));

const mocks = vi.hoisted(() => ({
  setNodesMock: vi.fn(),
  setEdgesMock: vi.fn(),
  selectNodeMock: vi.fn(),
  selectEdgeMock: vi.fn(),
  updateAiPathsSettingMock: vi.fn(),
  logClientErrorMock: vi.fn(),
  createPresetIdMock: vi.fn(),
  toastMock: vi.fn(),
  confirmMock: vi.fn(),
  reportAiPathsErrorMock: vi.fn(),
  ensureNodeVisibleMock: vi.fn(),
}));

const basePresetDraft = {
  name: '',
  description: '',
  bundlePorts: '',
  template: '',
};

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => ({
    setNodes: mocks.setNodesMock,
    setEdges: mocks.setEdgesMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/PresetsContext', () => ({
  usePresetsState: () => state.presetsState,
  usePresetsActions: () => ({
    setClusterPresets: (
      next:
        | Array<Record<string, unknown>>
        | ((prev: Array<Record<string, unknown>>) => Array<Record<string, unknown>>)
    ) => {
      state.presetsState.clusterPresets =
        typeof next === 'function' ? next(state.presetsState.clusterPresets) : next;
    },
    setDbQueryPresets: (
      next:
        | Array<Record<string, unknown>>
        | ((prev: Array<Record<string, unknown>>) => Array<Record<string, unknown>>)
    ) => {
      state.presetsState.dbQueryPresets =
        typeof next === 'function' ? next(state.presetsState.dbQueryPresets) : next;
    },
    setDbNodePresets: (
      next:
        | Array<Record<string, unknown>>
        | ((prev: Array<Record<string, unknown>>) => Array<Record<string, unknown>>)
    ) => {
      state.presetsState.dbNodePresets =
        typeof next === 'function' ? next(state.presetsState.dbNodePresets) : next;
    },
    setPresetDraft: (
      next:
        | typeof state.presetsState.presetDraft
        | ((prev: typeof state.presetsState.presetDraft) => typeof state.presetsState.presetDraft)
    ) => {
      state.presetsState.presetDraft =
        typeof next === 'function' ? next(state.presetsState.presetDraft) : next;
    },
    setPresetsModalOpen: (open: boolean) => {
      state.presetsState.presetsModalOpen = open;
    },
    setPresetsJson: (json: string) => {
      state.presetsState.presetsJson = json;
    },
    setExpandedPaletteGroups: (
      next: Set<string> | ((prev: Set<string>) => Set<string>)
    ) => {
      state.presetsState.expandedPaletteGroups =
        typeof next === 'function' ? next(state.presetsState.expandedPaletteGroups) : next;
    },
    setPaletteCollapsed: (collapsed: boolean) => {
      state.presetsState.paletteCollapsed = collapsed;
    },
    setEditingPresetId: (id: string | null) => {
      state.presetsState.editingPresetId = id;
    },
    resetPresetDraft: () => {
      state.presetsState.editingPresetId = null;
      state.presetsState.presetDraft = { ...basePresetDraft };
    },
    setPresetPersistenceHandlers: (handlers: Record<string, unknown>) => {
      state.persistenceHandlers = handlers;
    },
    normalizeClusterPreset: (raw: Partial<Record<string, unknown>>) => ({
      id: String(raw.id ?? 'normalized-preset'),
      name: String(raw.name ?? 'Imported Preset'),
      description: String(raw.description ?? ''),
      bundlePorts: Array.isArray(raw.bundlePorts) ? raw.bundlePorts : ['bundle'],
      template: String(raw.template ?? ''),
      createdAt: String(raw.createdAt ?? '2026-03-19T00:00:00.000Z'),
      updatedAt: String(raw.updatedAt ?? '2026-03-19T00:00:00.000Z'),
    }),
    normalizeDbQueryPreset: (raw: Partial<Record<string, unknown>>) => ({
      id: String(raw.id ?? 'db-query'),
      name: String(raw.name ?? 'DB Query'),
      queryTemplate: String(raw.queryTemplate ?? ''),
      updateTemplate: String(raw.updateTemplate ?? ''),
      createdAt: String(raw.createdAt ?? '2026-03-19T00:00:00.000Z'),
      updatedAt: String(raw.updatedAt ?? '2026-03-19T00:00:00.000Z'),
    }),
    normalizeDbNodePreset: (raw: Partial<Record<string, unknown>>) => ({
      id: String(raw.id ?? 'db-node'),
      name: String(raw.name ?? 'DB Node'),
      collection: String(raw.collection ?? 'products'),
      action: String(raw.action ?? 'find'),
      createdAt: String(raw.createdAt ?? '2026-03-19T00:00:00.000Z'),
      updatedAt: String(raw.updatedAt ?? '2026-03-19T00:00:00.000Z'),
    }),
    togglePaletteGroup: (title: string) => {
      const next = new Set(state.presetsState.expandedPaletteGroups);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      state.presetsState.expandedPaletteGroups = next;
    },
  }),
}));

vi.mock('@/features/ai/ai-paths/context/SelectionContext', () => ({
  useSelectionActions: () => ({
    selectNode: mocks.selectNodeMock,
    selectEdge: mocks.selectEdgeMock,
  }),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  BUNDLE_INPUT_PORTS: ['bundle'],
  TEMPLATE_INPUT_PORTS: ['bundle'],
  CLUSTER_PRESETS_KEY: 'cluster_presets',
  DB_NODE_PRESETS_KEY: 'db_node_presets',
  DB_QUERY_PRESETS_KEY: 'db_query_presets',
  createPresetId: () => mocks.createPresetIdMock(),
  parsePathList: (value: string) =>
    value
      .split(/\r?\n/)
      .map((entry: string) => entry.trim())
      .filter(Boolean),
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  updateAiPathsSetting: (...args: unknown[]) => mocks.updateAiPathsSettingMock(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mocks.logClientErrorMock(...args),
}));

const buildArgs = (overrides: Partial<Parameters<typeof useAiPathsPresets>[0]> = {}) => ({
  nodes: state.graphNodes as Parameters<typeof useAiPathsPresets>[0]['nodes'],
  edges: state.graphEdges as Parameters<typeof useAiPathsPresets>[0]['edges'],
  selectedNode:
    (state.graphNodes.find((node) => node.id === 'selected-node') as
      | Parameters<typeof useAiPathsPresets>[0]['selectedNode']
      | undefined) ?? null,
  isPathLocked: false,
  ensureNodeVisible: mocks.ensureNodeVisibleMock,
  getCanvasCenterPosition: () => ({ x: 100, y: 200 }),
  toast: mocks.toastMock,
  confirm: mocks.confirmMock,
  reportAiPathsError: mocks.reportAiPathsErrorMock,
  ...overrides,
});

describe('useAiPathsPresets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.graphNodes = [];
    state.graphEdges = [];
    state.presetsState = {
      clusterPresets: [
        {
          id: 'preset-1',
          name: 'Existing Preset',
          description: 'Existing description',
          bundlePorts: ['bundle', 'summary'],
          template: 'Existing template',
          createdAt: '2026-03-18T00:00:00.000Z',
          updatedAt: '2026-03-18T00:00:00.000Z',
        },
      ],
      dbQueryPresets: [
        {
          id: 'query-1',
          name: 'Query Preset',
          queryTemplate: '{}',
          updateTemplate: '',
          createdAt: '2026-03-18T00:00:00.000Z',
          updatedAt: '2026-03-18T00:00:00.000Z',
        },
      ],
      dbNodePresets: [
        {
          id: 'node-1',
          name: 'Node Preset',
          collection: 'products',
          action: 'find',
          createdAt: '2026-03-18T00:00:00.000Z',
          updatedAt: '2026-03-18T00:00:00.000Z',
        },
      ],
      editingPresetId: null,
      presetDraft: { ...basePresetDraft },
      presetsModalOpen: false,
      presetsJson: '',
      expandedPaletteGroups: new Set<string>(),
      paletteCollapsed: false,
    };
    state.persistenceHandlers = {};

    mocks.setNodesMock.mockImplementation((updater: (prev: typeof state.graphNodes) => typeof state.graphNodes) => {
      state.graphNodes = updater(state.graphNodes);
    });
    mocks.setEdgesMock.mockImplementation((updater: (prev: typeof state.graphEdges) => typeof state.graphEdges) => {
      state.graphEdges = updater(state.graphEdges);
    });
    mocks.createPresetIdMock.mockReset();
    mocks.createPresetIdMock.mockReturnValue('preset-new');
    mocks.updateAiPathsSettingMock.mockReset();
    mocks.updateAiPathsSettingMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers persistence handlers and supports state setters', () => {
    const { result, unmount, rerender } = renderHook(() => useAiPathsPresets(buildArgs()));

    expect(state.persistenceHandlers).toEqual({
      saveDbQueryPresets: expect.any(Function),
      saveDbNodePresets: expect.any(Function),
    });

    act(() => {
      result.current.setPresetsModalOpen(true);
      result.current.setPresetsJson('[1]');
      result.current.setPaletteCollapsed((prev) => !prev);
      result.current.togglePaletteGroup('Templates');
    });
    rerender();

    expect(state.presetsState.presetsModalOpen).toBe(true);
    expect(state.presetsState.presetsJson).toBe('[1]');
    expect(state.presetsState.paletteCollapsed).toBe(true);
    expect(state.presetsState.expandedPaletteGroups).toEqual(new Set(['Templates']));

    unmount();
    expect(state.persistenceHandlers).toEqual({});
  });

  it('creates, loads, and deletes cluster presets', async () => {
    state.presetsState.presetDraft = {
      name: 'New Preset',
      description: 'New description',
      bundlePorts: 'bundle\nsummary',
      template: 'Prompt body',
    };

    const { result, rerender } = renderHook(() => useAiPathsPresets(buildArgs()));

    await act(async () => {
      await result.current.handleSavePreset();
    });
    rerender();

    expect(state.presetsState.clusterPresets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'preset-new',
          name: 'New Preset',
          bundlePorts: ['bundle', 'summary'],
          template: 'Prompt body',
        }),
      ])
    );
    expect(mocks.updateAiPathsSettingMock).toHaveBeenCalledWith(
      'cluster_presets',
      expect.stringContaining('New Preset')
    );
    expect(mocks.toastMock).toHaveBeenCalledWith('Cluster preset saved.', {
      variant: 'success',
    });

    const savedPreset = state.presetsState.clusterPresets.find((preset) => preset.id === 'preset-new');
    expect(savedPreset).toBeTruthy();

    act(() => {
      result.current.handleLoadPreset(savedPreset as never);
    });
    rerender();

    expect(state.presetsState.editingPresetId).toBe('preset-new');
    expect(state.presetsState.presetDraft).toEqual({
      name: 'New Preset',
      description: 'New description',
      bundlePorts: 'bundle\nsummary',
      template: 'Prompt body',
    });

    act(() => {
      void result.current.handleDeletePreset('preset-new');
    });
    const deleteConfig = mocks.confirmMock.mock.calls.at(-1)?.[0];
    expect(deleteConfig).toMatchObject({
      title: 'Delete Preset?',
      confirmText: 'Delete',
      isDangerous: true,
    });

    await act(async () => {
      await deleteConfig.onConfirm();
    });
    rerender();

    expect(state.presetsState.clusterPresets).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'preset-new' })])
    );
    expect(state.presetsState.editingPresetId).toBe(null);
    expect(state.presetsState.presetDraft).toEqual(basePresetDraft);
    expect(mocks.toastMock).toHaveBeenCalledWith('Preset deleted.', {
      variant: 'success',
    });
  });

  it('applies presets to the graph and guards locked paths', () => {
    const preset = state.presetsState.clusterPresets[0];
    const { result } = renderHook(() => useAiPathsPresets(buildArgs()));

    act(() => {
      result.current.handleApplyPreset(preset as never);
    });

    expect(state.graphNodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'bundle',
          title: 'Existing Preset Bundle',
          position: { x: 100, y: 200 },
        }),
        expect.objectContaining({
          type: 'template',
          title: 'Existing Preset Template',
          position: { x: 420, y: 200 },
        }),
      ])
    );
    expect(state.graphEdges).toEqual([
      expect.objectContaining({
        fromPort: 'bundle',
        toPort: 'bundle',
      }),
    ]);
    expect(mocks.selectEdgeMock).toHaveBeenCalledWith(null);
    expect(mocks.selectNodeMock).toHaveBeenCalledWith(
      expect.stringMatching(/^node-/)
    );
    expect(mocks.ensureNodeVisibleMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'template' })
    );
    expect(mocks.toastMock).toHaveBeenCalledWith('Preset applied: Existing Preset', {
      variant: 'success',
    });

    state.graphNodes = [];
    state.graphEdges = [];
    mocks.toastMock.mockClear();
    const lockedHook = renderHook(() => useAiPathsPresets(buildArgs({ isPathLocked: true })));

    act(() => {
      lockedHook.result.current.handleApplyPreset(preset as never);
    });

    expect(state.graphNodes).toEqual([]);
    expect(state.graphEdges).toEqual([]);
    expect(mocks.toastMock).toHaveBeenCalledWith(
      'This path is locked. Unlock it to apply presets.',
      { variant: 'info' }
    );
  });

  it('exports presets and imports them in merge and replace modes', async () => {
    mocks.createPresetIdMock
      .mockReturnValueOnce('preset-duplicate')
      .mockReturnValueOnce('preset-merge');

    const { result, rerender } = renderHook(() => useAiPathsPresets(buildArgs()));

    act(() => {
      result.current.handleExportPresets();
    });

    expect(state.presetsState.presetsModalOpen).toBe(true);
    expect(state.presetsState.presetsJson).toContain('Existing Preset');

    state.presetsState.presetsJson = JSON.stringify([
      {
        id: 'preset-1',
        name: 'Duplicate Imported',
        description: 'dup',
        bundlePorts: ['bundle'],
        template: 'dup',
        createdAt: '2026-03-19T00:00:00.000Z',
        updatedAt: '2026-03-19T00:00:00.000Z',
      },
      {
        id: 'preset-merge-source',
        name: 'Merged Preset',
        description: 'merge',
        bundlePorts: ['summary'],
        template: 'merge',
        createdAt: '2026-03-19T00:00:00.000Z',
        updatedAt: '2026-03-19T00:00:00.000Z',
      },
    ]);
    rerender();

    await act(async () => {
      await result.current.handleImportPresets('merge');
    });
    rerender();

    expect(state.presetsState.clusterPresets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'preset-duplicate', name: 'Duplicate Imported' }),
        expect.objectContaining({ id: 'preset-merge-source', name: 'Merged Preset' }),
      ])
    );
    expect(mocks.toastMock).toHaveBeenCalledWith('Presets imported.', {
      variant: 'success',
    });

    state.presetsState.presetsJson = JSON.stringify({
      presets: [
        {
          id: 'preset-replace',
          name: 'Replacement Preset',
          description: 'replace',
          bundlePorts: ['bundle'],
          template: 'replacement',
          createdAt: '2026-03-19T00:00:00.000Z',
          updatedAt: '2026-03-19T00:00:00.000Z',
        },
      ],
    });
    rerender();

    await act(async () => {
      await result.current.handleImportPresets('replace');
    });

    const replaceConfig = mocks.confirmMock.mock.calls.at(-1)?.[0];
    expect(replaceConfig).toMatchObject({
      title: 'Replace Presets?',
      confirmText: 'Replace All',
      isDangerous: true,
    });

    await act(async () => {
      await replaceConfig.onConfirm();
    });
    rerender();

    expect(state.presetsState.clusterPresets).toEqual([
      expect.objectContaining({
        id: 'preset-replace',
        name: 'Replacement Preset',
      }),
    ]);
  });

  it('handles import validation and persistence errors', async () => {
    const { result, rerender } = renderHook(() => useAiPathsPresets(buildArgs()));

    await act(async () => {
      await result.current.handleImportPresets('merge');
    });
    expect(mocks.toastMock).toHaveBeenCalledWith('Paste presets JSON to import.', {
      variant: 'error',
    });

    state.presetsState.presetsJson = '{"foo":true}';
    rerender();
    await act(async () => {
      await result.current.handleImportPresets('merge');
    });
    expect(mocks.toastMock).toHaveBeenCalledWith('Invalid presets JSON. Expected an array.', {
      variant: 'error',
    });

    state.presetsState.presetsJson = '{';
    rerender();
    await act(async () => {
      await result.current.handleImportPresets('merge');
    });
    expect(mocks.logClientErrorMock).toHaveBeenCalled();
    expect(mocks.reportAiPathsErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      { action: 'importPresets' },
      'Failed to import presets:'
    );
    expect(mocks.toastMock).toHaveBeenCalledWith(
      'Failed to import presets. Check JSON format.',
      { variant: 'error' }
    );

    mocks.updateAiPathsSettingMock.mockRejectedValueOnce(new Error('cluster save failed'));
    await act(async () => {
      await result.current.saveClusterPresets(state.presetsState.clusterPresets as never);
    });
    expect(mocks.reportAiPathsErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      { action: 'saveClusterPresets' },
      'Failed to save presets:'
    );

    mocks.updateAiPathsSettingMock.mockRejectedValueOnce(new Error('query save failed'));
    await expect(
      result.current.saveDbQueryPresets(state.presetsState.dbQueryPresets as never)
    ).rejects.toThrow('query save failed');
    expect(mocks.reportAiPathsErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      { action: 'saveDbQueryPresets' },
      'Failed to save query presets:'
    );

    mocks.updateAiPathsSettingMock.mockRejectedValueOnce(new Error('node save failed'));
    await act(async () => {
      await result.current.saveDbNodePresets(state.presetsState.dbNodePresets as never);
    });
    expect(mocks.reportAiPathsErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      { action: 'saveDbNodePresets' },
      'Failed to save database presets:'
    );
  });

  it('builds preset drafts from selected bundle/template pairs', () => {
    state.graphNodes = [
      {
        id: 'bundle-1',
        type: 'bundle',
        title: 'Bundle One',
        description: 'Bundle description',
        inputs: ['bundle'],
        config: {
          bundle: {
            includePorts: ['bundle', 'summary'],
          },
        },
      },
      {
        id: 'bundle-2',
        type: 'bundle',
        title: 'Bundle Two',
        description: 'Unused bundle',
        inputs: ['bundle'],
        config: {
          bundle: {
            includePorts: ['bundle'],
          },
        },
      },
      {
        id: 'selected-node',
        type: 'template',
        title: 'SEO Template',
        config: {
          template: {
            template: 'Prompt body',
          },
        },
      },
    ];
    state.graphEdges = [
      { from: 'bundle-1', to: 'selected-node', toPort: 'bundle' },
      { from: 'bundle-2', to: 'selected-node', toPort: 'bundle' },
    ];

    const { result, rerender } = renderHook(() => useAiPathsPresets(buildArgs()));

    act(() => {
      result.current.handlePresetFromSelection();
    });
    rerender();

    expect(mocks.toastMock).toHaveBeenCalledWith(
      'Multiple bundles connected. Using the first one.',
      { variant: 'info' }
    );
    expect(state.presetsState.presetDraft).toEqual({
      name: 'SEO',
      description: 'Bundle description',
      bundlePorts: 'bundle\nsummary',
      template: 'Prompt body',
    });
    expect(mocks.toastMock).toHaveBeenCalledWith('Preset draft loaded from selection.', {
      variant: 'success',
    });

    state.graphNodes = [];
    state.graphEdges = [];
    rerender();

    act(() => {
      result.current.handlePresetFromSelection();
    });

    expect(mocks.toastMock).toHaveBeenCalledWith(
      'Select a connected Bundle + Template pair.',
      { variant: 'error' }
    );
  });
});
