'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  sanitizeEdges,
  validateConnection,
} from '@/features/ai/ai-paths/lib';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui';
import { DRAG_KEYS, getFirstDragValue, setDragData } from '@/shared/utils/drag-drop';

import { useCanvasState, useCanvasActions, useCanvasRefs } from './useCanvas';
import { useEdgePaths } from './useEdgePaths';
import { useGraphState, useGraphActions } from './useGraph';
import { useRuntimeActions } from './useRuntime';
import { useSelectionState, useSelectionActions } from './useSelection';

import type { EdgeRoutingMode } from './useEdgePaths';

type MarqueeMode = 'replace' | 'add' | 'subtract';

type MarqueeSelectionState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  mode: MarqueeMode;
  baseNodeIds: string[];
};

type SubgraphClipboardPayload = {
  version: 1;
  sourcePathId: string | null;
  capturedAt: string;
  nodes: AiNode[];
  edges: Edge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

type HandleSelectNodeOptions = {
  toggle?: boolean;
};

type TouchPointSample = {
  x: number;
  y: number;
  time: number;
};

type TouchGestureState =
  | {
    mode: 'pinch';
    pointerIds: [number, number];
    startDistance: number;
    startScale: number;
    anchorCanvas: { x: number; y: number };
  }
  | {
    mode: 'pan';
    pointerId: number;
    recentSamples: TouchPointSample[];
  };

type TouchLongPressSelectionState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startedAt: number;
  indicatorViewportX: number;
  indicatorViewportY: number;
  mode: MarqueeMode;
  baseNodeIds: string[];
  timerId: number | null;
};

type TouchLongPressIndicatorState = {
  x: number;
  y: number;
  progress: number;
  phase: 'pending' | 'activated';
};

const SUBGRAPH_CLIPBOARD_VERSION = 1 as const;
const SUBGRAPH_CLIPBOARD_STORAGE_KEY = 'ai-paths:canvas-subgraph-clipboard:v1';
const PASTE_OFFSET_STEP = 28;
const ZOOM_ANIMATION_DURATION_MS = 160;
const WHEEL_ZOOM_SENSITIVITY = 0.0016;
const WHEEL_ZOOM_EASING = 0.26;
const WHEEL_ZOOM_STOP_THRESHOLD = 0.0009;
const TOUCH_PINCH_MIN_DISTANCE = 8;
const TOUCH_PAN_INERTIA_SAMPLE_WINDOW_MS = 140;
const TOUCH_PAN_INERTIA_MIN_SPEED = 0.045;
const TOUCH_PAN_INERTIA_STOP_SPEED = 0.015;
const TOUCH_PAN_INERTIA_FRICTION_PER_FRAME = 0.9;
const TOUCH_LONG_PRESS_SELECTION_DELAY_MS = 280;
const TOUCH_LONG_PRESS_SELECTION_MOVE_TOLERANCE_PX = 10;
const TOUCH_LONG_PRESS_ACTIVATED_VISIBLE_MS = 200;
const TOUCH_LONG_PRESS_HAPTIC_MS = 12;

let inMemorySubgraphClipboard: SubgraphClipboardPayload | null = null;
let pasteSequence = 0;

const cloneValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const parseSubgraphClipboardPayload = (
  value: unknown
): SubgraphClipboardPayload | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record['version'] !== SUBGRAPH_CLIPBOARD_VERSION) return null;
  const nodes = record['nodes'];
  const edges = record['edges'];
  if (!Array.isArray(nodes) || !Array.isArray(edges)) return null;
  const bounds = record['bounds'];
  if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)) return null;
  const boundsRecord = bounds as Record<string, unknown>;
  const minX = Number(boundsRecord['minX']);
  const minY = Number(boundsRecord['minY']);
  const maxX = Number(boundsRecord['maxX']);
  const maxY = Number(boundsRecord['maxY']);
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  return {
    version: SUBGRAPH_CLIPBOARD_VERSION,
    sourcePathId:
      typeof record['sourcePathId'] === 'string' ? record['sourcePathId'] : null,
    capturedAt:
      typeof record['capturedAt'] === 'string'
        ? record['capturedAt']
        : new Date().toISOString(),
    nodes: cloneValue(nodes as AiNode[]),
    edges: cloneValue(edges as Edge[]),
    bounds: { minX, minY, maxX, maxY },
  };
};

const getMarqueeRect = (state: MarqueeSelectionState): {
  left: number;
  top: number;
  width: number;
  height: number;
} => ({
  left: Math.min(state.startX, state.currentX),
  top: Math.min(state.startY, state.currentY),
  width: Math.abs(state.currentX - state.startX),
  height: Math.abs(state.currentY - state.startY),
});

/**
 * Hook that manages all canvas-related interactions (pan, drag, connect, drop)
 * using AI-Paths contexts.
 *
 * This hook replaces the prop-drilling of handlers by providing them directly
 * from the context-aware logic.
 */
export function useCanvasInteractions(args?: {
  confirmNodeSwitch?: ((nodeId: string) => boolean | Promise<boolean>) | undefined;
  edgeRoutingMode?: EdgeRoutingMode | undefined;
}) {
  const {
    confirmNodeSwitch,
    edgeRoutingMode = 'bezier',
  } = args ?? {};
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();

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
  const { nodes, edges, isPathLocked, activePathId } = useGraphState();
  const { setNodes, setEdges, updateNode, removeNode, removeEdge } = useGraphActions();

  // Context: Selection
  const {
    selectedNodeId,
    selectedNodeIds,
    selectedEdgeId,
    selectionToolMode,
    selectionScopeMode,
  } = useSelectionState();
  const {
    selectNode,
    setNodeSelection,
    selectEdge,
    toggleNodeSelection,
  } = useSelectionActions();

  // Context: Runtime
  const { setRuntimeState } = useRuntimeActions();

  // Derived: Edge paths
  const edgePaths = useEdgePaths(edgeRoutingMode);
  const selectedNodeIdSet = useMemo(
    (): Set<string> => new Set(selectedNodeIds),
    [selectedNodeIds]
  );

  // Refs for throttling and timers
  const pendingDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const dragSelectionRef = useRef<{
    basePositions: Map<string, { x: number; y: number }>;
    anchorCanvasX: number;
    anchorCanvasY: number;
  } | null>(null);
  const lastPointerCanvasPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const viewAnimationRafRef = useRef<number | null>(null);
  const wheelZoomRafRef = useRef<number | null>(null);
  const wheelZoomTargetRef = useRef<{
    scale: number;
    anchorClientPos: { x: number; y: number } | null;
  } | null>(null);
  const activeTouchPointersRef = useRef<Map<number, TouchPointSample>>(new Map());
  const touchGestureRef = useRef<TouchGestureState | null>(null);
  const touchLongPressSelectionRef = useRef<TouchLongPressSelectionState | null>(
    null
  );
  const touchLongPressIndicatorRafRef = useRef<number | null>(null);
  const touchLongPressIndicatorHideTimerRef = useRef<number | null>(null);
  const panInertiaRafRef = useRef<number | null>(null);
  const panInertiaVelocityRef = useRef<{
    vx: number;
    vy: number;
    lastTs: number;
  } | null>(null);
  const latestViewRef = useRef(view);
  const lockedToastAtRef = useRef<number>(0);
  const hasCanvasKeyboardFocusRef = useRef(false);
  const [marqueeSelection, setMarqueeSelection] =
    useState<MarqueeSelectionState | null>(null);
  const [touchLongPressIndicator, setTouchLongPressIndicator] =
    useState<TouchLongPressIndicatorState | null>(null);

  useEffect(() => {
    latestViewRef.current = view;
  }, [view]);

  const getPointerCaptureTarget = (
    event: React.PointerEvent<Element>
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

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  const pruneRuntimeInputsInternal = useCallback(
    (state: RuntimeState, removedEdges: Edge[], remainingEdges: Edge[]): RuntimeState => {
      if (removedEdges.length === 0) return state;
      const remainingTargets = new Set<string>();
      remainingEdges.forEach((edge: Edge) => {
        if (!edge.to || !edge.toPort) return;
        remainingTargets.add(`${edge.to}:${edge.toPort}`);
      });

      const existingInputs = state.inputs ?? {};
      let nextInputs: Record<string, Record<string, unknown>> = existingInputs;
      let changed = false;

      removedEdges.forEach((edge: Edge) => {
        if (!edge.to || !edge.toPort) return;
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

  const stopProgrammaticViewAnimation = useCallback((): void => {
    if (viewAnimationRafRef.current !== null) {
      cancelAnimationFrame(viewAnimationRafRef.current);
      viewAnimationRafRef.current = null;
    }
  }, []);

  const stopPanInertia = useCallback((): void => {
    if (panInertiaRafRef.current !== null) {
      cancelAnimationFrame(panInertiaRafRef.current);
      panInertiaRafRef.current = null;
    }
    panInertiaVelocityRef.current = null;
  }, []);

  const resolveViewportPointFromClient = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return null;
      return {
        x: clientX - viewport.left,
        y: clientY - viewport.top,
      };
    },
    [viewportRef]
  );

  const clearTouchLongPressIndicator = useCallback((): void => {
    if (touchLongPressIndicatorRafRef.current !== null) {
      cancelAnimationFrame(touchLongPressIndicatorRafRef.current);
      touchLongPressIndicatorRafRef.current = null;
    }
    if (touchLongPressIndicatorHideTimerRef.current !== null) {
      window.clearTimeout(touchLongPressIndicatorHideTimerRef.current);
      touchLongPressIndicatorHideTimerRef.current = null;
    }
    setTouchLongPressIndicator(null);
  }, []);

  const startTouchLongPressIndicatorLoop = useCallback((): void => {
    if (touchLongPressIndicatorRafRef.current !== null) return;
    const tick = (now: number): void => {
      touchLongPressIndicatorRafRef.current = null;
      const pending = touchLongPressSelectionRef.current;
      if (pending?.timerId == null) return;
      const progress = Math.max(
        0,
        Math.min(1, (now - pending.startedAt) / TOUCH_LONG_PRESS_SELECTION_DELAY_MS)
      );
      setTouchLongPressIndicator({
        x: pending.indicatorViewportX,
        y: pending.indicatorViewportY,
        progress,
        phase: 'pending',
      });
      touchLongPressIndicatorRafRef.current = requestAnimationFrame(tick);
    };
    touchLongPressIndicatorRafRef.current = requestAnimationFrame(tick);
  }, []);

  const triggerTouchLongPressActivatedFeedback = useCallback(
    (x: number, y: number): void => {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.vibrate === 'function'
      ) {
        navigator.vibrate(TOUCH_LONG_PRESS_HAPTIC_MS);
      }
      if (touchLongPressIndicatorRafRef.current !== null) {
        cancelAnimationFrame(touchLongPressIndicatorRafRef.current);
        touchLongPressIndicatorRafRef.current = null;
      }
      setTouchLongPressIndicator({
        x,
        y,
        progress: 1,
        phase: 'activated',
      });
      if (touchLongPressIndicatorHideTimerRef.current !== null) {
        window.clearTimeout(touchLongPressIndicatorHideTimerRef.current);
      }
      touchLongPressIndicatorHideTimerRef.current = window.setTimeout(() => {
        touchLongPressIndicatorHideTimerRef.current = null;
        setTouchLongPressIndicator(null);
      }, TOUCH_LONG_PRESS_ACTIVATED_VISIBLE_MS);
    },
    []
  );

  const cancelTouchLongPressSelection = useCallback((): void => {
    const pending = touchLongPressSelectionRef.current;
    if (pending?.timerId != null) {
      window.clearTimeout(pending.timerId);
    }
    touchLongPressSelectionRef.current = null;
    clearTouchLongPressIndicator();
  }, [clearTouchLongPressIndicator]);

  const stopViewAnimation = useCallback((): void => {
    stopProgrammaticViewAnimation();
    if (wheelZoomRafRef.current !== null) {
      cancelAnimationFrame(wheelZoomRafRef.current);
      wheelZoomRafRef.current = null;
    }
    wheelZoomTargetRef.current = null;
    cancelTouchLongPressSelection();
    stopPanInertia();
  }, [cancelTouchLongPressSelection, stopPanInertia, stopProgrammaticViewAnimation]);

  const setViewClamped = useCallback((next: { x: number; y: number; scale: number }): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const clampedScale = clampScale(next.scale);
    const clamped = clampTranslate(next.x, next.y, clampedScale, viewport);
    const resolved = { x: clamped.x, y: clamped.y, scale: clampedScale };
    latestViewRef.current = resolved;
    updateView(resolved);
  }, [viewportRef, updateView]);

  const updateLastPointerCanvasPosFromClient = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return null;
      const currentView = latestViewRef.current;
      const next = {
        x: (clientX - viewport.left - currentView.x) / currentView.scale,
        y: (clientY - viewport.top - currentView.y) / currentView.scale,
      };
      lastPointerCanvasPosRef.current = next;
      return next;
    },
    [viewportRef]
  );

  const startPanInertia = useCallback((vx: number, vy: number): void => {
    stopPanInertia();
    const now = performance.now();
    panInertiaVelocityRef.current = { vx, vy, lastTs: now };
    const tick = (ts: number): void => {
      const inertia = panInertiaVelocityRef.current;
      if (!inertia) {
        panInertiaRafRef.current = null;
        return;
      }
      const dtMs = Math.max(1, ts - inertia.lastTs);
      inertia.lastTs = ts;
      const currentView = latestViewRef.current;
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      const nextX = currentView.x + inertia.vx * dtMs;
      const nextY = currentView.y + inertia.vy * dtMs;
      const clamped = clampTranslate(nextX, nextY, currentView.scale, viewport);
      setViewClamped({
        x: clamped.x,
        y: clamped.y,
        scale: currentView.scale,
      });
      const friction = Math.pow(TOUCH_PAN_INERTIA_FRICTION_PER_FRAME, dtMs / 16.67);
      inertia.vx *= friction;
      inertia.vy *= friction;
      const speed = Math.hypot(inertia.vx, inertia.vy);
      const stalled =
        Math.abs(clamped.x - nextX) < 0.001 &&
        Math.abs(clamped.y - nextY) < 0.001;
      if (speed < TOUCH_PAN_INERTIA_STOP_SPEED || stalled) {
        stopPanInertia();
        return;
      }
      panInertiaRafRef.current = requestAnimationFrame(tick);
    };
    panInertiaRafRef.current = requestAnimationFrame(tick);
  }, [setViewClamped, stopPanInertia, viewportRef]);

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

  const isWithinCanvasScope = useCallback((target: EventTarget | null): boolean => {
    if (!(target instanceof Node)) return false;
    const viewportElement = viewportRef.current;
    const canvasElement = canvasRef.current;
    if (viewportElement?.contains(target)) return true;
    if (canvasElement?.contains(target)) return true;
    return false;
  }, [canvasRef, viewportRef]);

  const isPageRootTarget = useCallback((target: EventTarget | null): boolean => {
    return (
      target === window ||
      target === document ||
      target === document.body ||
      target === document.documentElement
    );
  }, []);

  const resolveActiveNodeSelectionIds = useCallback((): string[] => {
    if (selectedNodeIds.length > 0) {
      return selectedNodeIds.filter((id: string): boolean => id.trim().length > 0);
    }
    if (selectedNodeId) return [selectedNodeId];
    return [];
  }, [selectedNodeId, selectedNodeIds]);

  const buildClipboardPayloadFromSelection =
    useCallback((): SubgraphClipboardPayload | null => {
      const selectedIds = resolveActiveNodeSelectionIds();
      if (selectedIds.length === 0) return null;
      const selectedIdSet = new Set(selectedIds);
      const copiedNodes = nodes.filter((node: AiNode): boolean => selectedIdSet.has(node.id));
      if (copiedNodes.length === 0) return null;
      const copiedEdges = edges.filter(
        (edge: Edge): boolean =>
          Boolean(
            edge.from &&
            edge.to &&
            selectedIdSet.has(edge.from) &&
            selectedIdSet.has(edge.to)
          )
      );
      const bounds = copiedNodes.reduce(
        (
          acc: { minX: number; minY: number; maxX: number; maxY: number },
          node: AiNode
        ) => ({
          minX: Math.min(acc.minX, node.position.x),
          minY: Math.min(acc.minY, node.position.y),
          maxX: Math.max(acc.maxX, node.position.x + NODE_WIDTH),
          maxY: Math.max(acc.maxY, node.position.y + NODE_MIN_HEIGHT),
        }),
        {
          minX: Number.POSITIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY,
        }
      );
      return {
        version: SUBGRAPH_CLIPBOARD_VERSION,
        sourcePathId: activePathId,
        capturedAt: new Date().toISOString(),
        nodes: cloneValue(copiedNodes),
        edges: cloneValue(copiedEdges),
        bounds,
      };
    }, [activePathId, edges, nodes, resolveActiveNodeSelectionIds]);

  const writeClipboardPayload = useCallback(
    async (payload: SubgraphClipboardPayload): Promise<void> => {
      inMemorySubgraphClipboard = payload;
      try {
        window.localStorage.setItem(
          SUBGRAPH_CLIPBOARD_STORAGE_KEY,
          JSON.stringify(payload)
        );
      } catch {
        // Ignore localStorage write failures.
      }
      const serialized = JSON.stringify(payload);
      try {
        if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === 'function'
        ) {
          await navigator.clipboard.writeText(serialized);
        }
      } catch {
        // Clipboard API can be blocked in some contexts; in-memory clipboard still works.
      }
    },
    []
  );

  const removeNodesAndConnectedEdges = useCallback(
    (nodeIds: string[]): { removedNodeCount: number; removedEdgeCount: number } => {
      const resolvedNodeIds = Array.from(
        new Set(
          nodeIds
            .map((nodeId: string) => nodeId.trim())
            .filter((nodeId: string): boolean => nodeId.length > 0)
        )
      );
      if (resolvedNodeIds.length === 0) {
        return { removedNodeCount: 0, removedEdgeCount: 0 };
      }
      const nodeIdSet = new Set(resolvedNodeIds);
      const removedEdges = edges.filter(
        (edge: Edge): boolean =>
          Boolean(
            (edge.from && nodeIdSet.has(edge.from)) ||
            (edge.to && nodeIdSet.has(edge.to))
          )
      );
      const remainingEdges = edges.filter(
        (edge: Edge): boolean =>
          !(
            (edge.from && nodeIdSet.has(edge.from)) ||
            (edge.to && nodeIdSet.has(edge.to))
          )
      );
      setNodes((prev: AiNode[]): AiNode[] =>
        prev.filter((node: AiNode): boolean => !nodeIdSet.has(node.id))
      );
      setEdges(remainingEdges);
      setRuntimeState((prev: RuntimeState): RuntimeState =>
        pruneRuntimeInputsInternal(prev, removedEdges, remainingEdges)
      );
      const nextSelection = resolveActiveNodeSelectionIds().filter(
        (nodeId: string): boolean => !nodeIdSet.has(nodeId)
      );
      setNodeSelection(nextSelection);
      selectEdge(null);
      return {
        removedNodeCount: resolvedNodeIds.length,
        removedEdgeCount: removedEdges.length,
      };
    },
    [
      edges,
      pruneRuntimeInputsInternal,
      resolveActiveNodeSelectionIds,
      selectEdge,
      setEdges,
      setNodeSelection,
      setNodes,
      setRuntimeState,
    ]
  );

  const pasteClipboardPayload = useCallback(
    (
      payload: SubgraphClipboardPayload
    ): { pastedNodeCount: number; pastedEdgeCount: number } => {
      if (payload.nodes.length === 0) {
        return { pastedNodeCount: 0, pastedEdgeCount: 0 };
      }
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      const viewportCenterX = viewport ? viewport.width / 2 : 0;
      const viewportCenterY = viewport ? viewport.height / 2 : 0;
      const cursorAnchor = lastPointerCanvasPosRef.current;
      const targetCanvasCenterX = cursorAnchor
        ? cursorAnchor.x
        : (viewportCenterX - view.x) / view.scale;
      const targetCanvasCenterY = cursorAnchor
        ? cursorAnchor.y
        : (viewportCenterY - view.y) / view.scale;
      const boundsWidth = Math.max(1, payload.bounds.maxX - payload.bounds.minX);
      const boundsHeight = Math.max(1, payload.bounds.maxY - payload.bounds.minY);
      const pasteOffset = pasteSequence * PASTE_OFFSET_STEP;
      pasteSequence += 1;

      const existingNodeIdSet = new Set(nodes.map((node: AiNode): string => node.id));
      const existingEdgeIdSet = new Set(edges.map((edge: Edge): string => edge.id));
      const oldToNewNodeId = new Map<string, string>();

      const generateNodeId = (): string => {
        let candidate: string;
        do {
          candidate = `node-${Math.random().toString(36).slice(2, 10)}`;
        } while (existingNodeIdSet.has(candidate));
        return candidate;
      };

      const generateEdgeId = (): string => {
        let candidate: string;
        do {
          candidate = `edge-${Math.random().toString(36).slice(2, 10)}`;
        } while (existingEdgeIdSet.has(candidate));
        existingEdgeIdSet.add(candidate);
        return candidate;
      };

      const offsetX = targetCanvasCenterX - boundsWidth / 2 + pasteOffset;
      const offsetY = targetCanvasCenterY - boundsHeight / 2 + pasteOffset;

      const pastedNodes = payload.nodes.map((node: AiNode): AiNode => {
        const newNodeId = generateNodeId();
        oldToNewNodeId.set(node.id, newNodeId);
        existingNodeIdSet.add(newNodeId);
        const relativeX = node.position.x - payload.bounds.minX;
        const relativeY = node.position.y - payload.bounds.minY;
        const nextX = Math.min(
          Math.max(offsetX + relativeX, 16),
          CANVAS_WIDTH - NODE_WIDTH - 16
        );
        const nextY = Math.min(
          Math.max(offsetY + relativeY, 16),
          CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
        );
        return {
          ...cloneValue(node),
          id: newNodeId,
          position: { x: nextX, y: nextY },
        };
      });

      const pastedEdges = payload.edges.reduce((acc: Edge[], edge: Edge) => {
        const fromId = edge.from;
        const toId = edge.to;
        if (!fromId || !toId) return acc;
        const from = oldToNewNodeId.get(fromId);
        const to = oldToNewNodeId.get(toId);
        if (!from || !to) return acc;
        acc.push({
          ...cloneValue(edge),
          id: generateEdgeId(),
          from,
          to,
        });
        return acc;
      }, []);

      const nextNodes = [...nodes, ...pastedNodes];
      const nextEdges = sanitizeEdges(nextNodes, [...edges, ...pastedEdges]);
      setNodes(nextNodes);
      setEdges(nextEdges);
      setNodeSelection(pastedNodes.map((node: AiNode): string => node.id));
      selectEdge(null);
      return {
        pastedNodeCount: pastedNodes.length,
        pastedEdgeCount: pastedEdges.length,
      };
    },
    [
      edges,
      nodes,
      selectEdge,
      setEdges,
      setNodeSelection,
      setNodes,
      view.scale,
      view.x,
      view.y,
      viewportRef,
    ]
  );

  const handleCopySelection = useCallback(async (): Promise<void> => {
    const payload = buildClipboardPayloadFromSelection();
    if (!payload) {
      toast('Select at least one node to copy.', { variant: 'info' });
      return;
    }
    await writeClipboardPayload(payload);
    toast(
      `Copied ${payload.nodes.length} node${payload.nodes.length === 1 ? '' : 's'} and ${payload.edges.length} wire${payload.edges.length === 1 ? '' : 's'}.`,
      { variant: 'success' }
    );
  }, [buildClipboardPayloadFromSelection, toast, writeClipboardPayload]);

  const readClipboardPayload = useCallback(async (): Promise<SubgraphClipboardPayload | null> => {
    if (inMemorySubgraphClipboard) {
      return cloneValue(inMemorySubgraphClipboard);
    }
    try {
      const stored = window.localStorage.getItem(SUBGRAPH_CLIPBOARD_STORAGE_KEY);
      if (stored) {
        const parsed = parseSubgraphClipboardPayload(JSON.parse(stored) as unknown);
        if (parsed) {
          inMemorySubgraphClipboard = parsed;
          return cloneValue(parsed);
        }
      }
    } catch {
      // Ignore parse/storage errors and continue to system clipboard.
    }
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.readText === 'function'
      ) {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText.trim()) {
          const parsed = parseSubgraphClipboardPayload(
            JSON.parse(clipboardText) as unknown
          );
          if (parsed) {
            inMemorySubgraphClipboard = parsed;
            return cloneValue(parsed);
          }
        }
      }
    } catch {
      // Clipboard read may be unavailable due to browser permissions.
    }
    return null;
  }, []);

  const handlePasteSelection = useCallback(async (): Promise<void> => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const payload = await readClipboardPayload();
    if (!payload || payload.nodes.length === 0) {
      toast('Clipboard does not contain AI Path nodes.', { variant: 'info' });
      return;
    }
    const { pastedNodeCount, pastedEdgeCount } = pasteClipboardPayload(payload);
    toast(
      `Pasted ${pastedNodeCount} node${pastedNodeCount === 1 ? '' : 's'} and ${pastedEdgeCount} wire${pastedEdgeCount === 1 ? '' : 's'}.`,
      { variant: 'success' }
    );
  }, [
    isPathLocked,
    notifyLocked,
    pasteClipboardPayload,
    readClipboardPayload,
    toast,
  ]);

  const handleCutSelection = useCallback(async (): Promise<void> => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const payload = buildClipboardPayloadFromSelection();
    if (!payload) {
      toast('Select at least one node to cut.', { variant: 'info' });
      return;
    }
    await writeClipboardPayload(payload);
    const selectedIds = resolveActiveNodeSelectionIds();
    const { removedNodeCount, removedEdgeCount } =
      removeNodesAndConnectedEdges(selectedIds);
    toast(
      `Cut ${removedNodeCount} node${removedNodeCount === 1 ? '' : 's'} and ${removedEdgeCount} wire${removedEdgeCount === 1 ? '' : 's'}.`,
      { variant: 'success' }
    );
  }, [
    buildClipboardPayloadFromSelection,
    isPathLocked,
    notifyLocked,
    removeNodesAndConnectedEdges,
    resolveActiveNodeSelectionIds,
    toast,
    writeClipboardPayload,
  ]);

  const handleDuplicateSelection = useCallback((): void => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const payload = buildClipboardPayloadFromSelection();
    if (!payload) {
      toast('Select at least one node to duplicate.', { variant: 'info' });
      return;
    }
    const { pastedNodeCount, pastedEdgeCount } = pasteClipboardPayload(payload);
    toast(
      `Duplicated ${pastedNodeCount} node${pastedNodeCount === 1 ? '' : 's'} and ${pastedEdgeCount} wire${pastedEdgeCount === 1 ? '' : 's'}.`,
      { variant: 'success' }
    );
  }, [
    buildClipboardPayloadFromSelection,
    isPathLocked,
    notifyLocked,
    pasteClipboardPayload,
    toast,
  ]);

  const resolveNodesWithinMarquee = useCallback(
    (state: MarqueeSelectionState): string[] => {
      const rect = getMarqueeRect(state);
      if (rect.width < 2 && rect.height < 2) return [];
      const x1 = (rect.left - view.x) / view.scale;
      const y1 = (rect.top - view.y) / view.scale;
      const x2 = (rect.left + rect.width - view.x) / view.scale;
      const y2 = (rect.top + rect.height - view.y) / view.scale;
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const maxX = Math.max(x1, x2);
      const maxY = Math.max(y1, y2);
      return nodes
        .filter((node: AiNode): boolean => {
          const nodeLeft = node.position.x;
          const nodeTop = node.position.y;
          const nodeRight = node.position.x + NODE_WIDTH;
          const nodeBottom = node.position.y + NODE_MIN_HEIGHT;
          return !(
            nodeRight < minX ||
            nodeLeft > maxX ||
            nodeBottom < minY ||
            nodeTop > maxY
          );
        })
        .map((node: AiNode): string => node.id);
    },
    [nodes, view.scale, view.x, view.y]
  );

  const resolveNodeSelectionByScope = useCallback(
    (seedNodeIds: string[]): string[] => {
      if (selectionScopeMode !== 'wiring' || seedNodeIds.length === 0) {
        return seedNodeIds;
      }
      const seedSet = new Set(seedNodeIds);
      const adjacency = new Map<string, Set<string>>();
      edges.forEach((edge: Edge): void => {
        const from = edge.from?.trim();
        const to = edge.to?.trim();
        if (!from || !to) return;
        const fromNeighbors = adjacency.get(from) ?? new Set<string>();
        fromNeighbors.add(to);
        adjacency.set(from, fromNeighbors);
        const toNeighbors = adjacency.get(to) ?? new Set<string>();
        toNeighbors.add(from);
        adjacency.set(to, toNeighbors);
      });
      const queue = [...seedSet];
      const expanded = new Set(seedSet);
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        const neighbors = adjacency.get(current);
        if (!neighbors) continue;
        neighbors.forEach((neighbor: string): void => {
          if (expanded.has(neighbor)) return;
          expanded.add(neighbor);
          queue.push(neighbor);
        });
      }
      return nodes
        .filter((node: AiNode): boolean => expanded.has(node.id))
        .map((node: AiNode): string => node.id);
    },
    [edges, nodes, selectionScopeMode]
  );

  const applyMarqueeSelection = useCallback(
    (state: MarqueeSelectionState): void => {
      const marqueeNodeIds = resolveNodeSelectionByScope(
        resolveNodesWithinMarquee(state)
      );
      const marqueeSet = new Set(marqueeNodeIds);
      const baseSet = new Set(state.baseNodeIds);
      const resolvedIds =
        state.mode === 'replace'
          ? marqueeNodeIds
          : state.mode === 'add'
            ? Array.from(new Set([...state.baseNodeIds, ...marqueeNodeIds]))
            : state.baseNodeIds.filter((id: string): boolean => !marqueeSet.has(id));
      if (state.mode !== 'replace' && baseSet.size === 0 && marqueeSet.size === 0) {
        setNodeSelection([]);
        return;
      }
      setNodeSelection(resolvedIds);
    },
    [resolveNodeSelectionByScope, resolveNodesWithinMarquee, setNodeSelection]
  );

  const selectionMarqueeRect = useMemo((): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null => {
    if (!marqueeSelection) return null;
    const rect = getMarqueeRect(marqueeSelection);
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, [marqueeSelection]);

  const beginMarqueeSelectionFromClient = useCallback(
    (
      clientX: number,
      clientY: number,
      mode: MarqueeMode,
      baseNodeIds: string[]
    ): boolean => {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return false;
      const startX = clientX - viewport.left;
      const startY = clientY - viewport.top;
      if (mode === 'replace') {
        setNodeSelection([]);
      }
      selectEdge(null);
      setMarqueeSelection({
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        mode,
        baseNodeIds,
      });
      return true;
    },
    [selectEdge, setNodeSelection, viewportRef]
  );

  // ---------------------------------------------------------------------------
  // View Actions
  // ---------------------------------------------------------------------------

  const getZoomTargetView = useCallback(
    (
      targetScale: number,
      anchorClientPos?: { x: number; y: number } | null
    ): { x: number; y: number; scale: number } => {
      const currentView = latestViewRef.current;
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      const nextScale = clampScale(targetScale);
      if (!viewport) {
        return {
          x: currentView.x,
          y: currentView.y,
          scale: nextScale,
        };
      }
      const anchorViewportX = anchorClientPos
        ? anchorClientPos.x - viewport.left
        : viewport.width / 2;
      const anchorViewportY = anchorClientPos
        ? anchorClientPos.y - viewport.top
        : viewport.height / 2;
      const canvasX = (anchorViewportX - currentView.x) / currentView.scale;
      const canvasY = (anchorViewportY - currentView.y) / currentView.scale;
      const nextX = anchorViewportX - canvasX * nextScale;
      const nextY = anchorViewportY - canvasY * nextScale;
      const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
      return {
        x: clamped.x,
        y: clamped.y,
        scale: nextScale,
      };
    },
    [viewportRef]
  );

  const startWheelZoomLoop = useCallback((): void => {
    if (wheelZoomRafRef.current !== null) return;
    const tick = (): void => {
      wheelZoomRafRef.current = null;
      const target = wheelZoomTargetRef.current;
      if (!target) return;
      const currentView = latestViewRef.current;
      const remainingScale = target.scale - currentView.scale;
      if (Math.abs(remainingScale) <= WHEEL_ZOOM_STOP_THRESHOLD) {
        const finalView = getZoomTargetView(target.scale, target.anchorClientPos);
        setViewClamped(finalView);
        wheelZoomTargetRef.current = null;
        return;
      }
      const steppedScale = currentView.scale + remainingScale * WHEEL_ZOOM_EASING;
      const steppedView = getZoomTargetView(steppedScale, target.anchorClientPos);
      setViewClamped(steppedView);
      wheelZoomRafRef.current = requestAnimationFrame(tick);
    };
    wheelZoomRafRef.current = requestAnimationFrame(tick);
  }, [getZoomTargetView, setViewClamped]);

  const animateViewTo = useCallback(
    (
      target: { x: number; y: number; scale: number },
      durationMs = ZOOM_ANIMATION_DURATION_MS
    ): void => {
      const fromView = latestViewRef.current;
      const deltaX = target.x - fromView.x;
      const deltaY = target.y - fromView.y;
      const deltaScale = target.scale - fromView.scale;
      const duration = Math.max(0, durationMs);
      const isNegligibleMotion =
        Math.abs(deltaX) < 0.1 &&
        Math.abs(deltaY) < 0.1 &&
        Math.abs(deltaScale) < 0.0008;
      if (duration <= 0 || isNegligibleMotion) {
        stopViewAnimation();
        setViewClamped(target);
        return;
      }

      stopViewAnimation();
      const startedAt = performance.now();
      const tick = (now: number): void => {
        const progress = Math.min(1, (now - startedAt) / duration);
        // Cubic ease-out feels responsive while avoiding abrupt stops.
        const eased = 1 - Math.pow(1 - progress, 3);
        setViewClamped({
          x: fromView.x + deltaX * eased,
          y: fromView.y + deltaY * eased,
          scale: fromView.scale + deltaScale * eased,
        });
        if (progress >= 1) {
          viewAnimationRafRef.current = null;
          return;
        }
        viewAnimationRafRef.current = requestAnimationFrame(tick);
      };

      viewAnimationRafRef.current = requestAnimationFrame(tick);
    },
    [setViewClamped, stopViewAnimation]
  );

  const zoomTo = useCallback((targetScale: number): void => {
    const target = getZoomTargetView(targetScale);
    animateViewTo(target, ZOOM_ANIMATION_DURATION_MS);
  }, [animateViewTo, getZoomTargetView]);

  const fitToNodes = useCallback((): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport || nodes.length === 0) {
      animateViewTo({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
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
    animateViewTo(
      { x: clamped.x, y: clamped.y, scale: nextScale },
      ZOOM_ANIMATION_DURATION_MS
    );
  }, [animateViewTo, nodes, viewportRef]);

  const fitToSelection = useCallback((): void => {
    const selectionIds = resolveActiveNodeSelectionIds();
    if (selectionIds.length === 0) {
      fitToNodes();
      return;
    }
    const selectedIdSet = new Set(selectionIds);
    const targetNodes = nodes.filter((node: AiNode): boolean => selectedIdSet.has(node.id));
    if (targetNodes.length === 0) {
      fitToNodes();
      return;
    }
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return;
    const padding = 96;
    const bounds = targetNodes.reduce(
      (
        acc: { minX: number; minY: number; maxX: number; maxY: number },
        node: AiNode
      ) => {
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
    animateViewTo(
      { x: clamped.x, y: clamped.y, scale: nextScale },
      ZOOM_ANIMATION_DURATION_MS
    );
  }, [animateViewTo, fitToNodes, nodes, resolveActiveNodeSelectionIds, viewportRef]);

  const resetView = useCallback((): void => {
    animateViewTo({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
  }, [animateViewTo]);

  const centerOnCanvasPoint = useCallback((canvasX: number, canvasY: number): void => {
    if (!Number.isFinite(canvasX) || !Number.isFinite(canvasY)) return;
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return;
    const currentView = latestViewRef.current;
    const nextX = viewport.width / 2 - canvasX * currentView.scale;
    const nextY = viewport.height / 2 - canvasY * currentView.scale;
    const clamped = clampTranslate(nextX, nextY, currentView.scale, viewport);
    animateViewTo(
      { x: clamped.x, y: clamped.y, scale: currentView.scale },
      ZOOM_ANIMATION_DURATION_MS
    );
  }, [animateViewTo, viewportRef]);

  const applyWheelZoom = useCallback(
    (deltaY: number, clientX: number, clientY: number): void => {
      stopProgrammaticViewAnimation();
      const baseScale = wheelZoomTargetRef.current?.scale ?? latestViewRef.current.scale;
      const zoomFactor = Math.exp((-deltaY) * WHEEL_ZOOM_SENSITIVITY);
      const targetScale = clampScale(baseScale * zoomFactor);
      if (!Number.isFinite(targetScale)) return;
      if (
        Math.abs(targetScale - latestViewRef.current.scale) < WHEEL_ZOOM_STOP_THRESHOLD &&
        (!wheelZoomTargetRef.current ||
          Math.abs(targetScale - wheelZoomTargetRef.current.scale) <
            WHEEL_ZOOM_STOP_THRESHOLD)
      ) {
        return;
      }
      wheelZoomTargetRef.current = {
        scale: targetScale,
        anchorClientPos: {
          x: clientX,
          y: clientY,
        },
      };
      startWheelZoomLoop();
      updateLastPointerCanvasPosFromClient(clientX, clientY);
    },
    [
      startWheelZoomLoop,
      stopProgrammaticViewAnimation,
      updateLastPointerCanvasPosFromClient,
    ]
  );

  const handleWheel = useCallback((event: React.WheelEvent<Element>): void => {
    event.preventDefault();
    event.stopPropagation();
    applyWheelZoom(event.deltaY, event.clientX, event.clientY);
  }, [applyWheelZoom]);

  // Use a non-passive wheel listener so browser scroll is reliably suppressed
  // while zooming the AI Paths canvas.
  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return;
    const handleNativeWheel = (event: WheelEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      applyWheelZoom(event.deltaY, event.clientX, event.clientY);
    };
    viewportElement.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      viewportElement.removeEventListener('wheel', handleNativeWheel);
    };
  }, [applyWheelZoom, viewportRef]);

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

  const startPinchGestureFromActivePointers = useCallback((): boolean => {
    const activePointers = activeTouchPointersRef.current;
    const pointerIds = Array.from(activePointers.keys());
    if (pointerIds.length < 2) return false;
    const firstId = pointerIds[0];
    const secondId = pointerIds[1];
    if (firstId == null || secondId == null) return false;
    const first = activePointers.get(firstId);
    const second = activePointers.get(secondId);
    if (!first || !second) return false;
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return false;
    const centerClientX = (first.x + second.x) / 2;
    const centerClientY = (first.y + second.y) / 2;
    const centerViewportX = centerClientX - viewport.left;
    const centerViewportY = centerClientY - viewport.top;
    const currentView = latestViewRef.current;
    const anchorCanvas = {
      x: (centerViewportX - currentView.x) / currentView.scale,
      y: (centerViewportY - currentView.y) / currentView.scale,
    };
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    touchGestureRef.current = {
      mode: 'pinch',
      pointerIds: [firstId, secondId],
      startDistance: Math.max(TOUCH_PINCH_MIN_DISTANCE, distance),
      startScale: currentView.scale,
      anchorCanvas,
    };
    return true;
  }, [viewportRef]);

  const appendTouchPanSample = useCallback(
    (pointerId: number, x: number, y: number, time: number): void => {
      const existing = touchGestureRef.current;
      if (existing?.mode !== 'pan' || existing.pointerId !== pointerId) {
        touchGestureRef.current = {
          mode: 'pan',
          pointerId,
          recentSamples: [{ x, y, time }],
        };
        return;
      }
      const recentSamples = [...existing.recentSamples, { x, y, time }].filter(
        (sample: TouchPointSample): boolean =>
          time - sample.time <= TOUCH_PAN_INERTIA_SAMPLE_WINDOW_MS
      );
      touchGestureRef.current = {
        mode: 'pan',
        pointerId,
        recentSamples,
      };
    },
    []
  );

  const maybeStartTouchPanInertia = useCallback(
    (pointerId: number): void => {
      const gesture = touchGestureRef.current;
      if (gesture?.mode !== 'pan' || gesture.pointerId !== pointerId) {
        return;
      }
      const samples = gesture.recentSamples;
      if (samples.length < 2) {
        touchGestureRef.current = null;
        return;
      }
      const first = samples[0];
      const last = samples[samples.length - 1];
      if (!first || !last) {
        touchGestureRef.current = null;
        return;
      }
      const dtMs = Math.max(1, last.time - first.time);
      const vx = (last.x - first.x) / dtMs;
      const vy = (last.y - first.y) / dtMs;
      const speed = Math.hypot(vx, vy);
      touchGestureRef.current = null;
      if (!Number.isFinite(speed) || speed < TOUCH_PAN_INERTIA_MIN_SPEED) {
        return;
      }
      startPanInertia(vx, vy);
    },
    [startPanInertia]
  );

  // ---------------------------------------------------------------------------
  // Interaction Handlers
  // ---------------------------------------------------------------------------

  const handlePointerDownNode = useCallback(async (
    event: React.PointerEvent<Element>,
    nodeId: string
  ): Promise<void> => {
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

    if (shouldGroupDrag) {
      const basePositions = new Map<string, { x: number; y: number }>();
      nodes.forEach((item: AiNode): void => {
        if (!selectedNodeIdSet.has(item.id)) return;
        basePositions.set(item.id, {
          x: item.position.x,
          y: item.position.y,
        });
      });
      dragSelectionRef.current = {
        basePositions,
        anchorCanvasX: canvasX,
        anchorCanvasY: canvasY,
      };
    } else {
      dragSelectionRef.current = null;
    }

    startDrag(nodeId, canvasX - node.position.x, canvasY - node.position.y);
  }, [
    confirmNodeSwitch,
    isPathLocked,
    nodes,
    notifyLocked,
    selectEdge,
    selectedNodeIdSet,
    setNodeSelection,
    startDrag,
    stopViewAnimation,
    updateLastPointerCanvasPosFromClient,
  ]);

  const handlePointerMoveNode = useCallback((
    event: React.PointerEvent<Element>,
    nodeId: string
  ): void => {
    if (dragState?.nodeId !== nodeId) return;
    const pointerCanvas = updateLastPointerCanvasPosFromClient(
      event.clientX,
      event.clientY
    );
    if (!pointerCanvas) return;
    const canvasX = pointerCanvas.x;
    const canvasY = pointerCanvas.y;
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
            CANVAS_WIDTH - NODE_WIDTH - 16
          );
          const nextY = Math.min(
            Math.max(base.y + deltaY, 16),
            CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
          );
          return {
            ...item,
            position: { x: nextX, y: nextY },
          };
        })
      );
      return;
    }
    const nextX = Math.min(
      Math.max(canvasX - dragState.offsetX, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
    const nextY = Math.min(
      Math.max(canvasY - dragState.offsetY, 16),
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
  }, [dragState, setNodes, updateLastPointerCanvasPosFromClient, updateNode]);

  const handlePointerUpNode = useCallback((
    event: React.PointerEvent<Element>,
    nodeId: string
  ): void => {
    if (dragState?.nodeId !== nodeId) return;
    releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);

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

    dragSelectionRef.current = null;
    endDrag();
  }, [dragState, endDrag, updateNode]);

  const handlePanStart = useCallback((event: React.PointerEvent<Element>): void => {
    stopViewAnimation();
    updateLastPointerCanvasPosFromClient(event.clientX, event.clientY);
    if (event.pointerType === 'touch') {
      activeTouchPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
      });
      setPointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      if (activeTouchPointersRef.current.size >= 2) {
        cancelTouchLongPressSelection();
        if (marqueeSelection) setMarqueeSelection(null);
        if (panState) endPan();
        endConnection();
        startPinchGestureFromActivePointers();
        return;
      }
    }
    const canvasEl = canvasRef.current;
    const targetEl = event.target as Element | null;
    if (event.pointerType !== 'touch' && targetEl?.closest('path')) return;
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
    if (selectionToolMode === 'select') {
      const mode: MarqueeMode = event.altKey
        ? 'subtract'
        : event.shiftKey
          ? 'add'
          : 'replace';
      const baseNodeIds = mode === 'replace' ? [] : [...selectedNodeIdSet];
      if (event.pointerType === 'touch') {
        cancelTouchLongPressSelection();
        const pointerId = event.pointerId;
        const startedAt = performance.now();
        const indicatorPoint =
          resolveViewportPointFromClient(event.clientX, event.clientY) ??
          {
            x: event.clientX,
            y: event.clientY,
          };
        const pending: TouchLongPressSelectionState = {
          pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startedAt,
          indicatorViewportX: indicatorPoint.x,
          indicatorViewportY: indicatorPoint.y,
          mode,
          baseNodeIds,
          timerId: null,
        };
        setTouchLongPressIndicator({
          x: indicatorPoint.x,
          y: indicatorPoint.y,
          progress: 0,
          phase: 'pending',
        });
        startTouchLongPressIndicatorLoop();
        const timerId = window.setTimeout(() => {
          const currentPending = touchLongPressSelectionRef.current;
          if (currentPending?.pointerId !== pointerId) return;
          if (
            activeTouchPointersRef.current.size !== 1 ||
            touchGestureRef.current?.mode === 'pinch'
          ) {
            cancelTouchLongPressSelection();
            return;
          }
          const currentPoint = activeTouchPointersRef.current.get(pointerId);
          const clientX = currentPoint?.x ?? currentPending.startClientX;
          const clientY = currentPoint?.y ?? currentPending.startClientY;
          const movedDistance = Math.hypot(
            clientX - currentPending.startClientX,
            clientY - currentPending.startClientY
          );
          if (movedDistance > TOUCH_LONG_PRESS_SELECTION_MOVE_TOLERANCE_PX) {
            cancelTouchLongPressSelection();
            return;
          }
          const activated = beginMarqueeSelectionFromClient(
            clientX,
            clientY,
            currentPending.mode,
            currentPending.baseNodeIds
          );
          if (!activated) {
            cancelTouchLongPressSelection();
            return;
          }
          const activatedPoint =
            resolveViewportPointFromClient(clientX, clientY) ??
            { x: currentPending.indicatorViewportX, y: currentPending.indicatorViewportY };
          triggerTouchLongPressActivatedFeedback(activatedPoint.x, activatedPoint.y);
          touchLongPressSelectionRef.current = null;
        }, TOUCH_LONG_PRESS_SELECTION_DELAY_MS);
        touchLongPressSelectionRef.current = {
          ...pending,
          timerId,
        };
        return;
      }
      setPointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      beginMarqueeSelectionFromClient(
        event.clientX,
        event.clientY,
        mode,
        baseNodeIds
      );
      return;
    }
    setPointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
    startPan(event.clientX, event.clientY);
    if (event.pointerType === 'touch') {
      appendTouchPanSample(
        event.pointerId,
        event.clientX,
        event.clientY,
        performance.now()
      );
    }
  }, [
    beginMarqueeSelectionFromClient,
    cancelTouchLongPressSelection,
    appendTouchPanSample,
    activeTouchPointersRef,
    canvasRef,
    connecting,
    endPan,
    endConnection,
    marqueeSelection,
    panState,
    selectedNodeIdSet,
    selectionToolMode,
    startPinchGestureFromActivePointers,
    startTouchLongPressIndicatorLoop,
    startPan,
    stopViewAnimation,
    triggerTouchLongPressActivatedFeedback,
    updateLastPointerCanvasPosFromClient,
    resolveViewportPointFromClient,
  ]);

  const handlePanMove = useCallback((event: React.PointerEvent<Element>): void => {
    updateLastPointerCanvasPosFromClient(event.clientX, event.clientY);
    if (event.pointerType === 'touch') {
      activeTouchPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
      });
      const gesture = touchGestureRef.current;
      if (gesture?.mode === 'pinch') {
        const first = activeTouchPointersRef.current.get(gesture.pointerIds[0]);
        const second = activeTouchPointersRef.current.get(gesture.pointerIds[1]);
        if (!first || !second) return;
        const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
        if (!viewport) return;
        const centerViewportX = (first.x + second.x) / 2 - viewport.left;
        const centerViewportY = (first.y + second.y) / 2 - viewport.top;
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        const nextScale = clampScale(
          gesture.startScale *
            (Math.max(TOUCH_PINCH_MIN_DISTANCE, distance) / gesture.startDistance)
        );
        const nextX = centerViewportX - gesture.anchorCanvas.x * nextScale;
        const nextY = centerViewportY - gesture.anchorCanvas.y * nextScale;
        const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
        setViewClamped({
          x: clamped.x,
          y: clamped.y,
          scale: nextScale,
        });
        return;
      }
      const pendingLongPress = touchLongPressSelectionRef.current;
      if (pendingLongPress?.pointerId === event.pointerId) {
        const indicatorPoint = resolveViewportPointFromClient(
          event.clientX,
          event.clientY
        );
        if (indicatorPoint) {
          touchLongPressSelectionRef.current = {
            ...pendingLongPress,
            indicatorViewportX: indicatorPoint.x,
            indicatorViewportY: indicatorPoint.y,
          };
        }
        const movedDistance = Math.hypot(
          event.clientX - pendingLongPress.startClientX,
          event.clientY - pendingLongPress.startClientY
        );
        if (movedDistance > TOUCH_LONG_PRESS_SELECTION_MOVE_TOLERANCE_PX) {
          cancelTouchLongPressSelection();
          if (!panState) {
            startPan(event.clientX, event.clientY);
            appendTouchPanSample(
              event.pointerId,
              event.clientX,
              event.clientY,
              performance.now()
            );
            return;
          }
        } else {
          return;
        }
      }
    }
    if (marqueeSelection) {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return;
      const nextState: MarqueeSelectionState = {
        ...marqueeSelection,
        currentX: event.clientX - viewport.left,
        currentY: event.clientY - viewport.top,
      };
      setMarqueeSelection(nextState);
      applyMarqueeSelection(nextState);
      return;
    }
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
    if (event.pointerType === 'touch') {
      appendTouchPanSample(
        event.pointerId,
        event.clientX,
        event.clientY,
        performance.now()
      );
    }
  }, [
    activeTouchPointersRef,
    applyMarqueeSelection,
    appendTouchPanSample,
    cancelTouchLongPressSelection,
    connecting,
    marqueeSelection,
    panState,
    setViewClamped,
    setConnectingPos,
    startPan,
    updateView,
    updateLastPointerCanvasPosFromClient,
    resolveViewportPointFromClient,
    view,
    viewportRef,
  ]);

  const handlePanEnd = useCallback((event: React.PointerEvent<Element>): void => {
    if (event.pointerType === 'touch') {
      activeTouchPointersRef.current.delete(event.pointerId);
      const pendingLongPress = touchLongPressSelectionRef.current;
      if (pendingLongPress?.pointerId === event.pointerId) {
        cancelTouchLongPressSelection();
      }
      const gesture = touchGestureRef.current;
      if (
        gesture?.mode === 'pinch' &&
        (gesture.pointerIds[0] === event.pointerId ||
          gesture.pointerIds[1] === event.pointerId)
      ) {
        releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
        if (activeTouchPointersRef.current.size >= 2) {
          startPinchGestureFromActivePointers();
          return;
        }
        const remainingEntries = Array.from(activeTouchPointersRef.current.entries());
        if (remainingEntries.length === 1) {
          const remainingEntry = remainingEntries[0];
          if (!remainingEntry) return;
          const [remainingPointerId, remainingPoint] = remainingEntry;
          const sample: TouchPointSample = {
            x: remainingPoint.x,
            y: remainingPoint.y,
            time: performance.now(),
          };
          touchGestureRef.current = {
            mode: 'pan',
            pointerId: remainingPointerId,
            recentSamples: [sample],
          };
          startPan(remainingPoint.x, remainingPoint.y);
          return;
        }
        touchGestureRef.current = null;
      }
    }
    if (marqueeSelection) {
      releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      setMarqueeSelection(null);
      return;
    }
    if (panState) {
      if (event.pointerType === 'touch') {
        maybeStartTouchPanInertia(event.pointerId);
      } else {
        touchGestureRef.current = null;
      }
      releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      endPan();
    }
    if (connecting) {
      endConnection();
    }
  }, [
    activeTouchPointersRef,
    cancelTouchLongPressSelection,
    connecting,
    endConnection,
    endPan,
    marqueeSelection,
    maybeStartTouchPanInertia,
    panState,
    startPan,
    startPinchGestureFromActivePointers,
  ]);

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

  const handleStartConnection = useCallback(async (
    event: React.PointerEvent<Element>,
    node: AiNode,
    port: string
  ): Promise<void> => {
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
  }, [isPathLocked, getPortPosition, startConnection, notifyLocked, confirmNodeSwitch]);

  const handleCompleteConnection = useCallback((
    event: React.PointerEvent<Element>,
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

  const handleReconnectInput = useCallback(async (
    event: React.PointerEvent<Element>,
    nodeId: string,
    port: string
  ): Promise<void> => {
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
    notifyLocked,
    confirmNodeSwitch
  ]);

  // ---------------------------------------------------------------------------
  // Node Handlers
  // ---------------------------------------------------------------------------

  const handleDeleteSelectedNode = useCallback((): void => {
    const nodeIdsToDelete = resolveActiveNodeSelectionIds();
    if (nodeIdsToDelete.length === 0) return;
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const nodeIdSet = new Set(nodeIdsToDelete);
    const isSingleNode = nodeIdsToDelete.length === 1;
    const targetNode = isSingleNode
      ? nodes.find((n) => n.id === nodeIdsToDelete[0])
      : null;
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
        
        const removedEdges = edges.filter(
          (e) =>
            Boolean(
              (e.from && nodeIdSet.has(e.from)) ||
              (e.to && nodeIdSet.has(e.to))
            )
        );
        const remainingEdges = edges.filter(
          (e) =>
            !(
              (e.from && nodeIdSet.has(e.from)) ||
              (e.to && nodeIdSet.has(e.to))
            )
        );
        
        setEdges(remainingEdges);
        setRuntimeState((prev: RuntimeState) => pruneRuntimeInputsInternal(prev, removedEdges, remainingEdges));
        
        selectNode(null);
        setNodeSelection([]);
        selectEdge(null);
      }
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
    lastPointerCanvasPosRef.current = { x: localX, y: localY };
    
    const nextX = Math.min(Math.max(localX - NODE_WIDTH / 2, 16), CANVAS_WIDTH - NODE_WIDTH - 16);
    const nextY = Math.min(Math.max(localY - NODE_MIN_HEIGHT / 2, 16), CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16);
    
    const defaultConfig = getDefaultConfigForType(payload.type, payload.outputs, payload.inputs);
    const mergedConfig = payload.config ? { ...defaultConfig, ...payload.config } : defaultConfig;
    
    const newNodeId = `node-${Math.random().toString(36).slice(2, 10)}`;
    const nowIso = new Date().toISOString();
    const newNode: AiNode = {
      ...payload,
      id: newNodeId,
      createdAt: nowIso,
      updatedAt: null,
      position: { x: nextX, y: nextY },
      data: {},
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
      const targetWithinCanvas = isWithinCanvasScope(event.target);
      const shouldHandleAsCanvasShortcut =
        targetWithinCanvas ||
        (hasCanvasKeyboardFocusRef.current && isPageRootTarget(event.target));
      if (!shouldHandleAsCanvasShortcut) return;

      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'c') {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        void handleCopySelection();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'v') {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        void handlePasteSelection();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'x') {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        void handleCutSelection();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'd') {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        handleDuplicateSelection();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'a') {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        setNodeSelection(nodes.map((node: AiNode): string => node.id));
        selectEdge(null);
        return;
      }
      if (event.key === 'Escape') {
        setMarqueeSelection(null);
        endConnection();
        setNodeSelection([]);
        selectEdge(null);
        return;
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
        return;
      }
      if (!modifier && event.key.toLowerCase() === 'f') {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        if (event.shiftKey) {
          fitToSelection();
          return;
        }
        fitToNodes();
        return;
      }
      if ((modifier && event.key === '0') || (!modifier && event.key.toLowerCase() === 'r')) {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        resetView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    endConnection,
    handleCopySelection,
    handleCutSelection,
    handleDeleteSelectedNode,
    handleDuplicateSelection,
    handlePasteSelection,
    handleRemoveEdge,
    fitToNodes,
    fitToSelection,
    isPageRootTarget,
    isWithinCanvasScope,
    nodes,
    resetView,
    selectedEdgeId,
    selectedNodeId,
    setNodeSelection,
    selectEdge,
  ]);

  // Global pointer listeners for clearing state
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      hasCanvasKeyboardFocusRef.current = isWithinCanvasScope(event.target);

      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-port]')) return;
      if (target?.closest('path')) return;
      if (target?.closest('[data-edge-panel]')) return;
      
      endConnection();
      selectEdge(null);
    };
    const handlePointerUp = () => {
      setMarqueeSelection(null);
      endConnection();
    };
    
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [endConnection, isWithinCanvasScope, selectEdge]);

  // Cleanup RAF
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (viewAnimationRafRef.current !== null) cancelAnimationFrame(viewAnimationRafRef.current);
      if (wheelZoomRafRef.current !== null) cancelAnimationFrame(wheelZoomRafRef.current);
      if (touchLongPressIndicatorRafRef.current !== null) {
        cancelAnimationFrame(touchLongPressIndicatorRafRef.current);
      }
      if (panInertiaRafRef.current !== null) cancelAnimationFrame(panInertiaRafRef.current);
      const pendingLongPress = touchLongPressSelectionRef.current;
      if (pendingLongPress?.timerId != null) {
        window.clearTimeout(pendingLongPress.timerId);
      }
      if (touchLongPressIndicatorHideTimerRef.current !== null) {
        window.clearTimeout(touchLongPressIndicatorHideTimerRef.current);
      }
      wheelZoomTargetRef.current = null;
      touchLongPressIndicatorRafRef.current = null;
      touchLongPressIndicatorHideTimerRef.current = null;
      panInertiaVelocityRef.current = null;
      touchGestureRef.current = null;
      touchLongPressSelectionRef.current = null;
      activeTouchPointersRef.current.clear();
      dragSelectionRef.current = null;
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
    selectionMarqueeRect,
    touchLongPressIndicator,
    lastDrop,
    edgePaths,
    // Handlers
    handlePointerDownNode,
    handlePointerMoveNode,
    handlePointerUpNode,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleWheel,
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
    handleCopySelection,
    handleCutSelection,
    handleDuplicateSelection,
    handlePasteSelection,
    ConfirmationModal,
    // Actions
    zoomTo,
    fitToNodes,
    fitToSelection,
    resetView,
    centerOnCanvasPoint,
    ensureNodeVisible,
    pruneRuntimeInputs: pruneRuntimeInputsInternal,
  };
}
