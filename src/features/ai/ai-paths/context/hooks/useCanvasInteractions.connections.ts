import { useCallback, useEffect, useRef } from 'react';
import type { AiNode, Edge, RuntimeState } from '@/shared/lib/ai-paths';
import {
  NODE_WIDTH,
  getNodeInputPortCardinality,
  getPortOffsetY,
  sanitizeEdges,
  validateConnection,
} from '@/shared/lib/ai-paths';
import type { Toast } from '@/shared/contracts/ui';
import type { GraphMutationMeta } from '../GraphContext';

export interface UseCanvasInteractionsConnectionsValue {
  handleRemoveEdge: (edgeId: string) => void;
  handleDisconnectPort: (direction: 'input' | 'output', nodeId: string, port: string) => void;
  handleStartConnection: (
    event: React.PointerEvent<Element>,
    node: AiNode,
    port: string
  ) => Promise<void>;
  handleCompleteConnection: (
    event: React.PointerEvent<Element>,
    node: AiNode,
    port: string
  ) => void;
  handleReconnectInput: (
    event: React.PointerEvent<Element>,
    nodeId: string,
    port: string
  ) => Promise<void>;
  getPortPosition: (
    node: AiNode,
    portName: string | undefined,
    side: 'input' | 'output'
  ) => { x: number; y: number };
}

export function useCanvasInteractionsConnections({
  nodes,
  edges,
  isPathLocked,
  notifyLocked,
  confirmNodeSwitch,
  setEdges,
  setRuntimeState,
  pruneRuntimeInputsInternal,
  selectedEdgeId,
  selectEdge,
  startConnection,
  endConnection,
  connecting,
  setConnectingPos,
  view,
  viewportRef,
  toast,
}: {
  nodes: AiNode[];
  edges: Edge[];
  isPathLocked: boolean;
  notifyLocked: () => void;
  confirmNodeSwitch?: (nodeId: string) => boolean | Promise<boolean>;
  setEdges: (
    edges: Edge[] | ((prev: Edge[]) => Edge[]),
    mutationMeta?: GraphMutationMeta
  ) => void;
  setRuntimeState: (state: RuntimeState | ((prev: RuntimeState) => RuntimeState)) => void;
  pruneRuntimeInputsInternal: (
    state: RuntimeState,
    removedEdges: Edge[],
    remainingEdges: Edge[]
  ) => RuntimeState;
  selectedEdgeId: string | null;
  selectEdge: (edgeId: string | null) => void;
  startConnection: (nodeId: string, port: string, pos: { x: number; y: number }) => void;
  endConnection: () => void;
  connecting: { fromNodeId: string; fromPort: string } | null;
  setConnectingPos: (pos: { x: number; y: number }) => void;
  view: { x: number; y: number; scale: number };
  viewportRef: React.RefObject<HTMLDivElement | null>;
  toast: Toast;
}): UseCanvasInteractionsConnectionsValue {
  const connectingRef = useRef(connecting);
  const edgesRef = useRef(edges);

  useEffect(() => {
    connectingRef.current = connecting;
  }, [connecting]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const getPortPosition = useCallback(
    (
      node: AiNode,
      portName: string | undefined,
      side: 'input' | 'output'
    ): { x: number; y: number } => {
      const ports = side === 'input' ? node.inputs : node.outputs;
      const index = portName ? ports.indexOf(portName) : -1;
      const safeIndex = index >= 0 ? index : Math.max(0, Math.floor(ports.length / 2));
      const x = node.position.x + (side === 'output' ? NODE_WIDTH : 0);
      const y = node.position.y + getPortOffsetY(safeIndex, ports.length);
      return { x, y };
    },
    []
  );

  const handleRemoveEdge = useCallback(
    (edgeId: string): void => {
      if (isPathLocked) {
        notifyLocked();
        return;
      }
      const currentEdges = edgesRef.current;
      const target = currentEdges.find((edge) => edge.id === edgeId) ?? null;
      if (!target) return;
      const remaining = currentEdges.filter((edge) => edge.id !== edgeId);

      setEdges(remaining, {
        reason: 'delete',
        source: 'canvas.connection.remove-edge',
      });
      edgesRef.current = remaining;

      // Cleanup runtime inputs for removed edge
      setRuntimeState((prev: RuntimeState) =>
        pruneRuntimeInputsInternal(prev, [target], remaining)
      );

      if (selectedEdgeId === edgeId) {
        selectEdge(null);
      }
    },
    [
      isPathLocked,
      notifyLocked,
      setEdges,
      setRuntimeState,
      pruneRuntimeInputsInternal,
      selectedEdgeId,
      selectEdge,
    ]
  );

  const handleDisconnectPort = useCallback(
    (direction: 'input' | 'output', nodeId: string, port: string): void => {
      if (isPathLocked) {
        notifyLocked();
        return;
      }
      const currentEdges = edgesRef.current;
      const shouldRemove = (edge: Edge): boolean =>
        direction === 'input'
          ? edge.to === nodeId && edge.toPort === port
          : edge.from === nodeId && edge.fromPort === port;

      const removed = currentEdges.filter(shouldRemove);
      const remaining = currentEdges.filter((e) => !shouldRemove(e));

      setEdges(remaining, { reason: 'delete', source: 'canvas.connection.disconnect-port' });
      edgesRef.current = remaining;
      setRuntimeState((prev: RuntimeState) => pruneRuntimeInputsInternal(prev, removed, remaining));

      if (selectedEdgeId) {
        const selectedEdge = currentEdges.find((edge) => edge.id === selectedEdgeId);
        if (selectedEdge && shouldRemove(selectedEdge)) {
          selectEdge(null);
        }
      }
    },
    [
      isPathLocked,
      notifyLocked,
      setEdges,
      setRuntimeState,
      pruneRuntimeInputsInternal,
      selectedEdgeId,
      selectEdge,
    ]
  );

  const handleStartConnection = useCallback(
    async (event: React.PointerEvent<Element>, node: AiNode, port: string): Promise<void> => {
      if (isPathLocked) {
        notifyLocked();
        return;
      }

      if (confirmNodeSwitch) {
        const result = confirmNodeSwitch(node.id);
        const confirmed = result instanceof Promise ? await result : result;
        if (!confirmed) return;
      }

      event.stopPropagation();
      const start = getPortPosition(node, port, 'output');
      connectingRef.current = {
        fromNodeId: node.id,
        fromPort: port,
      };
      startConnection(node.id, port, start);
    },
    [isPathLocked, getPortPosition, startConnection, notifyLocked, confirmNodeSwitch]
  );

  const handleCompleteConnection = useCallback(
    (event: React.PointerEvent<Element>, node: AiNode, port: string): void => {
      if (isPathLocked) {
        notifyLocked();
        return;
      }
      event.stopPropagation();
      const activeConnection = connecting ?? connectingRef.current;
      if (!activeConnection) return;
      if (activeConnection.fromNodeId === node.id && activeConnection.fromPort === port) {
        connectingRef.current = null;
        endConnection();
        return;
      }

      const fromNode = nodes.find((n) => n.id === activeConnection.fromNodeId);
      if (!fromNode) {
        connectingRef.current = null;
        endConnection();
        return;
      }

      const currentEdges = sanitizeEdges(nodes, edgesRef.current);
      const hasExactConnection = currentEdges.some(
        (edge) =>
          edge.from === activeConnection.fromNodeId &&
          edge.fromPort === activeConnection.fromPort &&
          edge.to === node.id &&
          edge.toPort === port
      );
      if (hasExactConnection) {
        connectingRef.current = null;
        endConnection();
        return;
      }
      const targetCardinality = getNodeInputPortCardinality(node, port);
      if (targetCardinality === 'one') {
        const existingIncoming = currentEdges.find(
          (edge) => edge.to === node.id && edge.toPort === port
        );
        if (existingIncoming) {
          const isDuplicateConnection =
            existingIncoming.from === activeConnection.fromNodeId &&
            existingIncoming.fromPort === activeConnection.fromPort;
          if (!isDuplicateConnection) {
            toast(
              `Port "${port}" on "${node.title || node.id}" accepts one connection. Disconnect or reconnect that input first.`,
              {
                variant: 'error',
              }
            );
          }
          connectingRef.current = null;
          endConnection();
          return;
        }
      }

      const validation = validateConnection(fromNode, node, activeConnection.fromPort, port);
      if (!validation.valid) {
        toast(validation.message ?? 'Invalid connection.', { variant: 'error' });
        connectingRef.current = null;
        endConnection();
        return;
      }

      const newEdge: Edge = {
        id: `edge-${Math.random().toString(36).slice(2, 8)}`,
        from: activeConnection.fromNodeId,
        to: node.id,
        fromPort: activeConnection.fromPort,
        toPort: port,
      };

      const nextEdges = [...currentEdges, newEdge];
      setEdges(nextEdges, {
        reason: 'update',
        source: 'canvas.connection.complete',
      });
      edgesRef.current = nextEdges;
      toast('Connection created.', { variant: 'success' });
      connectingRef.current = null;
      endConnection();
    },
    [connecting, nodes, isPathLocked, endConnection, setEdges, toast, notifyLocked]
  );

  const handleReconnectInput = useCallback(
    async (event: React.PointerEvent<Element>, nodeId: string, port: string): Promise<void> => {
      if (isPathLocked) {
        notifyLocked();
        return;
      }
      if (connectingRef.current) return;

      const currentEdges = sanitizeEdges(nodes, edgesRef.current);
      const edgeToMove = currentEdges.find((e) => e.to === nodeId && e.toPort === port);
      if (!edgeToMove?.from || !edgeToMove.fromPort) return;

      const fromNode = nodes.find((n) => n.id === edgeToMove.from);
      if (!fromNode) return;

      if (confirmNodeSwitch) {
        const result = confirmNodeSwitch(nodeId);
        const confirmed = result instanceof Promise ? await result : result;
        if (!confirmed) return;
      }

      const start = getPortPosition(fromNode, edgeToMove.fromPort, 'output');
      const viewport = viewportRef.current?.getBoundingClientRect();
      const nextPos = viewport
        ? {
          x: (event.clientX - viewport.left - view.x) / view.scale,
          y: (event.clientY - viewport.top - view.y) / view.scale,
        }
        : start;

      const remaining = currentEdges.filter((e) => e.id !== edgeToMove.id);
      setEdges(remaining, { reason: 'delete', source: 'canvas.connection.reconnect-input' });
      edgesRef.current = remaining;
      setRuntimeState((prev: RuntimeState) =>
        pruneRuntimeInputsInternal(prev, [edgeToMove], remaining)
      );

      if (selectedEdgeId === edgeToMove.id) {
        selectEdge(null);
      }

      startConnection(edgeToMove.from, edgeToMove.fromPort, start);
      connectingRef.current = {
        fromNodeId: edgeToMove.from,
        fromPort: edgeToMove.fromPort,
      };
      setConnectingPos(nextPos);
    },
    [
      nodes,
      view,
      viewportRef,
      isPathLocked,
      startConnection,
      setConnectingPos,
      setEdges,
      setRuntimeState,
      pruneRuntimeInputsInternal,
      selectedEdgeId,
      selectEdge,
      getPortPosition,
      notifyLocked,
      confirmNodeSwitch,
    ]
  );

  return {
    handleRemoveEdge,
    handleDisconnectPort,
    handleStartConnection,
    handleCompleteConnection,
    handleReconnectInput,
    getPortPosition,
  };
}
