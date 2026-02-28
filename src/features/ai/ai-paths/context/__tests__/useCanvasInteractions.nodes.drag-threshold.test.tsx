import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/lib/ai-paths';

import { useCanvasInteractionsNodes } from '../hooks/useCanvasInteractions.nodes';

const buildNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-1',
    type: 'template',
    title: 'Node 1',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 40, y: 40 },
    data: {},
    ...patch,
  }) as AiNode;

const createPointerEvent = (
  currentTarget: Element,
  patch: Partial<React.PointerEvent<Element>> = {}
): React.PointerEvent<Element> =>
  ({
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    stopPropagation: vi.fn(),
    currentTarget,
    target: currentTarget,
    nativeEvent: {
      currentTarget,
    },
    ...patch,
  }) as React.PointerEvent<Element>;

const buildHookProps = (): Parameters<typeof useCanvasInteractionsNodes>[0] => {
  const node = buildNode();
  return {
    nodes: [node],
    edges: [],
    isPathLocked: false,
    notifyLocked: vi.fn(),
    confirmNodeSwitch: undefined,
    selectedNodeIdSet: new Set<string>(),
    selectedNodeId: null,
    selectedNodeIds: [],
    setNodes: vi.fn(),
    updateNode: vi.fn(),
    removeNode: vi.fn(),
    setNodeSelection: vi.fn(),
    toggleNodeSelection: vi.fn(),
    selectNode: vi.fn(),
    selectEdge: vi.fn(),
    startDrag: vi.fn(),
    endDrag: vi.fn(),
    dragState: null,
    updateLastPointerCanvasPosFromClient: (clientX: number, clientY: number) => ({
      x: clientX,
      y: clientY,
    }),
    stopViewAnimation: vi.fn(),
    resolveActiveNodeSelectionIds: () => [],
    confirm: vi.fn(),
    setEdges: vi.fn(),
    setRuntimeState: vi.fn(),
    pruneRuntimeInputsInternal: (state) => state,
    viewportRef: { current: document.createElement('div') },
    canvasRef: { current: document.createElementNS('http://www.w3.org/2000/svg', 'svg') },
    view: { x: 0, y: 0, scale: 1 },
    setLastDrop: vi.fn(),
    ensureNodeVisible: vi.fn(),
    toast: vi.fn(),
  };
};

describe('useCanvasInteractionsNodes drag threshold', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', ((callback: FrameRequestCallback): number => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn() as unknown as typeof cancelAnimationFrame);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not start a drag for pointer movement below the threshold', async () => {
    const props = buildHookProps();
    const target = document.createElement('div');
    const { result } = renderHook(() => useCanvasInteractionsNodes(props));

    await act(async () => {
      await result.current.handlePointerDownNode(createPointerEvent(target), 'node-1');
    });

    act(() => {
      result.current.handlePointerMoveNode(
        createPointerEvent(target, {
          clientX: 102,
          clientY: 102,
        }),
        'node-1'
      );
    });

    act(() => {
      result.current.handlePointerUpNode(createPointerEvent(target), 'node-1');
    });

    expect(props.startDrag).not.toHaveBeenCalled();
    expect(props.updateNode).not.toHaveBeenCalled();
    expect(result.current.consumeSuppressedNodeClick('node-1')).toBe(false);
  });

  it('starts a drag after threshold crossing and suppresses the trailing click', async () => {
    const props = buildHookProps();
    const target = document.createElement('div');
    const { result } = renderHook(() => useCanvasInteractionsNodes(props));

    await act(async () => {
      await result.current.handlePointerDownNode(createPointerEvent(target), 'node-1');
    });

    act(() => {
      result.current.handlePointerMoveNode(
        createPointerEvent(target, {
          clientX: 110,
          clientY: 110,
        }),
        'node-1'
      );
    });

    act(() => {
      result.current.handlePointerUpNode(
        createPointerEvent(target, {
          clientX: 110,
          clientY: 110,
        }),
        'node-1'
      );
    });

    expect(props.startDrag).toHaveBeenCalledWith('node-1', 60, 60);
    expect(props.updateNode).toHaveBeenCalledWith('node-1', {
      position: { x: 50, y: 50 },
    });
    expect(props.endDrag).toHaveBeenCalledTimes(1);
    expect(result.current.consumeSuppressedNodeClick('node-1')).toBe(true);
    expect(result.current.consumeSuppressedNodeClick('node-1')).toBe(false);
  });
});
