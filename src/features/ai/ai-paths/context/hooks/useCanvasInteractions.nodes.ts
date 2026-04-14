'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { Toast } from '@/shared/contracts/ui/base';
import type { AiNode, Edge, NodeDefinition } from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import { CANVAS_HEIGHT, CANVAS_WIDTH, NODE_MIN_HEIGHT, NODE_WIDTH } from '@/shared/lib/ai-paths/core/constants';
import { getDefaultConfigForType } from '@/shared/lib/ai-paths/core/normalization';
import { createNodeInstanceId, resolveNodeTypeId } from '@/shared/lib/ai-paths/core/utils';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import { DRAG_KEYS, getFirstDragValue, setDragData } from '@/shared/utils/drag-drop';

import { computeNodeSelectionDeleteResult } from './canvas/delete-selection-command';
import {
  getPointerCaptureTarget,
  setPointerCaptureSafe,
  releasePointerCaptureSafe,
  type HandleSelectNodeOptions,
} from './useCanvasInteractions.helpers';

import type { GraphMutationMeta } from '../GraphContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';



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

export type UseCanvasInteractionsNodesGraphOps = {
  nodes: AiNode[];
  edges: Edge[];
  setNodes: (
    nodes: AiNode[] | ((prev: AiNode[]) => AiNode[]),
    mutationMeta?: GraphMutationMeta
  ) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[]), mutationMeta?: GraphMutationMeta) => void;
  setRuntimeState: (state: RuntimeState | ((prev: RuntimeState) => RuntimeState)) => void;
  pruneRuntimeInputsInternal: (
    state: RuntimeState,
    removedEdges: Edge[],
    remainingEdges: Edge[]
  ) => RuntimeState;
};

export type UseCanvasInteractionsNodesSelectionOps = {
  selectedNodeIdSet: Set<string>;
  selectedNodeIds: string[];
  setNodeSelection: (nodeIds: string[]) => void;
  toggleNodeSelection: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  resolveActiveNodeSelectionIds: () => string[];
};

export type UseCanvasInteractionsNodesCanvasOps = {
  startDrag: (nodeId: string, offsetX: number, offsetY: number) => void;
  endDrag: () => void;
  dragState: { nodeId: string; offsetX: number; offsetY: number } | null;
  updateLastPointerCanvasPosFromClient: (
    clientX: number,
    clientY: number
  ) => { x: number; y: number } | null;
  stopViewAnimation: () => void;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  view: { x: number; y: number; scale: number };
  setLastDrop: (pos: { x: number; y: number }) => void;
  ensureNodeVisible: (node: AiNode) => void;
};

export type UseCanvasInteractionsNodesInteractionOps = {
  isPathLocked: boolean;
  notifyLocked: () => void;
  confirmNodeSwitch?: (nodeId: string) => boolean | Promise<boolean>;
  confirm: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  toast: Toast;
};

export type UseCanvasInteractionsNodesArgs = {
  graphOps: UseCanvasInteractionsNodesGraphOps;
  selectionOps: UseCanvasInteractionsNodesSelectionOps;
  canvasOps: UseCanvasInteractionsNodesCanvasOps;
  interactionOps: UseCanvasInteractionsNodesInteractionOps;
};

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

type PointerCaptureTarget =
  | (Element & {
      setPointerCapture?: (pointerId: number) => void;
      releasePointerCapture?: (pointerId: number) => void;
      hasPointerCapture?: (pointerId: number) => boolean;
    })
  | null;

type PointerCaptureState = {
  nodeId: string;
  pointerId: number;
  target: PointerCaptureTarget;
};

const clampNodePosition = (x: number, y: number): { x: number; y: number } => ({
  x: Math.min(Math.max(x, 16), CANVAS_WIDTH - NODE_WIDTH - 16),
  y: Math.min(Math.max(y, 16), CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16),
});

export function useCanvasInteractionsNodes({
  graphOps,
  selectionOps,
  canvasOps,
  interactionOps,
}: UseCanvasInteractionsNodesArgs): UseCanvasInteractionsNodesValue {
  const { nodes, edges, setNodes, setEdges, setRuntimeState, pruneRuntimeInputsInternal } =
    graphOps;
  const {
    selectedNodeIdSet,
    selectedNodeIds,
    setNodeSelection,
    toggleNodeSelection,
    selectNode,
    selectEdge,
    resolveActiveNodeSelectionIds,
  } = selectionOps;
  const {
    startDrag,
    endDrag,
    dragState,
    updateLastPointerCanvasPosFromClient,
    stopViewAnimation,
    viewportRef,
    view,
    setLastDrop,
    ensureNodeVisible,
  } = canvasOps;
  const { isPathLocked, notifyLocked, confirmNodeSwitch, confirm, toast } = interactionOps;
  const toWorldPoint = useCallback(
    (point: { x: number; y: number }): { x: number; y: number } => {
      const scale = Number.isFinite(view.scale) && view.scale > 0 ? view.scale : 1;
      return {
        x: (point.x - view.x) / scale,
        y: (point.y - view.y) / scale,
      };
    },
    [view.scale, view.x, view.y]
  );

  const pendingDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const dragSelectionRef = useRef<DragSelectionState | null>(null);
  const dragCandidateRef = useRef<DragCandidateState | null>(null);
  const activeDragSessionRef = useRef<ActiveDragSessionState | null>(null);
  const suppressedClickNodeIdRef = useRef<string | null>(null);
  const pointerCaptureRef = useRef<PointerCaptureState | null>(null);
  const dragStateRef = useRef<typeof dragState>(dragState);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const flushPendingDragUpdate = useCallback((): void => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingDragRef.current) {
      const { nodeId: id, x, y } = pendingDragRef.current;
      setNodes(
        (prev: AiNode[]): AiNode[] =>
          prev.map(
            (item: AiNode): AiNode =>
              item.id === id
                ? {
                  ...item,
                  position: { x, y },
                }
                : item
          ),
        { reason: 'drag', source: 'canvas.drag.flush' }
      );
      pendingDragRef.current = null;
    }
  }, [setNodes]);

  const forceEndNodeDrag = useCallback(
    (_pointerId?: number): void => {
      const activePointerCapture = pointerCaptureRef.current;
      if (activePointerCapture) {
        releasePointerCaptureSafe(activePointerCapture.target, activePointerCapture.pointerId);
        pointerCaptureRef.current = null;
      }

      const hadActiveDrag =
        activeDragSessionRef.current !== null ||
        dragStateRef.current !== null ||
        pendingDragRef.current !== null ||
        rafIdRef.current !== null;
      dragCandidateRef.current = null;
      activeDragSessionRef.current = null;
      dragSelectionRef.current = null;
      flushPendingDragUpdate();
      if (hadActiveDrag) {
        endDrag();
      }
    },
    [endDrag, flushPendingDragUpdate]
  );

  useEffect(() => {
    const handleWindowPointerUp = (event: PointerEvent): void => {
      const hasCapture = pointerCaptureRef.current !== null;
      const hasPendingNodeDragCandidate = dragCandidateRef.current !== null;
      const hasActiveNodeDrag = activeDragSessionRef.current !== null || dragState !== null;
      if (!hasCapture && !hasPendingNodeDragCandidate && !hasActiveNodeDrag) return;
      forceEndNodeDrag(event.pointerId);
    };

    const handleWindowPointerCancel = (event: PointerEvent): void => {
      const hasCapture = pointerCaptureRef.current !== null;
      const hasPendingNodeDragCandidate = dragCandidateRef.current !== null;
      const hasActiveNodeDrag = activeDragSessionRef.current !== null || dragState !== null;
      if (!hasCapture && !hasPendingNodeDragCandidate && !hasActiveNodeDrag) return;
      forceEndNodeDrag(event.pointerId);
    };

    const handleWindowBlur = (): void => {
      const hasCapture = pointerCaptureRef.current !== null;
      const hasPendingNodeDragCandidate = dragCandidateRef.current !== null;
      const hasActiveNodeDrag = activeDragSessionRef.current !== null || dragState !== null;
      if (!hasCapture && !hasPendingNodeDragCandidate && !hasActiveNodeDrag) return;
      forceEndNodeDrag();
    };

    window.addEventListener('pointerup', handleWindowPointerUp, true);
    window.addEventListener('pointercancel', handleWindowPointerCancel, true);
    window.addEventListener('blur', handleWindowBlur);
    return (): void => {
      window.removeEventListener('pointerup', handleWindowPointerUp, true);
      window.removeEventListener('pointercancel', handleWindowPointerCancel, true);
      window.removeEventListener('blur', handleWindowBlur);
      forceEndNodeDrag();
      suppressedClickNodeIdRef.current = null;
    };
  }, [forceEndNodeDrag]);

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
      pointerCaptureRef.current = {
        nodeId,
        pointerId,
        target,
      };
      const node = nodes.find((item) => item.id === nodeId);
      if (!node) {
        forceEndNodeDrag(pointerId);
        return;
      }
      const pointerCanvas = updateLastPointerCanvasPosFromClient(clientX, clientY);
      if (!pointerCanvas) {
        forceEndNodeDrag(pointerId);
        return;
      }
      const pointerWorld = toWorldPoint(pointerCanvas);
      const canvasX = pointerWorld.x;
      const canvasY = pointerWorld.y;
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
      forceEndNodeDrag,
    ]
  );

  const handlePointerMoveNode = useCallback(
    (event: React.PointerEvent<Element>, nodeId: string): void => {
      const pointerType = typeof event.pointerType === 'string' ? event.pointerType : '';
      const hasNoPrimaryButtonPressed =
        (pointerType === 'mouse' || pointerType === 'pen') &&
        typeof event.buttons === 'number' &&
        (event.buttons & 1) === 0;
      if (hasNoPrimaryButtonPressed) {
        const capture = pointerCaptureRef.current;
        const pointerMatchesCapture = capture?.pointerId === event.pointerId;
        const captureTarget = capture?.target ?? null;
        const hasPointerCaptureForPointer =
          pointerMatchesCapture &&
          (typeof captureTarget?.hasPointerCapture !== 'function' ||
            captureTarget.hasPointerCapture(event.pointerId));
        if (!hasPointerCaptureForPointer) {
          return;
        }
      }

      const pointerCanvas = updateLastPointerCanvasPosFromClient(event.clientX, event.clientY);
      if (!pointerCanvas) return;
      const pointerWorld = toWorldPoint(pointerCanvas);
      const canvasX = pointerWorld.x;
      const canvasY = pointerWorld.y;
      if (!Number.isFinite(canvasX) || !Number.isFinite(canvasY)) return;
      let activeDragSession =
        activeDragSessionRef.current?.nodeId === nodeId &&
        activeDragSessionRef.current.pointerId === event.pointerId
          ? activeDragSessionRef.current
          : null;

      if (!activeDragSession && dragState?.nodeId !== nodeId) {
        const dragCandidate = dragCandidateRef.current;
        if (dragCandidate?.nodeId !== nodeId || dragCandidate?.pointerId !== event.pointerId) {
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
        setNodes(
          (prev: AiNode[]): AiNode[] =>
            prev.map((item: AiNode): AiNode => {
              const base = dragSelection.basePositions.get(item.id);
              if (!base) return item;
              const clamped = clampNodePosition(base.x + deltaX, base.y + deltaY);
              return {
                ...item,
                position: clamped,
              };
            }),
          { reason: 'drag', source: 'canvas.drag.group' }
        );
        return;
      }
      const nextY = canvasY - activeOffsetY;
      const nextX = canvasX - activeOffsetX;
      const clamped = clampNodePosition(nextX, nextY);

      // RAF throttling
      pendingDragRef.current = { nodeId, x: clamped.x, y: clamped.y };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (pendingDragRef.current) {
            const { nodeId: id, x, y } = pendingDragRef.current;
            setNodes(
              (prev: AiNode[]): AiNode[] =>
                prev.map(
                  (item: AiNode): AiNode =>
                    item.id === id
                      ? {
                        ...item,
                        position: { x, y },
                      }
                      : item
                ),
              { reason: 'drag', source: 'canvas.drag.raf' }
            );
            pendingDragRef.current = null;
          }
          rafIdRef.current = null;
        });
      }
    },
    [dragState, setNodes, startDrag, updateLastPointerCanvasPosFromClient]
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
      const activePointerCapture = pointerCaptureRef.current;
      if (activePointerCapture?.pointerId === event.pointerId) {
        releasePointerCaptureSafe(activePointerCapture.target, activePointerCapture.pointerId);
        pointerCaptureRef.current = null;
      } else {
        releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      }
      dragCandidateRef.current = null;

      if (!isActiveDragInteraction) {
        dragSelectionRef.current = null;
        return;
      }

      // Flush any pending RAF drag update
      flushPendingDragUpdate();

      activeDragSessionRef.current = null;
      dragSelectionRef.current = null;
      suppressedClickNodeIdRef.current = nodeId;
      endDrag();
    },
    [dragState, endDrag, flushPendingDragUpdate]
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

      if (selectedNodeIdSet.has(nodeId) && selectedNodeIds.length <= 1) return;

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
    const deleteResult = computeNodeSelectionDeleteResult(nodes, edges, nodeIdsToDelete);
    if (deleteResult.nodeIds.length === 0) return;
    const isSingleNode = deleteResult.nodeIds.length === 1;
    const targetNode = isSingleNode ? nodes.find((n) => n.id === deleteResult.nodeIds[0]) : null;
    const label = isSingleNode
      ? targetNode?.title || 'this node'
      : `${deleteResult.nodeIds.length} nodes`;

    confirm({
      title: 'Remove Node?',
      message: `Are you sure you want to remove ${label}? This will delete all connected wires.`,
      confirmText: 'Remove',
      isDangerous: true,
      onConfirm: () => {
        setNodes(deleteResult.remainingNodes, {
          reason: 'delete',
          source: 'canvas.delete.multi',
          allowNodeCountDecrease: true,
        });
        setEdges(deleteResult.remainingEdges, { reason: 'delete', source: 'canvas.delete.multi' });
        setRuntimeState((prev: RuntimeState) =>
          pruneRuntimeInputsInternal(prev, deleteResult.removedEdges, deleteResult.remainingEdges)
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

      const raw = getFirstDragValue(event.dataTransfer, [DRAG_KEYS.AI_NODE]);
      if (!raw) return;

      let payload: NodeDefinition | null;
      try {
        payload = JSON.parse(raw) as NodeDefinition;
      } catch (_error) {
        logClientError(_error);
        toast('Failed to add node. Invalid data.', { variant: 'error' });
        return;
      }

      if (!payload?.type) return;

      const scale = Number.isFinite(view.scale) && view.scale > 0 ? view.scale : 1;
      const localX = (event.clientX - viewport.left - view.x) / scale;
      const localY = (event.clientY - viewport.top - view.y) / scale;
      if (!Number.isFinite(localX) || !Number.isFinite(localY)) return;
      updateLastPointerCanvasPosFromClient(event.clientX, event.clientY);

      const clamped = clampNodePosition(localX - NODE_WIDTH / 2, localY - NODE_MIN_HEIGHT / 2);

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
        position: clamped,
        data: {},
        ...(mergedConfig ? { config: mergedConfig } : {}),
      };

      setNodes((prev: AiNode[]) => [...prev, newNode], {
        reason: 'drop',
        source: 'canvas.drop.palette',
      });
      selectNode(newNodeId);
      setLastDrop(clamped);
      ensureNodeVisible(newNode);
      toast(`Node added: ${payload.title}`, { variant: 'success' });
    },
    [
      isPathLocked,
      viewportRef,
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
