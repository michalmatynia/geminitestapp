import { useCallback } from 'react';

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
  type MarqueeSelectionState,
} from './useCanvasInteractions.helpers';

export interface UseCanvasInteractionsTouchValue {
  clearTouchLongPressIndicator: () => void;
  startTouchLongPressIndicatorLoop: () => void;
  triggerTouchLongPressActivatedFeedback: (x: number, y: number) => void;
  cancelTouchLongPressSelection: () => void;
  startPinchGestureFromActivePointers: () => boolean;
  beginMarqueeSelectionFromClient: (
    clientX: number,
    clientY: number,
    mode: MarqueeMode,
    baseNodeIds: string[]
  ) => boolean;
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
  setTouchLongPressIndicator,
  setNodeSelection,
  selectEdge,
  setMarqueeSelection,
}: {
  activeTouchPointersRef: React.MutableRefObject<Map<number, TouchPointSample>>;
  touchGestureRef: React.MutableRefObject<TouchGestureState | null>;
  touchLongPressSelectionRef: React.MutableRefObject<TouchLongPressSelectionState | null>;
  touchLongPressIndicatorRafRef: React.MutableRefObject<number | null>;
  touchLongPressIndicatorHideTimerRef: React.MutableRefObject<number | null>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  latestViewRef: React.MutableRefObject<{ x: number; y: number; scale: number }>;
  setTouchLongPressIndicator: React.Dispatch<
    React.SetStateAction<TouchLongPressIndicatorState | null>
  >;
  setNodeSelection: (nodeIds: string[]) => void;
  selectEdge: (edgeId: string | null) => void;
  setMarqueeSelection: React.Dispatch<React.SetStateAction<MarqueeSelectionState | null>>;
}): UseCanvasInteractionsTouchValue {
  const clearTouchLongPressIndicator = useCallback((): void => {
    if (touchLongPressIndicatorRafRef.current !== null) {
      cancelAnimationFrame(touchLongPressIndicatorRafRef.current);
      touchLongPressIndicatorRafRef.current = null;
    }
    setTouchLongPressIndicator(null);
  }, [setTouchLongPressIndicator, touchLongPressIndicatorRafRef]);

  const startTouchLongPressIndicatorLoop = useCallback((): void => {
    if (touchLongPressIndicatorRafRef.current !== null) return;
    const loop = (now: number): void => {
      const state = touchLongPressSelectionRef.current;
      if (!state) {
        touchLongPressIndicatorRafRef.current = null;
        return;
      }
      const elapsed = now - state.startedAt;
      const progress = Math.min(1, elapsed / TOUCH_LONG_PRESS_SELECTION_DELAY_MS);
      setTouchLongPressIndicator({
        x: state.indicatorViewportX,
        y: state.indicatorViewportY,
        progress,
        phase: 'pending',
      });
      if (progress < 1) {
        touchLongPressIndicatorRafRef.current = requestAnimationFrame(loop);
      } else {
        touchLongPressIndicatorRafRef.current = null;
      }
    };
    touchLongPressIndicatorRafRef.current = requestAnimationFrame(loop);
  }, [setTouchLongPressIndicator, touchLongPressIndicatorRafRef, touchLongPressSelectionRef]);

  const triggerTouchLongPressActivatedFeedback = useCallback(
    (x: number, y: number): void => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(TOUCH_LONG_PRESS_HAPTIC_MS);
        } catch {
          // Ignore vibration errors
        }
      }
      setTouchLongPressIndicator({ x, y, progress: 1, phase: 'activated' });
      if (touchLongPressIndicatorHideTimerRef.current !== null) {
        window.clearTimeout(touchLongPressIndicatorHideTimerRef.current);
      }
      touchLongPressIndicatorHideTimerRef.current = window.setTimeout(() => {
        setTouchLongPressIndicator(null);
        touchLongPressIndicatorHideTimerRef.current = null;
      }, TOUCH_LONG_PRESS_ACTIVATED_VISIBLE_MS);
    },
    [setTouchLongPressIndicator, touchLongPressIndicatorHideTimerRef]
  );

  const cancelTouchLongPressSelection = useCallback((): void => {
    const pending = touchLongPressSelectionRef.current;
    if (pending?.timerId !== null && pending?.timerId !== undefined) {
      window.clearTimeout(pending.timerId);
    }
    touchLongPressSelectionRef.current = null;
    clearTouchLongPressIndicator();
  }, [clearTouchLongPressIndicator, touchLongPressSelectionRef]);

  const startPinchGestureFromActivePointers = useCallback((): boolean => {
    const entries = Array.from(activeTouchPointersRef.current.entries());
    if (entries.length < 2) return false;
    const firstEntry = entries[0];
    const secondEntry = entries[1];
    if (!firstEntry || !secondEntry) return false;
    const [id1, p1] = firstEntry;
    const [id2, p2] = secondEntry;
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return false;
    const midViewportX = (p1.x + p2.x) / 2 - viewport.left;
    const midViewportY = (p1.y + p2.y) / 2 - viewport.top;
    const currentView = latestViewRef.current;
    const anchorCanvas = {
      x: (midViewportX - currentView.x) / currentView.scale,
      y: (midViewportY - currentView.y) / currentView.scale,
    };
    touchGestureRef.current = {
      mode: 'pinch',
      pointerIds: [id1, id2],
      startDistance: Math.max(TOUCH_PINCH_MIN_DISTANCE, Math.hypot(p2.x - p1.x, p2.y - p1.y)),
      startScale: currentView.scale,
      anchorCanvas,
    };
    return true;
  }, [activeTouchPointersRef, latestViewRef, touchGestureRef, viewportRef]);

  const beginMarqueeSelectionFromClient = useCallback(
    (clientX: number, clientY: number, mode: MarqueeMode, baseNodeIds: string[]): boolean => {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return false;
      const viewportX = clientX - viewport.left;
      const viewportY = clientY - viewport.top;
      setMarqueeSelection({
        mode,
        startX: viewportX,
        startY: viewportY,
        currentX: viewportX,
        currentY: viewportY,
        baseNodeIds,
      });
      setNodeSelection(baseNodeIds);
      selectEdge(null);
      return true;
    },
    [selectEdge, setMarqueeSelection, setNodeSelection, viewportRef]
  );

  const appendTouchPanSample = useCallback(
    (pointerId: number, x: number, y: number, time: number): void => {
      const gesture = touchGestureRef.current;
      if (gesture?.mode !== 'pan' || gesture.pointerId !== pointerId) {
        touchGestureRef.current = {
          mode: 'pan',
          pointerId,
          recentSamples: [{ x, y, time }],
        };
        return;
      }
      const samples = gesture.recentSamples;
      samples.push({ x, y, time });
      if (samples.length > 5) {
        samples.shift();
      }
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
