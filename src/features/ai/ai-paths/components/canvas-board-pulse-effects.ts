'use client';

import React from 'react';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { AiPathRuntimeEvent } from '@/shared/contracts/ai-paths-runtime';
import { hashRuntimeValue } from '@/shared/lib/ai-paths/core/utils';

import {
  normalizeRuntimeStatus,
  resolveEdgeRuntimeActive,
} from './canvas/signal-flow-visual-state';

type RuntimeHashes = {
  inputs: Record<string, Record<string, string>>;
  outputs: Record<string, Record<string, string>>;
};

type RuntimeSnapshot = {
  inputs?: Record<string, Record<string, unknown>>;
  outputs?: Record<string, Record<string, unknown>>;
};

type UseCanvasPulseEffectsInput = {
  nodes: AiNode[];
  edges: Edge[];
  runtimeEvents: AiPathRuntimeEvent[] | null | undefined;
  runtimeState: RuntimeSnapshot;
  getPortValue: (direction: 'input' | 'output', nodeId: string, port: string) => unknown;
  edgesByFromPort: Map<string, Edge[]>;
  edgesByToPort: Map<string, Edge[]>;
  incomingEdgeIdsByNode: Map<string, string[]>;
  outgoingEdgeIdsByNode: Map<string, string[]>;
  buildEdgePortKey: (nodeId: string, port: string) => string;
  nodeById: Map<string, AiNode>;
  flowAnimationMs: number;
  nodePulseMs: number;
};

type UseCanvasPulseEffectsResult = {
  activeEdgeIds: Set<string>;
  inputPulseNodes: Set<string>;
  outputPulseNodes: Set<string>;
};

export function useCanvasPulseEffects(
  args: UseCanvasPulseEffectsInput
): UseCanvasPulseEffectsResult {
  const {
    nodes,
    edges,
    runtimeEvents,
    runtimeState,
    getPortValue,
    edgesByFromPort,
    edgesByToPort,
    incomingEdgeIdsByNode,
    outgoingEdgeIdsByNode,
    buildEdgePortKey,
    nodeById,
    flowAnimationMs,
    nodePulseMs,
  } = args;
  const [activeEdgeIds, setActiveEdgeIds] = React.useState<Set<string>>(() => new Set());
  const [inputPulseNodes, setInputPulseNodes] = React.useState<Set<string>>(() => new Set());
  const [outputPulseNodes, setOutputPulseNodes] = React.useState<Set<string>>(() => new Set());
  const prevHashesRef = React.useRef<RuntimeHashes | null>(null);
  const edgePulseTimeouts = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const nodePulseTimeouts = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastRuntimeEventIdRef = React.useRef<string | null>(null);

  const buildRuntimeHashes = React.useCallback((): RuntimeHashes => {
    const inputHashes: Record<string, Record<string, string>> = {};
    const outputHashes: Record<string, Record<string, string>> = {};
    nodes.forEach((node) => {
      if (node.inputs?.length) {
        const nodeInputs = runtimeState.inputs?.[node.id] ?? {};
        const hashed: Record<string, string> = {};
        node.inputs.forEach((port) => {
          hashed[port] = hashRuntimeValue(nodeInputs[port]);
        });
        inputHashes[node.id] = hashed;
      }
      if (node.outputs?.length) {
        const nodeOutputs = runtimeState.outputs?.[node.id] ?? {};
        const hashed: Record<string, string> = {};
        node.outputs.forEach((port) => {
          hashed[port] = hashRuntimeValue(nodeOutputs[port]);
        });
        outputHashes[node.id] = hashed;
      }
    });
    return { inputs: inputHashes, outputs: outputHashes };
  }, [nodes, runtimeState.inputs, runtimeState.outputs]);

  const scheduleEdgePulse = React.useCallback(
    (edgeId: string): void => {
      setActiveEdgeIds((prev) => {
        if (prev.has(edgeId)) return prev;
        const next = new Set(prev);
        next.add(edgeId);
        return next;
      });
      const existing = edgePulseTimeouts.current.get(edgeId);
      if (existing) clearTimeout(existing);
      const timeout = setTimeout(() => {
        setActiveEdgeIds((prev) => {
          if (!prev.has(edgeId)) return prev;
          const next = new Set(prev);
          next.delete(edgeId);
          return next;
        });
        edgePulseTimeouts.current.delete(edgeId);
      }, flowAnimationMs);
      edgePulseTimeouts.current.set(edgeId, timeout);
    },
    [flowAnimationMs]
  );

  const scheduleNodePulse = React.useCallback(
    (nodeId: string, direction: 'input' | 'output'): void => {
      const setState = direction === 'input' ? setInputPulseNodes : setOutputPulseNodes;
      const key = `${direction}:${nodeId}`;
      setState((prev) => {
        if (prev.has(nodeId)) return prev;
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });
      const existing = nodePulseTimeouts.current.get(key);
      if (existing) clearTimeout(existing);
      const timeout = setTimeout(() => {
        setState((prev) => {
          if (!prev.has(nodeId)) return prev;
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
        nodePulseTimeouts.current.delete(key);
      }, nodePulseMs);
      nodePulseTimeouts.current.set(key, timeout);
    },
    [nodePulseMs]
  );

  React.useEffect(() => {
    if (!runtimeEvents || runtimeEvents.length === 0) {
      lastRuntimeEventIdRef.current = null;
      return;
    }
    const lastSeenId = lastRuntimeEventIdRef.current;
    const fallbackStart = Math.max(0, runtimeEvents.length - 40);
    const startIndex = lastSeenId
      ? runtimeEvents.findIndex((event: AiPathRuntimeEvent) => event.id === lastSeenId) + 1
      : fallbackStart;
    const nextEvents = runtimeEvents.slice(startIndex >= 0 ? startIndex : fallbackStart);
    if (nextEvents.length === 0) return;

    nextEvents.forEach((event: AiPathRuntimeEvent) => {
      const normalizedStatus = normalizeRuntimeStatus(event.status);
      const nodeId = event.nodeId?.trim() ?? '';
      if (!nodeId) return;

      const isStartSignal =
        event.kind === 'node_started' || resolveEdgeRuntimeActive(normalizedStatus);
      const isFinishSignal =
        event.kind === 'node_finished' ||
        normalizedStatus === 'completed' ||
        normalizedStatus === 'cached';
      const isFailureSignal =
        event.kind === 'node_failed' ||
        normalizedStatus === 'failed' ||
        normalizedStatus === 'timeout' ||
        normalizedStatus === 'canceled';

      if (isStartSignal || isFailureSignal) {
        scheduleNodePulse(nodeId, 'input');
        (incomingEdgeIdsByNode.get(nodeId) ?? []).forEach((edgeId: string) => {
          scheduleEdgePulse(edgeId);
        });
      }
      if (isFinishSignal) {
        scheduleNodePulse(nodeId, 'output');
        (outgoingEdgeIdsByNode.get(nodeId) ?? []).forEach((edgeId: string) => {
          scheduleEdgePulse(edgeId);
        });
      }
    });

    lastRuntimeEventIdRef.current = runtimeEvents[runtimeEvents.length - 1]?.id ?? null;
  }, [
    incomingEdgeIdsByNode,
    outgoingEdgeIdsByNode,
    runtimeEvents,
    scheduleEdgePulse,
    scheduleNodePulse,
  ]);

  React.useEffect(() => {
    const nextHashes = buildRuntimeHashes();
    const prevHashes = prevHashesRef.current;
    prevHashesRef.current = nextHashes;
    if (!prevHashes) return;
    const outputChanges: Array<{ nodeId: string; port: string }> = [];
    const inputChanges: Array<{ nodeId: string; port: string }> = [];
    Object.entries(nextHashes.outputs).forEach(([nodeId, ports]) => {
      const prevPorts = prevHashes.outputs[nodeId];
      if (!prevPorts) return;
      Object.entries(ports).forEach(([port, nextHash]) => {
        const prevHash = prevPorts[port];
        if (prevHash === undefined) return;
        if (prevHash !== nextHash) outputChanges.push({ nodeId, port });
      });
    });
    Object.entries(nextHashes.inputs).forEach(([nodeId, ports]) => {
      const prevPorts = prevHashes.inputs[nodeId];
      if (!prevPorts) return;
      Object.entries(ports).forEach(([port, nextHash]) => {
        const prevHash = prevPorts[port];
        if (prevHash === undefined) return;
        if (prevHash !== nextHash) inputChanges.push({ nodeId, port });
      });
    });
    if (outputChanges.length === 0 && inputChanges.length === 0) return;
    const edgeIds = new Set<string>();
    const inputNodes = new Set<string>();
    const outputNodes = new Set<string>();
    outputChanges.forEach(({ nodeId, port }) => {
      const value = getPortValue('output', nodeId, port);
      if (value === undefined) return;
      outputNodes.add(nodeId);
      const outgoing = edgesByFromPort.get(buildEdgePortKey(nodeId, port));
      outgoing?.forEach((edge: Edge) => {
        edgeIds.add(edge.id);
        if (edge.to) inputNodes.add(edge.to);
      });
    });
    inputChanges.forEach(({ nodeId, port }) => {
      const value = getPortValue('input', nodeId, port);
      if (value === undefined) return;
      inputNodes.add(nodeId);
      const incoming = edgesByToPort.get(buildEdgePortKey(nodeId, port));
      incoming?.forEach((edge: Edge) => {
        edgeIds.add(edge.id);
      });
    });

    outputNodes.forEach((nodeId) => {
      const node = nodeById.get(nodeId);
      if (node?.type !== 'trigger') return;
      edges.forEach((edge: Edge) => {
        if (edge.from !== nodeId) return;
        edgeIds.add(edge.id);
        if (edge.to) inputNodes.add(edge.to);
      });
    });
    edgeIds.forEach((edgeId) => scheduleEdgePulse(edgeId));
    outputNodes.forEach((nodeId) => scheduleNodePulse(nodeId, 'output'));
    inputNodes.forEach((nodeId) => scheduleNodePulse(nodeId, 'input'));
  }, [
    buildEdgePortKey,
    buildRuntimeHashes,
    edges,
    edgesByFromPort,
    edgesByToPort,
    getPortValue,
    nodeById,
    runtimeEvents,
    scheduleEdgePulse,
    scheduleNodePulse,
  ]);

  React.useEffect(() => {
    const epTimeouts = edgePulseTimeouts.current;
    const npTimeouts = nodePulseTimeouts.current;
    return (): void => {
      epTimeouts.forEach((timeout) => clearTimeout(timeout));
      npTimeouts.forEach((timeout) => clearTimeout(timeout));
      epTimeouts.clear();
      npTimeouts.clear();
    };
  }, []);

  return {
    activeEdgeIds,
    inputPulseNodes,
    outputPulseNodes,
  };
}
