import { renderHook, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { AiPathRuntimeEvent } from '@/shared/contracts/ai-paths-runtime';

import { useCanvasPulseEffects } from '../canvas-board-pulse-effects';

type RuntimeSnapshot = {
  inputs: Record<string, Record<string, unknown>>;
  outputs: Record<string, Record<string, unknown>>;
};

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: 'node-default',
    type: 'template',
    title: 'Node',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    data: {},
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: null,
    ...patch,
  }) as AiNode;

const buildPortMaps = (edges: Edge[]) => {
  const buildEdgePortKey = (nodeId: string, port: string): string => `${nodeId}:${port}`;
  const edgesByFromPort = new Map<string, Edge[]>();
  const edgesByToPort = new Map<string, Edge[]>();
  const incomingEdgeIdsByNode = new Map<string, string[]>();
  const outgoingEdgeIdsByNode = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (edge.from && edge.fromPort) {
      const key = buildEdgePortKey(edge.from, edge.fromPort);
      const list = edgesByFromPort.get(key) ?? [];
      list.push(edge);
      edgesByFromPort.set(key, list);
    }
    if (edge.to && edge.toPort) {
      const key = buildEdgePortKey(edge.to, edge.toPort);
      const list = edgesByToPort.get(key) ?? [];
      list.push(edge);
      edgesByToPort.set(key, list);
    }
    if (edge.to) {
      const list = incomingEdgeIdsByNode.get(edge.to) ?? [];
      list.push(edge.id);
      incomingEdgeIdsByNode.set(edge.to, list);
    }
    if (edge.from) {
      const list = outgoingEdgeIdsByNode.get(edge.from) ?? [];
      list.push(edge.id);
      outgoingEdgeIdsByNode.set(edge.from, list);
    }
  });

  return {
    buildEdgePortKey,
    edgesByFromPort,
    edgesByToPort,
    incomingEdgeIdsByNode,
    outgoingEdgeIdsByNode,
  };
};

describe('useCanvasPulseEffects', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('activates incoming edge and input pulse for node_started runtime events', () => {
    const sourceNode = buildNode({
      id: 'node-source',
      outputs: ['result'],
    });
    const targetNode = buildNode({
      id: 'node-target',
      inputs: ['trigger'],
    });
    const edge: Edge = {
      id: 'edge-source-target',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'trigger',
    };
    const maps = buildPortMaps([edge]);
    const nodeById = new Map<string, AiNode>([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    const runtimeState: RuntimeSnapshot = {
      inputs: {},
      outputs: {},
    };
    const runtimeEvents: AiPathRuntimeEvent[] = [
      {
        id: 'evt-node-started',
        source: 'local',
        kind: 'node_started',
        level: 'info',
        message: 'Target started',
        nodeId: targetNode.id,
        timestamp: '2026-03-04T10:00:00.000Z',
      } as AiPathRuntimeEvent,
    ];

    const { result } = renderHook(() =>
      useCanvasPulseEffects({
        nodes: [sourceNode, targetNode],
        edges: [edge],
        runtimeEvents,
        runtimeState,
        getPortValue: () => undefined,
        ...maps,
        nodeById,
        flowAnimationMs: 300,
        nodePulseMs: 250,
      })
    );

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(true);
    expect(result.current.inputPulseNodes.has(targetNode.id)).toBe(true);

    act(() => {
      vi.advanceTimersByTime(301);
    });

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(false);
    expect(result.current.inputPulseNodes.has(targetNode.id)).toBe(false);
  });

  it('activates incoming edge and input pulse for processing node_status events', () => {
    const sourceNode = buildNode({
      id: 'node-source-processing',
      outputs: ['result'],
    });
    const targetNode = buildNode({
      id: 'node-target-processing',
      inputs: ['trigger'],
    });
    const edge: Edge = {
      id: 'edge-source-target-processing',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'trigger',
    };
    const maps = buildPortMaps([edge]);
    const nodeById = new Map<string, AiNode>([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    const runtimeState: RuntimeSnapshot = {
      inputs: {},
      outputs: {},
    };
    const runtimeEvents: AiPathRuntimeEvent[] = [
      {
        id: 'evt-processing-status',
        source: 'server',
        kind: 'node_status',
        level: 'info',
        message: 'Target processing',
        nodeId: targetNode.id,
        status: 'processing',
        timestamp: '2026-03-04T10:01:00.000Z',
      } as AiPathRuntimeEvent,
    ];

    const { result } = renderHook(() =>
      useCanvasPulseEffects({
        nodes: [sourceNode, targetNode],
        edges: [edge],
        runtimeEvents,
        runtimeState,
        getPortValue: () => undefined,
        ...maps,
        nodeById,
        flowAnimationMs: 300,
        nodePulseMs: 250,
      })
    );

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(true);
    expect(result.current.inputPulseNodes.has(targetNode.id)).toBe(true);

    act(() => {
      vi.advanceTimersByTime(301);
    });

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(false);
    expect(result.current.inputPulseNodes.has(targetNode.id)).toBe(false);
  });

  it('does not activate edge pulses for pending node_status events', () => {
    const sourceNode = buildNode({
      id: 'node-source-pending',
      outputs: ['result'],
    });
    const targetNode = buildNode({
      id: 'node-target-pending',
      inputs: ['trigger'],
    });
    const edge: Edge = {
      id: 'edge-source-target-pending',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'trigger',
    };
    const maps = buildPortMaps([edge]);
    const nodeById = new Map<string, AiNode>([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    const runtimeState: RuntimeSnapshot = {
      inputs: {},
      outputs: {},
    };
    const runtimeEvents: AiPathRuntimeEvent[] = [
      {
        id: 'evt-pending-status',
        source: 'server',
        kind: 'node_status',
        level: 'info',
        message: 'Target pending',
        nodeId: targetNode.id,
        status: 'pending',
        timestamp: '2026-03-04T10:01:30.000Z',
      } as AiPathRuntimeEvent,
    ];

    const { result } = renderHook(() =>
      useCanvasPulseEffects({
        nodes: [sourceNode, targetNode],
        edges: [edge],
        runtimeEvents,
        runtimeState,
        getPortValue: () => undefined,
        ...maps,
        nodeById,
        flowAnimationMs: 300,
        nodePulseMs: 250,
      })
    );

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(false);
    expect(result.current.inputPulseNodes.has(targetNode.id)).toBe(false);
  });

  it('does not activate edge pulses for waiting_callback node_status events', () => {
    const sourceNode = buildNode({
      id: 'node-source-waiting',
      outputs: ['result'],
    });
    const targetNode = buildNode({
      id: 'node-target-waiting',
      inputs: ['trigger'],
    });
    const edge: Edge = {
      id: 'edge-source-target-waiting',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'trigger',
    };
    const maps = buildPortMaps([edge]);
    const nodeById = new Map<string, AiNode>([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    const runtimeState: RuntimeSnapshot = {
      inputs: {},
      outputs: {},
    };
    const runtimeEvents: AiPathRuntimeEvent[] = [
      {
        id: 'evt-waiting-status',
        source: 'server',
        kind: 'node_status',
        level: 'info',
        message: 'Target waiting',
        nodeId: targetNode.id,
        status: 'waiting_callback',
        timestamp: '2026-03-04T10:02:00.000Z',
      } as AiPathRuntimeEvent,
    ];

    const { result } = renderHook(() =>
      useCanvasPulseEffects({
        nodes: [sourceNode, targetNode],
        edges: [edge],
        runtimeEvents,
        runtimeState,
        getPortValue: () => undefined,
        ...maps,
        nodeById,
        flowAnimationMs: 300,
        nodePulseMs: 250,
      })
    );

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(false);
    expect(result.current.inputPulseNodes.has(targetNode.id)).toBe(false);
  });

  it('does not activate edge pulses for advance_pending node_status events', () => {
    const sourceNode = buildNode({
      id: 'node-source-advance-pending',
      outputs: ['result'],
    });
    const targetNode = buildNode({
      id: 'node-target-advance-pending',
      inputs: ['trigger'],
    });
    const edge: Edge = {
      id: 'edge-source-target-advance-pending',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'trigger',
    };
    const maps = buildPortMaps([edge]);
    const nodeById = new Map<string, AiNode>([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    const runtimeState: RuntimeSnapshot = {
      inputs: {},
      outputs: {},
    };
    const runtimeEvents: AiPathRuntimeEvent[] = [
      {
        id: 'evt-advance-pending-status',
        source: 'server',
        kind: 'node_status',
        level: 'info',
        message: 'Target advance pending',
        nodeId: targetNode.id,
        status: 'advance_pending',
        timestamp: '2026-03-04T10:02:30.000Z',
      } as AiPathRuntimeEvent,
    ];

    const { result } = renderHook(() =>
      useCanvasPulseEffects({
        nodes: [sourceNode, targetNode],
        edges: [edge],
        runtimeEvents,
        runtimeState,
        getPortValue: () => undefined,
        ...maps,
        nodeById,
        flowAnimationMs: 300,
        nodePulseMs: 250,
      })
    );

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(false);
    expect(result.current.inputPulseNodes.has(targetNode.id)).toBe(false);
  });

  it('does not activate edge pulses for blocked node_status events', () => {
    const sourceNode = buildNode({
      id: 'node-source-blocked',
      outputs: ['result'],
    });
    const targetNode = buildNode({
      id: 'node-target-blocked',
      inputs: ['trigger'],
    });
    const edge: Edge = {
      id: 'edge-source-target-blocked',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'trigger',
    };
    const maps = buildPortMaps([edge]);
    const nodeById = new Map<string, AiNode>([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    const runtimeState: RuntimeSnapshot = {
      inputs: {},
      outputs: {},
    };
    const runtimeEvents: AiPathRuntimeEvent[] = [
      {
        id: 'evt-blocked-status',
        source: 'server',
        kind: 'node_status',
        level: 'warn',
        message: 'Target blocked',
        nodeId: targetNode.id,
        status: 'blocked',
        timestamp: '2026-03-04T10:03:00.000Z',
      } as AiPathRuntimeEvent,
    ];

    const { result } = renderHook(() =>
      useCanvasPulseEffects({
        nodes: [sourceNode, targetNode],
        edges: [edge],
        runtimeEvents,
        runtimeState,
        getPortValue: () => undefined,
        ...maps,
        nodeById,
        flowAnimationMs: 300,
        nodePulseMs: 250,
      })
    );

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(false);
    expect(result.current.inputPulseNodes.has(targetNode.id)).toBe(false);
  });

  it('does not activate edge pulses for skipped node_status events', () => {
    const sourceNode = buildNode({
      id: 'node-source-skipped',
      outputs: ['result'],
    });
    const targetNode = buildNode({
      id: 'node-target-skipped',
      inputs: ['trigger'],
    });
    const edge: Edge = {
      id: 'edge-source-target-skipped',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'trigger',
    };
    const maps = buildPortMaps([edge]);
    const nodeById = new Map<string, AiNode>([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    const runtimeState: RuntimeSnapshot = {
      inputs: {},
      outputs: {},
    };
    const runtimeEvents: AiPathRuntimeEvent[] = [
      {
        id: 'evt-skipped-status',
        source: 'server',
        kind: 'node_status',
        level: 'info',
        message: 'Target skipped',
        nodeId: targetNode.id,
        status: 'skipped',
        timestamp: '2026-03-04T10:04:00.000Z',
      } as AiPathRuntimeEvent,
    ];

    const { result } = renderHook(() =>
      useCanvasPulseEffects({
        nodes: [sourceNode, targetNode],
        edges: [edge],
        runtimeEvents,
        runtimeState,
        getPortValue: () => undefined,
        ...maps,
        nodeById,
        flowAnimationMs: 300,
        nodePulseMs: 250,
      })
    );

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(false);
    expect(result.current.inputPulseNodes.has(targetNode.id)).toBe(false);
  });

  it('derives edge and node pulses from output payload changes when runtime events are empty', () => {
    const sourceNode = buildNode({
      id: 'node-source',
      outputs: ['result'],
    });
    const targetNode = buildNode({
      id: 'node-target',
      inputs: ['trigger'],
    });
    const edge: Edge = {
      id: 'edge-source-target',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'trigger',
    };
    const maps = buildPortMaps([edge]);
    const nodeById = new Map<string, AiNode>([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    let runtimeState: RuntimeSnapshot = {
      inputs: {},
      outputs: {},
    };
    const getPortValue = (direction: 'input' | 'output', nodeId: string, port: string): unknown => {
      const source = direction === 'input' ? runtimeState.inputs : runtimeState.outputs;
      return source[nodeId]?.[port];
    };

    const { result, rerender } = renderHook(() =>
      useCanvasPulseEffects({
        nodes: [sourceNode, targetNode],
        edges: [edge],
        runtimeEvents: [],
        runtimeState,
        getPortValue,
        ...maps,
        nodeById,
        flowAnimationMs: 280,
        nodePulseMs: 220,
      })
    );

    expect(result.current.activeEdgeIds.size).toBe(0);

    runtimeState = {
      inputs: {},
      outputs: {
        [sourceNode.id]: {
          result: { ok: true },
        },
      },
    };

    rerender();

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(true);
    expect(result.current.outputPulseNodes.has(sourceNode.id)).toBe(true);
    expect(result.current.inputPulseNodes.has(targetNode.id)).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(false);
  });

  it('derives edge pulses from output payload changes even when runtime events exist but are unchanged', () => {
    const sourceNode = buildNode({
      id: 'node-source-static-events',
      outputs: ['result'],
    });
    const targetNode = buildNode({
      id: 'node-target-static-events',
      inputs: ['trigger'],
    });
    const edge: Edge = {
      id: 'edge-source-target-static-events',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'trigger',
    };
    const maps = buildPortMaps([edge]);
    const nodeById = new Map<string, AiNode>([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    let runtimeState: RuntimeSnapshot = {
      inputs: {},
      outputs: {},
    };
    const runtimeEvents: AiPathRuntimeEvent[] = [
      {
        id: 'evt-static-log',
        source: 'server',
        kind: 'log',
        level: 'info',
        message: 'stream heartbeat',
        timestamp: '2026-03-04T10:12:00.000Z',
      } as AiPathRuntimeEvent,
    ];
    const getPortValue = (direction: 'input' | 'output', nodeId: string, port: string): unknown => {
      const source = direction === 'input' ? runtimeState.inputs : runtimeState.outputs;
      return source[nodeId]?.[port];
    };

    const { result, rerender } = renderHook(() =>
      useCanvasPulseEffects({
        nodes: [sourceNode, targetNode],
        edges: [edge],
        runtimeEvents,
        runtimeState,
        getPortValue,
        ...maps,
        nodeById,
        flowAnimationMs: 280,
        nodePulseMs: 220,
      })
    );

    expect(result.current.activeEdgeIds.size).toBe(0);

    runtimeState = {
      inputs: {},
      outputs: {
        [sourceNode.id]: {
          result: { id: 101 },
        },
      },
    };

    rerender();

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.activeEdgeIds.has(edge.id)).toBe(false);
  });
});
