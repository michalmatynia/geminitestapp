'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import type { AiNode, Edge, NodeDefinition, RuntimeState } from '@/features/ai/ai-paths/lib';
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
  validateConnection,
} from '@/features/ai/ai-paths/lib';
import { useToast } from '@/shared/ui';
import { DRAG_KEYS, getFirstDragValue, setDragData } from '@/shared/utils/drag-drop';

import { useCanvasState, useCanvasActions, useCanvasRefs } from './useCanvas';
import { useEdgePaths } from './useEdgePaths';
import { useGraphState, useGraphActions } from './useGraph';
import { useRuntimeActions } from './useRuntime';
import { useSelectionState, useSelectionActions } from './useSelection';

/**
 * Hook that manages all canvas-related interactions (pan, drag, connect, drop)
 * using AI-Paths contexts.
 *
 * This hook replaces the prop-drilling of handlers by providing them directly
 * from the context-aware logic.
 */
export function useCanvasInteractions() {
  const { toast } = useToast();

  // Context: Canvas
  const { view, panState, dragState, connecting, connectingPos, lastDrop } = useCanvasState();
  const {
    updateView,
    startPan,
    endPan,
    startDrag,
    endDrag,
    startConnection,
    endConnection,
    setConnectingPos,
    setLastDrop
  } = useCanvasActions();
  const { viewportRef, canvasRef } = useCanvasRefs();

  // Context: Graph
  const { nodes, edges, isPathLocked } = useGraphState();
  const { setNodes, setEdges, updateNode, removeNode, removeEdge } = useGraphActions();

  // Context: Selection
  const { selectedNodeId, selectedEdgeId } = useSelectionState();
  const { selectNode, selectEdge } = useSelectionActions();

  // Context: Runtime
  const { setRuntimeState } = useRuntimeActions();

  // Derived: Edge paths
  const edgePaths = useEdgePaths();

  // Refs for throttling and timers
  const pendingDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lockedToastAtRef = useRef<number>(0);

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  const pruneRuntimeInputsInternal = useCallback(
    (state: RuntimeState, removedEdges: Edge[], remainingEdges: Edge[]): RuntimeState => {
      if (removedEdges.length === 0) return state;
      const remainingTargets = new Set<string>();
      remainingEdges.forEach((edge: Edge) => {
        if (!edge.toPort) return;
        remainingTargets.add(`${edge.to}:${edge.toPort}`);
      });

      const existingInputs = state.inputs ?? {};
      let nextInputs: Record<string, Record<string, unknown>> = existingInputs;
      let changed = false;

      removedEdges.forEach((edge: Edge) => {
        if (!edge.toPort) return;
        const targetKey = `${edge.to}:${edge.toPort}`;
        if (remainingTargets.has(targetKey)) return;
        const nodeInputs = (nextInputs?.[edge.to] ?? {});
        if (!(edge.toPort in nodeInputs)) return;
        if (!changed) {
          nextInputs = { ...existingInputs };
          changed = true;
        }
        const nextNodeInputs = { ...nodeInputs };
        delete nextNodeInputs[edge.toPort];
        if (Object.keys(nextNodeInputs).length === 0) {
          const { [edge.to]: _, ...restInputs } = nextInputs;
          nextInputs = restInputs;
        } else {
          nextInputs[edge.to] = nextNodeInputs;
        }
      });

      if (!changed) return state;
      return { ...state, inputs: nextInputs };
    },
    []
  );

  const notifyLocked = useCallback((): void => {
    const now = Date.now();
    if (now - lockedToastAtRef.current < 800) return;
    lockedToastAtRef.current = now;
    toast('This path is locked. Unlock it to edit nodes or connections.', {
      variant: 'info',
    });
  }, [toast]);

  const setViewClamped = useCallback((next: { x: number; y: number; scale: number }): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const clampedScale = clampScale(next.scale);
    const clamped = clampTranslate(next.x, next.y, clampedScale, viewport);
    updateView({ x: clamped.x, y: clamped.y, scale: clampedScale });
  }, [viewportRef, updateView]);

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

  const isTypingTarget = (target: EventTarget | null): boolean => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    const tag = element.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return Boolean(element.closest('input, textarea, select, [contenteditable="true"]'));
  };

  // ---------------------------------------------------------------------------
  // View Actions
  // ---------------------------------------------------------------------------

  const zoomTo = useCallback((targetScale: number): void => {
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
    updateView({ x: clamped.x, y: clamped.y, scale: nextScale });
  }, [view, viewportRef, setViewClamped, updateView]);

  const fitToNodes = useCallback((): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport || nodes.length === 0) {
      setViewClamped({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
      return;
    }
    const padding = 120;
    const bounds = nodes.reduce(
      (acc, node) => {
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
    updateView({ x: clamped.x, y: clamped.y, scale: nextScale });
  }, [nodes, viewportRef, setViewClamped, updateView]);

  const resetView = useCallback((): void => {
    setViewClamped({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
  }, [setViewClamped]);

  const ensureNodeVisible = useCallback((node: AiNode): void => {
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
    updateView({ x: clamped.x, y: clamped.y, scale: view.scale });
  }, [view, viewportRef, updateView]);

  // ---------------------------------------------------------------------------
  // Interaction Handlers
  // ---------------------------------------------------------------------------

  const handlePointerDownNode = useCallback((
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    const canvasX = (event.clientX - viewport.left - view.x) / view.scale;
    const canvasY = (event.clientY - viewport.top - view.y) / view.scale;
    
    startDrag(nodeId, canvasX - node.position.x, canvasY - node.position.y);
  }, [isPathLocked, nodes, view, viewportRef, startDrag, notifyLocked]);

  const handlePointerMoveNode = useCallback((
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

    // RAF throttling
    pendingDragRef.current = { nodeId, x: nextX, y: nextY };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (pendingDragRef.current) {
          const { nodeId: id, x, y } = pendingDragRef.current;
          updateNode(id, { position: { x, y } });
        }
        rafIdRef.current = null;
      });
    }
  }, [dragState, view, viewportRef, updateNode]);

  const handlePointerUpNode = useCallback((
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
    if (dragState?.nodeId !== nodeId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);

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

    endDrag();
  }, [dragState, endDrag, updateNode]);

  const handlePanStart = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
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
      endConnection();
      return;
    }
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    startPan(event.clientX, event.clientY);
  }, [canvasRef, connecting, startPan, endConnection]);

  const handlePanMove = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
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
    updateView({ x: clamped.x, y: clamped.y });
  }, [connecting, panState, view, viewportRef, setConnectingPos, updateView]);

  const handlePanEnd = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    if (panState) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      endPan();
    }
    if (connecting) {
      endConnection();
    }
  }, [panState, connecting, endPan, endConnection]);

  // ---------------------------------------------------------------------------
  // Edge Handlers
  // ---------------------------------------------------------------------------

  const handleRemoveEdge = useCallback((edgeId: string): void => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const target = edges.find((edge) => edge.id === edgeId) ?? null;
    if (!target) return;

    removeEdge(edgeId);
    
    // Cleanup runtime inputs for removed edge
    const remaining = edges.filter((e) => e.id !== edgeId);
    setRuntimeState((prev: RuntimeState) => pruneRuntimeInputsInternal(prev, [target], remaining));

    if (selectedEdgeId === edgeId) {
      selectEdge(null);
    }
  }, [edges, isPathLocked, notifyLocked, removeEdge, setRuntimeState, pruneRuntimeInputsInternal, selectedEdgeId, selectEdge]);

  const handleDisconnectPort = useCallback((direction: 'input' | 'output', nodeId: string, port: string): void => {
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

    setEdges(remaining);
    setRuntimeState((prev: RuntimeState) => pruneRuntimeInputsInternal(prev, removed, remaining));

    if (selectedEdgeId) {
      const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
      if (selectedEdge && shouldRemove(selectedEdge)) {
        selectEdge(null);
      }
    }
  }, [edges, isPathLocked, notifyLocked, setEdges, setRuntimeState, pruneRuntimeInputsInternal, selectedEdgeId, selectEdge]);

  const handleStartConnection = useCallback((
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
    startConnection(node.id, port, start);
  }, [isPathLocked, getPortPosition, startConnection, notifyLocked]);

  const handleCompleteConnection = useCallback((
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

    setEdges((prev) => [...prev, newEdge]);
    toast('Connection created.', { variant: 'success' });
    endConnection();
  }, [connecting, nodes, isPathLocked, endConnection, setEdges, toast, notifyLocked]);

  const handleReconnectInput = useCallback((
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string,
    port: string
  ): void => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    if (connecting) return;
    
    const edgeToMove = edges.find((e) => e.to === nodeId && e.toPort === port);
    if (!edgeToMove?.from || !edgeToMove.fromPort) return;
    
    const fromNode = nodes.find((n) => n.id === edgeToMove.from);
    if (!fromNode) return;

    const start = getPortPosition(fromNode, edgeToMove.fromPort, 'output');
    const viewport = viewportRef.current?.getBoundingClientRect();
    const nextPos = viewport
      ? {
        x: (event.clientX - viewport.left - view.x) / view.scale,
        y: (event.clientY - viewport.top - view.y) / view.scale,
      }
      : start;

    const remaining = edges.filter((e) => e.id !== edgeToMove.id);
    setEdges(remaining);
    setRuntimeState((prev: RuntimeState) => pruneRuntimeInputsInternal(prev, [edgeToMove], remaining));

    if (selectedEdgeId === edgeToMove.id) {
      selectEdge(null);
    }

    startConnection(edgeToMove.from, edgeToMove.fromPort, start);
    setConnectingPos(nextPos);
  }, [
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
    notifyLocked
  ]);

  // ---------------------------------------------------------------------------
  // Node Handlers
  // ---------------------------------------------------------------------------

  const handleDeleteSelectedNode = useCallback((): void => {
    if (!selectedNodeId) return;
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const targetNode = nodes.find((n) => n.id === selectedNodeId);
    const label = targetNode?.title || 'this node';
    const confirmed = window.confirm(`Remove ${label}? This will delete connected wires.`);
    if (!confirmed) return;

    removeNode(selectedNodeId);
    
    const removedEdges = edges.filter(
      (e) => e.from === selectedNodeId || e.to === selectedNodeId
    );
    const remainingEdges = edges.filter(
      (e) => e.from !== selectedNodeId && e.to !== selectedNodeId
    );
    
    setEdges(remainingEdges);
    setRuntimeState((prev: RuntimeState) => pruneRuntimeInputsInternal(prev, removedEdges, remainingEdges));
    
    selectNode(null);
  }, [selectedNodeId, isPathLocked, nodes, edges, removeNode, setEdges, setRuntimeState, pruneRuntimeInputsInternal, selectNode, notifyLocked]);

  const handleSelectNode = useCallback((nodeId: string): void => {
    if (nodeId === selectedNodeId) return;
    selectEdge(null);
    selectNode(nodeId);
  }, [selectedNodeId, selectNode, selectEdge]);

  // ---------------------------------------------------------------------------
  // Drag & Drop Handlers
  // ---------------------------------------------------------------------------

  const handleDragStart = useCallback((
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
  }, [isPathLocked, notifyLocked]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
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
    
    const nextX = Math.min(Math.max(localX - NODE_WIDTH / 2, 16), CANVAS_WIDTH - NODE_WIDTH - 16);
    const nextY = Math.min(Math.max(localY - NODE_MIN_HEIGHT / 2, 16), CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16);
    
    const defaultConfig = getDefaultConfigForType(payload.type, payload.outputs, payload.inputs);
    const mergedConfig = payload.config ? { ...defaultConfig, ...payload.config } : defaultConfig;
    
    const newNodeId = `node-${Math.random().toString(36).slice(2, 10)}`;
    const newNode: AiNode = {
      ...payload,
      id: newNodeId,
      position: { x: nextX, y: nextY },
      ...(mergedConfig ? { config: mergedConfig } : {}),
    };

    setNodes((prev) => [...prev, newNode]);
    selectNode(newNodeId);
    setLastDrop({ x: nextX, y: nextY });
    ensureNodeVisible(newNode);
    toast(`Node added: ${payload.title}`, { variant: 'success' });
  }, [isPathLocked, viewportRef, canvasRef, view, setNodes, selectNode, setLastDrop, ensureNodeVisible, toast, notifyLocked]);

  // ---------------------------------------------------------------------------
  // Lifecycle Effects
  // ---------------------------------------------------------------------------

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        endConnection();
        selectEdge(null);
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (isTypingTarget(event.target)) return;
        if (selectedEdgeId) {
          event.preventDefault();
          handleRemoveEdge(selectedEdgeId);
        } else if (selectedNodeId) {
          event.preventDefault();
          handleDeleteSelectedNode();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId, selectedNodeId, handleRemoveEdge, handleDeleteSelectedNode, endConnection, selectEdge]);

  // Global pointer listeners for clearing state
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-port]')) return;
      if (target?.closest('path')) return;
      if (target?.closest('[data-edge-panel]')) return;
      
      endConnection();
      selectEdge(null);
    };
    const handlePointerUp = () => {
      endConnection();
    };
    
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [endConnection, selectEdge]);

  // Cleanup RAF
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return {
    // Refs
    viewportRef,
    canvasRef,
    // State
    view,
    panState,
    dragState,
    connecting,
    connectingPos,
    lastDrop,
    edgePaths,
    // Handlers
    handlePointerDownNode,
    handlePointerMoveNode,
    handlePointerUpNode,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleRemoveEdge,
    handleDisconnectPort,
    handleStartConnection,
    handleCompleteConnection,
    handleReconnectInput,
    handleDeleteSelectedNode,
    handleSelectNode,
    handleDragStart,
    handleDragOver,
    handleDrop,
    // Actions
    zoomTo,
    fitToNodes,
    resetView,
    ensureNodeVisible,
    pruneRuntimeInputs: pruneRuntimeInputsInternal,
  };
}
