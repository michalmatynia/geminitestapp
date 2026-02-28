import { useCallback, useRef } from 'react';
import { 
  type TouchPointSample,
  type TouchGestureState,
  type TouchLongPressSelectionState,
} from '../useCanvasInteractions.helpers';

export function useCanvasTouchHandlers(args: {
  nav: any;
}) {
  const activeTouchPointersRef = useRef<Map<number, TouchPointSample>>(new Map());
  const touchGestureRef = useRef<TouchGestureState | null>(null);
  const touchLongPressSelectionRef = useRef<TouchLongPressSelectionState | null>(null);
  const touchLongPressIndicatorRafRef = useRef<number | null>(null);
  const touchLongPressIndicatorHideTimerRef = useRef<number | null>(null);

  const maybeStartTouchPanInertia = useCallback(
    (lastSample: TouchPointSample): void => {
      const now = performance.now();
      const s = lastSample as any;
      if (now - (s.ts ?? s.time) > 100) return;
      args.nav.startPanInertia(s.vx ?? 0, s.vy ?? 0);
    },
    [args.nav]
  );

  return {
    maybeStartTouchPanInertia,
    activeTouchPointersRef,
    touchGestureRef,
    touchLongPressSelectionRef,
    touchLongPressIndicatorRafRef,
    touchLongPressIndicatorHideTimerRef,
  };
}
