'use client';

import { useCallback, useState, useMemo } from 'react';
import { 
  AiNode, 
  Edge, 
  NODE_WIDTH, 
  getPortOffsetY, 
  validateConnection,
  getNodeInputPortCardinality
} from '@/shared/lib/ai-paths';

type ConnectingState = {
  fromNodeId: string;
  fromPort: string;
  start: { x: number; y: number };
};

export function useCanvasConnection(args: {
  nodes: AiNode[];
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  view: { x: number; y: number; scale: number };
  viewportRef: React.RefObject<HTMLDivElement | null>;
  isPathLocked: boolean;
  notifyLocked: () => void;
  selectedEdgeId: string | null;
  selectEdge: (id: string | null) => void;
  clearRuntimeInputsForEdges: (removed: Edge[], remaining: Edge[]) => void;
  toast: (
    message: string,
    options?: {
      variant?: 'success' | 'error' | 'info' | 'warning';
      duration?: number;
      error?: unknown;
    }
  ) => void;
}) {
  const { 
    nodes, 
    edges, 
    setEdges, 
    view, 
    viewportRef, 
    isPathLocked, 
    notifyLocked, 
    selectedEdgeId, 
    selectEdge, 
    clearRuntimeInputsForEdges,
    toast
  } = args;

  const [connecting, setConnecting] = useState<ConnectingState | null>(null);
  const [connectingPos, setConnectingPos] = useState<{ x: number; y: number } | null>(null);

  const getPortPosition = useCallback(
    (
      node: AiNode,
      portName: string | undefined,
      side: 'input' | 'output'
    ): { x: number; y: number } => {
      const ports = side === 'input' ? node.inputs : node.outputs;
      const index = portName ? ports.indexOf(portName) : -1;
      const safeIndex = index >= 0 ? index : Math.max(0, Math.floor(ports.length / 2));
      const pos = node.position ?? { x: 0, y: 0 };
      const x = pos.x + (side === 'output' ? NODE_WIDTH : 0);
      const y = pos.y + getPortOffsetY(safeIndex, ports.length);
      return { x, y };
    },
    []
  );

  const handleStartConnection = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, node: AiNode, port: string): void => {
      if (isPathLocked) {
        notifyLocked();
        return;
      }
      event.stopPropagation();
      const start = getPortPosition(node, port, 'output');
      setConnecting({ fromNodeId: node.id, fromPort: port, start });
      setConnectingPos(start);
    },
    [getPortPosition, isPathLocked, notifyLocked]
  );

  const handleCompleteConnection = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, node: AiNode, port: string): void => {
      if (isPathLocked) {
        notifyLocked();
        return;
      }
      event.stopPropagation();
      if (!connecting) return;
      if (connecting.fromNodeId === node.id && connecting.fromPort === port) {
        setConnecting(null);
        setConnectingPos(null);
        return;
      }

      const fromNode = nodes.find((n: AiNode): boolean => n.id === connecting.fromNodeId);
      if (!fromNode) {
        setConnecting(null);
        setConnectingPos(null);
        return;
      }

      const targetCardinality = getNodeInputPortCardinality(node, port);
      if (targetCardinality === 'one') {
        const existingIncoming = edges.find(
          (edge: Edge): boolean => edge.to === node.id && edge.toPort === port
        );
        if (existingIncoming) {
          toast('This input accepts one connection. Insert a merge/select node for fan-in.', {
            variant: 'error',
          });
          setConnecting(null);
          setConnectingPos(null);
          return;
        }
      }

      const validation = validateConnection(fromNode, node, connecting.fromPort, port);

      if (!validation.valid) {
        toast(validation.message ?? 'Invalid connection.', { variant: 'error' });
        setConnecting(null);
        setConnectingPos(null);
        return;
      }

      setEdges((prev: Edge[]): Edge[] => [
        ...prev,
        {
          id: `edge-${Math.random().toString(36).slice(2, 8)}`,
          from: connecting.fromNodeId,
          to: node.id,
          fromPort: connecting.fromPort,
          toPort: port,
        },
      ]);
      toast('Connection created.', { variant: 'success' });
      setConnecting(null);
      setConnectingPos(null);
    },
    [connecting, edges, isPathLocked, nodes, notifyLocked, setEdges, toast]
  );

  const handleRemoveEdge = useCallback(
    (edgeId: string): void => {
      if (isPathLocked) {
        notifyLocked();
        return;
      }
      setEdges((prev: Edge[]): Edge[] => {
        const target = prev.find((edge: Edge): boolean => edge.id === edgeId) ?? null;
        if (!target) return prev;
        const remaining = prev.filter((edge: Edge): boolean => edge.id !== edgeId);
        clearRuntimeInputsForEdges([target], remaining);
        return remaining;
      });
      if (selectedEdgeId === edgeId) {
        selectEdge(null);
      }
    },
    [clearRuntimeInputsForEdges, isPathLocked, notifyLocked, selectedEdgeId, setEdges, selectEdge]
  );

  const handleDisconnectPort = useCallback(
    (direction: 'input' | 'output', nodeId: string, port: string): void => {
      if (isPathLocked) {
        notifyLocked();
        return;
      }
      setEdges((prev: Edge[]): Edge[] => {
        const shouldRemove = (edge: Edge): boolean =>
          direction === 'input'
            ? edge.to === nodeId && edge.toPort === port
            : edge.from === nodeId && edge.fromPort === port;
        const removed = prev.filter((edge: Edge): boolean => shouldRemove(edge));
        const remaining = prev.filter((edge: Edge): boolean => !shouldRemove(edge));
        if (selectedEdgeId) {
          const selectedEdge = prev.find((edge: Edge) => edge.id === selectedEdgeId);
          if (selectedEdge && shouldRemove(selectedEdge)) {
            selectEdge(null);
          }
        }
        clearRuntimeInputsForEdges(removed, remaining);
        return remaining;
      });
    },
    [clearRuntimeInputsForEdges, isPathLocked, notifyLocked, selectedEdgeId, setEdges, selectEdge]
  );

  const handleReconnectInput = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, nodeId: string, port: string): void => {
      if (isPathLocked) {
        notifyLocked();
        return;
      }
      if (connecting) return;
      let edgeToMove: Edge | null = null;
      for (let index = edges.length - 1; index >= 0; index -= 1) {
        const edge = edges[index];
        if (edge?.to === nodeId && edge.toPort === port) {
          edgeToMove = edge;
          break;
        }
      }
      if (!edgeToMove?.from || !edgeToMove.fromPort) return;
      const fromNode = nodes.find((node: AiNode): boolean => node.id === edgeToMove.from);
      if (!fromNode) return;
      const start = getPortPosition(fromNode, edgeToMove.fromPort, 'output');
      const viewport = viewportRef.current?.getBoundingClientRect();
      const nextPos = viewport
        ? {
          x: (event.clientX - viewport.left - view.x) / view.scale,
          y: (event.clientY - viewport.top - view.y) / view.scale,
        }
        : start;
      setEdges((prev: Edge[]): Edge[] => {
        const remaining = prev.filter((edge: Edge): boolean => edge.id !== edgeToMove.id);
        clearRuntimeInputsForEdges([edgeToMove], remaining);
        return remaining;
      });
      if (selectedEdgeId === edgeToMove.id) {
        selectEdge(null);
      }
      setConnecting({ fromNodeId: edgeToMove.from, fromPort: edgeToMove.fromPort, start });
      setConnectingPos(nextPos);
    },
    [
      clearRuntimeInputsForEdges,
      connecting,
      edges,
      getPortPosition,
      isPathLocked,
      nodes,
      notifyLocked,
      selectedEdgeId,
      setEdges,
      view,
      selectEdge,
      viewportRef
    ]
  );

  const edgePaths = useMemo((): {
    id: string;
    path: string;
    label?: string | undefined;
    arrow?: { x: number; y: number; angle: number } | undefined;
  }[] => {
    const nodeMap = new Map(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
    const midpoint = (
      a: { x: number; y: number },
      b: { x: number; y: number }
    ): { x: number; y: number } => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    });
    return edges
      .map(
        (
          edge: Edge
        ): {
          id: string;
          path: string;
          label?: string | undefined;
          arrow?: { x: number; y: number; angle: number } | undefined;
        } | null => {
          if (!edge.from || !edge.to) return null;
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          const fromPort = edge.fromPort ?? (from.outputs.length > 0 ? from.outputs[0] : undefined);
          const toPort = edge.toPort ?? (to.inputs.length > 0 ? to.inputs[0] : undefined);
          const fromPos = getPortPosition(from, fromPort, 'output');
          const toPos = getPortPosition(to, toPort, 'input');
          const p0 = { x: fromPos.x, y: fromPos.y };
          const p3 = { x: toPos.x, y: toPos.y };
          const midX = p0.x + (p3.x - p0.x) * 0.5;
          const p1 = { x: midX, y: p0.y };
          const p2 = { x: midX, y: p3.y };
          const q0 = midpoint(p0, p1);
          const q1 = midpoint(p1, p2);
          const q2 = midpoint(p2, p3);
          const r0 = midpoint(q0, q1);
          const r1 = midpoint(q1, q2);
          const s = midpoint(r0, r1);
          const path = [
            `M ${p0.x} ${p0.y}`,
            `C ${q0.x} ${q0.y}, ${r0.x} ${r0.y}, ${s.x} ${s.y}`,
            `C ${r1.x} ${r1.y}, ${q2.x} ${q2.y}, ${p3.x} ${p3.y}`,
          ].join(' ');
          let dx = r1.x - r0.x;
          let dy = r1.y - r0.y;
          if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
            dx = p3.x - p0.x;
            dy = p3.y - p0.y;
          }
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return {
            id: edge.id,
            path,
            label: edge.label ?? undefined,
            arrow: { x: s.x, y: s.y, angle },
          };
        }
      )
      .filter(Boolean) as {
      id: string;
      path: string;
      label?: string | undefined;
      arrow?: { x: number; y: number; angle: number } | undefined;
    }[];
  }, [edges, getPortPosition, nodes]);

  const connectingFromNode = useMemo(
    (): AiNode | null =>
      connecting
        ? (nodes.find((node: AiNode): boolean => node.id === connecting.fromNodeId) ?? null)
        : null,
    [connecting, nodes]
  );

  return {
    connecting,
    setConnecting,
    connectingPos,
    setConnectingPos,
    handleStartConnection,
    handleCompleteConnection,
    handleRemoveEdge,
    handleDisconnectPort,
    handleReconnectInput,
    edgePaths,
    connectingFromNode,
    getPortPosition
  };
}
