'use client';

import { useCallback, useEffect, type Dispatch, type MutableRefObject, type PointerEvent as ReactPointerEvent, type SetStateAction } from 'react';

import { clampTutorPanelPoint, snapTutorPanelPoint } from './KangurAiTutorWidget.shared';
import { persistTutorPanelPosition } from './KangurAiTutorWidget.storage';

import type { TutorPanelDragState, TutorPoint } from './KangurAiTutorWidget.types';
import type { TutorPanelSnapState } from './KangurAiTutorWidget.shared';

const PANEL_DRAG_THRESHOLD = 6;
const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, option, [role="button"], [role="link"]';

const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element ? Boolean(target.closest(INTERACTIVE_SELECTOR)) : false;

const getDraggedPanelPoint = (input: {
  dragState: TutorPanelDragState;
  pointerPoint: TutorPoint;
  viewport: {
    height: number;
    width: number;
  };
}): TutorPoint =>
  clampTutorPanelPoint(
    {
      x: input.dragState.origin.x + (input.pointerPoint.x - input.dragState.startX),
      y: input.dragState.origin.y + (input.pointerPoint.y - input.dragState.startY),
    },
    input.viewport,
    {
      width: input.dragState.width,
      height: input.dragState.height,
    }
  );

export function useKangurAiTutorPanelDrag(input: {
  isPanelDraggable: boolean;
  isPanelDragging: boolean;
  panelDragStateRef: MutableRefObject<TutorPanelDragState | null>;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  setIsPanelDragging: Dispatch<SetStateAction<boolean>>;
  setPanelPosition: Dispatch<SetStateAction<TutorPoint | null>>;
  setPanelPositionMode: Dispatch<SetStateAction<'contextual' | 'manual'>>;
  setPanelSnapPreference: Dispatch<SetStateAction<TutorPanelSnapState>>;
  viewport: { height: number; width: number };
}) {
  const {
    isPanelDraggable,
    isPanelDragging,
    panelDragStateRef,
    panelRef,
    setIsPanelDragging,
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
    viewport,
  } = input;

  const handlePanelHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      if (event.button !== 0 || !isPanelDraggable || isInteractiveTarget(event.target)) {
        return;
      }

      const panelRect = panelRef.current?.getBoundingClientRect();
      if (!panelRect || panelRect.width <= 0 || panelRect.height <= 0) {
        return;
      }

      const origin = clampTutorPanelPoint(
        {
          x: panelRect.left,
          y: panelRect.top,
        },
        viewport,
        {
          width: panelRect.width,
          height: panelRect.height,
        }
      );

      panelDragStateRef.current = {
        height: panelRect.height,
        moved: false,
        origin,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: panelRect.width,
      };
      setIsPanelDragging(true);
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [isPanelDraggable, panelDragStateRef, panelRef, setIsPanelDragging, viewport]
  );

  const updatePanelDrag = useCallback(
    (pointerId: number, clientX: number, clientY: number): void => {
      const dragState = panelDragStateRef.current;
      if (dragState?.pointerId !== pointerId) {
        return;
      }

      const pointerPoint = { x: clientX, y: clientY };
      if (
        !dragState.moved &&
        Math.hypot(pointerPoint.x - dragState.startX, pointerPoint.y - dragState.startY) >=
          PANEL_DRAG_THRESHOLD
      ) {
        dragState.moved = true;
      }

      if (!dragState.moved) {
        return;
      }

      setPanelPosition(getDraggedPanelPoint({ dragState, pointerPoint, viewport }));
    },
    [panelDragStateRef, setPanelPosition, viewport]
  );

  const finishPanelDrag = useCallback(
    (pointerId: number, clientX?: number, clientY?: number): void => {
      const dragState = panelDragStateRef.current;
      if (dragState?.pointerId !== pointerId) {
        return;
      }

      panelDragStateRef.current = null;
      setIsPanelDragging(false);

      if (!dragState.moved || clientX === undefined || clientY === undefined) {
        return;
      }

      const { point: nextPoint, snap } = snapTutorPanelPoint(
        getDraggedPanelPoint({
          dragState,
          pointerPoint: { x: clientX, y: clientY },
          viewport,
        }),
        viewport,
        {
          width: dragState.width,
          height: dragState.height,
        }
      );
      setPanelPosition(nextPoint);
      setPanelPositionMode('manual');
      setPanelSnapPreference(snap);
      persistTutorPanelPosition({
        left: nextPoint.x,
        mode: 'manual',
        snap,
        top: nextPoint.y,
      });
    },
    [
      panelDragStateRef,
      setIsPanelDragging,
      setPanelPosition,
      setPanelPositionMode,
      setPanelSnapPreference,
      viewport,
    ]
  );

  const handlePanelHeaderPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      updatePanelDrag(event.pointerId, event.clientX, event.clientY);
    },
    [updatePanelDrag]
  );

  const handlePanelHeaderPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      finishPanelDrag(event.pointerId, event.clientX, event.clientY);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [finishPanelDrag]
  );

  const handlePanelHeaderPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      finishPanelDrag(event.pointerId);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [finishPanelDrag]
  );

  useEffect(() => {
    if (!isPanelDragging || typeof window === 'undefined') {
      return;
    }

    const handleWindowPointerMove = (event: PointerEvent): void => {
      updatePanelDrag(event.pointerId, event.clientX, event.clientY);
    };
    const handleWindowPointerUp = (event: PointerEvent): void => {
      finishPanelDrag(event.pointerId, event.clientX, event.clientY);
    };
    const handleWindowPointerCancel = (event: PointerEvent): void => {
      finishPanelDrag(event.pointerId);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, true);
    window.addEventListener('pointerup', handleWindowPointerUp, true);
    window.addEventListener('pointercancel', handleWindowPointerCancel, true);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove, true);
      window.removeEventListener('pointerup', handleWindowPointerUp, true);
      window.removeEventListener('pointercancel', handleWindowPointerCancel, true);
    };
  }, [finishPanelDrag, isPanelDragging, updatePanelDrag]);

  return {
    handlePanelHeaderPointerCancel,
    handlePanelHeaderPointerDown,
    handlePanelHeaderPointerMove,
    handlePanelHeaderPointerUp,
  };
}
