import { useCallback, useEffect, useRef } from 'react';
import type { AiNode, Edge, NodeDefinition, RuntimeState } from '@/shared/lib/ai-paths';
import {
  createNodeInstanceId,
  getDefaultConfigForType,
  palette,
  resolveNodeTypeId,
} from '@/shared/lib/ai-paths';
import {
  getPointerCaptureTarget,
  setPointerCaptureSafe,
  releasePointerCaptureSafe,
  type HandleSelectNodeOptions,
} from './useCanvasInteractions.helpers';
import { DRAG_KEYS, getFirstDragValue, setDragData } from '@/shared/utils/drag-drop';
import type { Toast } from '@/shared/contracts/ui';

export interface UseCanvasInteractionsNodesValue {
  handlePointerDownNode: (event: React.PointerEvent<Element>, nodeId: string) => Promise<void>;
  handlePointerMoveNode: (event: React.PointerEvent<Element>, nodeId: string) => void;
  handlePointerUpNode: (event: React.PointerEvent<Element>, nodeId: string) => void;
  consumeSuppressedNodeClick: (nodeId: string) => boolean;
  handleSelectNode: (nodeId: string, options?: HandleSelectNodeOptions) => Promise<void>;
  handleDeleteSelectedNode: () => void;
  handleDragStart: (event: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => void;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  rafIdRef: React.MutableRefObject<number | null>;
  dragSelectionRef: React.MutableRefObject<DragSelectionState | null>;
}

const NODE_DRAG_START_THRESHOLD_PX = 4;

type DragSelectionState = {
  basePositions: Map<string, { x: number; y: number }>;
  anchorCanvasX: number;
  anchorCanvasY: number;
};

type DragCandidateState = {
  nodeId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  offsetX: number;
  offsetY: number;
  dragSelection: DragSelectionState | null;
};

type ActiveDragSessionState = {
  nodeId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

export function useCanvasInteractionsNodes({
  nodes,
  edges,
  isPathLocked,
  notifyLocked,
  confirmNodeSwitch,
  selectedNodeIdSet,
  selectedNodeId,
  selectedNodeIds,
  setNodes,
  updateNode,
  removeNode,
  setNodeSelection,
  toggleNodeSelection,
  selectNode,
  selectEdge,
  startDrag,
  endDrag,
  dragState,
  updateLastPointerCanvasPosFromClient,
  stopViewAnimation,
  resolveActiveNodeSelectionIds,
  confirm,
  setEdges,
  setRuntimeState,
  pruneRuntimeInputsInternal,
  viewportRef,
  canvasRef,
  view,
  setLastDrop,
  ensureNodeVisible,
  toast,
}: {
  nodes: AiNode[];
  edges: Edge[];
  isPathLocked: boolean;
  notifyLocked: () => void;
  confirmNodeSwitch?: (nodeId: string) => boolean | Promise<boolean>;
  selectedNodeIdSet: Set<string>;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  setNodes: (nodes: AiNode[] | ((prev: AiNode[]) => AiNode[])) => void;
  updateNode: (id: string, data: Partial<AiNode>) => void;
  removeNode: (id: string) => void;
  setNodeSelection: (nodeIds: string[]) => void;
  toggleNodeSelection: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  startDrag: (nodeId: string, offsetX: number, offsetY: number) => void;
  endDrag: () => void;
  dragState: { nodeId: string; offsetX: number; offsetY: number } | null;
  updateLastPointerCanvasPosFromClient: (
    clientX: number,
    clientY: number
  ) => { x: number; y: number } | null;
  stopViewAnimation: () => void;
  resolveActiveNodeSelectionIds: () => string[];
  confirm: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  setRuntimeState: (state: RuntimeState | ((prev: RuntimeState) => RuntimeState)) => void;
  pruneRuntimeInputsInternal: (
    state: RuntimeState,
    removedEdges: Edge[],
    remainingEdges: Edge[]
  ) => RuntimeState;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<SVGSVGElement | null>;
  view: { x: number; y: number; scale: number };
  setLastDrop: (pos: { x: number; y: number }) => void;
  ensureNodeVisible: (node: AiNode) => void;
  toast: Toast;
}): UseCanvasInteractionsNodesValue {
  const pendingDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const dragSelectionRef = useRef<DragSelectionState | null>(null);
  const dragCandidateRef = useRef<DragCandidateState | null>(null);
  const activeDragSessionRef = useRef<ActiveDragSessionState | null>(null);
  const suppressedClickNodeIdRef = useRef<string | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      pendingDragRef.current = null;
      dragSelectionRef.current = null;
      dragCandidateRef.current = null;
      activeDragSessionRef.current = null;
      suppressedClickNodeIdRef.current = null;
    };
  }, []);

  const handlePointerDownNode = useCallback(
    async (event: React.PointerEvent<Element>, nodeId: string): Promise<void> => {
      stopViewAnimation();
      if (isPathLocked) {
        notifyLocked();
        return;
      }

      event.stopPropagation();
      const target = getPointerCaptureTarget(event);
      const pointerId = event.pointerId;
      const clientX = event.clientX;
      const clientY = event.clientY;

      if (confirmNodeSwitch) {
        const result = confirmNodeSwitch(nodeId);
        const confirmed = result instanceof Promise ? await result : result;
        if (!confirmed) return;
      }

      setPointerCaptureSafe(target, pointerId);
      const node = nodes.find((item) => item.id === nodeId);
      if (!node) return;
      const pointerCanvas = updateLastPointerCanvasPosFromClient(clientX, clientY);
      if (!pointerCanvas) return;
      const canvasX = pointerCanvas.x;
      const canvasY = pointerCanvas.y;
      const hasSelectionToggleModifier = event.shiftKey || event.metaKey || event.ctrlKey;
      const isNodeSelected = selectedNodeIdSet.has(nodeId);
      const shouldGroupDrag =
        isNodeSelected && !hasSelectionToggleModifier && selectedNodeIdSet.size > 1;

      if (!hasSelectionToggleModifier && !isNodeSelected) {
        setNodeSelection([nodeId]);
        selectEdge(null);
      }

      let dragSelection: DragSelectionState | null = null;
      if (shouldGroupDrag) {
        const basePositions = new Map<string, { x: number; y: number }>();
        nodes.forEach((item: AiNode): void => {
          if (!selectedNodeIdSet.has(item.id)) return;
          basePositions.set(item.id, {
            x: item.position.x,
            y: item.position.y,
          });
        });
        dragSelection = {
          basePositions,
          anchorCanvasX: canvasX,
          anchorCanvasY: canvasY,
        };
      }
      dragSelectionRef.current = null;
      dragCandidateRef.current = {
        nodeId,
        pointerId,
        startClientX: clientX,
        startClientY: clientY,
        offsetX: canvasX - node.position.x,
        offsetY: canvasY - node.position.y,
        dragSelection,
      };
      activeDragSessionRef.current = null;
      suppressedClickNodeIdRef.current = null;
    },
    [
      confirmNodeSwitch,
      isPathLocked,
      nodes,
      notifyLocked,
      selectEdge,
      selectedNodeIdSet,
      setNodeSelection,
      stopViewAnimation,
      updateLastPointerCanvasPosFromClient,
    ]
  );

  const handlePointerMoveNode = useCallback(
    (event: React.PointerEvent<Element>, nodeId: string): void => {
      const pointerCanvas = updateLastPointerCanvasPosFromClient(event.clientX, event.clientY);
      if (!pointerCanvas) return;
      const canvasX = pointerCanvas.x;
      const canvasY = pointerCanvas.y;
      let activeDragSession =
        activeDragSessionRef.current?.nodeId === nodeId &&
        activeDragSessionRef.current.pointerId === event.pointerId
          ? activeDragSessionRef.current
          : null;

      if (!activeDragSession && dragState?.nodeId !== nodeId) {
        const dragCandidate = dragCandidateRef.current;
        if (
          dragCandidate?.nodeId !== nodeId ||
          dragCandidate?.pointerId !== event.pointerId
        ) {
          return;
        }
        const movedDistance = Math.hypot(
          event.clientX - dragCandidate.startClientX,
          event.clientY - dragCandidate.startClientY
        );
        if (movedDistance < NODE_DRAG_START_THRESHOLD_PX) return;
        dragSelectionRef.current = dragCandidate.dragSelection;
        activeDragSession = {
          nodeId,
          pointerId: event.pointerId,
          offsetX: dragCandidate.offsetX,
          offsetY: dragCandidate.offsetY,
        };
        activeDragSessionRef.current = activeDragSession;
        dragCandidateRef.current = null;
        startDrag(nodeId, dragCandidate.offsetX, dragCandidate.offsetY);
      }

      const activeOffsetX = activeDragSession?.offsetX ?? dragState?.offsetX;
      const activeOffsetY = activeDragSession?.offsetY ?? dragState?.offsetY;
      if (activeOffsetX == null || activeOffsetY == null) return;

      const dragSelection = dragSelectionRef.current;
      if (dragSelection && dragSelection.basePositions.size > 1) {
        const deltaX = canvasX - dragSelection.anchorCanvasX;
        const deltaY = canvasY - dragSelection.anchorCanvasY;
        setNodes((prev: AiNode[]): AiNode[] =>
          prev.map((item: AiNode): AiNode => {
            const base = dragSelection.basePositions.get(item.id);
            if (!base) return item;
            const nextX = Math.min(
              Math.max(base.x + deltaX, 16),
              2000 - 200 - 16 // CANVAS_WIDTH - NODE_WIDTH - 16
            );
            const nextY = Math.min(
              Math.max(base.y + deltaY, 16),
              2000 - 100 - 16 // CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
            );
            return {
              ...item,
              position: { x: nextX, y: nextY },
            };
          })
        );
        return;
      }
      const nextY = Math.min(
        Math.max(canvasY - activeOffsetY, 16),
        2000 - 100 - 16 // CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
      );
      const nextX = Math.min(
        Math.max(canvasX - activeOffsetX, 16),
        2000 - 200 - 16 // CANVAS_WIDTH - NODE_WIDTH - 16
      );

      // RAF throttling
      pendingDragRef.current = { nodeId, x: nextX, y: nextY };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (pendingDragRef.current) {
            const { nodeId: id, x, y } = pendingDragRef.current;
            updateNode(id, { position: { x, y } });
            pendingDragRef.current = null;
          }
          rafIdRef.current = null;
        });
      }
    },
    [dragState, setNodes, startDrag, updateLastPointerCanvasPosFromClient, updateNode]
  );

  const handlePointerUpNode = useCallback(
    (event: React.PointerEvent<Element>, nodeId: string): void => {
      const dragCandidate = dragCandidateRef.current;
      const isPendingClickOnlyInteraction =
        dragCandidate?.nodeId === nodeId && dragCandidate.pointerId === event.pointerId;
      const isActiveDragInteraction =
        (activeDragSessionRef.current?.nodeId === nodeId &&
          activeDragSessionRef.current.pointerId === event.pointerId) ||
        dragState?.nodeId === nodeId;

      if (!isPendingClickOnlyInteraction && !isActiveDragInteraction) return;
      releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      dragCandidateRef.current = null;

      if (!isActiveDragInteraction) {
        dragSelectionRef.current = null;
        return;
      }

      // Flush any pending RAF drag update
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (pendingDragRef.current) {
        const { nodeId: id, x, y } = pendingDragRef.current;
        updateNode(id, { position: { x, y } });
        pendingDragRef.current = null;
      }

      activeDragSessionRef.current = null;
      dragSelectionRef.current = null;
      suppressedClickNodeIdRef.current = nodeId;
      endDrag();
    },
    [dragState, endDrag, updateNode]
  );

  const consumeSuppressedNodeClick = useCallback((nodeId: string): boolean => {
    if (suppressedClickNodeIdRef.current !== nodeId) return false;
    suppressedClickNodeIdRef.current = null;
    return true;
  }, []);

  const handleSelectNode = useCallback(
    async (nodeId: string, options?: HandleSelectNodeOptions): Promise<void> => {
      const shouldToggle = options?.toggle === true;

      if (shouldToggle) {
        const isAlreadySelected = selectedNodeIdSet.has(nodeId);
        if (!isAlreadySelected && confirmNodeSwitch) {
          const result = confirmNodeSwitch(nodeId);
          const confirmed = result instanceof Promise ? await result : result;
          if (!confirmed) return;
        }
        selectEdge(null);
        toggleNodeSelection(nodeId);
        return;
      }

      if (selectedNodeIdSet.has(nodeId) && selectedNodeIds.length > 1) {
        setNodeSelection([
          nodeId,
          ...selectedNodeIds.filter((selectedId: string): boolean => selectedId !== nodeId),
        ]);
        selectEdge(null);
        return;
      }

      if (selectedNodeId === nodeId && selectedNodeIds.length <= 1) return;

      if (confirmNodeSwitch) {
        const result = confirmNodeSwitch(nodeId);
        const confirmed = result instanceof Promise ? await result : result;
        if (!confirmed) return;
      }

      selectEdge(null);
      selectNode(nodeId);
    },
    [
      confirmNodeSwitch,
      selectEdge,
      selectNode,
      selectedNodeId,
      selectedNodeIdSet,
      selectedNodeIds.length,
      selectedNodeIds,
      setNodeSelection,
      toggleNodeSelection,
    ]
  );

  const handleDeleteSelectedNode = useCallback((): void => {
    const nodeIdsToDelete = resolveActiveNodeSelectionIds();
    if (nodeIdsToDelete.length === 0) return;
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const nodeIdSet = new Set(nodeIdsToDelete);
    const isSingleNode = nodeIdsToDelete.length === 1;
    const targetNode = isSingleNode ? nodes.find((n) => n.id === nodeIdsToDelete[0]) : null;
    const label = isSingleNode
      ? targetNode?.title || 'this node'
      : `${nodeIdsToDelete.length} nodes`;

    confirm({
      title: 'Remove Node?',
      message: `Are you sure you want to remove ${label}? This will delete all connected wires.`,
      confirmText: 'Remove',
      isDangerous: true,
      onConfirm: () => {
        if (isSingleNode && nodeIdsToDelete[0]) {
          removeNode(nodeIdsToDelete[0]);
        } else {
          setNodes((prev: AiNode[]): AiNode[] =>
            prev.filter((node: AiNode): boolean => !nodeIdSet.has(node.id))
          );
        }

        const removedEdges = edges.filter((e) =>
          Boolean((e.from && nodeIdSet.has(e.from)) || (e.to && nodeIdSet.has(e.to)))
        );
        const remainingEdges = edges.filter(
          (e) => !((e.from && nodeIdSet.has(e.from)) || (e.to && nodeIdSet.has(e.to)))
        );

        setEdges(remainingEdges);
        setRuntimeState((prev: RuntimeState) =>
          pruneRuntimeInputsInternal(prev, removedEdges, remainingEdges)
        );

        selectNode(null);
        setNodeSelection([]);
        selectEdge(null);
      },
    });
  }, [
    resolveActiveNodeSelectionIds,
    isPathLocked,
    nodes,
    confirm,
    edges,
    notifyLocked,
    pruneRuntimeInputsInternal,
    removeNode,
    selectEdge,
    selectNode,
    setEdges,
    setNodeSelection,
    setNodes,
    setRuntimeState,
  ]);

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, node: NodeDefinition): void => {
      if (isPathLocked) {
        event.preventDefault();
        notifyLocked();
        return;
      }
      const payload = JSON.stringify(node);
      setDragData(event.dataTransfer, { [DRAG_KEYS.AI_NODE]: payload }, { effectAllowed: 'copy' });
    },
    [isPathLocked, notifyLocked]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      if (isPathLocked) {
        notifyLocked();
        return;
      }

      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      const canvasRect = canvasRef.current?.getBoundingClientRect() ?? null;

      const raw = getFirstDragValue(event.dataTransfer, [DRAG_KEYS.AI_NODE]);
      if (!raw) return;

      let payload: NodeDefinition | null;
      try {
        payload = JSON.parse(raw) as NodeDefinition;
      } catch (_error) {
        toast('Failed to add node. Invalid data.', { variant: 'error' });
        return;
      }

      if (!payload?.type) return;

      const localX = canvasRect
        ? (event.clientX - canvasRect.left) / view.scale
        : (event.clientX - viewport.left - view.x) / view.scale;
      const localY = canvasRect
        ? (event.clientY - canvasRect.top) / view.scale
        : (event.clientY - viewport.top - view.y) / view.scale;
      updateLastPointerCanvasPosFromClient(event.clientX, event.clientY);

      const nextX = Math.min(Math.max(localX - 200 / 2, 16), 2000 - 200 - 16); // NODE_WIDTH
      const nextY = Math.min(Math.max(localY - 100 / 2, 16), 2000 - 100 - 16); // NODE_MIN_HEIGHT

      const defaultConfig = getDefaultConfigForType(payload.type, payload.outputs, payload.inputs);
      const mergedConfig = payload.config ? { ...defaultConfig, ...payload.config } : defaultConfig;

      const newNodeId = createNodeInstanceId(new Set(nodes.map((node: AiNode): string => node.id)));
      const nowIso = new Date().toISOString();
      const newNode: AiNode = {
        ...payload,
        id: newNodeId,
        instanceId: newNodeId,
        nodeTypeId: resolveNodeTypeId(payload, palette),
        createdAt: nowIso,
        updatedAt: null,
        position: { x: nextX, y: nextY },
        data: {},
        ...(mergedConfig ? { config: mergedConfig } : {}),
      };

      setNodes((prev: AiNode[]) => [...prev, newNode]);
      selectNode(newNodeId);
      setLastDrop({ x: nextX, y: nextY });
      ensureNodeVisible(newNode);
      toast(`Node added: ${payload.title}`, { variant: 'success' });
    },
    [
      isPathLocked,
      viewportRef,
      canvasRef,
      view,
      setNodes,
      selectNode,
      setLastDrop,
      ensureNodeVisible,
      toast,
      notifyLocked,
      updateLastPointerCanvasPosFromClient,
      nodes,
    ]
  );

  return {
    handlePointerDownNode,
    handlePointerMoveNode,
    handlePointerUpNode,
    consumeSuppressedNodeClick,
    handleSelectNode,
    handleDeleteSelectedNode,
    handleDragStart,
    handleDragOver,
    handleDrop,
    rafIdRef,
    dragSelectionRef,
  };
}
