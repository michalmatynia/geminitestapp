import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CANVAS_HEIGHT, CANVAS_WIDTH, NODE_MIN_HEIGHT, NODE_WIDTH, type AiNode } from '@/shared/lib/ai-paths';

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
    pointerType: 'mouse',
    buttons: 1,
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

const dispatchWindowPointerEvent = (
  type: 'pointerup' | 'pointercancel',
  pointerId: number
): void => {
  const event = new Event(type) as PointerEvent;
  Object.defineProperty(event, 'pointerId', {
    value: pointerId,
    configurable: true,
  });
  window.dispatchEvent(event);
};

const buildHookProps = (): Parameters<typeof useCanvasInteractionsNodes>[0] => {
  const node = buildNode();
  return {
    nodes: [node],
    edges: [],
    isPathLocked: false,
    notifyLocked: vi.fn(),
    confirmNodeSwitch: undefined,
    selectedNodeIdSet: new Set<string>(),
    selectedNodeIds: [],
    setNodes: vi.fn(),
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
    view: { x: 0, y: 0, scale: 1 },
    setLastDrop: vi.fn(),
    ensureNodeVisible: vi.fn(),
    toast: vi.fn(),
  };
};

type HookProps = Parameters<typeof useCanvasInteractionsNodes>[0];

const resolveLastSetNodesMutation = (
  props: Parameters<typeof useCanvasInteractionsNodes>[0],
  prevNodes: AiNode[] = props.nodes
): { nodes: AiNode[]; mutationMeta: unknown } | null => {
  const calls = (props.setNodes as unknown as { mock: { calls: unknown[][] } }).mock.calls;
  const lastCall = calls[calls.length - 1];
  if (!lastCall) return null;
  const [nextNodes, mutationMeta] = lastCall as [
    AiNode[] | ((prev: AiNode[]) => AiNode[]),
    unknown,
  ];
  return {
    nodes: typeof nextNodes === 'function' ? nextNodes(prevNodes) : nextNodes,
    mutationMeta,
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
    expect(props.setNodes).not.toHaveBeenCalled();
    expect(result.current.consumeSuppressedNodeClick('node-1')).toBe(false);
  });

  it('releases stale pointer capture even when window pointerup arrives for a different pointer id', async () => {
    const props = buildHookProps();
    const target = document.createElement('div');
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    const hasPointerCapture = vi.fn(() => true);
    Object.assign(target, {
      setPointerCapture,
      releasePointerCapture,
      hasPointerCapture,
    });
    const { result } = renderHook(() => useCanvasInteractionsNodes(props));

    await act(async () => {
      await result.current.handlePointerDownNode(
        createPointerEvent(target, {
          pointerId: 1,
        }),
        'node-1'
      );
    });

    act(() => {
      dispatchWindowPointerEvent('pointerup', 2);
    });

    expect(releasePointerCapture).toHaveBeenCalledWith(1);
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
    const mutation = resolveLastSetNodesMutation(props, props.nodes);
    expect(mutation).not.toBeNull();
    expect(mutation?.mutationMeta).toMatchObject({
      reason: 'drag',
    });
    expect(mutation?.nodes.find((node) => node.id === 'node-1')?.position).toEqual({
      x: 50,
      y: 50,
    });
    expect(props.endDrag).toHaveBeenCalledTimes(1);
    expect(result.current.consumeSuppressedNodeClick('node-1')).toBe(true);
    expect(result.current.consumeSuppressedNodeClick('node-1')).toBe(false);
  });

  it('does not force-end drag when dragState transitions to active during pointer move', async () => {
    const target = document.createElement('div');
    const props: HookProps = buildHookProps();
    const { result, rerender } = renderHook(
      (nextProps: HookProps) => useCanvasInteractionsNodes(nextProps),
      { initialProps: props }
    );

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

    expect(props.startDrag).toHaveBeenCalledWith('node-1', 60, 60);
    expect(props.endDrag).not.toHaveBeenCalled();

    act(() => {
      rerender({
        ...props,
        dragState: { nodeId: 'node-1', offsetX: 60, offsetY: 60 },
      });
    });

    expect(props.endDrag).not.toHaveBeenCalled();
  });

  it('converts viewport pointer coordinates to world coordinates when view is transformed', async () => {
    const props = buildHookProps();
    props.nodes = [buildNode({ position: { x: 100, y: 100 } })];
    props.view = { x: 40, y: 20, scale: 2 };
    const target = document.createElement('div');
    const { result } = renderHook(() => useCanvasInteractionsNodes(props));

    await act(async () => {
      // World (100,100) maps to viewport (240,220) at scale=2 and translate (40,20)
      await result.current.handlePointerDownNode(
        createPointerEvent(target, { clientX: 240, clientY: 220 }),
        'node-1'
      );
    });

    act(() => {
      // Move +40 px in viewport => +20 in world at scale=2
      result.current.handlePointerMoveNode(
        createPointerEvent(target, {
          clientX: 280,
          clientY: 220,
        }),
        'node-1'
      );
    });

    act(() => {
      result.current.handlePointerUpNode(
        createPointerEvent(target, {
          clientX: 280,
          clientY: 220,
        }),
        'node-1'
      );
    });

    expect(props.startDrag).toHaveBeenCalledWith('node-1', 0, 0);
    const mutation = resolveLastSetNodesMutation(props, props.nodes);
    expect(mutation).not.toBeNull();
    expect(mutation?.mutationMeta).toMatchObject({
      reason: 'drag',
    });
    expect(mutation?.nodes.find((node) => node.id === 'node-1')?.position).toEqual({
      x: 120,
      y: 100,
    });
  });

  it('does not clamp node drag movement to the legacy 2000x2000 bounds', async () => {
    const props = buildHookProps();
    props.nodes = [buildNode({ position: { x: 1900, y: 1900 } })];
    const target = document.createElement('div');
    const { result } = renderHook(() => useCanvasInteractionsNodes(props));

    await act(async () => {
      await result.current.handlePointerDownNode(
        createPointerEvent(target, { clientX: 1910, clientY: 1910 }),
        'node-1'
      );
    });

    act(() => {
      result.current.handlePointerMoveNode(
        createPointerEvent(target, {
          clientX: 99999,
          clientY: 99999,
        }),
        'node-1'
      );
    });

    act(() => {
      result.current.handlePointerUpNode(
        createPointerEvent(target, {
          clientX: 99999,
          clientY: 99999,
        }),
        'node-1'
      );
    });

    const maxX = CANVAS_WIDTH - NODE_WIDTH - 16;
    const maxY = CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16;
    const mutation = resolveLastSetNodesMutation(props, props.nodes);
    expect(mutation).not.toBeNull();
    expect(mutation?.mutationMeta).toMatchObject({
      reason: 'drag',
    });
    expect(mutation?.nodes.find((node) => node.id === 'node-1')?.position).toEqual({
      x: maxX,
      y: maxY,
    });
  });

  it('ignores pointer move events when the primary pointer button is not pressed', async () => {
    const props = buildHookProps();
    const target = document.createElement('div');
    Object.assign(target, {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => false),
    });
    const { result } = renderHook(() => useCanvasInteractionsNodes(props));

    await act(async () => {
      await result.current.handlePointerDownNode(createPointerEvent(target), 'node-1');
    });

    act(() => {
      result.current.handlePointerMoveNode(
        createPointerEvent(target, {
          clientX: 140,
          clientY: 140,
          pointerType: 'mouse',
          buttons: 0,
        }),
        'node-1'
      );
    });

    act(() => {
      result.current.handlePointerUpNode(createPointerEvent(target), 'node-1');
    });

    expect(props.startDrag).not.toHaveBeenCalled();
    expect(props.setNodes).not.toHaveBeenCalled();
  });

  it('allows pointer moves with zero buttons when pointer capture is still active', async () => {
    const props = buildHookProps();
    const target = document.createElement('div');
    Object.assign(target, {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
    });
    const { result } = renderHook(() => useCanvasInteractionsNodes(props));

    await act(async () => {
      await result.current.handlePointerDownNode(createPointerEvent(target), 'node-1');
    });

    act(() => {
      result.current.handlePointerMoveNode(
        createPointerEvent(target, {
          clientX: 150,
          clientY: 140,
          pointerType: 'mouse',
          buttons: 0,
        }),
        'node-1'
      );
    });

    act(() => {
      result.current.handlePointerUpNode(
        createPointerEvent(target, {
          clientX: 150,
          clientY: 140,
        }),
        'node-1'
      );
    });

    expect(props.startDrag).toHaveBeenCalledWith('node-1', 60, 60);
    const mutation = resolveLastSetNodesMutation(props, props.nodes);
    expect(mutation).not.toBeNull();
    expect(mutation?.mutationMeta).toMatchObject({
      reason: 'drag',
    });
    expect(mutation?.nodes.find((node) => node.id === 'node-1')?.position).toEqual({
      x: 90,
      y: 80,
    });
  });

  it('ignores non-finite pointer coordinates to prevent invalid node movement', async () => {
    const props = buildHookProps();
    const target = document.createElement('div');
    const { result } = renderHook(() => useCanvasInteractionsNodes(props));

    await act(async () => {
      await result.current.handlePointerDownNode(createPointerEvent(target), 'node-1');
    });

    act(() => {
      result.current.handlePointerMoveNode(
        createPointerEvent(target, {
          clientX: Number.POSITIVE_INFINITY,
          clientY: Number.POSITIVE_INFINITY,
        }),
        'node-1'
      );
    });

    act(() => {
      result.current.handlePointerUpNode(
        createPointerEvent(target, {
          clientX: Number.POSITIVE_INFINITY,
          clientY: Number.POSITIVE_INFINITY,
        }),
        'node-1'
      );
    });

    expect(props.startDrag).not.toHaveBeenCalled();
    expect(props.setNodes).not.toHaveBeenCalled();
  });
});
