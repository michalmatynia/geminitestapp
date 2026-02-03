import React from "react";
import { Button, Tooltip } from "@/shared/ui";

import type { AiNode, Edge, RuntimeState } from "@/features/ai/ai-paths/lib";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_WIDTH,
  PORT_SIZE,
  getPortOffsetY,
  formatRuntimeValue,
  hashRuntimeValue,
  typeStyles,
  validateConnection,
  arePortTypesCompatible,
  formatPortDataTypes,
  getPortDataTypes,
  getValueTypeLabel,
  isValueCompatibleWithTypes,
  type PortDataType,
} from "@/features/ai/ai-paths/lib";
import { formatPortLabel } from "../utils/ui-utils";

type EdgePath = { id: string; path: string; label?: string | undefined; arrow?: { x: number; y: number; angle: number } | undefined };
type ConnectionTypeMismatch = {
  fromNode?: AiNode | null;
  toNode?: AiNode | null;
  fromPort: string;
  toPort: string;
  fromTypes: PortDataType[];
  toTypes: PortDataType[];
};
type ConnectorInfo = {
  direction: "input" | "output";
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

type CanvasBoardProps = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  nodes: AiNode[];
  edges: Edge[];
  runtimeState: RuntimeState;
  edgePaths: EdgePath[];
  view: { x: number; y: number; scale: number };
  panState: { startX: number; startY: number; originX: number; originY: number } | null;
  lastDrop: { x: number; y: number } | null;
  connecting: { fromNodeId: string; fromPort: string; start: { x: number; y: number } } | null;
  connectingPos: { x: number; y: number } | null;
  connectingFromNode: AiNode | null;
  selectedNodeId: string | null;
  draggingNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectEdgeId: (edgeId: string | null) => void;
  onRemoveEdge: (edgeId: string) => void;
  onDisconnectPort: (direction: "input" | "output", nodeId: string, port: string) => void;
  onReconnectInput: (event: React.PointerEvent<HTMLButtonElement>, nodeId: string, port: string) => void;
  onSelectNode: (nodeId: string) => void;
  onOpenNodeConfig: (nodeId: string) => void;
  onFireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onPointerDownNode: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onPointerMoveNode: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onPointerUpNode: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onStartConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => void;
  onCompleteConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onPanStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPanMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPanEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
  onZoomTo: (scale: number) => void;
  onFitToNodes: () => void;
  onResetView: () => void;
};

export function CanvasBoard({
  viewportRef,
  canvasRef,
  nodes,
  edges,
  runtimeState,
  edgePaths,
  view,
  panState,
  lastDrop,
  connecting,
  connectingPos,
  connectingFromNode,
  selectedNodeId,
  draggingNodeId,
  selectedEdgeId,
  onSelectEdgeId,
  onRemoveEdge,
  onDisconnectPort,
  onReconnectInput,
  onSelectNode,
  onOpenNodeConfig,
  onFireTrigger,
  onPointerDownNode,
  onPointerMoveNode,
  onPointerUpNode,
  onStartConnection,
  onCompleteConnection,
  onDrop,
  onDragOver,
  onPanStart,
  onPanMove,
  onPanEnd,
  onZoomTo,
  onFitToNodes,
  onResetView,
}: CanvasBoardProps): React.JSX.Element {
  const [hoveredConnectorKey, setHoveredConnectorKey] = React.useState<string | null>(null);
  const [pinnedConnectorKey, setPinnedConnectorKey] = React.useState<string | null>(null);
  const [activeEdgeIds, setActiveEdgeIds] = React.useState<Set<string>>(() => new Set());
  const [inputPulseNodes, setInputPulseNodes] = React.useState<Set<string>>(() => new Set());
  const [outputPulseNodes, setOutputPulseNodes] = React.useState<Set<string>>(() => new Set());
  const prevHashesRef = React.useRef<RuntimeHashes | null>(null);
  const edgePulseTimeouts = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const nodePulseTimeouts = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const FLOW_ANIMATION_MS = 1600;
  const NODE_PULSE_MS = 1400;

  const buildConnectorKey = (
    direction: "input" | "output",
    nodeId: string,
    port: string
  ): string => `${direction}:${nodeId}:${port}`;
  const buildEdgePortKey = React.useCallback(
    (nodeId: string, port: string): string => `${nodeId}:${port}`,
    []
  );

  const formatConnectorValue = (value: unknown): string => {
    if (value === undefined) return "No data yet.";
    if (value === null) return "null";
    const formatted = typeof value === "string" ? value : formatRuntimeValue(value);
    if (formatted.length > 1200) return `${formatted.slice(0, 1200)}…`;
    return formatted;
  };

  const stringifyForDiff = (value: unknown): string => {
    if (value === undefined) return "";
    if (value === null) return "null";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "[Complex Object]";
    }
  };

  const buildDiffLines = (prev: string, next: string, limit: number = 120): { lines: Array<{ type: "add" | "remove" | "same"; text: string }>; truncated: boolean } => {
    const prevLines = prev.split("\n");
    const nextLines = next.split("\n");
    const max = Math.max(prevLines.length, nextLines.length);
    const lines: Array<{ type: "add" | "remove" | "same"; text: string }> = [];
    let truncated = false;
    for (let index = 0; index < max; index += 1) {
      const prevLine = prevLines[index];
      const nextLine = nextLines[index];
      if (prevLine === nextLine) {
        if (prevLine !== undefined) {
          lines.push({ type: "same", text: prevLine });
        }
      } else {
        if (prevLine !== undefined) {
          lines.push({ type: "remove", text: prevLine });
        }
        if (nextLine !== undefined) {
          lines.push({ type: "add", text: nextLine });
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
    (direction: "input" | "output", nodeId: string, port: string): unknown => {
      const source = direction === "input" ? runtimeState.inputs : runtimeState.outputs;
      const nodeValues = source?.[nodeId] ?? {};
      return (nodeValues as Record<string, unknown>)[port];
    },
    [runtimeState]
  );

  const nodeById = React.useMemo(
    () => new Map(nodes.map((node: AiNode) => [node.id, node])),
    [nodes]
  );

  const getConnectionMismatches = (
    direction: "input" | "output",
    nodeId: string,
    port: string
  ): ConnectionTypeMismatch[] => {
    const relevantEdges =
      direction === "input"
        ? edges.filter((edge: Edge) => edge.to === nodeId && edge.toPort === port)
        : edges.filter((edge: Edge) => edge.from === nodeId && edge.fromPort === port);
    return relevantEdges.flatMap((edge: Edge) => {
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
    direction: "input" | "output",
    nodeId: string,
    port: string
  ): ConnectorInfo => {
    const expectedTypes = getPortDataTypes(port);
    const rawValue = getPortValue(direction, nodeId, port);
    const treatArrayAsHistory =
      Array.isArray(rawValue) &&
      !expectedTypes.includes("array") &&
      !expectedTypes.includes("image");
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
    const label = info.direction === "input" ? "Input" : "Output";
    const diff =
      info.isHistory && Array.isArray(info.rawValue) && info.rawValue.length > 1
        ? buildDiffLines(
            stringifyForDiff(info.rawValue[info.rawValue.length - 2]),
            stringifyForDiff(info.rawValue[info.rawValue.length - 1])
          )
        : null;
    return (
      <div className="space-y-1">
        <div className="text-[11px] text-gray-400">
          {label}: {formatPortLabel(info.port)}
        </div>
        <div className="text-[10px] text-gray-400">
          Data type: <span className="text-gray-200">{info.expectedLabel}</span>
        </div>
        {info.actualType ? (
          <div
            className={`text-[10px] ${
              info.runtimeMismatch ? "text-rose-300" : "text-gray-400"
            }`}
          >
            Actual: {info.actualType}
          </div>
        ) : null}
        {info.isHistory ? (
          <div className="text-[10px] text-amber-200">
            {info.historyLength > 1 ? `History (${info.historyLength})` : "Single value"}
          </div>
        ) : null}
        {info.runtimeMismatch ? (
          <div className="text-[10px] text-rose-300">
            Type mismatch (expected {info.expectedLabel})
          </div>
        ) : null}
        {info.connectionMismatches.length > 0 ? (
          <div className="space-y-1 text-[10px] text-rose-300">
            {info.connectionMismatches.map((mismatch: ConnectionTypeMismatch, index: number) => {
              const fromLabel = mismatch.fromNode?.title ?? mismatch.fromNode?.id ?? "unknown";
              const toLabel = mismatch.toNode?.title ?? mismatch.toNode?.id ?? "unknown";
              return (
                <div key={`${mismatch.fromPort}-${mismatch.toPort}-${index}`}>
                  Connection mismatch: {fromLabel}.{formatPortLabel(mismatch.fromPort)} (
                  {formatPortDataTypes(mismatch.fromTypes)}) {"->"} {toLabel}.
                  {formatPortLabel(mismatch.toPort)} ({formatPortDataTypes(mismatch.toTypes)})
                </div>
              );
            })}
          </div>
        ) : null}
        <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200">
          {formatConnectorValue(info.value)}
        </pre>
        <div className="text-[10px] text-gray-500">
          Right-click to disconnect. Drag to reconnect.
        </div>
        {diff ? (
          <div className="mt-2">
            <div className="text-[10px] text-gray-400">Diff (last two passes)</div>
            <div className="mt-1 max-h-40 overflow-auto rounded bg-black/50 p-2 font-mono text-[10px] leading-relaxed">
              {diff.lines.map((line: { type: "add" | "remove" | "same"; text: string }, index: number) => {
                const prefix = line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  ";
                const colorClass =
                  line.type === "add"
                    ? "text-emerald-300"
                    : line.type === "remove"
                      ? "text-rose-300"
                      : "text-gray-300";
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
                <div className="mt-1 text-gray-500">Diff truncated…</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const triggerConnected = React.useMemo((): Set<string> => {
    const triggerIds = nodes.filter((node: AiNode) => node.type === "trigger").map((node: AiNode) => node.id);
    if (triggerIds.length === 0) return new Set<string>();
    const adjacency = new Map<string, Set<string>>();
    edges.forEach((edge: Edge) => {
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
    triggerIds.forEach((id: string) => visited.add(id));
    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor: string) => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        queue.push(neighbor);
      });
    }
    return visited;
  }, [nodes, edges]);
  const edgeMetaMap = React.useMemo(
    (): Map<string, Edge> => new Map(edges.map((edge: Edge) => [edge.id, edge])),
    [edges]
  );
  const edgesByFromPort = React.useMemo(() => {
    const map = new Map<string, Edge[]>();
    edges.forEach((edge: Edge) => {
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
    edges.forEach((edge: Edge) => {
      if (!edge.to || !edge.toPort) return;
      const key = buildEdgePortKey(edge.to, edge.toPort);
      const list = map.get(key) ?? [];
      list.push(edge);
      map.set(key, list);
    });
    return map;
  }, [edges, buildEdgePortKey]);

  // While a "blocker" node is waiting (polling / queued / running), keep the incoming wires animated
  // to show where the signal is currently stuck. Wires *after* the blocker won't animate until the
  // blocker emits its downstream outputs.
  const blockingFlowEdgeIds = React.useMemo((): Set<string> => {
    const result = new Set<string>();
    const blockerTypes = new Set<string>(["poll", "model", "agent", "delay"]);
    const outputs = runtimeState.outputs ?? {};
    nodes.forEach((node: AiNode) => {
      if (!blockerTypes.has(node.type)) return;
      const nodeOutputs = outputs[node.id] as Record<string, unknown> | undefined;
      const rawStatus = nodeOutputs?.status;
      if (typeof rawStatus !== "string") return;
      const status = rawStatus.trim().toLowerCase();
      if (!status) return;
      if (status === "completed" || status === "failed") return;

      edges.forEach((edge: Edge) => {
        if (edge.to !== node.id) return;
        if (!edge.from || !edge.to) return;
        if (!edge.fromPort || !edge.toPort) return;
        if (!triggerConnected.has(edge.from) || !triggerConnected.has(edge.to)) return;

        // Mark the edge as "flowing" if it is currently feeding meaningful inputs into the blocker.
        const inputVal = getPortValue("input", edge.to, edge.toPort);
        const outputVal = getPortValue("output", edge.from, edge.fromPort);
        if (inputVal === undefined && outputVal === undefined) return;
        result.add(edge.id);
      });
    });
    return result;
  }, [edges, getPortValue, nodes, runtimeState.outputs, triggerConnected]);

  const buildRuntimeHashes = React.useCallback((): RuntimeHashes => {
    const inputHashes: Record<string, Record<string, string>> = {};
    const outputHashes: Record<string, Record<string, string>> = {};
    nodes.forEach((node: AiNode) => {
      if (node.inputs?.length) {
        const nodeInputs = (runtimeState.inputs?.[node.id] ?? {}) as Record<
          string,
          unknown
        >;
        const hashed: Record<string, string> = {};
        node.inputs.forEach((port: string) => {
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
        node.outputs.forEach((port: string) => {
          hashed[port] = hashRuntimeValue(nodeOutputs[port]);
        });
        outputHashes[node.id] = hashed;
      }
    });
    return { inputs: inputHashes, outputs: outputHashes };
  }, [nodes, runtimeState]);

  const scheduleEdgePulse = React.useCallback(
    (edgeId: string): void => {
      setActiveEdgeIds((prev: Set<string>) => {
        if (prev.has(edgeId)) return prev;
        const next = new Set(prev);
        next.add(edgeId);
        return next;
      });
      const existing = edgePulseTimeouts.current.get(edgeId);
      if (existing) clearTimeout(existing);
      const timeout = setTimeout(() => {
        setActiveEdgeIds((prev: Set<string>) => {
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
    (nodeId: string, direction: "input" | "output"): void => {
      const setState = direction === "input" ? setInputPulseNodes : setOutputPulseNodes;
      const key = `${direction}:${nodeId}`;
      setState((prev: Set<string>) => {
        if (prev.has(nodeId)) return prev;
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });
      const existing = nodePulseTimeouts.current.get(key);
      if (existing) clearTimeout(existing);
      const timeout = setTimeout(() => {
        setState((prev: Set<string>) => {
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
    const nextHashes = buildRuntimeHashes();
    const prevHashes = prevHashesRef.current;
    prevHashesRef.current = nextHashes;
    if (!prevHashes) return;
    const outputChanges: Array<{ nodeId: string; port: string }> = [];
    const inputChanges: Array<{ nodeId: string; port: string }> = [];
    Object.entries(nextHashes.outputs).forEach(([nodeId, ports]: [string, Record<string, string>]) => {
      const prevPorts = prevHashes.outputs[nodeId];
      if (!prevPorts) return;
      Object.entries(ports).forEach(([port, nextHash]: [string, string]) => {
        const prevHash = prevPorts[port];
        if (prevHash === undefined) return;
        if (prevHash !== nextHash) outputChanges.push({ nodeId, port });
      });
    });
    Object.entries(nextHashes.inputs).forEach(([nodeId, ports]: [string, Record<string, string>]) => {
      const prevPorts = prevHashes.inputs[nodeId];
      if (!prevPorts) return;
      Object.entries(ports).forEach(([port, nextHash]: [string, string]) => {
        const prevHash = prevPorts[port];
        if (prevHash === undefined) return;
        if (prevHash !== nextHash) inputChanges.push({ nodeId, port });
      });
    });
    if (outputChanges.length === 0 && inputChanges.length === 0) return;
    const edgeIds = new Set<string>();
    const inputNodes = new Set<string>();
    const outputNodes = new Set<string>();
    outputChanges.forEach(({ nodeId, port }: { nodeId: string; port: string }) => {
      const value = getPortValue("output", nodeId, port);
      if (value === undefined) return;
      outputNodes.add(nodeId);
      const outgoing = edgesByFromPort.get(buildEdgePortKey(nodeId, port));
      outgoing?.forEach((edge: Edge) => {
        edgeIds.add(edge.id);
        if (edge.to) inputNodes.add(edge.to);
      });
    });
    inputChanges.forEach(({ nodeId, port }: { nodeId: string; port: string }) => {
      const value = getPortValue("input", nodeId, port);
      if (value === undefined) return;
      inputNodes.add(nodeId);
      const incoming = edgesByToPort.get(buildEdgePortKey(nodeId, port));
      incoming?.forEach((edge: Edge) => {
        edgeIds.add(edge.id);
      });
    });

    // Special case: Trigger fires a boolean `trigger` signal that often stays `true` across runs.
    // To still communicate "a run started", pulse all outgoing edges from Trigger nodes whenever
    // any of their outputs change (meta/context usually changes every run).
    outputNodes.forEach((nodeId: string) => {
      const node = nodeById.get(nodeId);
      if (node?.type !== "trigger") return;
      edges.forEach((edge: Edge) => {
        if (edge.from !== nodeId) return;
        edgeIds.add(edge.id);
        if (edge.to) inputNodes.add(edge.to);
      });
    });
    edgeIds.forEach((edgeId: string) => scheduleEdgePulse(edgeId));
    outputNodes.forEach((nodeId: string) => scheduleNodePulse(nodeId, "output"));
    inputNodes.forEach((nodeId: string) => scheduleNodePulse(nodeId, "input"));
  }, [
    buildRuntimeHashes,
    buildEdgePortKey,
    edges,
    edgesByFromPort,
    edgesByToPort,
    getPortValue,
    nodeById,
    scheduleEdgePulse,
    scheduleNodePulse,
  ]);

  React.useEffect(() => {
    const epTimeouts = edgePulseTimeouts.current;
    const npTimeouts = nodePulseTimeouts.current;
    return (): void => {
      epTimeouts.forEach((timeout: ReturnType<typeof setTimeout>) => clearTimeout(timeout));
      npTimeouts.forEach((timeout: ReturnType<typeof setTimeout>) => clearTimeout(timeout));
      epTimeouts.clear();
      npTimeouts.clear();
    };
  }, []);

  return (
    <div
      ref={viewportRef}
      className={`relative min-h-[560px] rounded-lg border bg-card/70 backdrop-blur overflow-hidden ${
        panState ? "cursor-grabbing" : "cursor-grab"
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPointerDown={onPanStart}
      onPointerMove={onPanMove}
      onPointerUp={onPanEnd}
      onPointerLeave={onPanEnd}
    >
      <div className="absolute bottom-3 left-3 z-10 rounded-md border bg-card/70 backdrop-blur px-3 py-2 text-[11px] text-gray-400">
        Nodes: {nodes.length}
        {lastDrop ? ` • Last drop: ${Math.round(lastDrop.x)}, ${Math.round(lastDrop.y)}` : ""}
        {` • View: ${Math.round(view.x)}, ${Math.round(view.y)} @ ${Math.round(view.scale * 100)}%`}
      </div>
      <div className="absolute bottom-4 right-4 z-10 rounded-md border bg-card/70 backdrop-blur p-2 text-xs text-gray-300">
        <div className="mb-2 text-[11px] uppercase text-gray-500">View Controls</div>
        <div className="flex items-center gap-2">
          <Button
            className="h-7 w-7 rounded-full border text-xs text-white hover:bg-muted/60"
            type="button"
            onClick={() => onZoomTo(view.scale - 0.1)}
          >
            -
          </Button>
          <span className="min-w-[56px] text-center text-[11px] text-gray-300">
            {Math.round(view.scale * 100)}%
          </span>
          <Button
            className="h-7 w-7 rounded-full border text-xs text-white hover:bg-muted/60"
            type="button"
            onClick={() => onZoomTo(view.scale + 0.1)}
          >
            +
          </Button>
          <Button
            className="h-7 rounded-full border px-2 text-[11px] text-white hover:bg-muted/60"
            type="button"
            onClick={onFitToNodes}
          >
            Fit
          </Button>
          <Button
            className="h-7 rounded-full border px-2 text-[11px] text-white hover:bg-muted/60"
            type="button"
            onClick={onResetView}
          >
            Reset
          </Button>
        </div>
      </div>
      <div
        ref={canvasRef}
        className="absolute left-0 top-0"
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: "0 0",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.18) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        {lastDrop ? (
          <div
            className="absolute"
            style={{
              width: 10,
              height: 10,
              transform: `translate(${lastDrop.x}px, ${lastDrop.y}px)`,
            }}
          >
            <span className="absolute inset-0 rounded-full bg-sky-400/40 animate-ping" />
            <span className="absolute inset-0 rounded-full border border-sky-300/70 bg-sky-500/60" />
          </div>
        ) : null}
        <svg
          className="absolute inset-0"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ pointerEvents: "auto" }}
        >
          {edgePaths.map((edge: EdgePath): React.JSX.Element => {
            const isSelected = selectedEdgeId === edge.id;
            const edgeMeta = edgeMetaMap.get(edge.id);
            const isFlowing = activeEdgeIds.has(edge.id) || blockingFlowEdgeIds.has(edge.id);
            const isManualConnector =
              edgeMeta?.fromPort === "aiPrompt" || edgeMeta?.toPort === "queryCallback";
            // Check if this is a schema connection (db_schema -> database)
            const fromNode = edgeMeta ? nodes.find((n: AiNode) => n.id === edgeMeta.from) : null;
            const toNode = edgeMeta ? nodes.find((n: AiNode) => n.id === edgeMeta.to) : null;
            const isSchemaConnection =
              fromNode?.type === "db_schema" && toNode?.type === "database";
            const isActivePath =
              !isManualConnector &&
              !isSchemaConnection &&
              edgeMeta &&
              triggerConnected.has(edgeMeta.from) &&
              triggerConnected.has(edgeMeta.to);
            const edgeClass = `transition-all duration-150 ${
              isSelected
                ? "text-sky-300"
                : isActivePath || isFlowing
                  ? "text-sky-400/80 group-hover:text-sky-300/90"
                  : "text-sky-400/55 group-hover:text-sky-300/80"
            }`;
            const arrowSize = isSelected ? 9 : 8;
            const arrowWidth = isSelected ? 6 : 5;
            const arrowPath = `M 0 0 L -${arrowSize} ${arrowWidth / 2} L -${arrowSize} -${arrowWidth / 2} Z`;
            return (
              <g key={edge.id} className="group cursor-pointer">
                <path
                  d={edge.path}
                  stroke="transparent"
                  strokeWidth="14"
                  fill="none"
                  style={{ pointerEvents: "stroke" }}
                  onContextMenu={(event: React.MouseEvent<SVGPathElement>) => {
                    event.preventDefault();
                    onRemoveEdge(edge.id);
                  }}
                  onClick={(event: React.MouseEvent<SVGPathElement>) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectEdgeId(edge.id);
                  }}
                />
                <path
                  d={edge.path}
                  className={edgeClass}
                  strokeWidth={isSelected ? 2.5 : 1.6}
                  stroke="currentColor"
                  fill="none"
                  style={{ pointerEvents: "none" }}
                />
                {isFlowing ? (
                  <path
                    d={edge.path}
                    className={`${edgeClass} ai-paths-wire-flow`}
                    strokeWidth={isSelected ? 3.4 : 2.2}
                    stroke="currentColor"
                    fill="none"
                    style={{ pointerEvents: "none" }}
                  />
                ) : null}
                {edge.arrow ? (
                  <path
                    d={arrowPath}
                    transform={`translate(${edge.arrow.x} ${edge.arrow.y}) rotate(${edge.arrow.angle})`}
                    className={edgeClass}
                    fill="currentColor"
                    stroke="none"
                    style={{ pointerEvents: "none" }}
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
                stroke="rgba(56,189,248,0.55)"
                strokeWidth="1.6"
                fill="none"
              />
            );
          })() : null}
        </svg>

        {nodes.map((node: AiNode) => {
          const isSelected = node.id === selectedNodeId;
          const style = typeStyles[node.type];
          const modelStatus =
            node.type === "model"
              ? (runtimeState.outputs[node.id]?.status as string | undefined)
              : undefined;
          const modelStatusLabel =
            modelStatus === "completed"
              ? "Completed"
              : modelStatus === "failed"
                ? "Failed"
                : modelStatus === "queued"
                  ? "Queued"
                  : modelStatus
                    ? "Pending"
                    : null;
          const modelStatusClasses =
            modelStatus === "completed"
              ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
              : modelStatus === "failed"
                ? "border-rose-500/60 bg-rose-500/15 text-rose-200"
                : "border-sky-500/60 bg-sky-500/15 text-sky-200";
          const pollStatus =
            node.type === "poll"
              ? (runtimeState.outputs[node.id]?.status as string | undefined)
              : undefined;
          const pollStatusLabel =
            pollStatus === "completed"
              ? "Completed"
              : pollStatus === "failed"
                ? "Failed"
                : pollStatus === "timeout"
                  ? "Timed Out"
                  : pollStatus === "polling"
                    ? "Polling"
                    : pollStatus
                      ? "Pending"
                      : null;
          const pollStatusClasses =
            pollStatus === "completed"
              ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
              : pollStatus === "failed" || pollStatus === "timeout"
                ? "border-rose-500/60 bg-rose-500/15 text-rose-200"
                : "border-sky-500/60 bg-sky-500/15 text-sky-200";
          const iteratorOutput =
            node.type === "iterator"
              ? (runtimeState.outputs[node.id] as
                  | { status?: string; index?: number; total?: number; done?: boolean }
                  | undefined)
              : undefined;
          const iteratorStatus = iteratorOutput?.status ?? null;
          const iteratorIndex =
            typeof iteratorOutput?.index === "number" ? iteratorOutput.index : null;
          const iteratorTotal =
            typeof iteratorOutput?.total === "number" ? iteratorOutput.total : null;
          const iteratorDone =
            typeof iteratorOutput?.done === "boolean" ? iteratorOutput.done : null;
          const iteratorProgressLabel =
            iteratorIndex !== null && iteratorTotal !== null && iteratorTotal > 0
              ? `${Math.min(iteratorIndex + 1, iteratorTotal)}/${iteratorTotal}`
              : iteratorTotal !== null && iteratorTotal === 0
                ? "0/0"
                : null;
          const iteratorStatusClasses =
            iteratorStatus === "completed" || iteratorDone
              ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
              : iteratorStatus === "advance_pending"
                ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                : iteratorStatus === "waiting_callback"
                  ? "border-sky-500/60 bg-sky-500/15 text-sky-200"
                  : "border-border bg-card/60 text-gray-200";
          const isScheduledTrigger =
            node.type === "trigger" && node.config?.trigger?.event === "scheduled_run";
          const isInputPulse = inputPulseNodes.has(node.id);
          const isOutputPulse = outputPulseNodes.has(node.id);
          return (
            <div
              key={node.id}
              className={`absolute ${draggingNodeId === node.id ? "cursor-grabbing" : "cursor-grab"}`}
              style={{
                width: NODE_WIDTH,
                transform: `translate(${node.position.x}px, ${node.position.y}px)`,
              }}
              onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => onPointerDownNode(event, node.id)}
              onPointerMove={(event: React.PointerEvent<HTMLDivElement>) => onPointerMoveNode(event, node.id)}
              onPointerUp={(event: React.PointerEvent<HTMLDivElement>) => onPointerUpNode(event, node.id)}
              onClick={() => onSelectNode(node.id)}
              onDoubleClick={(event: React.MouseEvent<HTMLDivElement>) => {
                event.stopPropagation();
                onSelectNode(node.id);
                onOpenNodeConfig(node.id);
              }}
            >
              <div
                className={`relative flex flex-col gap-2 rounded-xl border bg-card/80 p-3 text-xs text-gray-200 shadow-lg backdrop-blur ${
                  style.border
                } ${style.glow} ${isSelected ? "ring-2 ring-white/20" : ""}`}
              >
                {isInputPulse || isOutputPulse ? (
                  <div className="absolute -top-2 right-2 flex items-center gap-1">
                    {isInputPulse ? (
                      <span
                        className="relative inline-flex h-2.5 w-2.5"
                        title="Input loaded"
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/70" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_6px_rgba(56,189,248,0.75)]" />
                      </span>
                    ) : null}
                    {isOutputPulse ? (
                      <span
                        className="relative inline-flex h-2.5 w-2.5"
                        title="Output sent"
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.75)]" />
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {node.inputs.map((input: string, index: number) => (
                  <div
                    key={`input-${node.id}-${input}`}
                    className="absolute flex items-center"
                    style={{
                      left: -(PORT_SIZE / 2) - 4,
                      top: getPortOffsetY(index, node.inputs.length) - PORT_SIZE / 2,
                    }}
                    onMouseEnter={() => setHoveredConnectorKey(buildConnectorKey("input", node.id, input))}
                    onMouseLeave={() =>
                      setHoveredConnectorKey((prev: string | null) =>
                        prev === buildConnectorKey("input", node.id, input) ? null : prev
                      )
                    }
                  >
                    {(() : React.JSX.Element => {
                      const isConnecting = Boolean(connecting && connectingFromNode);
                      const isConnectable = isConnecting
                        ? validateConnection(
                            connectingFromNode as AiNode,
                            node,
                            connecting?.fromPort ?? "",
                            input
                          ).valid
                        : false;
                      const connectorInfo = buildConnectorInfo("input", node.id, input);
                      const hasIncomingEdge = edges.some(
                        (edge: Edge): boolean =>
                          edge.to === node.id && edge.toPort === input
                      );
                      const connectorKey = buildConnectorKey("input", node.id, input);
                      const isPinned = pinnedConnectorKey === connectorKey;
                      const isHovered = hoveredConnectorKey === connectorKey;
                      const isTooltipOpen = isPinned || isHovered;
                      const hasMismatch = connectorInfo.hasMismatch;
                      return (
                        <>
                          <Tooltip
                            content={renderConnectorTooltip(connectorInfo)}
                            side="right"
                            maxWidth="360px"
                            open={isTooltipOpen}
                            disableHover
                          >
                            <div className="relative">
                              <button
                                type="button"
                                data-port="input"
                                className={`cursor-pointer rounded-full border bg-sky-500/20 shadow-[0_0_8px_rgba(56,189,248,0.35)] hover:border-sky-200 ${
                                  isConnecting
                                    ? isConnectable
                                      ? "border-emerald-300/80 bg-emerald-500/30 shadow-[0_0_14px_rgba(52,211,153,0.55)] ring-2 ring-emerald-400/60"
                                      : "border-border/60 bg-card/20 opacity-40 shadow-none"
                                    : isPinned
                                      ? "border-amber-300/80 ring-2 ring-amber-300/70"
                                      : "border-sky-400/60"
                                }`}
                                style={{
                                  width: PORT_SIZE + 2,
                                  height: PORT_SIZE + 2,
                                }}
                                onPointerUp={(event: React.PointerEvent<HTMLButtonElement>) => {
                                  event.stopPropagation();
                                  if (connecting) {
                                    onCompleteConnection(event, node, input);
                                    return;
                                  }
                                }}
                                onPointerDown={(event: React.PointerEvent<HTMLButtonElement>) => {
                                  event.stopPropagation();
                                  if (hasIncomingEdge) {
                                    onReconnectInput(event, node.id, input);
                                  }
                                }}
                                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                  event.stopPropagation();
                                  setPinnedConnectorKey((prev: string | null) =>
                                    prev === connectorKey ? null : connectorKey
                                  );
                                }}
                                onContextMenu={(event: React.MouseEvent<HTMLButtonElement>) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  onDisconnectPort("input", node.id, input);
                                }}
                                aria-label={`Connect to ${formatPortLabel(input)}`}
                                title={`Input: ${formatPortLabel(input)}`}
                              />
                              {hasMismatch ? (
                              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black/60" />
                              ) : null}
                            </div>
                          </Tooltip>
                          <span
                            className={`ml-1.5 rounded px-1 py-0.5 text-[8px] font-medium ${
                              isConnecting
                                ? isConnectable
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : "bg-muted/60 text-gray-500"
                                : hasMismatch
                                  ? "bg-rose-500/15 text-rose-200"
                                  : "bg-sky-500/10 text-sky-300"
                            }`}
                          >
                            {formatPortLabel(input)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                ))}
                {node.outputs.map((output: string, index: number) => (
                  <div
                    key={`output-${node.id}-${output}`}
                    className="absolute flex items-center"
                    style={{
                      right: -(PORT_SIZE / 2) - 4,
                      top: getPortOffsetY(index, node.outputs.length) - PORT_SIZE / 2,
                    }}
                    onMouseEnter={() => setHoveredConnectorKey(buildConnectorKey("output", node.id, output))}
                    onMouseLeave={() =>
                      setHoveredConnectorKey((prev: string | null) =>
                        prev === buildConnectorKey("output", node.id, output) ? null : prev
                      )
                    }
                  >
                    {((): React.JSX.Element => {
                      const connectorInfo = buildConnectorInfo("output", node.id, output);
                      const connectorKey = buildConnectorKey("output", node.id, output);
                      const isPinned = pinnedConnectorKey === connectorKey;
                      const isHovered = hoveredConnectorKey === connectorKey;
                      const isTooltipOpen = isPinned || isHovered;
                      const hasMismatch = connectorInfo.hasMismatch;
                      return (
                        <>
                          <span
                            className={`mr-1.5 rounded px-1 py-0.5 text-[8px] font-medium ${
                              hasMismatch
                                ? "bg-rose-500/15 text-rose-200"
                                : "bg-amber-500/10 text-amber-300"
                            }`}
                          >
                            {formatPortLabel(output)}
                          </span>
                          <Tooltip
                            content={renderConnectorTooltip(connectorInfo)}
                            side="left"
                            maxWidth="360px"
                            open={isTooltipOpen}
                            disableHover
                          >
                            <div className="relative">
                              <button
                                type="button"
                                data-port="output"
                                className={`cursor-pointer rounded-full border bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.35)] hover:border-amber-200 ${
                                  isPinned ? "border-amber-300/80 ring-2 ring-amber-300/70" : "border-amber-400/60"
                                }`}
                                style={{
                                  width: PORT_SIZE + 2,
                                  height: PORT_SIZE + 2,
                                }}
                                onPointerDown={(event: React.PointerEvent<HTMLButtonElement>) =>
                                  onStartConnection(event, node, output)
                                }
                                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                  event.stopPropagation();
                                  setPinnedConnectorKey((prev: string | null) =>
                                    prev === connectorKey ? null : connectorKey
                                  );
                                }}                                onContextMenu={(event: React.MouseEvent<HTMLButtonElement>) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  onDisconnectPort("output", node.id, output);
                                }}
                                aria-label={`Start connection from ${formatPortLabel(output)}`}
                                title={`Output: ${formatPortLabel(output)}`}
                              />
                              {hasMismatch ? (
                                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black/60" />
                              ) : null}
                            </div>
                          </Tooltip>
                        </>
                      );
                    })()}
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{node.title}</span>
                  <div className="flex items-center gap-1">
                    {isScheduledTrigger ? (
                      <span className="rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-[1px] text-[9px] uppercase text-amber-200">
                        Scheduled
                      </span>
                    ) : null}
                    <span className="rounded-full border px-2 py-[1px] text-[10px] uppercase text-gray-400">
                      {node.type}
                    </span>
                  </div>
                </div>
                {node.type === "model" && modelStatusLabel && (
                  <div
                    className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-[2px] text-[9px] uppercase tracking-wide ${modelStatusClasses}`}
                  >
                    {modelStatusLabel}
                  </div>
                )}
                {node.type === "poll" && pollStatusLabel && (
                  <div
                    className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-[2px] text-[9px] uppercase tracking-wide ${pollStatusClasses}`}
                  >
                    {pollStatusLabel}
                  </div>
                )}
                {node.type === "iterator" && (iteratorStatus || iteratorProgressLabel) ? (
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
                {node.type === "viewer" && !triggerConnected.has(node.id) && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[9px] text-amber-200">
                    Not wired to a Trigger
                  </div>
                )}
                {node.type === "trigger" && (
                  <Button
                    className="self-start rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/10"
                    type="button"
                    onPointerDown={(event: React.PointerEvent<HTMLButtonElement>) => event.stopPropagation()}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => onFireTrigger(node, event)}
                  >
                    Fire Trigger
                  </Button>
                )}
                {node.type === "trigger" && (
                  <div className="text-[10px] uppercase text-lime-200/80">
                    {isScheduledTrigger
                      ? "Server scheduled trigger"
                      : "Accepts context input"}
                  </div>
                )}
                {node.type === "context" && (
                  <span className="text-[10px] uppercase text-emerald-300/80">
                    Role output can feed any Trigger
                  </span>
                )}
                {node.type === "simulation" && (
                  <span className="text-[10px] uppercase text-cyan-300/80">
                    Wire Trigger ↔ Simulation
                  </span>
                )}
                {node.type === "viewer" && (
                  <div className="rounded-md border border-border bg-card/60 px-2 py-1 text-[10px] text-gray-400">
                    Open node to view results
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
