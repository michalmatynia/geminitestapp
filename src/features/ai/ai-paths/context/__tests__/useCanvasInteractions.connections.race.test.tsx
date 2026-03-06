import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge, RuntimeState } from '@/shared/lib/ai-paths';
import { useCanvasInteractionsConnections } from '@/features/ai/ai-paths/context/hooks/useCanvasInteractions.connections';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: patch.id ?? 'node',
    type: patch.type ?? 'template',
    title: patch.title ?? 'Node',
    description: '',
    inputs: patch.inputs ?? [],
    outputs: patch.outputs ?? [],
    position: patch.position ?? { x: 100, y: 100 },
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
    stopPropagation: vi.fn(),
    currentTarget,
    target: currentTarget,
    nativeEvent: {
      currentTarget,
    },
    ...patch,
  }) as React.PointerEvent<Element>;

describe('useCanvasInteractionsConnections race handling', () => {
  it('completes a connection even when connecting prop has not re-rendered yet', async () => {
    const sourceNode = buildNode({
      id: 'node-source',
      outputs: ['result'],
      position: { x: 120, y: 120 },
    });
    const targetNode = buildNode({
      id: 'node-target',
      inputs: ['value'],
      position: { x: 460, y: 180 },
    });

    const props: Parameters<typeof useCanvasInteractionsConnections>[0] = {
      nodes: [sourceNode, targetNode],
      edges: [],
      isPathLocked: false,
      notifyLocked: vi.fn(),
      confirmNodeSwitch: undefined,
      setEdges: vi.fn(),
      setRuntimeState: vi.fn(),
      pruneRuntimeInputsInternal: (
        state: RuntimeState,
        _removedEdges: Edge[],
        _remainingEdges: Edge[]
      ) => state,
      selectedEdgeId: null,
      selectEdge: vi.fn(),
      startConnection: vi.fn(),
      endConnection: vi.fn(),
      connecting: null,
      setConnectingPos: vi.fn(),
      view: { x: 0, y: 0, scale: 1 },
      viewportRef: { current: document.createElement('div') },
      toast: vi.fn(),
    };

    const sourceTarget = document.createElement('div');
    const targetTarget = document.createElement('div');
    const { result } = renderHook(() => useCanvasInteractionsConnections(props));

    await act(async () => {
      await result.current.handleStartConnection(
        createPointerEvent(sourceTarget, {
          clientX: 380,
          clientY: 220,
        }),
        sourceNode,
        'result'
      );
    });

    act(() => {
      result.current.handleCompleteConnection(
        createPointerEvent(targetTarget, {
          clientX: 520,
          clientY: 220,
          buttons: 0,
        }),
        targetNode,
        'value'
      );
    });

    const setEdgesCalls = (props.setEdges as unknown as { mock: { calls: unknown[][] } }).mock
      .calls;
    expect(setEdgesCalls.length).toBe(1);
    const [nextEdges] = setEdgesCalls[0] as [Edge[] | ((prev: Edge[]) => Edge[]), unknown];
    const resolvedEdges = typeof nextEdges === 'function' ? nextEdges([]) : nextEdges;
    expect(resolvedEdges).toHaveLength(1);
    expect(resolvedEdges[0]).toMatchObject({
      from: 'node-source',
      to: 'node-target',
      fromPort: 'result',
      toPort: 'value',
    });
  });

  it('blocks a second write on a single-cardinality input before edges prop re-renders', async () => {
    const sourceNodeA = buildNode({
      id: 'node-source-a',
      type: 'trigger',
      outputs: ['trigger'],
      position: { x: 120, y: 120 },
    });
    const sourceNodeB = buildNode({
      id: 'node-source-b',
      type: 'trigger',
      outputs: ['trigger'],
      position: { x: 120, y: 300 },
    });
    const targetNode = buildNode({
      id: 'node-target',
      type: 'fetcher',
      title: 'Fetcher: Trigger Context',
      inputs: ['trigger'],
      position: { x: 460, y: 180 },
    });

    const props: Parameters<typeof useCanvasInteractionsConnections>[0] = {
      nodes: [sourceNodeA, sourceNodeB, targetNode],
      edges: [],
      isPathLocked: false,
      notifyLocked: vi.fn(),
      confirmNodeSwitch: undefined,
      setEdges: vi.fn(),
      setRuntimeState: vi.fn(),
      pruneRuntimeInputsInternal: (
        state: RuntimeState,
        _removedEdges: Edge[],
        _remainingEdges: Edge[]
      ) => state,
      selectedEdgeId: null,
      selectEdge: vi.fn(),
      startConnection: vi.fn(),
      endConnection: vi.fn(),
      connecting: null,
      setConnectingPos: vi.fn(),
      view: { x: 0, y: 0, scale: 1 },
      viewportRef: { current: document.createElement('div') },
      toast: vi.fn(),
    };

    const sourceTargetA = document.createElement('div');
    const sourceTargetB = document.createElement('div');
    const target = document.createElement('div');
    const { result } = renderHook(() => useCanvasInteractionsConnections(props));

    await act(async () => {
      await result.current.handleStartConnection(
        createPointerEvent(sourceTargetA),
        sourceNodeA,
        'trigger'
      );
    });
    act(() => {
      result.current.handleCompleteConnection(createPointerEvent(target), targetNode, 'trigger');
    });

    await act(async () => {
      await result.current.handleStartConnection(
        createPointerEvent(sourceTargetB),
        sourceNodeB,
        'trigger'
      );
    });
    act(() => {
      result.current.handleCompleteConnection(createPointerEvent(target), targetNode, 'trigger');
    });

    const setEdgesCalls = (props.setEdges as unknown as { mock: { calls: unknown[][] } }).mock
      .calls;
    expect(setEdgesCalls.length).toBe(1);
    const [nextEdges] = setEdgesCalls[0] as [Edge[] | ((prev: Edge[]) => Edge[]), unknown];
    const resolvedEdges = typeof nextEdges === 'function' ? nextEdges([]) : nextEdges;
    expect(resolvedEdges).toHaveLength(1);
    expect(resolvedEdges[0]).toMatchObject({
      from: 'node-source-a',
      to: 'node-target',
      fromPort: 'trigger',
      toPort: 'trigger',
    });
    expect(props.toast).toHaveBeenCalledWith(
      expect.stringContaining('accepts one connection'),
      expect.objectContaining({ variant: 'error' })
    );
  });
});
