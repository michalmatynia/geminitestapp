import { useCallback, useRef } from 'react';
import type { AiNode } from '@/features/ai/ai-paths/lib';
import {
  clampScale,
  clampTranslate,
  VIEW_MARGIN,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
} from '@/features/ai/ai-paths/lib';
import {
  ZOOM_ANIMATION_DURATION_MS,
  WHEEL_ZOOM_EASING,
  WHEEL_ZOOM_SENSITIVITY,
  WHEEL_ZOOM_STOP_THRESHOLD,
  TOUCH_PAN_INERTIA_FRICTION_PER_FRAME,
  TOUCH_PAN_INERTIA_STOP_SPEED,
} from './useCanvasInteractions.helpers';

export interface UseCanvasInteractionsNavigationValue {
  stopViewAnimation: () => void;
  stopPanInertia: () => void;
  stopProgrammaticViewAnimation: () => void;
  setViewClamped: (view: { x: number; y: number; scale: number }) => void;
  startPanInertia: (vx: number, vy: number) => void;
  getZoomTargetView: (targetScale: number, anchorClientPos?: { x: number; y: number } | null) => { x: number; y: number; scale: number };
  startWheelZoomLoop: () => void;
  animateViewTo: (target: { x: number; y: number; scale: number }, durationMs?: number) => void;
  zoomTo: (targetScale: number) => void;
  fitToNodes: () => void;
  fitToSelection: () => void;
  resetView: () => void;
  centerOnCanvasPoint: (canvasX: number, canvasY: number) => void;
  applyWheelZoom: (
    deltaY: number,
    clientX: number,
    clientY: number,
    deltaMode?: number,
    ctrlKey?: boolean
  ) => void;
  wheelZoomRafRef: React.MutableRefObject<number | null>;
  viewAnimationRafRef: React.MutableRefObject<number | null>;
  panInertiaRafRef: React.MutableRefObject<number | null>;
  ensureNodeVisible: (node: AiNode) => void;
}

export function useCanvasInteractionsNavigation({
  view,
  latestViewRef,
  updateView,
  viewportRef,
  nodes,
  resolveActiveNodeSelectionIds,
  updateLastPointerCanvasPosFromClient,
}: {
  view: { x: number; y: number; scale: number };
  latestViewRef: React.MutableRefObject<{ x: number; y: number; scale: number }>;
  updateView: (view: { x: number; y: number; scale: number }) => void;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  nodes: AiNode[];
  resolveActiveNodeSelectionIds: () => string[];
  updateLastPointerCanvasPosFromClient: (clientX: number, clientY: number) => { x: number; y: number } | null;
}): UseCanvasInteractionsNavigationValue {
  const viewAnimationRafRef = useRef<number | null>(null);
  const wheelZoomRafRef = useRef<number | null>(null);
  const wheelZoomTargetRef = useRef<{
    scale: number;
    anchorClientPos: { x: number; y: number } | null;
  } | null>(null);
  const panInertiaRafRef = useRef<number | null>(null);
  const panInertiaVelocityRef = useRef<{
    vx: number;
    vy: number;
    lastTs: number;
  } | null>(null);

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

  const setViewClamped = useCallback((next: { x: number; y: number; scale: number }): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const clampedScale = clampScale(next.scale);
    const clamped = clampTranslate(next.x, next.y, clampedScale, viewport);
    const resolved = { x: clamped.x, y: clamped.y, scale: clampedScale };
    latestViewRef.current = resolved;
    updateView(resolved);
  }, [viewportRef, updateView, latestViewRef]);

  const stopViewAnimation = useCallback((): void => {
    stopProgrammaticViewAnimation();
    if (wheelZoomRafRef.current !== null) {
      cancelAnimationFrame(wheelZoomRafRef.current);
      wheelZoomRafRef.current = null;
    }
    wheelZoomTargetRef.current = null;
    stopPanInertia();
  }, [stopPanInertia, stopProgrammaticViewAnimation]);

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
  }, [setViewClamped, stopPanInertia, viewportRef, latestViewRef]);

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
    [viewportRef, latestViewRef]
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
  }, [getZoomTargetView, setViewClamped, latestViewRef]);

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
    [setViewClamped, stopViewAnimation, latestViewRef]
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
  }, [animateViewTo, viewportRef, latestViewRef]);

  const applyWheelZoom = useCallback(
    (
      deltaY: number,
      clientX: number,
      clientY: number,
      deltaMode = 0,
      ctrlKey = false
    ): void => {
      stopProgrammaticViewAnimation();
      let normalizedDeltaY = Number.isFinite(deltaY) ? deltaY : 0;
      // Normalize wheel units and amplify very small trackpad deltas.
      if (deltaMode === 1) {
        normalizedDeltaY *= 16;
      } else if (deltaMode === 2) {
        normalizedDeltaY *= 120;
      }
      const isPinchLikeGesture = Boolean(ctrlKey);
      if (isPinchLikeGesture) {
        normalizedDeltaY *= 3;
      }
      const absDelta = Math.abs(normalizedDeltaY);
      if (absDelta > 0 && absDelta < 4) {
        normalizedDeltaY *= isPinchLikeGesture ? 10 : 6;
      }
      if (isPinchLikeGesture && Math.abs(normalizedDeltaY) > 0 && Math.abs(normalizedDeltaY) < 1.25) {
        normalizedDeltaY = Math.sign(normalizedDeltaY) * 1.25;
      }
      const baseScale = wheelZoomTargetRef.current?.scale ?? latestViewRef.current.scale;
      const zoomFactor = Math.exp((-normalizedDeltaY) * WHEEL_ZOOM_SENSITIVITY);
      const targetScale = clampScale(baseScale * zoomFactor);
      if (!Number.isFinite(targetScale)) return;
      const previousTargetScale =
        wheelZoomTargetRef.current?.scale ?? latestViewRef.current.scale;
      if (Math.abs(targetScale - previousTargetScale) < 0.000001) {
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
      latestViewRef,
    ]
  );

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

  return {
    stopViewAnimation,
    stopPanInertia,
    stopProgrammaticViewAnimation,
    setViewClamped,
    startPanInertia,
    getZoomTargetView,
    startWheelZoomLoop,
    animateViewTo,
    zoomTo,
    fitToNodes,
    fitToSelection,
    resetView,
    centerOnCanvasPoint,
    applyWheelZoom,
    wheelZoomRafRef,
    viewAnimationRafRef,
    panInertiaRafRef,
    ensureNodeVisible,
  };
}
