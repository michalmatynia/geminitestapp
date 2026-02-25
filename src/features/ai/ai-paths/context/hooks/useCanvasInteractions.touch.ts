import { useCallback } from 'react';
import { clampScale, clampTranslate } from '@/features/ai/ai-paths/lib';
import {
  TOUCH_PINCH_MIN_DISTANCE,
  TOUCH_LONG_PRESS_SELECTION_DELAY_MS,
  TOUCH_LONG_PRESS_HAPTIC_MS,
  TOUCH_LONG_PRESS_ACTIVATED_VISIBLE_MS,
  type TouchGestureState,
  type TouchLongPressIndicatorState,
  type TouchLongPressSelectionState,
  type TouchPointSample,
  type MarqueeMode,
} from './useCanvasInteractions.helpers';

export interface UseCanvasInteractionsTouchValue {
  clearTouchLongPressIndicator: () => void;
  startTouchLongPressIndicatorLoop: () => void;
  triggerTouchLongPressActivatedFeedback: (x: number, y: number) => void;
  cancelTouchLongPressSelection: () => void;
  startPinchGestureFromActivePointers: () => boolean;
  beginMarqueeSelectionFromClient: (clientX: number, clientY: number, mode: MarqueeMode, baseNodeIds: string[]) => boolean;
  appendTouchPanSample: (pointerId: number, x: number, y: number, time: number) => void;
}

export function useCanvasInteractionsTouch({
  activeTouchPointersRef,
  touchGestureRef,
  touchLongPressSelectionRef,
  touchLongPressIndicatorRafRef,
  touchLongPressIndicatorHideTimerRef,
  viewportRef,
  latestViewRef,
  setViewClamped,
  resolveViewportPointFromClient,
  setTouchLongPressIndicator,
  setNodeSelection,
  selectEdge,
  setMarqueeSelection,
  startPan,
  panState,
  endPan,
  endConnection,
}: {
  activeTouchPointersRef: React.MutableRefObject<Map<number, TouchPointSample>>;
  touchGestureRef: React.MutableRefObject<TouchGestureState | null>;
  touchLongPressSelectionRef: React.MutableRefObject<TouchLongPressSelectionState | null>;
  touchLongPressIndicatorRafRef: React.MutableRefObject<number | null>;
  touchLongPressIndicatorHideTimerRef: React.MutableRefObject<number | null>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  latestViewRef: React.MutableRefObject<{ x: number; y: number; scale: number }>;
  setViewClamped: (view: { x: number; y: number; scale: number }) => void;
  resolveViewportPointFromClient: (clientX: number, clientY: number) => { x: number; y: number } | null;
  setTouchLongPressIndicator: React.Dispatch<React.SetStateAction<TouchLongPressIndicatorState | null>>;
  setNodeSelection: (nodeIds: string[]) => void;
  selectEdge: (edgeId: string | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setMarqueeSelection: React.Dispatch<React.SetStateAction<any>>;
  startPan: (clientX: number, clientY: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  panState: any;
  endPan: () => void;
  endConnection: () => void;
}): UseCanvasInteractionsTouchValue {
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
  }, [setTouchLongPressIndicator, touchLongPressIndicatorRafRef, touchLongPressIndicatorHideTimerRef]);

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
  }, [setTouchLongPressIndicator, touchLongPressIndicatorRafRef, touchLongPressSelectionRef]);

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
    [setTouchLongPressIndicator, touchLongPressIndicatorRafRef, touchLongPressIndicatorHideTimerRef]
  );

  const cancelTouchLongPressSelection = useCallback((): void => {
    const pending = touchLongPressSelectionRef.current;
    if (pending?.timerId != null) {
      window.clearTimeout(pending.timerId);
    }
    touchLongPressSelectionRef.current = null;
    clearTouchLongPressIndicator();
  }, [clearTouchLongPressIndicator, touchLongPressSelectionRef]);

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
  }, [viewportRef, latestViewRef, activeTouchPointersRef, touchGestureRef]);

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
    [selectEdge, setNodeSelection, viewportRef, setMarqueeSelection]
  );

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
          time - sample.time <= 140 // TOUCH_PAN_INERTIA_SAMPLE_WINDOW_MS
      );
      touchGestureRef.current = {
        mode: 'pan',
        pointerId,
        recentSamples,
      };
    },
    [touchGestureRef]
  );

  return {
    clearTouchLongPressIndicator,
    startTouchLongPressIndicatorLoop,
    triggerTouchLongPressActivatedFeedback,
    cancelTouchLongPressSelection,
    startPinchGestureFromActivePointers,
    beginMarqueeSelectionFromClient,
    appendTouchPanSample,
  };
}
