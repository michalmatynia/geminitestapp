import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge, RuntimeState } from '@/shared/lib/ai-paths';

import { useCanvasSidebarActions } from '../useCanvasSidebarActions';

const mockState = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  ConfirmationModal: vi.fn(() => null),
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  setRuntimeState: vi.fn(),
  selectNode: vi.fn(),
  selectEdge: vi.fn(),
  updateSelectedNode: vi.fn(),
  setDragData: vi.fn(),
  graphState: {
    nodes: [] as AiNode[],
    edges: [] as Edge[],
    isPathLocked: false,
  },
  selectionState: {
    selectedNodeId: null as string | null,
    selectedNodeIds: [] as string[],
    selectedEdgeId: null as string | null,
  },
  persistenceState: {
    isPathSwitching: false,
  },
}));
const graphActionsMock = {
  setNodes: mockState.setNodes,
  setEdges: mockState.setEdges,
};

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({ toast: mockState.toast }),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mockState.confirm,
    ConfirmationModal: mockState.ConfirmationModal,
  }),
}));

vi.mock('@/shared/utils/drag-drop', () => ({
  DRAG_KEYS: { AI_NODE: 'ai-node' },
  setDragData: (...args: unknown[]) => mockState.setDragData(...args),
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  useGraphDataState: () => mockState.graphState,
  usePathMetadataState: () => mockState.graphState,
  useGraphActions: () => graphActionsMock,
  useRuntimeActions: () => ({
    setRuntimeState: mockState.setRuntimeState,
  }),
  useSelectionState: () => mockState.selectionState,
  useSelectionActions: () => ({
    selectNode: mockState.selectNode,
    selectEdge: mockState.selectEdge,
  }),
  usePersistenceState: () => mockState.persistenceState,
}));

vi.mock(
  '@/features/ai/ai-paths/components/ai-paths-settings/hooks/useAiPathsNodeConfigActions',
  () => ({
    useAiPathsNodeConfigActions: ({
      selectedNodeId,
    }: {
      selectedNodeId: string | null;
    }) => ({
      updateSelectedNode: mockState.updateSelectedNode,
      selectedNodeId,
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
    ...patch,
  }) as AiNode;

const buildEdge = (patch: Partial<Edge> = {}): Edge =>
  ({
    id: 'edge-1',
    from: 'node-a',
    to: 'node-b',
    fromPort: 'result',
    toPort: 'value',
    ...patch,
  }) as Edge;

describe('useCanvasSidebarActions', () => {
  beforeEach(() => {
    mockState.toast.mockReset();
    mockState.confirm.mockReset();
    mockState.setNodes.mockReset();
    mockState.setEdges.mockReset();
    mockState.setRuntimeState.mockReset();
    mockState.selectNode.mockReset();
    mockState.selectEdge.mockReset();
    mockState.updateSelectedNode.mockReset();
    mockState.setDragData.mockReset();
    mockState.graphState.nodes = [];
    mockState.graphState.edges = [];
    mockState.graphState.isPathLocked = false;
    mockState.selectionState.selectedNodeId = null;
    mockState.selectionState.selectedNodeIds = [];
    mockState.selectionState.selectedEdgeId = null;
    mockState.persistenceState.isPathSwitching = false;
  });

  it('returns the node config updater and confirmation modal from its child hooks', () => {
    mockState.selectionState.selectedNodeId = 'node-7';

    const { result } = renderHook(() => useCanvasSidebarActions());

    expect(result.current.updateSelectedNode).toBe(mockState.updateSelectedNode);
    expect(result.current.ConfirmationModal).toBe(mockState.ConfirmationModal);
  });

  it('blocks drag start on locked paths and otherwise seeds drag data for the palette node', () => {
    const paletteNode = {
      type: 'model',
      title: 'Model',
      description: 'Palette node',
      inputs: [],
      outputs: [],
      config: {},
    };
    const lockedEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {},
    } as unknown as React.DragEvent<HTMLDivElement>;

    mockState.graphState.isPathLocked = true;
    const { result, rerender } = renderHook(() => useCanvasSidebarActions());

    act(() => {
      result.current.handleDragStart(lockedEvent, paletteNode as never);
    });

    expect(lockedEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockState.toast).toHaveBeenCalledWith(
      'This path is locked. Unlock it in Path Settings to make changes.',
      { variant: 'info' }
    );
    expect(mockState.setDragData).not.toHaveBeenCalled();

    mockState.graphState.isPathLocked = false;
    rerender();
    const unlockedEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: 'none' },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      result.current.handleDragStart(unlockedEvent, paletteNode as never);
    });

    expect(unlockedEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockState.setDragData).toHaveBeenCalledWith(
      unlockedEvent.dataTransfer,
      { 'ai-node': JSON.stringify(paletteNode) },
      { effectAllowed: 'copy' }
    );
  });

  it('removes an edge, prunes orphaned runtime inputs, and clears the selected edge when needed', () => {
    mockState.graphState.edges = [
      buildEdge({ id: 'edge-1', to: 'node-b', toPort: 'value' }),
      buildEdge({ id: 'edge-2', to: 'node-c', toPort: 'other' }),
    ];
    mockState.selectionState.selectedEdgeId = 'edge-1';

    const { result } = renderHook(() => useCanvasSidebarActions());

    act(() => {
      result.current.handleRemoveEdge('edge-1');
    });

    expect(mockState.setEdges).toHaveBeenCalledWith([mockState.graphState.edges[1]]);
    expect(mockState.setRuntimeState).toHaveBeenCalledTimes(1);
    const updater = mockState.setRuntimeState.mock.calls[0]?.[0] as (
      prev: RuntimeState
    ) => RuntimeState;
    expect(
      updater({
        inputs: {
          'node-b': { value: 'remove-me' },
          'node-c': { other: 'keep-me' },
        },
        outputs: {},
        status: 'idle',
      } as RuntimeState)
    ).toEqual({
      inputs: {
        'node-c': { other: 'keep-me' },
      },
      outputs: {},
      status: 'idle',
    });
    expect(mockState.selectEdge).toHaveBeenCalledWith(null);
  });

  it('skips edge removal when the path is locked or the target edge is missing', () => {
    mockState.graphState.edges = [buildEdge({ id: 'edge-1' })];
    mockState.graphState.isPathLocked = true;

    const { result, rerender } = renderHook(() => useCanvasSidebarActions());

    act(() => {
      result.current.handleRemoveEdge('edge-1');
    });

    expect(mockState.toast).toHaveBeenCalledWith(
      'This path is locked. Unlock it in Path Settings to make changes.',
      { variant: 'info' }
    );
    expect(mockState.setEdges).not.toHaveBeenCalled();
    expect(mockState.setRuntimeState).not.toHaveBeenCalled();

    mockState.toast.mockReset();
    mockState.graphState.isPathLocked = false;
    rerender();

    act(() => {
      result.current.handleRemoveEdge('missing-edge');
    });

    expect(mockState.toast).not.toHaveBeenCalled();
    expect(mockState.setEdges).not.toHaveBeenCalled();
    expect(mockState.setRuntimeState).not.toHaveBeenCalled();
  });

  it('returns early while paths are switching and ignores blank selected edge ids', () => {
    mockState.persistenceState.isPathSwitching = true;
    mockState.selectionState.selectedNodeIds = ['node-a'];
    const { result, rerender } = renderHook(() => useCanvasSidebarActions());

    act(() => {
      result.current.handleDeleteSelectedNode();
    });

    expect(mockState.confirm).not.toHaveBeenCalled();
    expect(mockState.setNodes).not.toHaveBeenCalled();

    mockState.persistenceState.isPathSwitching = false;
    mockState.selectionState.selectedNodeIds = [];
    mockState.selectionState.selectedEdgeId = '   ';

    rerender();

    act(() => {
      result.current.handleDeleteSelectedNode();
    });

    expect(mockState.setEdges).not.toHaveBeenCalled();
    expect(mockState.setRuntimeState).not.toHaveBeenCalled();
    expect(mockState.selectEdge).not.toHaveBeenCalled();
  });

  it('deletes the selected edge when no nodes are selected', () => {
    const edge = buildEdge({ id: 'edge-1', to: 'node-b', toPort: 'value' });
    mockState.graphState.edges = [edge];
    mockState.selectionState.selectedNodeIds = [];
    mockState.selectionState.selectedEdgeId = 'edge-1';

    const { result } = renderHook(() => useCanvasSidebarActions());

    act(() => {
      result.current.handleDeleteSelectedNode();
    });

    expect(mockState.setEdges).toHaveBeenCalledWith([]);
    expect(mockState.setRuntimeState).toHaveBeenCalledTimes(1);
    const updater = mockState.setRuntimeState.mock.calls[0]?.[0] as (
      prev: RuntimeState
    ) => RuntimeState;
    expect(
      updater({
        inputs: {
          'node-b': { value: 'remove-me' },
        },
        outputs: {},
        status: 'idle',
      } as RuntimeState)
    ).toEqual({
      inputs: {},
      outputs: {},
      status: 'idle',
    });
    expect(mockState.selectEdge).toHaveBeenCalledWith(null);
  });

  it('shows the locked toast instead of deleting selected nodes on locked paths', () => {
    mockState.graphState.isPathLocked = true;
    mockState.selectionState.selectedNodeIds = ['node-a'];

    const { result } = renderHook(() => useCanvasSidebarActions());

    act(() => {
      result.current.handleDeleteSelectedNode();
    });

    expect(mockState.toast).toHaveBeenCalledWith(
      'This path is locked. Unlock it in Path Settings to make changes.',
      { variant: 'info' }
    );
    expect(mockState.confirm).not.toHaveBeenCalled();
  });

  it('confirms and deletes a single selected node along with its connected wires', () => {
    const nodeA = buildNode({ id: 'node-a', title: 'Alpha' });
    const nodeB = buildNode({ id: 'node-b', title: 'Beta' });
    const removedEdge = buildEdge({ id: 'edge-1', from: 'node-a', to: 'node-b', toPort: 'value' });
    const keptEdge = buildEdge({ id: 'edge-2', from: 'node-c', to: 'node-d', toPort: 'other' });

    mockState.graphState.nodes = [nodeA, nodeB];
    mockState.graphState.edges = [removedEdge, keptEdge];
    mockState.selectionState.selectedNodeIds = ['node-a'];
    mockState.selectionState.selectedEdgeId = 'edge-1';

    const { result } = renderHook(() => useCanvasSidebarActions());

    act(() => {
      result.current.handleDeleteSelectedNode();
    });

    expect(mockState.confirm).toHaveBeenCalledTimes(1);
    const confirmConfig = mockState.confirm.mock.calls[0]?.[0] as {
      title: string;
      message: string;
      confirmText: string;
      isDangerous: boolean;
      onConfirm: () => void;
    };

    expect(confirmConfig.title).toBe('Remove Node?');
    expect(confirmConfig.message).toBe(
      'Are you sure you want to remove Alpha? This will delete all connected wires.'
    );
    expect(confirmConfig.confirmText).toBe('Remove');
    expect(confirmConfig.isDangerous).toBe(true);

    act(() => {
      confirmConfig.onConfirm();
    });

    expect(mockState.setNodes).toHaveBeenCalledWith([nodeB]);
    expect(mockState.setEdges).toHaveBeenCalledWith([keptEdge]);
    expect(mockState.selectNode).toHaveBeenCalledWith(null);
    expect(mockState.selectEdge).toHaveBeenCalledWith(null);

    const updater = mockState.setRuntimeState.mock.calls[0]?.[0] as (
      prev: RuntimeState
    ) => RuntimeState;
    expect(
      updater({
        inputs: {
          'node-b': { value: 'remove-me' },
          'node-d': { other: 'keep-me' },
        },
        outputs: {},
        status: 'idle',
      } as RuntimeState)
    ).toEqual({
      inputs: {
        'node-d': { other: 'keep-me' },
      },
      outputs: {},
      status: 'idle',
    });
  });

  it('uses a count label when deleting multiple selected nodes', () => {
    mockState.graphState.nodes = [buildNode({ id: 'node-a' }), buildNode({ id: 'node-b' })];
    mockState.graphState.edges = [buildEdge({ id: 'edge-1', from: 'node-a' })];
    mockState.selectionState.selectedNodeIds = ['node-a', 'node-b'];

    const { result } = renderHook(() => useCanvasSidebarActions());

    act(() => {
      result.current.handleDeleteSelectedNode();
    });

    expect(mockState.confirm).toHaveBeenCalledTimes(1);
    expect(mockState.confirm.mock.calls[0]?.[0]?.message).toBe(
      'Are you sure you want to remove 2 nodes? This will delete all connected wires.'
    );
  });
});
