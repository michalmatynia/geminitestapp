import { useCallback, useRef } from 'react';
import { clampScale } from '@/shared/lib/ai-paths';
import { type UseCanvasInteractionsNavigationValue } from '../useCanvasInteractions.navigation';

export interface UseCanvasEventHandlersValue {
  handleWheel: (event: React.WheelEvent) => void;
  wheelGestureActiveUntilRef: React.MutableRefObject<number>;
}

export function useCanvasEventHandlers(args: {
  viewportRef: React.RefObject<HTMLDivElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  view: { scale: number; panX: number; panY: number };
  nav: UseCanvasInteractionsNavigationValue;
  updateLastPointerCanvasPosFromClient: (x: number, y: number) => void;
  resolveViewportPointFromClient: (x: number, y: number) => { x: number; y: number } | null;
}): UseCanvasEventHandlersValue {
  const { nav, resolveViewportPointFromClient, updateLastPointerCanvasPosFromClient } = args;

  const wheelGestureActiveUntilRef = useRef(0);

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

  const isWheelLikelyZoomGesture = useCallback((event: React.WheelEvent): boolean => {
    if (event.ctrlKey || event.metaKey) return true;
    if (performance.now() < wheelGestureActiveUntilRef.current) return true;
    return false;
  }, []);

  const isWheelTargetInsideCanvas = useCallback(
    (event: React.WheelEvent): boolean => isPointInsideCanvas(event.clientX, event.clientY),
    [isPointInsideCanvas]
  );

  const applyWheelZoomFromEvent = useCallback(
    (event: React.WheelEvent): void => {
      const zoomFactor = 1 - event.deltaY * 0.0015;
      const targetScale = clampScale(args.view.scale * zoomFactor);
      const anchor = resolveViewportPointFromClient(event.clientX, event.clientY);
      const targetView = nav.getZoomTargetView(targetScale, anchor);
      nav.setViewClamped(targetView);
      if (anchor) {
        updateLastPointerCanvasPosFromClient(event.clientX, event.clientY);
      }
    },
    [args.view.scale, nav, resolveViewportPointFromClient, updateLastPointerCanvasPosFromClient]
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent): void => {
      const isZoom = isWheelLikelyZoomGesture(event);
      if (!isZoom) return;

      if (isWheelTargetInsideCanvas(event)) {
        event.preventDefault();
        event.stopPropagation();
        applyWheelZoomFromEvent(event);
      }
    },
    [isWheelLikelyZoomGesture, isWheelTargetInsideCanvas, applyWheelZoomFromEvent]
  );

  return {
    handleWheel,
    wheelGestureActiveUntilRef,
  };
}
