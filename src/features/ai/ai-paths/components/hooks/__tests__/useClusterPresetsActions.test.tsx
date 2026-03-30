import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode, ClusterPreset, Edge } from '@/shared/contracts/ai-paths';

import { useClusterPresetsActions } from '../useClusterPresetsActions';

const mockState = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  ConfirmationModal: vi.fn(() => null),
  updateAiPathsSetting: vi.fn(),
  reportAiPathsError: vi.fn(),
  logClientError: vi.fn(), logClientCatch: vi.fn(),
  createPresetId: vi.fn(() => 'preset-generated'),
  parsePathList: vi.fn((value: string) =>
    value
      .split('\n')
      .map((part) => part.trim())
      .filter(Boolean)
  ),
  presetsState: {
    clusterPresets: [] as ClusterPreset[],
    presetDraft: {
      name: '',
      description: '',
      bundlePorts: '',
      template: '',
    },
    editingPresetId: null as string | null,
  },
  presetsActions: {
    setPresetsJson: vi.fn(),
    setPresetsModalOpen: vi.fn(),
    setEditingPresetId: vi.fn(),
    setPresetDraft: vi.fn(),
    setClusterPresets: vi.fn(),
  },
  graphState: {
    nodes: [] as AiNode[],
    edges: [] as Edge[],
    isPathLocked: false,
  },
  graphActions: {
    setNodes: vi.fn(),
    setEdges: vi.fn(),
  },
  selectionState: {
    selectedNodeId: null as string | null,
  },
  selectionActions: {
    selectEdge: vi.fn(),
    selectNode: vi.fn(),
  },
  canvasState: {
    view: { x: 0, y: 0, scale: 1 },
  },
  viewportRef: {
    current: {
      getBoundingClientRect: () => ({ width: 200, height: 100 }),
    },
  },
  updateView: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mockState.toast }),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mockState.confirm,
    ConfirmationModal: mockState.ConfirmationModal,
  }),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  BUNDLE_INPUT_PORTS: ['bundle', 'context'],
  TEMPLATE_INPUT_PORTS: ['bundle'],
  CLUSTER_PRESETS_KEY: 'cluster-presets',
  NODE_MIN_HEIGHT: 50,
  NODE_WIDTH: 100,
  VIEW_MARGIN: 10,
  createPresetId: () => mockState.createPresetId(),
  parsePathList: (value: string) => mockState.parsePathList(value),
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  updateAiPathsSetting: (...args: unknown[]) => mockState.updateAiPathsSetting(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
}));

vi.mock('@/features/ai/ai-paths/context/CanvasContext', () => ({
  useCanvasState: () => mockState.canvasState,
  useCanvasRefs: () => ({ viewportRef: mockState.viewportRef }),
  useCanvasActions: () => {
    const canvasActions = {
      updateView: mockState.updateView,
    };
    return canvasActions;
  },
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphState: () => mockState.graphState,
  useGraphActions: () => mockState.graphActions,
}));

vi.mock('@/features/ai/ai-paths/context/PresetsContext', () => ({
  usePresetsState: () => mockState.presetsState,
  usePresetsActions: () => mockState.presetsActions,
}));

vi.mock('@/features/ai/ai-paths/context/SelectionContext', () => ({
  useSelectionState: () => mockState.selectionState,
  useSelectionActions: () => mockState.selectionActions,
}));

vi.mock(
  '@/features/ai/ai-paths/components/ai-paths-settings/hooks/useAiPathsErrorState',
  () => ({
    useAiPathsErrorState: () => ({
      reportAiPathsError: mockState.reportAiPathsError,
    }),
  })
);

const buildNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-1',
    type: 'template',
    title: 'Node 1',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    data: {},
    createdAt: '2026-03-19T00:00:00.000Z',
    updatedAt: null,
    ...patch,
  }) as AiNode;

const buildEdge = (patch: Partial<Edge> = {}): Edge =>
  ({
    id: 'edge-1',
    from: 'node-a',
    to: 'node-b',
    fromPort: 'bundle',
    toPort: 'bundle',
    ...patch,
  }) as Edge;

const buildPreset = (patch: Partial<ClusterPreset> = {}): ClusterPreset =>
  ({
    id: 'preset-1',
    name: 'Starter',
    description: 'Starter preset',
    bundlePorts: ['bundle', 'context'],
    template: 'Prompt body',
    createdAt: '2026-03-19T09:00:00.000Z',
    updatedAt: '2026-03-19T09:00:00.000Z',
    ...patch,
  }) as ClusterPreset;

describe('useClusterPresetsActions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T12:00:00.000Z'));

    mockState.toast.mockReset();
    mockState.confirm.mockReset();
    mockState.updateAiPathsSetting.mockReset().mockResolvedValue(undefined);
    mockState.reportAiPathsError.mockReset();
    mockState.logClientError.mockReset();
    mockState.createPresetId.mockClear();
    mockState.parsePathList.mockClear();
    mockState.presetsState.clusterPresets = [];
    mockState.presetsState.presetDraft = {
      name: '',
      description: '',
      bundlePorts: '',
      template: '',
    };
    mockState.presetsState.editingPresetId = null;
    mockState.presetsActions.setPresetsJson.mockReset();
    mockState.presetsActions.setPresetsModalOpen.mockReset();
    mockState.presetsActions.setEditingPresetId.mockReset();
    mockState.presetsActions.setPresetDraft.mockReset();
    mockState.presetsActions.setClusterPresets.mockReset();
    mockState.graphState.nodes = [];
    mockState.graphState.edges = [];
    mockState.graphState.isPathLocked = false;
    mockState.graphActions.setNodes.mockReset();
    mockState.graphActions.setEdges.mockReset();
    mockState.selectionState.selectedNodeId = null;
    mockState.selectionActions.selectEdge.mockReset();
    mockState.selectionActions.selectNode.mockReset();
    mockState.canvasState.view = { x: 0, y: 0, scale: 1 };
    mockState.viewportRef.current = {
      getBoundingClientRect: () => ({ width: 200, height: 100 }),
    };
    mockState.updateView.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('exports presets into the modal and returns the confirmation modal', () => {
    mockState.presetsState.clusterPresets = [buildPreset()];

    const { result } = renderHook(() => useClusterPresetsActions());

    act(() => {
      result.current.handleExportPresets();
    });

    expect(result.current.ConfirmationModal).toBe(mockState.ConfirmationModal);
    expect(mockState.presetsActions.setPresetsJson).toHaveBeenCalledWith(
      JSON.stringify(mockState.presetsState.clusterPresets, null, 2)
    );
    expect(mockState.presetsActions.setPresetsModalOpen).toHaveBeenCalledWith(true);
  });

  it('loads a draft from a selected template and uses the first connected bundle', () => {
    const template = buildNode({
      id: 'template-1',
      type: 'template',
      title: 'Welcome Template',
      config: {
        template: {
          template: 'Hello {{name}}',
        },
      },
    });
    const bundleA = buildNode({
      id: 'bundle-a',
      type: 'bundle',
      title: 'Bundle A',
      description: 'Bundle A description',
      inputs: ['fallback'],
      config: {
        bundle: {
          includePorts: ['bundle', 'context'],
        },
      },
    });
    const bundleB = buildNode({
      id: 'bundle-b',
      type: 'bundle',
      title: 'Bundle B',
      description: 'Bundle B description',
    });
    mockState.graphState.nodes = [template, bundleA, bundleB];
    mockState.graphState.edges = [
      buildEdge({ id: 'edge-a', from: 'bundle-a', to: 'template-1' }),
      buildEdge({ id: 'edge-b', from: 'bundle-b', to: 'template-1' }),
    ];
    mockState.selectionState.selectedNodeId = 'template-1';

    const { result } = renderHook(() => useClusterPresetsActions());

    act(() => {
      result.current.handlePresetFromSelection();
    });

    expect(mockState.toast).toHaveBeenNthCalledWith(1, 'Multiple bundles connected. Using the first one.', {
      variant: 'info',
    });
    expect(mockState.presetsActions.setEditingPresetId).toHaveBeenCalledWith(null);
    expect(mockState.presetsActions.setPresetDraft).toHaveBeenCalledWith({
      name: 'Welcome',
      description: 'Bundle A description',
      bundlePorts: 'bundle\ncontext',
      template: 'Hello {{name}}',
    });
    expect(mockState.toast).toHaveBeenNthCalledWith(2, 'Preset draft loaded from selection.', {
      variant: 'success',
    });
  });

  it('loads a draft from a selected bundle and uses the first connected template', () => {
    const bundle = buildNode({
      id: 'bundle-1',
      type: 'bundle',
      title: 'Source Bundle',
      description: 'Bundle description',
      config: {
        bundle: {
          includePorts: ['summary'],
        },
      },
    });
    const templateA = buildNode({
      id: 'template-a',
      type: 'template',
      title: 'Answer Template',
      config: {
        template: {
          template: 'Answer {{question}}',
        },
      },
    });
    const templateB = buildNode({
      id: 'template-b',
      type: 'template',
      title: 'Backup Template',
      config: {
        template: {
          template: 'Backup',
        },
      },
    });
    mockState.graphState.nodes = [bundle, templateA, templateB];
    mockState.graphState.edges = [
      buildEdge({ id: 'edge-a', from: 'bundle-1', to: 'template-a' }),
      buildEdge({ id: 'edge-b', from: 'bundle-1', to: 'template-b' }),
    ];
    mockState.selectionState.selectedNodeId = 'bundle-1';

    const { result } = renderHook(() => useClusterPresetsActions());

    act(() => {
      result.current.handlePresetFromSelection();
    });

    expect(mockState.toast).toHaveBeenNthCalledWith(
      1,
      'Multiple templates connected. Using the first one.',
      { variant: 'info' }
    );
    expect(mockState.presetsActions.setPresetDraft).toHaveBeenCalledWith({
      name: 'Answer',
      description: 'Bundle description',
      bundlePorts: 'summary',
      template: 'Answer {{question}}',
    });
  });

  it('shows an error when the selection does not resolve to a bundle/template pair', () => {
    mockState.graphState.nodes = [buildNode({ id: 'node-x', type: 'note', title: 'Loose node' })];
    mockState.selectionState.selectedNodeId = 'node-x';

    const { result } = renderHook(() => useClusterPresetsActions());

    act(() => {
      result.current.handlePresetFromSelection();
    });

    expect(mockState.presetsActions.setPresetDraft).not.toHaveBeenCalled();
    expect(mockState.toast).toHaveBeenCalledWith('Select a connected Bundle + Template pair.', {
      variant: 'error',
    });
  });

  it('requires a preset name before saving', async () => {
    mockState.presetsState.presetDraft = {
      name: '   ',
      description: 'desc',
      bundlePorts: 'bundle',
      template: 'prompt',
    };

    const { result } = renderHook(() => useClusterPresetsActions());

    await act(async () => {
      await result.current.handleSavePreset();
    });

    expect(mockState.presetsActions.setClusterPresets).not.toHaveBeenCalled();
    expect(mockState.updateAiPathsSetting).not.toHaveBeenCalled();
    expect(mockState.toast).toHaveBeenCalledWith('Preset name is required.', { variant: 'error' });
  });

  it('creates a new preset, persists it, and clears edit mode', async () => {
    mockState.presetsState.presetDraft = {
      name: '  New Preset  ',
      description: '  Cluster description  ',
      bundlePorts: 'bundle\ncontext',
      template: '  Prompt template  ',
    };

    const { result } = renderHook(() => useClusterPresetsActions());

    await act(async () => {
      await result.current.handleSavePreset();
    });

    expect(mockState.parsePathList).toHaveBeenCalledWith('bundle\ncontext');
    const nextPresets = mockState.presetsActions.setClusterPresets.mock.calls[0]?.[0] as ClusterPreset[];
    expect(nextPresets).toEqual([
      {
        id: 'preset-generated',
        name: 'New Preset',
        description: 'Cluster description',
        bundlePorts: ['bundle', 'context'],
        template: 'Prompt template',
        createdAt: '2026-03-19T12:00:00.000Z',
        updatedAt: '2026-03-19T12:00:00.000Z',
      },
    ]);
    expect(mockState.updateAiPathsSetting).toHaveBeenCalledWith(
      'cluster-presets',
      JSON.stringify(nextPresets)
    );
    expect(mockState.presetsActions.setEditingPresetId).toHaveBeenCalledWith(null);
    expect(mockState.toast).toHaveBeenCalledWith('Cluster preset saved.', { variant: 'success' });
  });

  it('updates an existing preset in place when editing', async () => {
    mockState.presetsState.clusterPresets = [
      buildPreset({
        id: 'preset-1',
        name: 'Old Name',
        description: 'Old Description',
        template: 'Old Template',
        bundlePorts: ['legacy'],
      }),
    ];
    mockState.presetsState.editingPresetId = 'preset-1';
    mockState.presetsState.presetDraft = {
      name: 'Updated Name',
      description: 'Updated Description',
      bundlePorts: 'bundle\nsummary',
      template: 'Updated Template',
    };

    const { result } = renderHook(() => useClusterPresetsActions());

    await act(async () => {
      await result.current.handleSavePreset();
    });

    expect(mockState.presetsActions.setClusterPresets).toHaveBeenCalledTimes(1);
    expect(mockState.presetsActions.setClusterPresets.mock.calls[0]?.[0]).toEqual([
      {
        id: 'preset-1',
        name: 'Updated Name',
        description: 'Updated Description',
        bundlePorts: ['bundle', 'summary'],
        template: 'Updated Template',
        createdAt: '2026-03-19T09:00:00.000Z',
        updatedAt: '2026-03-19T12:00:00.000Z',
      },
    ]);
  });

  it('reports persistence failures while still resolving the save flow', async () => {
    mockState.presetsState.presetDraft = {
      name: 'Broken Save',
      description: 'desc',
      bundlePorts: 'bundle',
      template: 'prompt',
    };
    const error = new Error('write failed');
    mockState.updateAiPathsSetting.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useClusterPresetsActions());

    await act(async () => {
      await result.current.handleSavePreset();
    });

    expect(mockState.logClientError).toHaveBeenCalledWith(error);
    expect(mockState.reportAiPathsError).toHaveBeenCalledWith(
      error,
      { action: 'saveClusterPresets' },
      'Failed to save presets:'
    );
    expect(mockState.toast).toHaveBeenNthCalledWith(1, 'Failed to save cluster presets.', {
      variant: 'error',
    });
    expect(mockState.toast).toHaveBeenNthCalledWith(2, 'Cluster preset saved.', {
      variant: 'success',
    });
  });

  it('confirms preset deletion and persists the filtered list', async () => {
    mockState.presetsState.clusterPresets = [
      buildPreset({ id: 'preset-1', name: 'Delete Me' }),
      buildPreset({ id: 'preset-2', name: 'Keep Me' }),
    ];

    const { result } = renderHook(() => useClusterPresetsActions());

    await act(async () => {
      await result.current.handleDeletePreset('preset-1');
    });

    expect(mockState.confirm).toHaveBeenCalledTimes(1);
    const confirmConfig = mockState.confirm.mock.calls[0]?.[0] as {
      title: string;
      message: string;
      confirmText: string;
      isDangerous: boolean;
      onConfirm: () => Promise<void>;
    };
    expect(confirmConfig.title).toBe('Delete Preset?');
    expect(confirmConfig.message).toBe(
      'Are you sure you want to delete preset "Delete Me"? This action cannot be undone.'
    );
    expect(confirmConfig.confirmText).toBe('Delete');
    expect(confirmConfig.isDangerous).toBe(true);

    await act(async () => {
      await confirmConfig.onConfirm();
    });

    const nextPresets = mockState.presetsActions.setClusterPresets.mock.calls[0]?.[0] as ClusterPreset[];
    expect(nextPresets).toEqual([
      expect.objectContaining({ id: 'preset-2', name: 'Keep Me' }),
    ]);
    expect(mockState.updateAiPathsSetting).toHaveBeenCalledWith(
      'cluster-presets',
      JSON.stringify(nextPresets)
    );
    expect(mockState.toast).toHaveBeenCalledWith('Preset deleted.', { variant: 'success' });
  });

  it('applies a preset by creating bundle/template nodes, wiring them, and centering the view', () => {
    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.123456)
      .mockReturnValueOnce(0.654321)
      .mockReturnValueOnce(0.777777);

    const preset = buildPreset({
      name: 'Reusable',
      description: 'Reusable description',
      bundlePorts: ['bundle', 'context'],
      template: 'Prompt {{value}}',
    });

    const { result } = renderHook(() => useClusterPresetsActions());

    act(() => {
      result.current.handleApplyPreset(preset);
    });

    expect(mockState.graphActions.setNodes).toHaveBeenCalledTimes(1);
    expect(mockState.graphActions.setEdges).toHaveBeenCalledTimes(1);
    expect(mockState.selectionActions.selectEdge).toHaveBeenCalledWith(null);

    const nodesUpdater = mockState.graphActions.setNodes.mock.calls[0]?.[0] as (
      prev: AiNode[]
    ) => AiNode[];
    const createdNodes = nodesUpdater([]);
    expect(createdNodes).toHaveLength(2);
    expect(createdNodes[0]).toEqual(
      expect.objectContaining({
        type: 'bundle',
        title: 'Reusable Bundle',
        description: 'Reusable description',
        inputs: ['bundle', 'context'],
        outputs: ['bundle'],
        position: { x: 100, y: 50 },
        config: { bundle: { includePorts: ['bundle', 'context'] } },
      })
    );
    expect(createdNodes[1]).toEqual(
      expect.objectContaining({
        type: 'template',
        title: 'Reusable Template',
        description: 'Preset template prompt.',
        inputs: ['bundle'],
        outputs: ['prompt'],
        position: { x: 420, y: 50 },
        config: { template: { template: 'Prompt {{value}}' } },
      })
    );

    const edgesUpdater = mockState.graphActions.setEdges.mock.calls[0]?.[0] as (
      prev: Edge[]
    ) => Edge[];
    const createdEdges = edgesUpdater([]);
    expect(createdEdges).toHaveLength(1);
    expect(createdEdges[0]).toEqual(
      expect.objectContaining({
        from: createdNodes[0]?.id,
        to: createdNodes[1]?.id,
        fromPort: 'bundle',
        toPort: 'bundle',
      })
    );

    expect(mockState.selectionActions.selectNode).toHaveBeenCalledWith(createdNodes[1]?.id);
    expect(mockState.updateView).toHaveBeenCalledWith({ x: -330, y: -10, scale: 1 });
    expect(mockState.toast).toHaveBeenCalledWith('Preset applied: Reusable', {
      variant: 'success',
    });

    randomSpy.mockRestore();
  });

  it('blocks preset application on locked paths', () => {
    mockState.graphState.isPathLocked = true;
    const preset = buildPreset({ name: 'Locked Preset' });

    const { result } = renderHook(() => useClusterPresetsActions());

    act(() => {
      result.current.handleApplyPreset(preset);
    });

    expect(mockState.graphActions.setNodes).not.toHaveBeenCalled();
    expect(mockState.graphActions.setEdges).not.toHaveBeenCalled();
    expect(mockState.updateView).not.toHaveBeenCalled();
    expect(mockState.toast).toHaveBeenCalledWith(
      'This path is locked. Unlock it to apply presets.',
      { variant: 'info' }
    );
  });
});
