import { useCallback } from 'react';
import type { AiNode, Edge, RuntimeState } from '@/shared/lib/ai-paths';
import { NODE_WIDTH, getPortOffsetY, validateConnection } from '@/shared/lib/ai-paths';
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
      const target = edges.find((edge) => edge.id === edgeId) ?? null;
      if (!target) return;

      setEdges((prev: Edge[]) => prev.filter((e) => e.id !== edgeId), {
        reason: 'delete',
        source: 'canvas.connection.remove-edge',
      });

      // Cleanup runtime inputs for removed edge
      const remaining = edges.filter((e) => e.id !== edgeId);
      setRuntimeState((prev: RuntimeState) =>
        pruneRuntimeInputsInternal(prev, [target], remaining)
      );

      if (selectedEdgeId === edgeId) {
        selectEdge(null);
      }
    },
    [
      edges,
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
      const shouldRemove = (edge: Edge): boolean =>
        direction === 'input'
          ? edge.to === nodeId && edge.toPort === port
          : edge.from === nodeId && edge.fromPort === port;

      const removed = edges.filter(shouldRemove);
      const remaining = edges.filter((e) => !shouldRemove(e));

      setEdges(remaining, { reason: 'delete', source: 'canvas.connection.disconnect-port' });
      setRuntimeState((prev: RuntimeState) => pruneRuntimeInputsInternal(prev, removed, remaining));

      if (selectedEdgeId) {
        const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
        if (selectedEdge && shouldRemove(selectedEdge)) {
          selectEdge(null);
        }
      }
    },
    [
      edges,
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
      if (!connecting) return;
      if (connecting.fromNodeId === node.id && connecting.fromPort === port) {
        endConnection();
        return;
      }

      const fromNode = nodes.find((n) => n.id === connecting.fromNodeId);
      if (!fromNode) {
        endConnection();
        return;
      }

      const validation = validateConnection(fromNode, node, connecting.fromPort, port);
      if (!validation.valid) {
        toast(validation.message ?? 'Invalid connection.', { variant: 'error' });
        endConnection();
        return;
      }

      const newEdge: Edge = {
        id: `edge-${Math.random().toString(36).slice(2, 8)}`,
        from: connecting.fromNodeId,
        to: node.id,
        fromPort: connecting.fromPort,
        toPort: port,
      };

      setEdges((prev: Edge[]) => [...prev, newEdge], {
        reason: 'update',
        source: 'canvas.connection.complete',
      });
      toast('Connection created.', { variant: 'success' });
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
      if (connecting) return;

      const edgeToMove = edges.find((e) => e.to === nodeId && e.toPort === port);
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

      const remaining = edges.filter((e) => e.id !== edgeToMove.id);
      setEdges(remaining, { reason: 'delete', source: 'canvas.connection.reconnect-input' });
      setRuntimeState((prev: RuntimeState) =>
        pruneRuntimeInputsInternal(prev, [edgeToMove], remaining)
      );

      if (selectedEdgeId === edgeToMove.id) {
        selectEdge(null);
      }

      startConnection(edgeToMove.from, edgeToMove.fromPort, start);
      setConnectingPos(nextPos);
    },
    [
      edges,
      nodes,
      view,
      viewportRef,
      isPathLocked,
      connecting,
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
