'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCanvasRefs } from '@/features/ai/ai-paths/context/CanvasContext';
import { useSelectionActions, useSelectionState } from '@/features/ai/ai-paths/context/SelectionContext';
import type { AiNode, Edge, NodeDefinition } from '@/features/ai/ai-paths/lib';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  VIEW_MARGIN,
  clampScale,
  clampTranslate,
  getDefaultConfigForType,
  getPortOffsetY,
  sanitizeEdges,
  validateConnection,
} from '@/features/ai/ai-paths/lib';
import { type ConfirmConfig, useConfirm } from '@/shared/hooks/ui/useConfirm';
import { ToastFn } from '@/shared/types/domain/ai-paths-runtime';
import { DRAG_KEYS, getFirstDragValue, setDragData } from '@/shared/utils/drag-drop';

type UseAiPathsCanvasInteractionsArgs = {
  nodes: AiNode[];
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  isPathLocked: boolean;
  selectedNodeId: string | null;
  setSelectedNodeId: (value: string | null) => void;
  confirmNodeSwitch?: (nextNodeId: string) => boolean | Promise<boolean>;
  confirm: (config: ConfirmConfig) => void;
  clearRuntimeInputsForEdges: (removed: Edge[], remaining: Edge[]) => void;
  reportAiPathsError: (error: unknown, context: Record<string, unknown>, fallbackMessage?: string) => void;
  toast: ToastFn;
};

type ConnectingState = {
  fromNodeId: string;
  fromPort: string;
  start: { x: number; y: number };
};

export interface AiPathsCanvasInteractions {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  view: { x: number; y: number; scale: number };
  panState: { startX: number; startY: number; originX: number; originY: number } | null;
  dragState: { nodeId: string; offsetX: number; offsetY: number } | null;
  connecting: ConnectingState | null;
  connectingPos: { x: number; y: number } | null;
  lastDrop: { x: number; y: number } | null;
  selectedEdgeId: string | null;
  edgePaths: { id: string; path: string; label?: string | undefined; arrow?: { x: number; y: number; angle: number } | undefined }[];
  connectingFromNode: AiNode | null;
  ensureNodeVisible: (node: AiNode) => void;
  getCanvasCenterPosition: () => { x: number; y: number };
  handlePointerDown: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handleDragStart: (event: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleStartConnection: (event: React.PointerEvent<HTMLButtonElement>, node: AiNode, port: string) => void;
  handleCompleteConnection: (event: React.PointerEvent<HTMLButtonElement>, node: AiNode, port: string) => void;
  handlePanStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  handlePanMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  handlePanEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleReconnectInput: (event: React.PointerEvent<HTMLButtonElement>, nodeId: string, port: string) => void;
  handleRemoveEdge: (edgeId: string) => void;
  handleDisconnectPort: (direction: 'input' | 'output', nodeId: string, port: string) => void;
  handleDeleteSelectedNode: () => void;
  handleSelectEdge: (edgeId: string | null) => void;
  handleSelectNode: (nodeId: string) => void;
  zoomTo: (targetScale: number) => void;
  fitToNodes: () => void;
  resetView: () => void;
  ConfirmationModal: React.ComponentType;
}

export function useAiPathsCanvasInteractions({
  nodes,
  setNodes,
  edges,
  setEdges,
  isPathLocked,
  selectedNodeId,
  setSelectedNodeId,
  confirmNodeSwitch,
  confirm,
  clearRuntimeInputsForEdges,
  reportAiPathsError,
  toast,
}: UseAiPathsCanvasInteractionsArgs): AiPathsCanvasInteractions {
  // Initial view centered on the middle of the canvas where nodes are placed
  const [view, setView] = useState({ x: -600, y: -320, scale: 1 });
  const [connecting, setConnecting] = useState<ConnectingState | null>(null);
  const [connectingPos, setConnectingPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [lastDrop, setLastDrop] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [panState, setPanState] = useState<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const { selectedEdgeId, selectedNodeId: selectedNodeIdCtx } = useSelectionState();
  const { selectEdge, selectNode } = useSelectionActions();
  const { ConfirmationModal } = useConfirm();

  const { viewportRef, canvasRef } = useCanvasRefs();
  const pendingDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastDropTimerRef = useRef<number | null>(null);
  const lockedToastAtRef = useRef<number>(0);

  const getPointerCaptureTarget = (
    event: React.PointerEvent<HTMLElement>
  ): (Element & {
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
    hasPointerCapture?: (pointerId: number) => boolean;
  }) | null => {
    const nativeCurrentTarget = event.nativeEvent.currentTarget;
    const candidates: EventTarget[] = [
      event.currentTarget,
      ...(nativeCurrentTarget ? [nativeCurrentTarget] : []),
      event.target,
    ];
    for (const candidate of candidates) {
      if (candidate instanceof Element) {
        return candidate as Element & {
          setPointerCapture?: (pointerId: number) => void;
          releasePointerCapture?: (pointerId: number) => void;
          hasPointerCapture?: (pointerId: number) => boolean;
        };
      }
    }
    return null;
  };

  const setPointerCaptureSafe = (
    target: (Element & { setPointerCapture?: (pointerId: number) => void }) | null,
    pointerId: number
  ): void => {
    if (!target || typeof target.setPointerCapture !== 'function') return;
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Ignore pointer-capture errors from detached/non-capturing targets.
    }
  };

  const releasePointerCaptureSafe = (
    target: (Element & {
      releasePointerCapture?: (pointerId: number) => void;
      hasPointerCapture?: (pointerId: number) => boolean;
    }) | null,
    pointerId: number
  ): void => {
    if (!target || typeof target.releasePointerCapture !== 'function') return;
    try {
      if (typeof target.hasPointerCapture !== 'function' || target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore release failures for already-detached targets.
    }
  };

  const notifyLocked = useCallback((): void => {
    const now = Date.now();
    if (now - lockedToastAtRef.current < 800) return;
    lockedToastAtRef.current = now;
    toast('This path is locked. Unlock it to edit nodes or connections.', {
      variant: 'info',
    });
  }, [toast]);

  useEffect((): void | (() => void) => {
    if (!lastDrop) return;
    if (lastDropTimerRef.current) {
      window.clearTimeout(lastDropTimerRef.current);
    }
    lastDropTimerRef.current = window.setTimeout((): void => {
      setLastDrop(null);
      lastDropTimerRef.current = null;
    }, 1600);
    return (): void => {
      if (lastDropTimerRef.current) {
        window.clearTimeout(lastDropTimerRef.current);
        lastDropTimerRef.current = null;
      }
    };
  }, [lastDrop]);

  // Cleanup RAF on unmount
  useEffect((): () => void => {
    return (): void => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  useEffect((): void | (() => void) => {
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-port]')) return;
      if (target?.closest('path')) return;
      if (target?.closest('[data-edge-panel]')) return;
      setConnecting(null);
      setConnectingPos(null);
      selectEdge(null);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return (): void => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect((): void | (() => void) => {
    const handlePointerUp = (): void => {
      setConnecting(null);
      setConnectingPos(null);
    };
    window.addEventListener('pointerup', handlePointerUp);
    return (): void => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

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

  const handleDeleteSelectedNode = useCallback((): void => {
    const activeNodeId = selectedNodeIdCtx ?? selectedNodeId;
    if (!activeNodeId) return;
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const targetNode = nodes.find((node: AiNode): boolean => node.id === activeNodeId);
    const label = targetNode?.title || 'this node';
    
    confirm({
      title: 'Remove Node?',
      message: `Are you sure you want to remove ${label}? This will delete all connected wires.`,
      confirmText: 'Remove',
      isDangerous: true,
      onConfirm: () => {
        setNodes((prev: AiNode[]): AiNode[] => prev.filter((node: AiNode): boolean => node.id !== activeNodeId));
        setEdges((prev: Edge[]): Edge[] => {
          const removed = prev.filter(
            (edge: Edge): boolean => edge.from === activeNodeId || edge.to === activeNodeId
          );
          const remaining = prev.filter(
            (edge: Edge): boolean => edge.from !== activeNodeId && edge.to !== activeNodeId
          );
          clearRuntimeInputsForEdges(removed, remaining);
          return remaining;
        });
        selectNode(null);
        setSelectedNodeId(null);
      }
    });
  }, [
    nodes,
    selectedNodeId,
    selectedNodeIdCtx,
    clearRuntimeInputsForEdges,
    isPathLocked,
    notifyLocked,
    setEdges,
    setNodes,
    setSelectedNodeId,
    selectNode,
    confirm,
  ]);

  useEffect((): void => {
    setEdges((prev: Edge[]): Edge[] => sanitizeEdges(nodes, prev));
  }, [nodes, setEdges]);

  const setViewClamped = (next: { x: number; y: number; scale: number }): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const clampedScale = clampScale(next.scale);
    const clamped = clampTranslate(next.x, next.y, clampedScale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: clampedScale });
  };

  const zoomTo = (targetScale: number): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) {
      setViewClamped({ ...view, scale: targetScale });
      return;
    }
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    const nextScale = clampScale(targetScale);
    const canvasX = (centerX - view.x) / view.scale;
    const canvasY = (centerY - view.y) / view.scale;
    const nextX = centerX - canvasX * nextScale;
    const nextY = centerY - canvasY * nextScale;
    const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: nextScale });
  };

  const fitToNodesWith = (items: AiNode[]): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport || items.length === 0) {
      resetView();
      return;
    }
    const padding = 120;
    const bounds = items.reduce(
      (acc: { minX: number; minY: number; maxX: number; maxY: number }, node: AiNode) => {
        const x1 = node.position.x;
        const y1 = node.position.y;
        const x2 = node.position.x + NODE_WIDTH;
        const y2 = node.position.y + NODE_MIN_HEIGHT;
        return {
          minX: Math.min(acc.minX, x1),
          minY: Math.min(acc.minY, y1),
          maxX: Math.max(acc.maxX, x2),
          maxY: Math.max(acc.maxY, y2),
        };
      },
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      }
    );
    const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
    const scaleX = viewport.width / width;
    const scaleY = viewport.height / height;
    const nextScale = clampScale(Math.min(scaleX, scaleY));
    const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
    const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
    const nextX = viewport.width / 2 - centerX * nextScale;
    const nextY = viewport.height / 2 - centerY * nextScale;
    const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: nextScale });
  };

  const fitToNodes = (): void => {
    fitToNodesWith(nodes);
  };

  const resetView = (): void => {
    setViewClamped({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
  };

  const ensureNodeVisible = (node: AiNode): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return;
    const nodeLeft = node.position.x * view.scale + view.x;
    const nodeTop = node.position.y * view.scale + view.y;
    const nodeRight = nodeLeft + NODE_WIDTH * view.scale;
    const nodeBottom = nodeTop + NODE_MIN_HEIGHT * view.scale;
    let nextX = view.x;
    let nextY = view.y;
    if (nodeLeft < VIEW_MARGIN) {
      nextX += VIEW_MARGIN - nodeLeft;
    } else if (nodeRight > viewport.width - VIEW_MARGIN) {
      nextX -= nodeRight - (viewport.width - VIEW_MARGIN);
    }
    if (nodeTop < VIEW_MARGIN) {
      nextY += VIEW_MARGIN - nodeTop;
    } else if (nodeBottom > viewport.height - VIEW_MARGIN) {
      nextY -= nodeBottom - (viewport.height - VIEW_MARGIN);
    }
    const clamped = clampTranslate(nextX, nextY, view.scale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: view.scale });
  };

  const getPortPosition = useCallback((
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
  }, []);

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
        const remaining = prev.filter(
          (edge: Edge): boolean => edge.id !== edgeToMove.id
        );
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
    ]
  );



  const edgePaths = useMemo((): { id: string; path: string; label?: string | undefined; arrow?: { x: number; y: number; angle: number } | undefined }[] => {
    const nodeMap = new Map(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
    const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    });
    return edges
      .map((edge: Edge): { id: string; path: string; label?: string | undefined; arrow?: { x: number; y: number; angle: number } | undefined } | null => {
        if (!edge.from || !edge.to) return null;
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return null;
        const fromPort =
          edge.fromPort ?? (from.outputs.length > 0 ? from.outputs[0] : undefined);
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
      })
      .filter(Boolean) as { id: string; path: string; label?: string | undefined; arrow?: { x: number; y: number; angle: number } | undefined }[];
  }, [edges, getPortPosition, nodes]);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
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
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
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

    // RAF throttling: batch position updates to animation frames
    pendingDragRef.current = { nodeId, x: nextX, y: nextY };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame((): void => {
        if (pendingDragRef.current) {
          const { nodeId: id, x, y } = pendingDragRef.current;
          setNodes((prev: AiNode[]): AiNode[] =>
            prev.map((node: AiNode): AiNode =>
              node.id === id ? { ...node, position: { x, y } } : node
            )
          );
        }
        rafIdRef.current = null;
      });
    }
  };

  const handlePointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
    if (dragState?.nodeId !== nodeId) return;
    releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);

    // Flush any pending RAF drag update immediately on pointer up
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingDragRef.current) {
      const { nodeId: id, x, y } = pendingDragRef.current;
      setNodes((prev: AiNode[]): AiNode[] =>
        prev.map((node: AiNode): AiNode =>
          node.id === id ? { ...node, position: { x, y } } : node
        )
      );
      pendingDragRef.current = null;
    }

    setDragState(null);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    node: NodeDefinition
  ): void => {
    if (isPathLocked) {
      event.preventDefault();
      notifyLocked();
      return;
    }
    const payload = JSON.stringify(node);
    setDragData(
      event.dataTransfer,
      { [DRAG_KEYS.AI_NODE]: payload },
      { effectAllowed: 'copy' }
    );
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
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
    let payload: NodeDefinition | null = null;
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
    if (!payload || typeof payload.type !== 'string' || !Array.isArray(payload.inputs) || !Array.isArray(payload.outputs)) {
      return;
    }
    const localX = canvasRect
      ? (event.clientX - canvasRect.left) / view.scale
      : (event.clientX - viewport.left - view.x) / view.scale;
    const localY = canvasRect
      ? (event.clientY - canvasRect.top) / view.scale
      : (event.clientY - viewport.top - view.y) / view.scale;
    const nextX = Math.min(
      Math.max(localX - NODE_WIDTH / 2, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
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
    const createNodeId = (): string => {
      if (globalThis.crypto?.randomUUID) {
        return `node-${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
      }
      return `node-${Math.random().toString(36).slice(2, 10)}`;
    };
    const newNode: AiNode = {
      ...payload,
      id: createNodeId(),
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
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleStartConnection = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ): void => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    event.stopPropagation();
    const start = getPortPosition(node, port, 'output');
    setConnecting({ fromNodeId: node.id, fromPort: port, start });
    setConnectingPos(start);
  };

  const handleCompleteConnection = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ): void => {
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

    const validation = validateConnection(
      fromNode,
      node,
      connecting.fromPort,
      port
    );

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
  };

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>): void => {
    const canvasEl = canvasRef.current;
    const targetEl = event.target as Element | null;
    if (targetEl?.closest('path')) return;
    if (
      event.target !== event.currentTarget &&
      event.target !== canvasEl &&
      targetEl?.tagName?.toLowerCase() !== 'svg'
    ) {
      return;
    }
    if (connecting) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }
    setPointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
    setPanState({
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    });
  };

  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (connecting) {
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      const x = (event.clientX - viewport.left - view.x) / view.scale;
      const y = (event.clientY - viewport.top - view.y) / view.scale;
      setConnectingPos({ x, y });
      return;
    }
    if (!panState) return;
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const nextX = panState.originX + (event.clientX - panState.startX);
    const nextY = panState.originY + (event.clientY - panState.startY);
    const clamped = clampTranslate(nextX, nextY, view.scale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: view.scale });
  };

  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (panState) {
      releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      setPanState(null);
    }
    if (connecting) {
      setConnecting(null);
      setConnectingPos(null);
    }
  };

  const handleSelectEdge = (edgeId: string | null): void => {
    selectEdge(edgeId);
    if (edgeId) {
      selectNode(null);
      setSelectedNodeId(null);
    }
  };

  const handleSelectNode = (nodeId: string): void => {
    if (nodeId === (selectedNodeIdCtx ?? selectedNodeId)) return;
    
    const proceed = (): void => {
      selectEdge(null);
      selectNode(nodeId);
      setSelectedNodeId(nodeId);
    };

    if (confirmNodeSwitch) {
      const result = confirmNodeSwitch(nodeId);
      if (result instanceof Promise) {
        void result.then((confirmed: boolean): void => {
          if (confirmed) proceed();
        });
      } else if (result) {
        proceed();
      }
    } else {
      proceed();
    }
  };

  const getCanvasCenterPosition = (): { x: number; y: number } => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return { x: VIEW_MARGIN, y: VIEW_MARGIN };
    const centerX = (viewport.width / 2 - view.x) / view.scale;
    const centerY = (viewport.height / 2 - view.y) / view.scale;
    const nextX = Math.min(
      Math.max(centerX - NODE_WIDTH / 2, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
    const nextY = Math.min(
      Math.max(centerY - NODE_MIN_HEIGHT / 2, 16),
      CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
    );
    return { x: nextX, y: nextY };
  };

  const connectingFromNode = useMemo(
    (): AiNode | null => (connecting ? nodes.find((node: AiNode): boolean => node.id === connecting.fromNodeId) ?? null : null),
    [connecting, nodes]
  );

  return {
    viewportRef,
    canvasRef,
    view,
    panState,
    dragState,
    connecting,
    connectingPos,
    lastDrop,
    selectedEdgeId,
    edgePaths,
    connectingFromNode,
    ensureNodeVisible,
    getCanvasCenterPosition,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleStartConnection,
    handleCompleteConnection,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleReconnectInput,
    handleRemoveEdge,
    handleDisconnectPort,
    handleDeleteSelectedNode,
    handleSelectEdge,
    handleSelectNode,
    zoomTo,
    fitToNodes,
    resetView,
    ConfirmationModal,
  };
}
