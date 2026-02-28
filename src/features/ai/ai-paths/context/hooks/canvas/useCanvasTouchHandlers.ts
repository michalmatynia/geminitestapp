import { useCallback, useRef } from 'react';
import { 
  type TouchPointSample,
  type TouchGestureState,
  type TouchLongPressSelectionState,
} from '../useCanvasInteractions.helpers';
import { type UseCanvasInteractionsNavigationValue } from '../useCanvasInteractions.navigation';

export function useCanvasTouchHandlers(args: {
  nav: UseCanvasInteractionsNavigationValue;
}) {
  const activeTouchPointersRef = useRef<Map<number, TouchPointSample>>(new Map());
  const touchGestureRef = useRef<TouchGestureState | null>(null);
  const touchLongPressSelectionRef = useRef<TouchLongPressSelectionState | null>(null);
  const touchLongPressIndicatorRafRef = useRef<number | null>(null);
  const touchLongPressIndicatorHideTimerRef = useRef<number | null>(null);

  const maybeStartTouchPanInertia = useCallback(
    (lastSample: TouchPointSample): void => {
      const now = performance.now();
      if (now - (lastSample.ts ?? lastSample.time ?? 0) > 100) return;
      args.nav.startPanInertia(lastSample.vx ?? 0, lastSample.vy ?? 0);
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
