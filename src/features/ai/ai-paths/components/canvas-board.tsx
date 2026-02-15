import React from 'react';


import type {
  AiNode,
  AiPathRuntimeEvent,
  PathFlowIntensity,
  Edge,
} from '@/features/ai/ai-paths/lib';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  PORT_SIZE,
  getPortOffsetY,
  formatRuntimeValue,
  formatDurationMs,
  typeStyles,
  validateConnection,
  arePortTypesCompatible,
  formatPortDataTypes,
  getPortDataTypes,
  getValueTypeLabel,
  isValueCompatibleWithTypes,
  type PortDataType,
  hashRuntimeValue,
} from '@/features/ai/ai-paths/lib';
import { Button, Tooltip } from '@/shared/ui';

import {
  useCanvasState,
  useCanvasRefs,
  useCanvasInteractions,
  useGraphState,
  useRuntimeState,
  useRuntimeActions,
  useSelectionState,
  useSelectionActions,
} from '../context';
import { NodeProcessingDots } from './NodeProcessingDots';
import { SignalDots } from './SignalDots';
import { formatPortLabel } from '../utils/ui-utils';

export type EdgePath = { id: string; path: string; label?: string | undefined; arrow?: { x: number; y: number; angle: number } | undefined };
const DEFAULT_NODE_NOTE_COLOR = '#f5e7c3';
type ConnectionTypeMismatch = {
  fromNode?: AiNode | null;
  toNode?: AiNode | null;
  fromPort: string;
  toPort: string;
  fromTypes: PortDataType[];
  toTypes: PortDataType[];
};
type ConnectorInfo = {
  direction: 'input' | 'output';
  port: string;
  expectedTypes: PortDataType[];
  expectedLabel: string;
  rawValue: unknown;
  value: unknown;
  isHistory: boolean;
  historyLength: number;
  actualType: string | null;
  runtimeMismatch: boolean;
  connectionMismatches: ConnectionTypeMismatch[];
  hasMismatch: boolean;
};

type RuntimeHashes = {
  inputs: Record<string, Record<string, string>>;
  outputs: Record<string, Record<string, string>>;
};

export type CanvasBoardConnectorTooltipOverrideInput = {
  direction: 'input' | 'output';
  node: AiNode;
  port: string;
};

export type CanvasBoardConnectorTooltipOverride = {
  content: React.ReactNode;
  maxWidth?: string | undefined;
};

type CanvasBoardProps = {
  /** Optional class name for the viewport container */
  viewportClassName?: string | undefined;
  resolveConnectorTooltip?:
    | ((
        input: CanvasBoardConnectorTooltipOverrideInput
      ) => CanvasBoardConnectorTooltipOverride | null | undefined)
    | undefined;
};

const formatRuntimeStatusLabel = (status: string): string =>
  status
    .split('_')
    .map((part: string) => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
    .join(' ');

const runtimeStatusBadgeClassName = (status: string): string => {
  if (status === 'completed') {
    return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200';
  }
  if (status === 'cached') {
    return 'border-teal-400/60 bg-teal-500/15 text-teal-200';
  }
  if (status === 'failed' || status === 'canceled' || status === 'timeout') {
    return 'border-rose-500/60 bg-rose-500/15 text-rose-200';
  }
  if (status === 'queued') {
    return 'border-amber-500/60 bg-amber-500/15 text-amber-200';
  }
  if (
    status === 'running' ||
    status === 'polling' ||
    status === 'paused' ||
    status === 'waiting_callback' ||
    status === 'advance_pending'
  ) {
    return 'border-sky-500/60 bg-sky-500/15 text-sky-200';
  }
  return 'border-border bg-card/60 text-gray-200';
};

const BLOCKER_PROCESSING_STATUSES = new Set<string>([
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);

export function CanvasBoard({
  viewportClassName,
  resolveConnectorTooltip,
}: CanvasBoardProps): React.JSX.Element {
  // --- Context Hooks ---
  const { view, panState, dragState, lastDrop, connecting, connectingPos } = useCanvasState();
  const { viewportRef, canvasRef } = useCanvasRefs();
  const { nodes, edges, flowIntensity } = useGraphState();
  const {
    runtimeState,
    runtimeNodeStatuses,
    runtimeEvents,
    runtimeRunStatus,
    nodeDurations,
  } = useRuntimeState();
  const { fireTrigger } = useRuntimeActions();
  const { selectedNodeId, selectedEdgeId } = useSelectionState();
  const { selectEdge, setConfigOpen } = useSelectionActions();
  const {
    edgePaths,
    handlePointerDownNode,
    handlePointerMoveNode,
    handlePointerUpNode,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleRemoveEdge,
    handleDeleteSelectedNode,
    handleDisconnectPort,
    handleStartConnection,
    handleCompleteConnection,
    handleReconnectInput,
    handleSelectNode,
    handleDrop,
    handleDragOver,
    zoomTo,
    fitToNodes,
    resetView,
  } = useCanvasInteractions();

  // --- Local State & Refs ---
  const [hoveredConnectorKey, setHoveredConnectorKey] = React.useState<string | null>(null);
  const [pinnedConnectorKey, setPinnedConnectorKey] = React.useState<string | null>(null);
  const [activeEdgeIds, setActiveEdgeIds] = React.useState<Set<string>>(() => new Set());
  const [inputPulseNodes, setInputPulseNodes] = React.useState<Set<string>>(() => new Set());
  const [outputPulseNodes, setOutputPulseNodes] = React.useState<Set<string>>(() => new Set());
  const prevHashesRef = React.useRef<RuntimeHashes | null>(null);
  const edgePulseTimeouts = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const nodePulseTimeouts = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastRuntimeEventIdRef = React.useRef<string | null>(null);

  // --- Constants & Derived ---
  const FLOW_ANIMATION_MS = 1600;
  const NODE_PULSE_MS = 1400;
  const resolvedFlowIntensity: PathFlowIntensity = flowIntensity ?? 'medium';
  const flowEnabled = resolvedFlowIntensity !== 'off';

  // --- Derived from Context ---
  const connectingFromNode = React.useMemo<AiNode | null>(() => {
    if (!connecting?.fromNodeId) return null;
    return nodes.find((node) => node.id === connecting.fromNodeId) ?? null;
  }, [nodes, connecting?.fromNodeId]);

  const flowStyle = React.useMemo<React.CSSProperties>(() => {
    switch (resolvedFlowIntensity) {
      case 'off':
        return {
          '--ai-paths-flow-duration': '0s',
          '--ai-paths-flow-opacity': '0',
          '--ai-paths-flow-dash': '0 0',
          '--ai-paths-flow-glow': '0px',
        };
      case 'low':
        return {
          '--ai-paths-flow-duration': '1.6s',
          '--ai-paths-flow-opacity': '0.45',
          '--ai-paths-flow-dash': '8 10',
          '--ai-paths-flow-glow': '2px',
        };
      case 'high':
        return {
          '--ai-paths-flow-duration': '0.55s',
          '--ai-paths-flow-opacity': '1',
          '--ai-paths-flow-dash': '4 4',
          '--ai-paths-flow-glow': '10px',
        };
      case 'medium':
      default:
        return {
          '--ai-paths-flow-duration': '0.9s',
          '--ai-paths-flow-opacity': '0.9',
          '--ai-paths-flow-dash': '6 6',
          '--ai-paths-flow-glow': '6px',
        };
    }
  }, [resolvedFlowIntensity]);

  const buildConnectorKey = (
    direction: 'input' | 'output',
    nodeId: string,
    port: string
  ): string => `${direction}:${nodeId}:${port}`;
  const buildEdgePortKey = React.useCallback(
    (nodeId: string, port: string): string => `${nodeId}:${port}`,
    []
  );

  const canRemoveSelectedEdge = true;
  const canDeleteSelectedNode = true;

  React.useEffect((): void | (() => void) => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      if (element.isContentEditable) return true;
      const tag = element.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      return Boolean(element.closest('input, textarea, select, [contenteditable="true"]'));
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;
      if (isTypingTarget(event.target)) return;
      if (selectedEdgeId && canRemoveSelectedEdge) {
        event.preventDefault();
        event.stopImmediatePropagation();
        handleRemoveEdge(selectedEdgeId);
        return;
      }
      if (selectedNodeId && canDeleteSelectedNode) {
        event.preventDefault();
        event.stopImmediatePropagation();
        handleDeleteSelectedNode();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    canDeleteSelectedNode,
    canRemoveSelectedEdge,
    handleDeleteSelectedNode,
    handleRemoveEdge,
    selectedEdgeId,
    selectedNodeId,
  ]);

  const formatConnectorValue = (value: unknown): string => {
    if (value === undefined) return 'No data yet.';
    if (value === null) return 'null';
    const formatted = typeof value === 'string' ? value : formatRuntimeValue(value);
    if (formatted.length > 1200) return `${formatted.slice(0, 1200)}…`;
    return formatted;
  };

  const stringifyForDiff = (value: unknown): string => {
    if (value === undefined) return '';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Complex Object]';
    }
  };

  const buildDiffLines = (prev: string, next: string, limit: number = 120): { lines: Array<{ type: 'add' | 'remove' | 'same'; text: string }>; truncated: boolean } => {
    const prevLines = prev.split('\n');
    const nextLines = next.split('\n');
    const max = Math.max(prevLines.length, nextLines.length);
    const lines: Array<{ type: 'add' | 'remove' | 'same'; text: string }> = [];
    let truncated = false;
    for (let index = 0; index < max; index += 1) {
      const prevLine = prevLines[index];
      const nextLine = nextLines[index];
      if (prevLine === nextLine) {
        if (prevLine !== undefined) {
          lines.push({ type: 'same', text: prevLine });
        }
      } else {
        if (prevLine !== undefined) {
          lines.push({ type: 'remove', text: prevLine });
        }
        if (nextLine !== undefined) {
          lines.push({ type: 'add', text: nextLine });
        }
      }
      if (lines.length >= limit) {
        truncated = true;
        break;
      }
    }
    return { lines, truncated };
  };

  const getPortValue = React.useCallback(
    (direction: 'input' | 'output', nodeId: string, port: string): unknown => {
      const source = direction === 'input' ? runtimeState.inputs : runtimeState.outputs;
      const nodeValues = source?.[nodeId] ?? {};
      const directValue = (nodeValues as Record<string, unknown>)[port];
      if (directValue !== undefined) return directValue;
      const history = runtimeState.history?.[nodeId];
      if (!Array.isArray(history) || history.length === 0) return directValue;
      const lastEntry = history[history.length - 1];
      const fallbackSource =
        direction === 'input' ? lastEntry?.inputs : lastEntry?.outputs;
      return (fallbackSource as Record<string, unknown> | undefined)?.[port];
    },
    [runtimeState]
  );

  const nodeById = React.useMemo(
    () => new Map(nodes.map((node: AiNode) => [node.id, node])),
    [nodes]
  );

  const getConnectionMismatches = (
    direction: 'input' | 'output',
    nodeId: string,
    port: string
  ): ConnectionTypeMismatch[] => {
    const relevantEdges =
      direction === 'input'
        ? edges.filter((edge) => edge.to === nodeId && edge.toPort === port)
        : edges.filter((edge) => edge.from === nodeId && edge.fromPort === port);
    return relevantEdges.flatMap((edge) => {
      if (!edge.fromPort || !edge.toPort) return [];
      const fromTypes = getPortDataTypes(edge.fromPort);
      const toTypes = getPortDataTypes(edge.toPort);
      if (arePortTypesCompatible(fromTypes, toTypes)) return [];
      return [
        {
          fromNode: nodeById.get(edge.from) ?? null,
          toNode: nodeById.get(edge.to) ?? null,
          fromPort: edge.fromPort,
          toPort: edge.toPort,
          fromTypes,
          toTypes,
        },
      ];
    });
  };

  const buildConnectorInfo = (
    direction: 'input' | 'output',
    nodeId: string,
    port: string
  ): ConnectorInfo => {
    const expectedTypes = getPortDataTypes(port);
    const rawValue = getPortValue(direction, nodeId, port);
    const treatArrayAsHistory =
      Array.isArray(rawValue) &&
      !expectedTypes.includes('array') &&
      !expectedTypes.includes('image') &&
      !expectedTypes.includes('any') &&
      !expectedTypes.includes('json');
    const history = treatArrayAsHistory ? (rawValue as unknown[]) : null;
    const value = history ? history[history.length - 1] : rawValue;
    const actualType = value !== undefined ? getValueTypeLabel(value) : null;
    const runtimeMismatch =
      value !== undefined && value !== null
        ? !isValueCompatibleWithTypes(value, expectedTypes)
        : false;
    const connectionMismatches = getConnectionMismatches(direction, nodeId, port);
    const hasMismatch = runtimeMismatch || connectionMismatches.length > 0;
    return {
      direction,
      port,
      expectedTypes,
      expectedLabel: formatPortDataTypes(expectedTypes),
      rawValue,
      value,
      isHistory: Boolean(history),
      historyLength: history ? history.length : 0,
      actualType,
      runtimeMismatch,
      connectionMismatches,
      hasMismatch,
    };
  };

  const renderConnectorTooltip = (info: ConnectorInfo): React.JSX.Element => {
    const label = info.direction === 'input' ? 'Input' : 'Output';
    const diff =
      info.isHistory && Array.isArray(info.rawValue) && info.rawValue.length > 1
        ? buildDiffLines(
          stringifyForDiff(info.rawValue[info.rawValue.length - 2]),
          stringifyForDiff(info.rawValue[info.rawValue.length - 1])
        )
        : null;
    return (
      <div className='space-y-1'>
        <div className='text-[11px] text-gray-400'>
          {label}: {formatPortLabel(info.port)}
        </div>
        <div className='text-[10px] text-gray-400'>
          Data type: <span className='text-gray-200'>{info.expectedLabel}</span>
        </div>
        {info.actualType ? (
          <div
            className={`text-[10px] ${
              info.runtimeMismatch ? 'text-rose-300' : 'text-gray-400'
            }`}
          >
            Actual: {info.actualType}
          </div>
        ) : null}
        {info.isHistory ? (
          <div className='text-[10px] text-amber-200'>
            {info.historyLength > 1 ? `History (${info.historyLength})` : 'Single value'}
          </div>
        ) : null}
        {info.runtimeMismatch ? (
          <div className='text-[10px] text-rose-300'>
            Type mismatch (expected {info.expectedLabel})
          </div>
        ) : null}
        {info.connectionMismatches.length > 0 ? (
          <div className='space-y-1 text-[10px] text-rose-300'>
            {info.connectionMismatches.map((mismatch, index) => {
              const fromLabel = mismatch.fromNode?.title ?? mismatch.fromNode?.id ?? 'unknown';
              const toLabel = mismatch.toNode?.title ?? mismatch.toNode?.id ?? 'unknown';
              return (
                <div key={`${mismatch.fromPort}-${mismatch.toPort}-${index}`}>
                  Connection mismatch: {fromLabel}.{formatPortLabel(mismatch.fromPort)} (
                  {formatPortDataTypes(mismatch.fromTypes)}) {'->'} {toLabel}.
                  {formatPortLabel(mismatch.toPort)} ({formatPortDataTypes(mismatch.toTypes)})
                </div>
              );
            })}
          </div>
        ) : null}
        <pre className='mt-1 max-h-56 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200'>
          {formatConnectorValue(info.value)}
        </pre>
        <div className='text-[10px] text-gray-500'>
          Right-click to disconnect. Drag to reconnect.
        </div>
        {diff ? (
          <div className='mt-2'>
            <div className='text-[10px] text-gray-400'>Diff (last two passes)</div>
            <div className='mt-1 max-h-40 overflow-auto rounded bg-black/50 p-2 font-mono text-[10px] leading-relaxed'>
              {diff.lines.map((line, index) => {
                const prefix = line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  ';
                const colorClass =
                  line.type === 'add'
                    ? 'text-emerald-300'
                    : line.type === 'remove'
                      ? 'text-rose-300'
                      : 'text-gray-300';
                return (
                  <div
                    key={`${line.type}-${index}`}
                    className={`whitespace-pre ${colorClass}`}
                  >
                    {prefix}
                    {line.text}
                  </div>
                );
              })}
              {diff.truncated ? (
                <div className='mt-1 text-gray-500'>Diff truncated…</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const triggerConnected = React.useMemo((): Set<string> => {
    const triggerIds = nodes.filter((node) => node.type === 'trigger').map((node) => node.id);
    if (triggerIds.length === 0) return new Set<string>();
    const adjacency = new Map<string, Set<string>>();
    edges.forEach((edge) => {
      if (!edge.from || !edge.to) return;
      const fromSet = adjacency.get(edge.from) ?? new Set<string>();
      fromSet.add(edge.to);
      adjacency.set(edge.from, fromSet);
      const toSet = adjacency.get(edge.to) ?? new Set<string>();
      toSet.add(edge.from);
      adjacency.set(edge.to, toSet);
    });
    const visited = new Set<string>();
    const queue = [...triggerIds];
    triggerIds.forEach((id) => visited.add(id));
    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor) => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        queue.push(neighbor);
      });
    }
    return visited;
  }, [nodes, edges]);

  const edgeMetaMap = React.useMemo(
    (): Map<string, Edge> => new Map(edges.map((edge) => [edge.id, edge])),
    [edges]
  );
  const edgesByFromPort = React.useMemo(() => {
    const map = new Map<string, Edge[]>();
    edges.forEach((edge) => {
      if (!edge.from || !edge.fromPort) return;
      const key = buildEdgePortKey(edge.from, edge.fromPort);
      const list = map.get(key) ?? [];
      list.push(edge);
      map.set(key, list);
    });
    return map;
  }, [edges, buildEdgePortKey]);
  const edgesByToPort = React.useMemo(() => {
    const map = new Map<string, Edge[]>();
    edges.forEach((edge) => {
      if (!edge.to || !edge.toPort) return;
      const key = buildEdgePortKey(edge.to, edge.toPort);
      const list = map.get(key) ?? [];
      list.push(edge);
      map.set(key, list);
    });
    return map;
  }, [edges, buildEdgePortKey]);
  const incomingEdgeIdsByNode = React.useMemo((): Map<string, string[]> => {
    const map = new Map<string, string[]>();
    edges.forEach((edge) => {
      if (!edge.to) return;
      const list = map.get(edge.to) ?? [];
      list.push(edge.id);
      map.set(edge.to, list);
    });
    return map;
  }, [edges]);
  const outgoingEdgeIdsByNode = React.useMemo((): Map<string, string[]> => {
    const map = new Map<string, string[]>();
    edges.forEach((edge) => {
      if (!edge.from) return;
      const list = map.get(edge.from) ?? [];
      list.push(edge.id);
      map.set(edge.from, list);
    });
    return map;
  }, [edges]);

  const buildRuntimeHashes = React.useCallback((): RuntimeHashes => {
    const inputHashes: Record<string, Record<string, string>> = {};
    const outputHashes: Record<string, Record<string, string>> = {};
    nodes.forEach((node) => {
      if (node.inputs?.length) {
        const nodeInputs = (runtimeState.inputs?.[node.id] ?? {}) as Record<
          string,
          unknown
        >;
        const hashed: Record<string, string> = {};
        node.inputs.forEach((port) => {
          hashed[port] = hashRuntimeValue(nodeInputs[port]);
        });
        inputHashes[node.id] = hashed;
      }
      if (node.outputs?.length) {
        const nodeOutputs = (runtimeState.outputs?.[node.id] ?? {}) as Record<
          string,
          unknown
        >;
        const hashed: Record<string, string> = {};
        node.outputs.forEach((port) => {
          hashed[port] = hashRuntimeValue(nodeOutputs[port]);
        });
        outputHashes[node.id] = hashed;
      }
    });
    return { inputs: inputHashes, outputs: outputHashes };
  }, [nodes, runtimeState]);

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
      }, FLOW_ANIMATION_MS);
      edgePulseTimeouts.current.set(edgeId, timeout);
    },
    [FLOW_ANIMATION_MS]
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
      }, NODE_PULSE_MS);
      nodePulseTimeouts.current.set(key, timeout);
    },
    [NODE_PULSE_MS]
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
    const nextEvents = runtimeEvents.slice(
      startIndex >= 0 ? startIndex : fallbackStart
    );
    if (nextEvents.length === 0) return;

    nextEvents.forEach((event: AiPathRuntimeEvent) => {
      const normalizedStatus =
        typeof event.status === 'string'
          ? event.status.trim().toLowerCase()
          : '';
      const nodeId = event.nodeId?.trim() ?? '';
      if (!nodeId) return;

      const isStartSignal =
        event.kind === 'node_started' ||
        normalizedStatus === 'running';
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
    if ((runtimeEvents?.length ?? 0) > 0) return;
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
    buildRuntimeHashes,
    buildEdgePortKey,
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

  return (
    <div
      ref={viewportRef}
      className={`relative min-h-[560px] rounded-lg border bg-card/70 backdrop-blur overflow-hidden ${
        panState ? 'cursor-grabbing' : 'cursor-grab'
      } ${viewportClassName ?? ''}`}
      style={flowStyle}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onPointerDown={handlePanStart}
      onPointerMove={handlePanMove}
      onPointerUp={handlePanEnd}
      onPointerLeave={handlePanEnd}
    >
      <div className='absolute bottom-3 left-3 z-10 rounded-md border border-border/60 bg-card/30 p-2 text-[11px] text-gray-400'>
        Nodes: {nodes.length}
        {lastDrop ? ` • Last drop: ${Math.round(lastDrop.x)}, ${Math.round(lastDrop.y)}` : ''}
        {` • View: ${Math.round(view.x)}, ${Math.round(view.y)} @ ${Math.round(view.scale * 100)}%`}
      </div>
      <div className='absolute bottom-4 right-4 z-10 rounded-md border border-border/60 bg-card/30 p-2 text-xs text-gray-300'>
        <div className='mb-2 text-[11px] uppercase text-gray-500'>View Controls</div>
        <div className='flex items-center gap-2'>
          <Button
            className='h-7 w-7 rounded-full border text-xs text-white hover:bg-muted/60'
            type='button'
            onClick={() => zoomTo(view.scale - 0.1)}
          >
            -
          </Button>
          <span className='min-w-[56px] text-center text-[11px] text-gray-300'>
            {Math.round(view.scale * 100)}%
          </span>
          <Button
            className='h-7 w-7 rounded-full border text-xs text-white hover:bg-muted/60'
            type='button'
            onClick={() => zoomTo(view.scale + 0.1)}
          >
            +
          </Button>
          <Button
            className='h-7 rounded-full border px-2 text-[11px] text-white hover:bg-muted/60'
            type='button'
            onClick={fitToNodes}
          >
            Fit
          </Button>
          <Button
            className='h-7 rounded-full border px-2 text-[11px] text-white hover:bg-muted/60'
            type='button'
            onClick={resetView}
          >
            Reset
          </Button>
        </div>
      </div>
      <div
        ref={canvasRef}
        className='absolute left-0 top-0'
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: '0 0',
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.18) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      >
        {lastDrop ? (
          <div
            className='absolute'
            style={{
              width: 10,
              height: 10,
              transform: `translate(${lastDrop.x}px, ${lastDrop.y}px)`,
            }}
          >
            <span className='absolute inset-0 rounded-full bg-sky-400/40 animate-ping' />
            <span className='absolute inset-0 rounded-full border border-sky-300/70 bg-sky-500/60' />
          </div>
        ) : null}
        <svg
          className='absolute inset-0'
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ pointerEvents: 'auto' }}
        >
          <defs>
            <filter id='signal-dot-glow' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur stdDeviation='2' result='blur' />
              <feMerge>
                <feMergeNode in='blur' />
                <feMergeNode in='SourceGraphic' />
              </feMerge>
            </filter>
          </defs>
          {(edgePaths as EdgePath[]).map((edge: EdgePath): React.JSX.Element => {
            const isSelected = selectedEdgeId === edge.id;
            const edgeMeta = edgeMetaMap.get(edge.id);
            const isFlowing = activeEdgeIds.has(edge.id);
            const isManualConnector =
              edgeMeta?.fromPort === 'aiPrompt' || edgeMeta?.toPort === 'queryCallback';
            const fromNode = edgeMeta ? nodes.find((n) => n.id === edgeMeta.from) : null;
            const toNode = edgeMeta ? nodes.find((n) => n.id === edgeMeta.to) : null;
            const isSchemaConnection =
              fromNode?.type === 'db_schema' && toNode?.type === 'database';
            const isActivePath =
              !isManualConnector &&
              !isSchemaConnection &&
              edgeMeta &&
              triggerConnected.has(edgeMeta.from) &&
              triggerConnected.has(edgeMeta.to);
            const edgeClass = `transition-all duration-150 ${
              isSelected
                ? 'text-sky-300'
                : isActivePath || isFlowing
                  ? 'text-sky-400/80 group-hover:text-sky-300/90'
                  : 'text-sky-400/55 group-hover:text-sky-300/80'
            }`;
            const arrowSize = isSelected ? 9 : 8;
            const arrowWidth = isSelected ? 6 : 5;
            const arrowPath = `M 0 0 L -${arrowSize} ${arrowWidth / 2} L -${arrowSize} -${arrowWidth / 2} Z`;
            return (
              <g key={edge.id} className='group cursor-pointer'>
                <path
                  d={edge.path}
                  stroke='transparent'
                  strokeWidth='14'
                  fill='none'
                  style={{ pointerEvents: 'stroke' }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    handleRemoveEdge(edge.id);
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectEdge(edge.id);
                  }}
                />
                <path
                  d={edge.path}
                  className={edgeClass}
                  strokeWidth={isSelected ? 2.5 : 1.6}
                  stroke='currentColor'
                  fill='none'
                  style={{ pointerEvents: 'none' }}
                />
                {isFlowing && flowEnabled ? (
                  <>
                    <path
                      d={edge.path}
                      className={`${edgeClass} ai-paths-wire-flow`}
                      strokeWidth={isSelected ? 3.4 : 2.2}
                      stroke='currentColor'
                      fill='none'
                      style={{ pointerEvents: 'none' }}
                    />
                    <SignalDots
                      path={edge.path}
                      intensity={resolvedFlowIntensity}
                    />
                  </>
                ) : null}
                {edge.arrow ? (
                  <path
                    d={arrowPath}
                    transform={`translate(${edge.arrow.x} ${edge.arrow.y}) rotate(${edge.arrow.angle})`}
                    className={edgeClass}
                    fill='currentColor'
                    stroke='none'
                    style={{ pointerEvents: 'none' }}
                  />
                ) : null}
              </g>
            );
          })}
          {connecting && connectingPos ? ((): React.JSX.Element => {
            const fromX = connecting.start.x;
            const fromY = connecting.start.y;
            const toX = connectingPos.x;
            const toY = connectingPos.y;
            const midX = fromX + (toX - fromX) * 0.5;
            const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
            return (
              <path
                d={path}
                stroke='rgba(56,189,248,0.55)'
                strokeWidth='1.6'
                fill='none'
              />
            );
          })() : null}
        </svg>

        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId;
          const style = typeStyles[node.type];
          const canUsePersistedStatusFallback = runtimeRunStatus !== 'idle';
          const statusFromRuntimeState = (runtimeState.outputs[node.id] as Record<string, unknown> | undefined)?.['status'];
          const runtimeNodeStatusRaw =
            runtimeNodeStatuses?.[node.id] ??
            (canUsePersistedStatusFallback && typeof statusFromRuntimeState === 'string'
              ? statusFromRuntimeState
              : null);
          const runtimeNodeStatus =
            typeof runtimeNodeStatusRaw === 'string' && runtimeNodeStatusRaw.trim().length > 0
              ? runtimeNodeStatusRaw.trim().toLowerCase()
              : null;
          const runtimeNodeStatusLabel = runtimeNodeStatus
            ? formatRuntimeStatusLabel(runtimeNodeStatus)
            : null;
          const iteratorOutput =
            node.type === 'iterator'
              ? (runtimeState.outputs[node.id] as
                  | Record<string, unknown>
                  | undefined)
              : undefined;
          const iteratorStatus = (iteratorOutput?.['status'] as string | undefined) ?? null;
          const iteratorIndex =
            typeof iteratorOutput?.['index'] === 'number' ? (iteratorOutput?.['index']) : null;
          const iteratorTotal =
            typeof iteratorOutput?.['total'] === 'number' ? (iteratorOutput?.['total']) : null;
          const iteratorDone =
            typeof iteratorOutput?.['done'] === 'boolean' ? (iteratorOutput?.['done']) : null;
          const iteratorProgressLabel =
            iteratorIndex !== null && iteratorTotal !== null && iteratorTotal > 0
              ? `${Math.min(iteratorIndex + 1, iteratorTotal)}/${iteratorTotal}`
              : iteratorTotal !== null && iteratorTotal === 0
                ? '0/0'
                : null;
          const iteratorStatusClasses =
            iteratorStatus === 'completed' || iteratorDone
              ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
              : iteratorStatus === 'advance_pending'
                ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                : iteratorStatus === 'waiting_callback'
                  ? 'border-sky-500/60 bg-sky-500/15 text-sky-200'
                  : 'border-border bg-card/60 text-gray-200';
          const blockerNodeStatus =
            node.type === 'model' ||
            node.type === 'agent' ||
            node.type === 'learner_agent' ||
            node.type === 'poll' ||
            node.type === 'delay'
              ? runtimeNodeStatus
              : undefined;
          const isBlockerProcessing =
            flowEnabled &&
            !!blockerNodeStatus &&
            BLOCKER_PROCESSING_STATUSES.has(blockerNodeStatus);
          const noteConfig = node.config?.notes;
          const noteText = typeof noteConfig?.text === 'string' ? noteConfig.text.trim() : '';
          const noteColor =
            typeof noteConfig?.color === 'string' && noteConfig.color.trim()
              ? noteConfig.color.trim()
              : DEFAULT_NODE_NOTE_COLOR;
          const showNote = Boolean(noteConfig?.showOnCanvas && noteText);
          const isScheduledTrigger =
            node.type === 'trigger' && node.config?.trigger?.event === 'scheduled_run';
          const isInputPulse = inputPulseNodes.has(node.id);
          const isOutputPulse = outputPulseNodes.has(node.id);
          const isDragging = dragState?.nodeId === node.id;
          
          return (
            <div
              key={node.id}
              className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{
                width: NODE_WIDTH,
                transform: `translate(${node.position.x}px, ${node.position.y}px)`,
              }}
              onPointerDown={(event) => handlePointerDownNode(event, node.id)}
              onPointerMove={(event) => handlePointerMoveNode(event, node.id)}
              onPointerUp={(event) => handlePointerUpNode(event, node.id)}
              onClick={() => handleSelectNode(node.id)}
              onDoubleClick={(event) => {
                event.stopPropagation();
                handleSelectNode(node.id);
                setConfigOpen(true);
              }}
            >
              <div
                className={`relative flex flex-col gap-2 rounded-xl border bg-card/80 p-3 pb-5 text-xs text-gray-200 shadow-lg backdrop-blur ${
                  style.border
                } ${style.glow} ${isSelected ? 'ring-2 ring-white/20' : ''}`}
                style={{ minHeight: NODE_MIN_HEIGHT }}
              >
                {isInputPulse || isOutputPulse ? (
                  <div className='absolute -top-2 right-2 flex items-center gap-1'>
                    {isInputPulse ? (
                      <span
                        className='relative inline-flex h-2.5 w-2.5'
                        title='Input loaded'
                      >
                        <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/70' />
                        <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_6px_rgba(56,189,248,0.75)]' />
                      </span>
                    ) : null}
                    {isOutputPulse ? (
                      <span
                        className='relative inline-flex h-2.5 w-2.5'
                        title='Output sent'
                      >
                        <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70' />
                        <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.75)]' />
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div
                  className='pointer-events-none absolute bottom-1 right-2 w-[90%] break-all text-right text-[9px] font-mono text-gray-400/80'
                >
                  {node.id}
                </div>
                {node.inputs.map((input, index) => (
                  <div
                    key={`input-${node.id}-${input}`}
                    className='absolute flex items-center'
                    style={{
                      left: -(PORT_SIZE / 2) - 4,
                      top: getPortOffsetY(index, node.inputs.length) - PORT_SIZE / 2,
                    }}
                    onMouseEnter={() => setHoveredConnectorKey(buildConnectorKey('input', node.id, input))}
                    onMouseLeave={() =>
                      setHoveredConnectorKey((prev) =>
                        prev === buildConnectorKey('input', node.id, input) ? null : prev
                      )
                    }
                  >
                    {(() : React.JSX.Element => {
                      const isConnecting = Boolean(connecting && connectingFromNode);
                      const isConnectable = isConnecting
                        ? validateConnection(
                            connectingFromNode as AiNode,
                            node,
                            connecting?.fromPort ?? '',
                            input
                        ).valid
                        : false;
                      const connectorInfo = buildConnectorInfo('input', node.id, input);
                      const hasIncomingEdge = edges.some(
                        (edge): boolean =>
                          edge.to === node.id && edge.toPort === input
                      );
                      const connectorKey = buildConnectorKey('input', node.id, input);
                      const isPinned = pinnedConnectorKey === connectorKey;
                      const isHovered = hoveredConnectorKey === connectorKey;
                      const isTooltipOpen = isPinned || isHovered;
                      const hasMismatch = connectorInfo.hasMismatch;
                      const tooltipOverride = resolveConnectorTooltip?.({
                        direction: 'input',
                        node,
                        port: input,
                      }) ?? null;
                      return (
                        <>
                          <Tooltip
                            content={tooltipOverride?.content ?? renderConnectorTooltip(connectorInfo)}
                            side='right'
                            maxWidth={tooltipOverride?.maxWidth ?? '360px'}
                            open={isTooltipOpen}
                            disableHover
                          >
                            <div className='relative'>
                              <button
                                type='button'
                                data-port='input'
                                className={`cursor-pointer rounded-full border bg-sky-500/20 shadow-[0_0_8px_rgba(56,189,248,0.35)] hover:border-sky-200 ${
                                  isConnecting
                                    ? isConnectable
                                      ? 'border-emerald-300/80 bg-emerald-500/30 shadow-[0_0_14px_rgba(52,211,153,0.55)] ring-2 ring-emerald-400/60'
                                      : 'border-border/60 bg-card/20 opacity-40 shadow-none'
                                    : isPinned
                                      ? 'border-amber-300/80 ring-2 ring-amber-300/70'
                                      : 'border-sky-400/60'
                                }`}
                                style={{
                                  width: PORT_SIZE + 2,
                                  height: PORT_SIZE + 2,
                                }}
                                onPointerUp={(event) => {
                                  event.stopPropagation();
                                  if (connecting) {
                                    handleCompleteConnection(event, node, input);
                                    return;
                                  }
                                }}
                                onPointerDown={(event) => {
                                  event.stopPropagation();
                                  if (hasIncomingEdge) {
                                    handleReconnectInput(event, node.id, input);
                                  }
                                }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPinnedConnectorKey((prev) =>
                                    prev === connectorKey ? null : connectorKey
                                  );
                                }}
                                onContextMenu={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleDisconnectPort('input', node.id, input);
                                }}
                                aria-label={`Connect to ${formatPortLabel(input)}`}
                                title={`Input: ${formatPortLabel(input)}`}
                              />
                              {hasMismatch ? (
                                <span className='absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black/60' />
                              ) : null}
                            </div>
                          </Tooltip>
                          <span
                            className={`ml-1.5 rounded px-1 py-0.5 text-[8px] font-medium ${
                              isConnecting
                                ? isConnectable
                                  ? 'bg-emerald-500/15 text-emerald-200'
                                  : 'bg-muted/60 text-gray-500'
                                : hasMismatch
                                  ? 'bg-rose-500/15 text-rose-200'
                                  : 'bg-sky-500/10 text-sky-300'
                            }`}
                          >
                            {formatPortLabel(input)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                ))}
                {node.outputs.map((output, index) => (
                  <div
                    key={`output-${node.id}-${output}`}
                    className='absolute flex items-center'
                    style={{
                      right: -(PORT_SIZE / 2) - 4,
                      top: getPortOffsetY(index, node.outputs.length) - PORT_SIZE / 2,
                    }}
                    onMouseEnter={() => setHoveredConnectorKey(buildConnectorKey('output', node.id, output))}
                    onMouseLeave={() =>
                      setHoveredConnectorKey((prev) =>
                        prev === buildConnectorKey('output', node.id, output) ? null : prev
                      )
                    }
                  >
                    {((): React.JSX.Element => {
                      const connectorInfo = buildConnectorInfo('output', node.id, output);
                      const connectorKey = buildConnectorKey('output', node.id, output);
                      const isPinned = pinnedConnectorKey === connectorKey;
                      const isHovered = hoveredConnectorKey === connectorKey;
                      const isTooltipOpen = isPinned || isHovered;
                      const hasMismatch = connectorInfo.hasMismatch;
                      const tooltipOverride = resolveConnectorTooltip?.({
                        direction: 'output',
                        node,
                        port: output,
                      }) ?? null;
                      return (
                        <>
                          <span
                            className={`mr-1.5 rounded px-1 py-0.5 text-[8px] font-medium ${
                              hasMismatch
                                ? 'bg-rose-500/15 text-rose-200'
                                : 'bg-amber-500/10 text-amber-300'
                            }`}
                          >
                            {formatPortLabel(output)}
                          </span>
                          <Tooltip
                            content={tooltipOverride?.content ?? renderConnectorTooltip(connectorInfo)}
                            side='left'
                            maxWidth={tooltipOverride?.maxWidth ?? '360px'}
                            open={isTooltipOpen}
                            disableHover
                          >
                            <div className='relative'>
                              <button
                                type='button'
                                data-port='output'
                                className={`cursor-pointer rounded-full border bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.35)] hover:border-amber-200 ${
                                  isPinned ? 'border-amber-300/80 ring-2 ring-amber-300/70' : 'border-amber-400/60'
                                }`}
                                style={{
                                  width: PORT_SIZE + 2,
                                  height: PORT_SIZE + 2,
                                }}
                                onPointerDown={(event) =>
                                  handleStartConnection(event, node, output)
                                }
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPinnedConnectorKey((prev) =>
                                    prev === connectorKey ? null : connectorKey
                                  );
                                }}
                                onContextMenu={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleDisconnectPort('output', node.id, output);
                                }}
                                aria-label={`Start connection from ${formatPortLabel(output)}`}
                                title={`Output: ${formatPortLabel(output)}`}
                              />
                              {hasMismatch ? (
                                <span className='absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black/60' />
                              ) : null}
                            </div>
                          </Tooltip>
                        </>
                      );
                    })()}
                  </div>
                ))}
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-xs font-semibold text-white'>{node.title}</span>
                  <div className='flex items-center gap-1'>
                    {isScheduledTrigger ? (
                      <span className='rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-[1px] text-[9px] uppercase text-amber-200'>
                        Scheduled
                      </span>
                    ) : null}
                    <span className='rounded-full border px-2 py-[1px] text-[10px] uppercase text-gray-400'>
                      {node.type}
                    </span>
                  </div>
                </div>
                {runtimeNodeStatusLabel && (
                  <div className='inline-flex w-fit items-center gap-1'>
                    <div
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[9px] uppercase tracking-wide ${runtimeStatusBadgeClassName(runtimeNodeStatus ?? '')}`}
                    >
                      {runtimeNodeStatus === 'cached' && (
                        <svg className='h-2.5 w-2.5 shrink-0' viewBox='0 0 16 16' fill='currentColor'>
                          <path d='M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2' />
                        </svg>
                      )}
                      {runtimeNodeStatusLabel}
                    </div>
                    {nodeDurations[node.id] != null && (
                      <span className='text-[9px] text-gray-400'>
                        {formatDurationMs(nodeDurations[node.id] ?? null)}
                      </span>
                    )}
                  </div>
                )}
                {node.type === 'iterator' && (iteratorStatus || iteratorProgressLabel) ? (
                  <div
                    className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-[2px] text-[9px] uppercase tracking-wide ${iteratorStatusClasses}`}
                    title={
                      iteratorProgressLabel && iteratorStatus
                        ? `${iteratorProgressLabel} • ${iteratorStatus}`
                        : iteratorStatus ?? iteratorProgressLabel ?? undefined
                    }
                  >
                    {iteratorProgressLabel ? <span>{iteratorProgressLabel}</span> : null}
                    {iteratorStatus ? <span>{iteratorStatus}</span> : null}
                  </div>
                ) : null}
                {isBlockerProcessing && (
                  <div className='inline-flex w-fit items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-[2px] text-[9px] uppercase tracking-wide text-sky-200'>
                    Processing
                    <NodeProcessingDots active />
                  </div>
                )}
                {node.type === 'viewer' && !triggerConnected.has(node.id) && (
                  <div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[9px] text-amber-200'>
                    Not wired to a Trigger
                  </div>
                )}
                {node.type === 'trigger' && (
                  <Button
                    className='self-start rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/10'
                    type='button'
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => { void fireTrigger(node, event); }}
                  >
                    Fire Trigger
                  </Button>
                )}
                {node.type === 'trigger' && (
                  <div className='text-[10px] uppercase text-lime-200/80'>
                    {isScheduledTrigger
                      ? 'Server scheduled trigger'
                      : 'Accepts context input'}
                  </div>
                )}
                {node.type === 'context' && (
                  <span className='text-[10px] uppercase text-emerald-300/80'>
                    Role output can feed any Trigger
                  </span>
                )}
                {node.type === 'simulation' && (
                  <span className='text-[10px] uppercase text-cyan-300/80'>
                    Wire Trigger ↔ Simulation
                  </span>
                )}
                {node.type === 'viewer' && (
                  <div className='rounded-md border border-border bg-card/60 px-2 py-1 text-[10px] text-gray-400'>
                    Open node to view results
                  </div>
                )}
              </div>
              {showNote ? (
                <div
                  className='mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-[11px] text-gray-900 shadow-sm'
                  style={{ backgroundColor: noteColor }}
                >
                  <div className='whitespace-pre-wrap break-words'>{noteText}</div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
