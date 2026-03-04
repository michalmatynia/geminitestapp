import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge } from '@/shared/lib/ai-paths';
import { useCanvasConnection } from '@/features/ai/ai-paths/components/ai-paths-settings/hooks/useCanvasConnection';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: patch.id ?? 'node',
    type: patch.type ?? 'template',
    title: patch.title ?? 'Node',
    description: '',
    inputs: patch.inputs ?? [],
    outputs: patch.outputs ?? [],
    position: patch.position ?? { x: 120, y: 120 },
    data: {},
    ...patch,
  }) as AiNode;

const createPointerEvent = (
  currentTarget: HTMLButtonElement,
  patch: Partial<React.PointerEvent<HTMLButtonElement>> = {}
): React.PointerEvent<HTMLButtonElement> =>
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
  }) as React.PointerEvent<HTMLButtonElement>;

describe('useCanvasConnection race handling', () => {
  it('completes a connection even when connecting prop has not re-rendered yet', () => {
    const sourceNode = buildNode({
      id: 'node-source',
      outputs: ['result'],
      position: { x: 100, y: 120 },
    });
    const targetNode = buildNode({
      id: 'node-target',
      inputs: ['value'],
      position: { x: 460, y: 180 },
    });

    const setEdges = vi.fn();
    const startConnection = vi.fn();
    const endConnection = vi.fn();

    const { result } = renderHook(() =>
      useCanvasConnection({
        nodes: [sourceNode, targetNode],
        edges: [],
        setEdges,
        connecting: null,
        setConnecting: vi.fn(),
        connectingPos: null,
        setConnectingPos: vi.fn(),
        startConnection,
        endConnection,
        view: { x: 0, y: 0, scale: 1 },
        viewportRef: { current: document.createElement('div') },
        isPathLocked: false,
        notifyLocked: vi.fn(),
        selectedEdgeId: null,
        selectEdge: vi.fn(),
        clearRuntimeInputsForEdges: vi.fn(),
        toast: vi.fn(),
      })
    );

    const sourceTarget = document.createElement('button');
    const targetTarget = document.createElement('button');

    act(() => {
      result.current.handleStartConnection(
        createPointerEvent(sourceTarget, {
          clientX: 360,
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

    expect(startConnection).toHaveBeenCalledTimes(1);
    expect(endConnection).toHaveBeenCalledTimes(1);

    expect(setEdges).toHaveBeenCalledTimes(1);
    const [nextEdges] = setEdges.mock.calls[0] as [Edge[] | ((prev: Edge[]) => Edge[])];
    const resolvedEdges = typeof nextEdges === 'function' ? nextEdges([]) : nextEdges;
    expect(resolvedEdges).toHaveLength(1);
    expect(resolvedEdges[0]).toMatchObject({
      from: 'node-source',
      to: 'node-target',
      fromPort: 'result',
      toPort: 'value',
    });
  });
});

