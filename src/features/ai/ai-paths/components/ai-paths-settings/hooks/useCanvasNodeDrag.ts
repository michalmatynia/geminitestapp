'use client';

import { useCallback, useRef, useState } from 'react';
import {
  AiNode,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  NODE_WIDTH,
  NODE_MIN_HEIGHT,
  NodeDefinition,
  createNodeInstanceId,
  getDefaultConfigForType,
  resolveNodeTypeId,
  palette,
} from '@/shared/lib/ai-paths';
import { DRAG_KEYS, getFirstDragValue, setDragData } from '@/shared/utils/drag-drop';
import {
  getPointerCaptureTarget,
  setPointerCaptureSafe,
  releasePointerCaptureSafe,
} from '../utils/canvas-interaction-utils';

export function useCanvasNodeDrag(args: {
  nodes: AiNode[];
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  view: { x: number; y: number; scale: number };
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isPathLocked: boolean;
  notifyLocked: () => void;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
  toast: (
    message: string,
    options?: {
      variant?: 'success' | 'error' | 'info' | 'warning';
      duration?: number;
      error?: unknown;
    }
  ) => void;
  setSelectedNodeId: (id: string | null) => void;
  ensureNodeVisible: (node: AiNode) => void;
  setLastDrop: (pos: { x: number; y: number } | null) => void;
}) {
  const {
    nodes,
    setNodes,
    view,
    viewportRef,
    canvasRef,
    isPathLocked,
    notifyLocked,
    reportAiPathsError,
    toast,
    setSelectedNodeId,
    ensureNodeVisible,
    setLastDrop,
  } = args;

  const [dragState, setDragState] = useState<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const pendingDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, nodeId: string): void => {
      if (isPathLocked) {
        notifyLocked();
        return;
      }
      event.stopPropagation();
      setPointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      const node = nodes.find((item: AiNode): boolean => item.id === nodeId);
      if (!node) return;
      const canvasX = (event.clientX - viewport.left - view.x) / view.scale;
      const canvasY = (event.clientY - viewport.top - view.y) / view.scale;
      setDragState({
        nodeId,
        offsetX: canvasX - node.position.x,
        offsetY: canvasY - node.position.y,
      });
    },
    [isPathLocked, nodes, notifyLocked, view, viewportRef]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, nodeId: string): void => {
      if (dragState?.nodeId !== nodeId) return;
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      const nextX = Math.min(
        Math.max((event.clientX - viewport.left - view.x) / view.scale - dragState.offsetX, 16),
        CANVAS_WIDTH - NODE_WIDTH - 16
      );
      const nextY = Math.min(
        Math.max((event.clientY - viewport.top - view.y) / view.scale - dragState.offsetY, 16),
        CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
      );

      pendingDragRef.current = { nodeId, x: nextX, y: nextY };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame((): void => {
          if (pendingDragRef.current) {
            const { nodeId: id, x, y } = pendingDragRef.current;
            setNodes((prev: AiNode[]): AiNode[] =>
              prev.map(
                (node: AiNode): AiNode => (node.id === id ? { ...node, position: { x, y } } : node)
              )
            );
          }
          rafIdRef.current = null;
        });
      }
    },
    [dragState, setNodes, view, viewportRef]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, nodeId: string): void => {
      if (dragState?.nodeId !== nodeId) return;
      releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (pendingDragRef.current) {
        const { nodeId: id, x, y } = pendingDragRef.current;
        setNodes((prev: AiNode[]): AiNode[] =>
          prev.map(
            (node: AiNode): AiNode => (node.id === id ? { ...node, position: { x, y } } : node)
          )
        );
        pendingDragRef.current = null;
      }

      setDragState(null);
    },
    [dragState, setNodes]
  );

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
      let payload: NodeDefinition;
      try {
        payload = JSON.parse(raw) as NodeDefinition;
      } catch (error) {
        reportAiPathsError(
          error,
          { action: 'dropNode', dataPreview: raw.slice(0, 120) },
          'Invalid node payload dropped:'
        );
        toast('Failed to add node. Drag again.', { variant: 'error' });
        return;
      }
      if (
        !payload ||
        typeof payload.type !== 'string' ||
        !Array.isArray(payload.inputs) ||
        !Array.isArray(payload.outputs)
      ) {
        return;
      }
      const localX = canvasRect
        ? (event.clientX - canvasRect.left) / view.scale
        : (event.clientX - viewport.left - view.x) / view.scale;
      const localY = canvasRect
        ? (event.clientY - canvasRect.top) / view.scale
        : (event.clientY - viewport.top - view.y) / view.scale;
      const nextX = Math.min(Math.max(localX - NODE_WIDTH / 2, 16), CANVAS_WIDTH - NODE_WIDTH - 16);
      const nextY = Math.min(
        Math.max(localY - NODE_MIN_HEIGHT / 2, 16),
        CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
      );
      const defaultConfig = getDefaultConfigForType(payload.type, payload.outputs, payload.inputs);
      const mergedConfig = payload.config
        ? {
            ...(defaultConfig ?? {}),
            ...payload.config,
          }
        : defaultConfig;

      const nodeIds = new Set(nodes.map((node: AiNode): string => node.id));
      const nodeId = createNodeInstanceId(nodeIds);
      const newNode: AiNode = {
        ...payload,
        id: nodeId,
        instanceId: nodeId,
        nodeTypeId: resolveNodeTypeId(payload, palette),
        createdAt: new Date().toISOString(),
        updatedAt: null,
        data: {},
        position: { x: nextX, y: nextY },
        ...(mergedConfig ? { config: mergedConfig } : {}),
      };
      setSelectedNodeId(newNode.id);
      setNodes((prev: AiNode[]): AiNode[] => [...prev, newNode]);
      ensureNodeVisible(newNode);
      setLastDrop({ x: nextX, y: nextY });
      toast(`Node added: ${payload.title}`, { variant: 'success' });
    },
    [
      isPathLocked,
      notifyLocked,
      viewportRef,
      canvasRef,
      view,
      reportAiPathsError,
      toast,
      nodes,
      setSelectedNodeId,
      setNodes,
      ensureNodeVisible,
      setLastDrop,
    ]
  );

  return {
    dragState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDragStart,
    handleDragOver,
    handleDrop,
    rafIdRef,
  };
}
