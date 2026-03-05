import { useCallback, useEffect, useRef } from 'react';
import { clampScale } from '@/shared/lib/ai-paths';
import { type UseCanvasInteractionsNavigationValue } from '../useCanvasInteractions.navigation';

export interface UseCanvasEventHandlersValue {
  handleWheel: (event: React.WheelEvent) => void;
  wheelGestureActiveUntilRef: React.MutableRefObject<number>;
}

export function useCanvasEventHandlers(args: {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  view: { scale: number; panX: number; panY: number };
  nav: UseCanvasInteractionsNavigationValue;
  updateLastPointerCanvasPosFromClient: (x: number, y: number) => void;
  resolveViewportPointFromClient: (x: number, y: number) => { x: number; y: number } | null;
}): UseCanvasEventHandlersValue {
  const { nav, resolveViewportPointFromClient, updateLastPointerCanvasPosFromClient } = args;

  const wheelGestureActiveUntilRef = useRef(0);
  const wheelGestureSourceRef = useRef<'wheel-modifier' | 'safari' | null>(null);
  const safariGestureScaleRef = useRef<number | null>(null);
  const latestScaleRef = useRef(args.view.scale);
  latestScaleRef.current = args.view.scale;

  type WheelLikeEvent = {
    defaultPrevented?: boolean;
    preventDefault: () => void;
    stopPropagation?: () => void;
    deltaY: number;
    deltaX: number;
    deltaMode: number;
    clientX: number;
    clientY: number;
    ctrlKey: boolean;
    metaKey: boolean;
  };

  const resolveViewportCenter = useCallback((): { x: number; y: number } | null => {
    const rect = args.viewportRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, [args.viewportRef]);

  const isPointInsideCanvas = useCallback(
    (clientX: number, clientY: number): boolean => {
      const viewport = args.viewportRef.current?.getBoundingClientRect();
      if (!viewport) return false;
      return (
        clientX >= viewport.left &&
        clientX <= viewport.right &&
        clientY >= viewport.top &&
        clientY <= viewport.bottom
      );
    },
    [args.viewportRef]
  );

  const isWheelLikelyZoomGesture = useCallback((event: WheelLikeEvent): boolean => {
    // Classify the wheel source for gesture continuity tracking.
    // Unmodified in-canvas wheel is also treated as zoom by handleWheelLike.
    if (event.ctrlKey || event.metaKey) return true;
    if (performance.now() >= wheelGestureActiveUntilRef.current) return false;
    return wheelGestureSourceRef.current === 'safari';
  }, []);

  const applyWheelZoomFromEvent = useCallback(
    (event: WheelLikeEvent): void => {
      const hasFiniteClient = Number.isFinite(event.clientX) && Number.isFinite(event.clientY);
      const anchorClient = hasFiniteClient
        ? { x: event.clientX, y: event.clientY }
        : resolveViewportCenter();
      if (!anchorClient) return;
      nav.applyWheelZoom(
        event.deltaY,
        anchorClient.x,
        anchorClient.y,
        event.deltaMode,
        event.ctrlKey,
        event.metaKey,
        event.deltaX
      );
    },
    [nav, resolveViewportCenter]
  );

  const handleWheelLike = useCallback(
    (event: WheelLikeEvent): void => {
      if (event.defaultPrevented) return;
      const now = performance.now();
      const insideByPoint = isPointInsideCanvas(event.clientX, event.clientY);
      if (!insideByPoint) return;
      const likelyZoomGesture = isWheelLikelyZoomGesture(event);

      wheelGestureSourceRef.current =
        event.ctrlKey || event.metaKey ? 'wheel-modifier' : likelyZoomGesture ? 'safari' : null;
      wheelGestureActiveUntilRef.current = now + 1800;
      event.preventDefault();
      event.stopPropagation?.();
      applyWheelZoomFromEvent(event);
    },
    [applyWheelZoomFromEvent, isPointInsideCanvas, isWheelLikelyZoomGesture]
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent): void => {
      handleWheelLike(event);
    },
    [handleWheelLike]
  );

  useEffect(() => {
    const handleNativeWheel = (event: WheelEvent): void => {
      handleWheelLike(event);
    };
    window.addEventListener('wheel', handleNativeWheel, { passive: false, capture: true });
    return (): void => {
      window.removeEventListener('wheel', handleNativeWheel, true);
    };
  }, [handleWheelLike]);

  useEffect(() => {
    const viewportElement = args.viewportRef.current;
    if (!viewportElement) return;

    const resolveAnchorClient = (
      event: Event & {
        clientX?: number;
        clientY?: number;
        pageX?: number;
        pageY?: number;
      }
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
      if (clientX != null && clientY != null) {
        return { x: clientX, y: clientY };
      }
      return resolveViewportCenter();
    };

    const handleGestureStart = (rawEvent: Event): void => {
      const event = rawEvent as Event & { scale?: number; clientX?: number; clientY?: number };
      const anchorClient = resolveAnchorClient(event);
      if (!anchorClient || !isPointInsideCanvas(anchorClient.x, anchorClient.y)) return;
      rawEvent.preventDefault();
      wheelGestureSourceRef.current = 'safari';
      wheelGestureActiveUntilRef.current = performance.now() + 1800;
      const nextScale = Number(event.scale);
      safariGestureScaleRef.current = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
    };

    const handleGestureChange = (rawEvent: Event): void => {
      const event = rawEvent as Event & { scale?: number; clientX?: number; clientY?: number };
      const anchorClient = resolveAnchorClient(event);
      if (!anchorClient || !isPointInsideCanvas(anchorClient.x, anchorClient.y)) return;
      rawEvent.preventDefault();
      const previousGestureScale = safariGestureScaleRef.current ?? 1;
      const nextGestureScale = Number(event.scale);
      if (
        !Number.isFinite(previousGestureScale) ||
        previousGestureScale <= 0 ||
        !Number.isFinite(nextGestureScale) ||
        nextGestureScale <= 0
      ) {
        return;
      }
      const scaleFactor = nextGestureScale / previousGestureScale;
      safariGestureScaleRef.current = nextGestureScale;
      if (!Number.isFinite(scaleFactor) || Math.abs(scaleFactor - 1) < 0.0001) return;

      wheelGestureSourceRef.current = 'safari';
      wheelGestureActiveUntilRef.current = performance.now() + 1800;
      const anchor = resolveViewportPointFromClient(anchorClient.x, anchorClient.y);
      const targetScale = clampScale(latestScaleRef.current * scaleFactor);
      const targetView = nav.getZoomTargetView(targetScale, anchor);
      nav.setViewClamped(targetView);
      updateLastPointerCanvasPosFromClient(anchorClient.x, anchorClient.y);
    };

    const handleGestureEnd = (): void => {
      safariGestureScaleRef.current = null;
      if (wheelGestureSourceRef.current === 'safari') {
        wheelGestureSourceRef.current = null;
        wheelGestureActiveUntilRef.current = 0;
      }
    };

    viewportElement.addEventListener('gesturestart', handleGestureStart, { passive: false });
    viewportElement.addEventListener('gesturechange', handleGestureChange, { passive: false });
    viewportElement.addEventListener('gestureend', handleGestureEnd);
    return (): void => {
      viewportElement.removeEventListener('gesturestart', handleGestureStart);
      viewportElement.removeEventListener('gesturechange', handleGestureChange);
      viewportElement.removeEventListener('gestureend', handleGestureEnd);
    };
  }, [
    args.viewportRef,
    isPointInsideCanvas,
    nav,
    resolveViewportCenter,
    resolveViewportPointFromClient,
    updateLastPointerCanvasPosFromClient,
  ]);

  return {
    handleWheel,
    wheelGestureActiveUntilRef,
  };
}
