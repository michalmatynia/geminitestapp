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
const setGraphNodesMock = vi.fn();
const setGraphEdgesMock = vi.fn();

vi.mock('@/features/ai/ai-paths/context/CanvasContext', () => ({
  useCanvasRefs: () => ({
    viewportRef: { current: null },
    canvasRef: { current: null },
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
  useGraphActions: () => ({
    setNodes: setGraphNodesMock,
    setEdges: setGraphEdgesMock,
  }),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    ConfirmationModal: () => null,
  }),
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

    const setNodesMock = vi.fn((updater: AiNode[] | ((prev: AiNode[]) => AiNode[])) => {
      nodesState = typeof updater === 'function' ? updater(nodesState) : updater;
    });
    const setEdgesMock = vi.fn((updater: Edge[] | ((prev: Edge[]) => Edge[])) => {
      edgesState = typeof updater === 'function' ? updater(edgesState) : updater;
    });

    selectionStateMock = {
      selectedEdgeId: null,
      selectedNodeId: 'node-a',
      selectedNodeIds: ['node-a'],
    };

    renderHook(() =>
      useAiPathsCanvasInteractions({
        nodes: nodesState,
        setNodes: setNodesMock,
        edges: edgesState,
        setEdges: setEdgesMock,
        isPathLocked: false,
        selectedNodeId: 'node-a',
        setSelectedNodeId: vi.fn(),
        confirmNodeSwitch: undefined,
        confirm: confirmMock,
        clearRuntimeInputsForEdges: clearRuntimeInputsForEdgesMock,
        reportAiPathsError: vi.fn(),
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

    const setEdgesMock = vi.fn((updater: Edge[] | ((prev: Edge[]) => Edge[])) => {
      edgesState = typeof updater === 'function' ? updater(edgesState) : updater;
    });

    selectionStateMock = {
      selectedEdgeId: 'edge-a-a',
      selectedNodeId: null,
      selectedNodeIds: [],
    };

    renderHook(() =>
      useAiPathsCanvasInteractions({
        nodes: [node],
        setNodes: vi.fn(),
        edges: edgesState,
        setEdges: setEdgesMock,
        isPathLocked: false,
        selectedNodeId: null,
        setSelectedNodeId: vi.fn(),
        confirmNodeSwitch: undefined,
        confirm: confirmMock,
        clearRuntimeInputsForEdges: vi.fn(),
        reportAiPathsError: vi.fn(),
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

    renderHook(() =>
      useAiPathsCanvasInteractions({
        nodes: [
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
        ],
        setNodes: vi.fn(),
        edges: [],
        setEdges: vi.fn(),
        isPathLocked: false,
        selectedNodeId: 'node-a',
        setSelectedNodeId: vi.fn(),
        confirmNodeSwitch: undefined,
        confirm: confirmMock,
        clearRuntimeInputsForEdges: vi.fn(),
        reportAiPathsError: vi.fn(),
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
