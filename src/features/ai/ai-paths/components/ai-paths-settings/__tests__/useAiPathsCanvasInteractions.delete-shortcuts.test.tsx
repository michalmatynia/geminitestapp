import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge } from '@/shared/lib/ai-paths';
import { useAiPathsCanvasInteractions } from '@/features/ai/ai-paths/components/ai-paths-settings/useAiPathsCanvasInteractions';

type SelectionStateMock = {
  selectedEdgeId: string | null;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
};

let selectionStateMock: SelectionStateMock = {
  selectedEdgeId: null,
  selectedNodeId: null,
  selectedNodeIds: [],
};

const selectEdgeMock = vi.fn();
const selectNodeMock = vi.fn();
const graphStateMock: { nodes: AiNode[]; edges: Edge[] } = {
  nodes: [],
  edges: [],
};
const canvasStateMock: {
  view: { x: number; y: number; scale: number };
  panState: { startX: number; startY: number; originX: number; originY: number } | null;
  dragState: { nodeId: string; offsetX: number; offsetY: number } | null;
  connecting: { fromNodeId: string; fromPort: string; start: { x: number; y: number } } | null;
  connectingPos: { x: number; y: number } | null;
  lastDrop: { x: number; y: number } | null;
} = {
  view: { x: -600, y: -320, scale: 1 },
  panState: null,
  dragState: null,
  connecting: null,
  connectingPos: null,
  lastDrop: null,
};
const setGraphNodesMock = vi.fn(
  (
    updater: AiNode[] | ((prev: AiNode[]) => AiNode[]),
    _meta?: { reason?: string; source?: string }
  ) => {
    graphStateMock.nodes = typeof updater === 'function' ? updater(graphStateMock.nodes) : updater;
  }
);
const setGraphEdgesMock = vi.fn(
  (
    updater: Edge[] | ((prev: Edge[]) => Edge[]),
    _meta?: { reason?: string; source?: string }
  ) => {
    graphStateMock.edges = typeof updater === 'function' ? updater(graphStateMock.edges) : updater;
  }
);
const setCanvasViewMock = vi.fn((next: { x: number; y: number; scale: number }) => {
  canvasStateMock.view = next;
});
const startPanMock = vi.fn((startX: number, startY: number) => {
  canvasStateMock.panState = {
    startX,
    startY,
    originX: canvasStateMock.view.x,
    originY: canvasStateMock.view.y,
  };
});
const endPanMock = vi.fn(() => {
  canvasStateMock.panState = null;
});
const startDragMock = vi.fn((nodeId: string, offsetX: number, offsetY: number) => {
  canvasStateMock.dragState = { nodeId, offsetX, offsetY };
});
const endDragMock = vi.fn(() => {
  canvasStateMock.dragState = null;
});
const setConnectingMock = vi.fn(
  (connecting: { fromNodeId: string; fromPort: string; start: { x: number; y: number } } | null) => {
    canvasStateMock.connecting = connecting;
  }
);
const setConnectingPosMock = vi.fn((pos: { x: number; y: number } | null) => {
  canvasStateMock.connectingPos = pos;
});
const startConnectionMock = vi.fn(
  (fromNodeId: string, fromPort: string, start: { x: number; y: number }) => {
    canvasStateMock.connecting = { fromNodeId, fromPort, start };
    canvasStateMock.connectingPos = start;
  }
);
const endConnectionMock = vi.fn(() => {
  canvasStateMock.connecting = null;
  canvasStateMock.connectingPos = null;
});
const setLastDropMock = vi.fn((pos: { x: number; y: number } | null) => {
  canvasStateMock.lastDrop = pos;
});
const canvasInteractionsMock = {
  handlePointerDownNode: vi.fn(),
  handlePointerMoveNode: vi.fn(),
  handlePointerUpNode: vi.fn(),
  handleStartConnection: vi.fn(),
  handleCompleteConnection: vi.fn(),
  handleReconnectInput: vi.fn(),
  handleDragStart: vi.fn(),
  handleDragOver: vi.fn(),
  handleDrop: vi.fn(),
  handleRemoveEdge: vi.fn(),
  handleDisconnectPort: vi.fn(),
  ensureNodeVisible: vi.fn(),
  zoomTo: vi.fn(),
  fitToNodes: vi.fn(),
  resetView: vi.fn(),
  handlePanStart: vi.fn(),
  handlePanMove: vi.fn(),
  handlePanEnd: vi.fn(),
  edgePaths: [] as {
    id: string;
    path: string;
    label?: string;
    arrow?: { x: number; y: number; angle: number };
  }[],
  ConfirmationModal: () => null,
};

vi.mock('@/features/ai/ai-paths/context/CanvasContext', () => ({
  useCanvasRefs: () => ({
    viewportRef: { current: null },
    canvasRef: { current: null },
  }),
  useCanvasState: () => canvasStateMock,
  useCanvasActions: () => ({
    setView: setCanvasViewMock,
    startPan: startPanMock,
    endPan: endPanMock,
    startDrag: startDragMock,
    endDrag: endDragMock,
    setConnecting: setConnectingMock,
    setConnectingPos: setConnectingPosMock,
    startConnection: startConnectionMock,
    endConnection: endConnectionMock,
    setLastDrop: setLastDropMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/SelectionContext', () => ({
  useSelectionState: () => selectionStateMock,
  useSelectionActions: () => ({
    selectEdge: selectEdgeMock,
    selectNode: selectNodeMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphState: () => graphStateMock,
  useGraphActions: () => ({
    setNodes: setGraphNodesMock,
    setEdges: setGraphEdgesMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/hooks/useCanvasInteractions', () => ({
  useCanvasInteractions: () => canvasInteractionsMock,
}));

describe('useAiPathsCanvasInteractions delete shortcuts', () => {
  beforeEach(() => {
    selectionStateMock = {
      selectedEdgeId: null,
      selectedNodeId: null,
      selectedNodeIds: [],
    };
    selectEdgeMock.mockReset();
    selectNodeMock.mockReset();
    setGraphNodesMock.mockReset();
    setGraphEdgesMock.mockReset();
    setCanvasViewMock.mockReset();
    startPanMock.mockReset();
    endPanMock.mockReset();
    startDragMock.mockReset();
    endDragMock.mockReset();
    setConnectingMock.mockReset();
    setConnectingPosMock.mockReset();
    startConnectionMock.mockReset();
    endConnectionMock.mockReset();
    setLastDropMock.mockReset();
    canvasInteractionsMock.handlePointerDownNode.mockReset();
    canvasInteractionsMock.handlePointerMoveNode.mockReset();
    canvasInteractionsMock.handlePointerUpNode.mockReset();
    canvasInteractionsMock.handleStartConnection.mockReset();
    canvasInteractionsMock.handleCompleteConnection.mockReset();
    canvasInteractionsMock.handleReconnectInput.mockReset();
    canvasInteractionsMock.handleDragStart.mockReset();
    canvasInteractionsMock.handleDragOver.mockReset();
    canvasInteractionsMock.handleDrop.mockReset();
    canvasInteractionsMock.handleRemoveEdge.mockReset();
    canvasInteractionsMock.handleDisconnectPort.mockReset();
    canvasInteractionsMock.ensureNodeVisible.mockReset();
    canvasInteractionsMock.zoomTo.mockReset();
    canvasInteractionsMock.fitToNodes.mockReset();
    canvasInteractionsMock.resetView.mockReset();
    canvasInteractionsMock.handlePanStart.mockReset();
    canvasInteractionsMock.handlePanMove.mockReset();
    canvasInteractionsMock.handlePanEnd.mockReset();
    graphStateMock.nodes = [];
    graphStateMock.edges = [];
    canvasStateMock.view = { x: -600, y: -320, scale: 1 };
    canvasStateMock.panState = null;
    canvasStateMock.dragState = null;
    canvasStateMock.connecting = null;
    canvasStateMock.connectingPos = null;
    canvasStateMock.lastDrop = null;
  });

  it('opens remove confirmation on Delete for selected node and removes node on confirm', () => {
    const confirmMock = vi.fn();
    const clearRuntimeInputsForEdgesMock = vi.fn();

    let nodesState: AiNode[] = [
      {
        id: 'node-a',
        type: 'prompt',
        title: 'A',
        description: '',
        inputs: [],
        outputs: [],
        position: { x: 100, y: 100 },
        config: {},
      },
      {
        id: 'node-b',
        type: 'model',
        title: 'B',
        description: '',
        inputs: [],
        outputs: [],
        position: { x: 300, y: 100 },
        config: {},
      },
    ];
    let edgesState: Edge[] = [
      {
        id: 'edge-a-b',
        from: 'node-a',
        to: 'node-b',
        fromPort: 'result',
        toPort: 'prompt',
      },
    ];

    selectionStateMock = {
      selectedEdgeId: null,
      selectedNodeId: 'node-a',
      selectedNodeIds: ['node-a'],
    };
    graphStateMock.nodes = nodesState;
    graphStateMock.edges = edgesState;

    renderHook(() =>
      useAiPathsCanvasInteractions({
        isPathLocked: false,
        confirmNodeSwitch: undefined,
        confirm: confirmMock,
        clearRuntimeInputsForEdges: clearRuntimeInputsForEdgesMock,
        toast: vi.fn(),
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(confirmMock).toHaveBeenCalledTimes(1);
    const config = confirmMock.mock.calls[0]?.[0] as { onConfirm: () => void };
    expect(typeof config?.onConfirm).toBe('function');

    act(() => {
      config.onConfirm();
    });

    expect(setGraphNodesMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({ id: 'node-b' }),
      ],
      expect.objectContaining({
        reason: 'delete',
        source: 'settings.canvas.delete.node',
      })
    );
    expect(setGraphEdgesMock).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        reason: 'delete',
        source: 'settings.canvas.delete.node',
      })
    );
    expect(clearRuntimeInputsForEdgesMock).toHaveBeenCalledTimes(1);
  });

  it('removes selected edge on Delete when no node is selected', () => {
    const confirmMock = vi.fn();

    const node: AiNode = {
      id: 'node-a',
      type: 'prompt',
      title: 'A',
      description: '',
      inputs: [],
      outputs: [],
      position: { x: 100, y: 100 },
      config: {},
    };
    let edgesState: Edge[] = [
      {
        id: 'edge-a-a',
        from: 'node-a',
        to: 'node-a',
        fromPort: 'result',
        toPort: 'prompt',
      },
    ];

    selectionStateMock = {
      selectedEdgeId: 'edge-a-a',
      selectedNodeId: null,
      selectedNodeIds: [],
    };
    graphStateMock.nodes = [node];
    graphStateMock.edges = edgesState;

    renderHook(() =>
      useAiPathsCanvasInteractions({
        isPathLocked: false,
        confirmNodeSwitch: undefined,
        confirm: confirmMock,
        clearRuntimeInputsForEdges: vi.fn(),
        toast: vi.fn(),
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(setGraphEdgesMock).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        reason: 'delete',
        source: 'settings.canvas.delete.edge',
      })
    );
  });

  it('ignores delete shortcut while typing in an input field', () => {
    const confirmMock = vi.fn();

    selectionStateMock = {
      selectedEdgeId: null,
      selectedNodeId: 'node-a',
      selectedNodeIds: ['node-a'],
    };
    graphStateMock.nodes = [
      {
        id: 'node-a',
        type: 'prompt',
        title: 'A',
        description: '',
        inputs: [],
        outputs: [],
        position: { x: 100, y: 100 },
        config: {},
      },
    ];
    graphStateMock.edges = [];

    renderHook(() =>
      useAiPathsCanvasInteractions({
        isPathLocked: false,
        confirmNodeSwitch: undefined,
        confirm: confirmMock,
        clearRuntimeInputsForEdges: vi.fn(),
        toast: vi.fn(),
      })
    );

    const input = document.createElement('input');
    document.body.appendChild(input);

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    });

    expect(confirmMock).not.toHaveBeenCalled();

    input.remove();
  });
});
