'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AiNode, RuntimeState, Edge } from '@/shared/lib/ai-paths';
import { clampScale, clampTranslate } from '@/shared/lib/ai-paths';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui';

import { useCanvasState, useCanvasActions, useCanvasRefs } from './useCanvas';
import { useEdgePaths } from './useEdgePaths';
import { useGraphState, useGraphActions } from './useGraph';
import { useRuntimeActions } from './useRuntime';
import { useSelectionState, useSelectionActions } from './useSelection';

import type { EdgeRoutingMode } from './useEdgePaths';
import {
  type MarqueeMode,
  type MarqueeSelectionState,
  type TouchLongPressIndicatorState,
  type TouchPointSample,
  type TouchGestureState,
  type TouchLongPressSelectionState,
  getMarqueeRect,
  getPointerCaptureTarget,
  setPointerCaptureSafe,
  releasePointerCaptureSafe,
  TOUCH_LONG_PRESS_SELECTION_MOVE_TOLERANCE_PX,
  TOUCH_LONG_PRESS_SELECTION_DELAY_MS,
  TOUCH_PINCH_MIN_DISTANCE,
} from './useCanvasInteractions.helpers';

import {
  useCanvasInteractionsClipboard,
  type UseCanvasInteractionsClipboardValue,
} from './useCanvasInteractions.clipboard';
import {
  useCanvasInteractionsNavigation,
  type UseCanvasInteractionsNavigationValue,
} from './useCanvasInteractions.navigation';
import {
  useCanvasInteractionsTouch,
  type UseCanvasInteractionsTouchValue,
} from './useCanvasInteractions.touch';
import {
  useCanvasInteractionsNodes,
  type UseCanvasInteractionsNodesValue,
} from './useCanvasInteractions.nodes';
import {
  useCanvasInteractionsConnections,
  type UseCanvasInteractionsConnectionsValue,
} from './useCanvasInteractions.connections';

type WebkitGestureLikeEvent = Event & {
  scale?: number;
  clientX?: number;
  clientY?: number;
  pageX?: number;
  pageY?: number;
};

/**
 * Hook that manages all canvas-related interactions (pan, drag, connect, drop)
 * using AI-Paths contexts.
 */
export function useCanvasInteractions(args?: {
  confirmNodeSwitch?: ((nodeId: string) => boolean | Promise<boolean>) | undefined;
  edgeRoutingMode?: EdgeRoutingMode | undefined;
}) {
  const { confirmNodeSwitch, edgeRoutingMode = 'bezier' } = args ?? {};
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
    setLastDrop,
  } = useCanvasActions();
  const { viewportRef, canvasRef } = useCanvasRefs();

  // Context: Graph
  const { nodes, edges, isPathLocked, activePathId } = useGraphState();
  const { setNodes, setEdges, updateNode, removeNode } = useGraphActions();

  // Context: Selection
  const { selectedNodeId, selectedNodeIds, selectedEdgeId, selectionToolMode, selectionScopeMode } =
    useSelectionState();
  const { selectNode, setNodeSelection, selectEdge, toggleNodeSelection } = useSelectionActions();

  // Context: Runtime
  const { setRuntimeState } = useRuntimeActions();

  // Derived: Edge paths
  const edgePaths = useEdgePaths(edgeRoutingMode);
  const selectedNodeIdSet = useMemo((): Set<string> => new Set(selectedNodeIds), [selectedNodeIds]);

  // Refs
  const lastPointerCanvasPosRef = useRef<{ x: number; y: number } | null>(null);
  const activeTouchPointersRef = useRef<Map<number, TouchPointSample>>(new Map());
  const touchGestureRef = useRef<TouchGestureState | null>(null);
  const touchLongPressSelectionRef = useRef<TouchLongPressSelectionState | null>(null);
  const touchLongPressIndicatorRafRef = useRef<number | null>(null);
  const touchLongPressIndicatorHideTimerRef = useRef<number | null>(null);
  const latestViewRef = useRef(view);
  const lockedToastAtRef = useRef<number>(0);
  const hasCanvasKeyboardFocusRef = useRef(false);
  const safariGestureScaleRef = useRef<number | null>(null);
  const wheelGestureActiveUntilRef = useRef<number>(0);

  const [marqueeSelection, setMarqueeSelection] = useState<MarqueeSelectionState | null>(null);
  const [touchLongPressIndicator, setTouchLongPressIndicator] =
    useState<TouchLongPressIndicatorState | null>(null);

  useEffect(() => {
    latestViewRef.current = view;
  }, [view]);

  const notifyLocked = useCallback((): void => {
    const now = Date.now();
    if (now - lockedToastAtRef.current < 800) return;
    lockedToastAtRef.current = now;
    toast('This path is locked. Unlock it to edit nodes or connections.', {
      variant: 'info',
    });
  }, [toast]);

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
        const nodeInputs = nextInputs?.[edge.to] ?? {};
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

  const resolveActiveNodeSelectionIds = useCallback((): string[] => {
    if (selectedNodeIds.length > 0) {
      return selectedNodeIds.filter((id: string): boolean => id.trim().length > 0);
    }
    if (selectedNodeId) return [selectedNodeId];
    return [];
  }, [selectedNodeId, selectedNodeIds]);

  const nav: UseCanvasInteractionsNavigationValue = useCanvasInteractionsNavigation({
    view,
    latestViewRef,
    updateView,
    viewportRef,
    nodes,
    resolveActiveNodeSelectionIds,
    updateLastPointerCanvasPosFromClient,
  });

  const clipboard: UseCanvasInteractionsClipboardValue = useCanvasInteractionsClipboard({
    nodes,
    edges,
    activePathId,
    isPathLocked,
    notifyLocked,
    toast,
    setNodes,
    setEdges,
    setNodeSelection,
    selectEdge,
    setRuntimeState,
    pruneRuntimeInputsInternal,
    resolveActiveNodeSelectionIds,
    viewportRef,
    lastPointerCanvasPosRef,
    view,
  });

  const touch: UseCanvasInteractionsTouchValue = useCanvasInteractionsTouch({
    activeTouchPointersRef,
    touchGestureRef,
    touchLongPressSelectionRef,
    touchLongPressIndicatorRafRef,
    touchLongPressIndicatorHideTimerRef,
    viewportRef,
    latestViewRef,
    setTouchLongPressIndicator,
    setNodeSelection,
    selectEdge,
    setMarqueeSelection,
  });

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
      if (!Number.isFinite(speed) || speed < 0.045) {
        // TOUCH_PAN_INERTIA_MIN_SPEED
        return;
      }
      nav.startPanInertia(vx, vy);
    },
    [nav, touchGestureRef]
  );

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
          const nodeRight = node.position.x + 200; // NODE_WIDTH
          const nodeBottom = node.position.y + 100; // NODE_MIN_HEIGHT
          return !(nodeRight < minX || nodeLeft > maxX || nodeBottom < minY || nodeTop > maxY);
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
      const marqueeNodeIds = resolveNodeSelectionByScope(resolveNodesWithinMarquee(state));
      const resolvedIds =
        state.mode === 'replace'
          ? marqueeNodeIds
          : state.mode === 'add'
            ? Array.from(new Set([...state.baseNodeIds, ...marqueeNodeIds]))
            : state.baseNodeIds.filter((id: string): boolean => !new Set(marqueeNodeIds).has(id));

      setNodeSelection(resolvedIds);
    },
    [resolveNodeSelectionByScope, resolveNodesWithinMarquee, setNodeSelection]
  );

  const nodeActions: UseCanvasInteractionsNodesValue = useCanvasInteractionsNodes({
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
    stopViewAnimation: nav.stopViewAnimation,
    resolveActiveNodeSelectionIds,
    confirm,
    setEdges,
    setRuntimeState,
    pruneRuntimeInputsInternal,
    viewportRef,
    canvasRef: canvasRef as React.RefObject<SVGSVGElement | null>,
    view,
    setLastDrop,
    ensureNodeVisible: nav.ensureNodeVisible,
    toast,
  });

  const connectionActions: UseCanvasInteractionsConnectionsValue = useCanvasInteractionsConnections(
    {
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
    }
  );

  // Effects and Handlers composition
  const handlePanStart = useCallback(
    (event: React.PointerEvent<Element>): void => {
      nav.stopViewAnimation();
      updateLastPointerCanvasPosFromClient(event.clientX, event.clientY);
      if (event.pointerType === 'touch') {
        activeTouchPointersRef.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
          time: performance.now(),
        });
        setPointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
        if (activeTouchPointersRef.current.size >= 2) {
          touch.cancelTouchLongPressSelection();
          if (marqueeSelection) setMarqueeSelection(null);
          if (panState) endPan();
          endConnection();
          touch.startPinchGestureFromActivePointers();
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
        const mode: MarqueeMode = event.altKey ? 'subtract' : event.shiftKey ? 'add' : 'replace';
        const baseNodeIds = mode === 'replace' ? [] : [...selectedNodeIdSet];
        if (event.pointerType === 'touch') {
          touch.cancelTouchLongPressSelection();
          const pointerId = event.pointerId;
          const startedAt = performance.now();
          const indicatorPoint = resolveViewportPointFromClient(event.clientX, event.clientY) ?? {
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
          touch.startTouchLongPressIndicatorLoop();
          const timerId = window.setTimeout(() => {
            const currentPending = touchLongPressSelectionRef.current;
            if (currentPending?.pointerId !== pointerId) return;
            if (
              activeTouchPointersRef.current.size !== 1 ||
              touchGestureRef.current?.mode === 'pinch'
            ) {
              touch.cancelTouchLongPressSelection();
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
              touch.cancelTouchLongPressSelection();
              return;
            }
            const activated = touch.beginMarqueeSelectionFromClient(
              clientX,
              clientY,
              currentPending.mode,
              currentPending.baseNodeIds
            );
            if (!activated) {
              touch.cancelTouchLongPressSelection();
              return;
            }
            const activatedPoint = resolveViewportPointFromClient(clientX, clientY) ?? {
              x: currentPending.indicatorViewportX,
              y: currentPending.indicatorViewportY,
            };
            touch.triggerTouchLongPressActivatedFeedback(activatedPoint.x, activatedPoint.y);
            touchLongPressSelectionRef.current = null;
          }, TOUCH_LONG_PRESS_SELECTION_DELAY_MS);
          touchLongPressSelectionRef.current = { ...pending, timerId };
          return;
        }
        setPointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
        touch.beginMarqueeSelectionFromClient(event.clientX, event.clientY, mode, baseNodeIds);
        return;
      }
      setPointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      startPan(event.clientX, event.clientY);
      if (event.pointerType === 'touch') {
        touch.appendTouchPanSample(
          event.pointerId,
          event.clientX,
          event.clientY,
          performance.now()
        );
      }
    },
    [
      nav,
      updateLastPointerCanvasPosFromClient,
      touch,
      marqueeSelection,
      panState,
      endPan,
      endConnection,
      connecting,
      selectionToolMode,
      selectedNodeIdSet,
      resolveViewportPointFromClient,
      startPan,
      canvasRef,
      touchLongPressSelectionRef,
      setTouchLongPressIndicator,
    ]
  );

  const handlePanMove = useCallback(
    (event: React.PointerEvent<Element>): void => {
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
          nav.setViewClamped({ x: nextX, y: nextY, scale: nextScale });
          return;
        }
        const pendingLongPress = touchLongPressSelectionRef.current;
        if (pendingLongPress?.pointerId === event.pointerId) {
          const indicatorPoint = resolveViewportPointFromClient(event.clientX, event.clientY);
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
            touch.cancelTouchLongPressSelection();
            if (!panState) {
              startPan(event.clientX, event.clientY);
              touch.appendTouchPanSample(
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
        touch.appendTouchPanSample(
          event.pointerId,
          event.clientX,
          event.clientY,
          performance.now()
        );
      }
    },
    [
      updateLastPointerCanvasPosFromClient,
      nav,
      touch,
      resolveViewportPointFromClient,
      marqueeSelection,
      applyMarqueeSelection,
      connecting,
      view,
      setConnectingPos,
      panState,
      updateView,
      startPan,
      viewportRef,
    ]
  );

  const handlePanEnd = useCallback(
    (event: React.PointerEvent<Element>): void => {
      if (event.pointerType === 'touch') {
        activeTouchPointersRef.current.delete(event.pointerId);
        const pendingLongPress = touchLongPressSelectionRef.current;
        if (pendingLongPress?.pointerId === event.pointerId) {
          touch.cancelTouchLongPressSelection();
        }
        const gesture = touchGestureRef.current;
        if (
          gesture?.mode === 'pinch' &&
          (gesture.pointerIds[0] === event.pointerId || gesture.pointerIds[1] === event.pointerId)
        ) {
          releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
          if (activeTouchPointersRef.current.size >= 2) {
            touch.startPinchGestureFromActivePointers();
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
    },
    [
      touch,
      marqueeSelection,
      panState,
      connecting,
      endPan,
      endConnection,
      startPan,
      maybeStartTouchPanInertia,
    ]
  );

  const isPointInsideCanvas = useCallback(
    (clientX: number, clientY: number): boolean => {
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;
      const canvasElement = canvasRef.current;
      if (!canvasElement) return false;
      const rect = canvasElement.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    },
    [canvasRef]
  );

  const isWheelLikelyZoomGesture = useCallback(
    (event: {
      ctrlKey: boolean;
      metaKey: boolean;
      deltaMode: number;
      deltaY: number;
      deltaX: number;
    }): boolean => {
      if (event.ctrlKey || event.metaKey) return true;
      if (event.deltaMode !== 0) return false;
      const absY = Math.abs(event.deltaY);
      const absX = Math.abs(event.deltaX);
      const hasSmallTrackpadDelta = (absY > 0 && absY < 12) || (absX > 0 && absX < 12);
      return hasSmallTrackpadDelta;
    },
    []
  );

  const isWheelTargetInsideCanvas = useCallback(
    (target: EventTarget | null): boolean => {
      const canvasElement = canvasRef.current;
      if (!canvasElement) return false;
      return target instanceof Node && canvasElement.contains(target);
    },
    [canvasRef]
  );

  const applyWheelZoomFromEvent = useCallback(
    (event: {
      defaultPrevented: boolean;
      preventDefault: () => void;
      stopPropagation?: () => void;
      target?: EventTarget | null;
      deltaY: number;
      deltaX: number;
      clientX: number;
      clientY: number;
      deltaMode: number;
      ctrlKey: boolean;
      metaKey: boolean;
    }): void => {
      if (event.defaultPrevented) return;
      const now = performance.now();
      const likelyZoomGesture = isWheelLikelyZoomGesture(event);
      const insideByTarget = isWheelTargetInsideCanvas(event.target ?? null);
      const insideByPoint = isPointInsideCanvas(event.clientX, event.clientY);
      const withinActiveGestureWindow = now <= wheelGestureActiveUntilRef.current;
      const shouldHandle =
        insideByTarget || insideByPoint || (likelyZoomGesture && withinActiveGestureWindow);
      if (!shouldHandle) return;
      wheelGestureActiveUntilRef.current = now + (likelyZoomGesture ? 520 : 260);
      event.preventDefault();
      event.stopPropagation?.();
      nav.applyWheelZoom(
        event.deltaY,
        event.clientX,
        event.clientY,
        event.deltaMode,
        event.ctrlKey,
        event.metaKey,
        event.deltaX
      );
    },
    [isPointInsideCanvas, isWheelLikelyZoomGesture, isWheelTargetInsideCanvas, nav]
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<Element>): void => {
      const nativeWheelEvent = event.nativeEvent as WheelEvent | undefined;
      if (nativeWheelEvent?.defaultPrevented) return;
      applyWheelZoomFromEvent(event);
    },
    [applyWheelZoomFromEvent]
  );

  useEffect(() => {
    const handleDocumentWheel = (event: WheelEvent): void => {
      applyWheelZoomFromEvent(event);
    };
    window.addEventListener('wheel', handleDocumentWheel, {
      passive: false,
      capture: true,
    });
    return () => {
      window.removeEventListener('wheel', handleDocumentWheel, true);
    };
  }, [applyWheelZoomFromEvent]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    const viewportElement = viewportRef.current;
    const gestureTarget = canvasElement ?? viewportElement;
    if (!gestureTarget) return;

    const resolveGestureAnchor = (
      event: WebkitGestureLikeEvent
    ): { x: number; y: number } | null => {
      const clientX = Number.isFinite(event.clientX)
        ? Number(event.clientX)
        : Number.isFinite(event.pageX)
          ? Number(event.pageX)
          : null;
      const clientY = Number.isFinite(event.clientY)
        ? Number(event.clientY)
        : Number.isFinite(event.pageY)
          ? Number(event.pageY)
          : null;
      if (clientX !== null && clientY !== null) {
        return { x: clientX, y: clientY };
      }
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return null;
      return {
        x: viewport.left + viewport.width / 2,
        y: viewport.top + viewport.height / 2,
      };
    };

    const handleGestureStart = (rawEvent: Event): void => {
      const event = rawEvent as WebkitGestureLikeEvent;
      rawEvent.preventDefault();
      nav.stopViewAnimation();
      wheelGestureActiveUntilRef.current = performance.now() + 800;
      const scale = Number(event.scale);
      safariGestureScaleRef.current = Number.isFinite(scale) && scale > 0 ? scale : 1;
    };

    const handleGestureChange = (rawEvent: Event): void => {
      const event = rawEvent as WebkitGestureLikeEvent;
      rawEvent.preventDefault();
      const previousGestureScale = safariGestureScaleRef.current ?? 1;
      const nextGestureScale = Number(event.scale);
      if (
        !Number.isFinite(previousGestureScale) ||
        previousGestureScale <= 0 ||
        !Number.isFinite(nextGestureScale) ||
        nextGestureScale <= 0
      ) {
        safariGestureScaleRef.current =
          Number.isFinite(nextGestureScale) && nextGestureScale > 0
            ? nextGestureScale
            : previousGestureScale;
        return;
      }

      const scaleFactor = nextGestureScale / previousGestureScale;
      safariGestureScaleRef.current = nextGestureScale;
      if (!Number.isFinite(scaleFactor) || Math.abs(scaleFactor - 1) < 0.0001) return;
      wheelGestureActiveUntilRef.current = performance.now() + 800;

      const anchor = resolveGestureAnchor(event);
      const targetScale = clampScale(latestViewRef.current.scale * scaleFactor);
      const targetView = nav.getZoomTargetView(targetScale, anchor);
      nav.setViewClamped(targetView);
      if (anchor) {
        updateLastPointerCanvasPosFromClient(anchor.x, anchor.y);
      }
    };

    const handleGestureEnd = (): void => {
      safariGestureScaleRef.current = null;
    };

    gestureTarget.addEventListener('gesturestart', handleGestureStart, { passive: false });
    gestureTarget.addEventListener('gesturechange', handleGestureChange, { passive: false });
    gestureTarget.addEventListener('gestureend', handleGestureEnd);
    return () => {
      gestureTarget.removeEventListener('gesturestart', handleGestureStart);
      gestureTarget.removeEventListener('gesturechange', handleGestureChange);
      gestureTarget.removeEventListener('gestureend', handleGestureEnd);
    };
  }, [canvasRef, nav, updateLastPointerCanvasPosFromClient, viewportRef, latestViewRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const targetWithinCanvas = ((): boolean => {
        if (!(event.target instanceof Node)) return false;
        return (
          viewportRef.current?.contains(event.target) ||
          canvasRef.current?.contains(event.target) ||
          false
        );
      })();
      const isPageRoot =
        event.target === window ||
        event.target === document ||
        event.target === document.body ||
        event.target === document.documentElement;
      const shouldHandle = targetWithinCanvas || (hasCanvasKeyboardFocusRef.current && isPageRoot);
      if (!shouldHandle) return;

      const isTyping = ((): boolean => {
        const element = event.target as HTMLElement | null;
        if (!element) return false;
        if (element.isContentEditable) return true;
        const tag = element.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
        return Boolean(element.closest('input, textarea, select, [contenteditable="true"]'));
      })();

      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'c') {
        if (isTyping) return;
        event.preventDefault();
        void clipboard.handleCopySelection();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'v') {
        if (isTyping) return;
        event.preventDefault();
        void clipboard.handlePasteSelection();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'x') {
        if (isTyping) return;
        event.preventDefault();
        void clipboard.handleCutSelection();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'd') {
        if (isTyping) return;
        event.preventDefault();
        clipboard.handleDuplicateSelection();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'a') {
        if (isTyping) return;
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
        if (isTyping) return;
        if (selectedEdgeId) {
          event.preventDefault();
          connectionActions.handleRemoveEdge(selectedEdgeId);
        } else if (selectedNodeId) {
          event.preventDefault();
          nodeActions.handleDeleteSelectedNode();
        }
        return;
      }
      if (!modifier && event.key.toLowerCase() === 'f') {
        if (isTyping) return;
        event.preventDefault();
        if (event.shiftKey) {
          nav.fitToSelection();
          return;
        }
        nav.fitToNodes();
        return;
      }
      if ((modifier && event.key === '0') || (!modifier && event.key.toLowerCase() === 'r')) {
        if (isTyping) return;
        event.preventDefault();
        nav.resetView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    clipboard,
    connectionActions,
    nodeActions,
    nav,
    endConnection,
    setNodeSelection,
    selectEdge,
    nodes,
    selectedEdgeId,
    selectedNodeId,
    viewportRef,
    canvasRef,
  ]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      const targetWithinCanvas = ((): boolean => {
        if (!(event.target instanceof Node)) return false;
        return (
          viewportRef.current?.contains(event.target) ||
          canvasRef.current?.contains(event.target) ||
          false
        );
      })();
      hasCanvasKeyboardFocusRef.current = targetWithinCanvas;

      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-port]')) return;
      if (target?.closest('path')) return;
      if (target?.closest('[data-edge-panel]')) return;

      endConnection();
      selectEdge(null);
    };
    const handlePointerUp = (event: PointerEvent): void => {
      setMarqueeSelection(null);
      const target = event.target as HTMLElement | null;
      const portElement = target?.closest('[data-port]') as HTMLElement | null;
      const portDirection = portElement?.getAttribute('data-port');
      if (portDirection === 'input') {
        // Let input-port handlers complete a connection before any global cancel.
        return;
      }
      if (portDirection === 'output') {
        endConnection();
        return;
      }
      if (target?.closest('[data-edge-panel]')) return;
      endConnection();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [endConnection, selectEdge, viewportRef, canvasRef]);

  useEffect(() => {
    return () => {
      if (nodeActions.rafIdRef.current !== null) cancelAnimationFrame(nodeActions.rafIdRef.current);
      if (nav.viewAnimationRafRef.current !== null)
        cancelAnimationFrame(nav.viewAnimationRafRef.current);
      if (nav.wheelZoomRafRef.current !== null) cancelAnimationFrame(nav.wheelZoomRafRef.current);
      if (touchLongPressIndicatorRafRef.current !== null)
        cancelAnimationFrame(touchLongPressIndicatorRafRef.current);
      if (nav.panInertiaRafRef.current !== null) cancelAnimationFrame(nav.panInertiaRafRef.current);
      const pendingLongPress = touchLongPressSelectionRef.current;
      if (pendingLongPress?.timerId != null) window.clearTimeout(pendingLongPress.timerId);
      if (touchLongPressIndicatorHideTimerRef.current !== null)
        window.clearTimeout(touchLongPressIndicatorHideTimerRef.current);
      activeTouchPointersRef.current.clear();
      nodeActions.dragSelectionRef.current = null;
    };
  }, [
    nodeActions,
    nav,
    touchLongPressIndicatorRafRef,
    touchLongPressSelectionRef,
    touchLongPressIndicatorHideTimerRef,
  ]);

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

  const isPanning = Boolean(panState);

  return {
    viewportRef,
    canvasRef,
    view,
    panState,
    dragState,
    connecting,
    connectingPos,
    selectionMarqueeRect,
    touchLongPressIndicator,
    lastDrop,
    edgePaths,
    ...nodeActions,
    ...connectionActions,
    ...clipboard,
    ...nav,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleWheel,
    ConfirmationModal,
    pruneRuntimeInputs: pruneRuntimeInputsInternal,
    isPanning,
  };
}
