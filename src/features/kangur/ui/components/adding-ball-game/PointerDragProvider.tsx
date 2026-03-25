'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

import type { JSX, ReactNode } from 'react';

import type { BallItem } from './types';
import { Ball } from './AddingBallGame.Shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DragState = {
  ballId: string;
  ball: BallItem;
  sourceZoneId: string;
  phase: 'dragging' | 'settling' | 'returning';
  /** Offset from the pointer to the top-left corner of the grabbed element. */
  offsetX: number;
  offsetY: number;
  originLeft: number;
  originTop: number;
  width: number;
  height: number;
  currentX: number;
  currentY: number;
  previewLeft: number;
  previewTop: number;
  tiltDeg: number;
};

type PointerDragContextValue = {
  dragState: DragState | null;
  hoveredZoneId: string | null;
  registerDropZone: (id: string, element: HTMLElement) => void;
  unregisterDropZone: (id: string) => void;
  startDrag: (
    ballId: string,
    ball: BallItem,
    sourceZoneId: string,
    pointerX: number,
    pointerY: number,
    element: HTMLElement
  ) => void;
};

type PointerDragProviderProps = {
  children: ReactNode;
  onDrop: (ballId: string, sourceZoneId: string, destinationZoneId: string) => void;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const PointerDragContext = createContext<PointerDragContextValue | null>(null);

export const usePointerDrag = (): PointerDragContextValue => {
  const ctx = useContext(PointerDragContext);
  if (!ctx) throw new Error('usePointerDrag must be used within PointerDragProvider');
  return ctx;
};

// ---------------------------------------------------------------------------
// Hit-testing
// ---------------------------------------------------------------------------

type DropZoneMatch = {
  id: string;
  rect: DOMRect;
};

export const POINTER_DRAG_SETTLE_DURATION_MS = 140;
export const POINTER_DRAG_RETURN_DURATION_MS = 180;

const DRAG_GRAB_SCALE = 1.08;
const DRAG_FOLLOW_TRANSITION = { type: 'spring', stiffness: 520, damping: 42, mass: 0.32 } as const;
const DRAG_SETTLE_TRANSITION = { type: 'spring', stiffness: 440, damping: 30, mass: 0.45 } as const;
const DRAG_RETURN_TRANSITION = { type: 'spring', stiffness: 360, damping: 28, mass: 0.48 } as const;
const DRAG_ROTATION_MAX_DEG = 6;
const DRAG_MAGNET_RADIUS_PX = 96;
const DRAG_MAGNET_PULL = 0.34;
const DRAG_NEAR_ZONE_PULL = 0.18;
const DRAG_TILT_DIVISOR = 9;

const findDropZoneAtPoint = (
  x: number,
  y: number,
  registry: Map<string, HTMLElement>,
): string | null => {
  for (const [id, element] of registry) {
    const rect = element.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return id;
    }
  }
  return null;
};

const getDropZoneMatch = (
  id: string,
  registry: Map<string, HTMLElement>
): DropZoneMatch | null => {
  const element = registry.get(id);
  if (!element) return null;
  return {
    id,
    rect: element.getBoundingClientRect(),
  };
};

const findNearestDropZone = (
  x: number,
  y: number,
  registry: Map<string, HTMLElement>,
  sourceZoneId: string
): DropZoneMatch | null => {
  let nearest: DropZoneMatch | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const [id, element] of registry) {
    if (id === sourceZoneId) continue;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(centerX - x, centerY - y);
    if (distance > DRAG_MAGNET_RADIUS_PX || distance >= nearestDistance) continue;
    nearest = { id, rect };
    nearestDistance = distance;
  }

  return nearest;
};

const getZoneCenterPreviewPosition = (state: DragState, rect: DOMRect): { left: number; top: number } => ({
  left: rect.left + rect.width / 2 - state.width / 2,
  top: rect.top + rect.height / 2 - state.height / 2,
});

const getDraggingPreviewPosition = (
  state: DragState,
  hoveredZoneId: string | null,
  registry: Map<string, HTMLElement>
): { left: number; top: number } => {
  const rawLeft = state.currentX - state.offsetX;
  const rawTop = state.currentY - state.offsetY;

  const hoveredMatch =
    hoveredZoneId && hoveredZoneId !== state.sourceZoneId
      ? getDropZoneMatch(hoveredZoneId, registry)
      : null;

  const magneticMatch =
    hoveredMatch ?? findNearestDropZone(state.currentX, state.currentY, registry, state.sourceZoneId);

  if (!magneticMatch) {
    return { left: rawLeft, top: rawTop };
  }

  const zoneTarget = getZoneCenterPreviewPosition(state, magneticMatch.rect);
  const pull = hoveredMatch ? DRAG_MAGNET_PULL : DRAG_NEAR_ZONE_PULL;

  return {
    left: rawLeft + (zoneTarget.left - rawLeft) * pull,
    top: rawTop + (zoneTarget.top - rawTop) * pull,
  };
};

// ---------------------------------------------------------------------------
// Floating preview
// ---------------------------------------------------------------------------

function DragOverlay({ state }: { state: DragState }): JSX.Element {
  const transition =
    state.phase === 'settling'
      ? DRAG_SETTLE_TRANSITION
      : state.phase === 'returning'
        ? DRAG_RETURN_TRANSITION
        : DRAG_FOLLOW_TRANSITION;
  const scale = state.phase === 'dragging' ? DRAG_GRAB_SCALE : 1;
  const rotate = state.phase === 'dragging' ? state.tiltDeg : 0;

  return createPortal(
    <motion.div
      data-phase={state.phase}
      data-testid='adding-ball-drag-overlay'
      aria-hidden='true'
      initial={false}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        willChange: 'transform',
        filter:
          state.phase === 'dragging'
            ? 'drop-shadow(0 10px 22px rgba(15,23,42,0.24))'
            : 'drop-shadow(0 6px 14px rgba(15,23,42,0.16))',
      }}
      animate={{
        x: state.previewLeft,
        y: state.previewTop,
        scale,
        rotate,
      }}
      transition={transition}
    >
      <Ball ball={state.ball} isCoarsePointer />
    </motion.div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PointerDragProvider({
  children,
  onDrop,
  disabled = false,
}: PointerDragProviderProps): JSX.Element {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const isDragging = dragState !== null;
  const dropZonesRef = useRef(new Map<string, HTMLElement>());
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const completionTimerRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const registerDropZone = useCallback((id: string, element: HTMLElement) => {
    dropZonesRef.current.set(id, element);
  }, []);

  const unregisterDropZone = useCallback((id: string) => {
    dropZonesRef.current.delete(id);
  }, []);

  const startDrag = useCallback(
    (
      ballId: string,
      ball: BallItem,
      sourceZoneId: string,
      pointerX: number,
      pointerY: number,
      element: HTMLElement,
    ) => {
      if (disabled) return;
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
      const rect = element.getBoundingClientRect();
      const previewLeft = rect.left;
      const previewTop = rect.top;
      lastPointerRef.current = { x: pointerX, y: pointerY };
      setDragState({
        ballId,
        ball,
        sourceZoneId,
        phase: 'dragging',
        offsetX: pointerX - rect.left,
        offsetY: pointerY - rect.top,
        originLeft: rect.left,
        originTop: rect.top,
        width: rect.width,
        height: rect.height,
        currentX: pointerX,
        currentY: pointerY,
        previewLeft,
        previewTop,
        tiltDeg: 0,
      });
    },
    [disabled],
  );

  // Global pointer move & up while dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (event: PointerEvent): void => {
      event.preventDefault();
      const x = event.clientX;
      const y = event.clientY;
      const previousPointer = lastPointerRef.current;
      lastPointerRef.current = { x, y };
      const hoveredZone = findDropZoneAtPoint(x, y, dropZonesRef.current);
      setHoveredZoneId(hoveredZone);
      setDragState((prev) => {
        if (prev?.phase !== 'dragging') return prev;
        const tiltDeg = previousPointer
          ? Math.max(
              -DRAG_ROTATION_MAX_DEG,
              Math.min(DRAG_ROTATION_MAX_DEG, (x - previousPointer.x) / DRAG_TILT_DIVISOR)
            )
          : 0;
        const nextState = {
          ...prev,
          currentX: x,
          currentY: y,
          tiltDeg,
        };
        const previewPosition = getDraggingPreviewPosition(nextState, hoveredZone, dropZonesRef.current);
        return {
          ...nextState,
          previewLeft: previewPosition.left,
          previewTop: previewPosition.top,
        };
      });
    };

    const handleUp = (event: PointerEvent): void => {
      const current = dragStateRef.current;
      if (!current) return;
      const zone = findDropZoneAtPoint(event.clientX, event.clientY, dropZonesRef.current);
      if (zone && zone !== current.sourceZoneId) {
        const targetZone = getDropZoneMatch(zone, dropZonesRef.current);
        const previewPosition = targetZone
          ? getZoneCenterPreviewPosition(current, targetZone.rect)
          : { left: current.previewLeft, top: current.previewTop };

        setHoveredZoneId(zone);
        setDragState({
          ...current,
          phase: 'settling',
          previewLeft: previewPosition.left,
          previewTop: previewPosition.top,
          tiltDeg: 0,
        });
        completionTimerRef.current = window.setTimeout(() => {
          const latest = dragStateRef.current;
          if (latest?.ballId !== current.ballId || latest?.phase !== 'settling') {
            return;
          }
          onDropRef.current(current.ballId, current.sourceZoneId, zone);
          setDragState(null);
          setHoveredZoneId(null);
          completionTimerRef.current = null;
        }, POINTER_DRAG_SETTLE_DURATION_MS);
        return;
      }

      setDragState({
        ...current,
        phase: 'returning',
        previewLeft: current.originLeft,
        previewTop: current.originTop,
        tiltDeg: 0,
      });
      setHoveredZoneId(null);
      completionTimerRef.current = window.setTimeout(() => {
        const latest = dragStateRef.current;
        if (latest?.ballId !== current.ballId || latest?.phase !== 'returning') {
          return;
        }
        setDragState(null);
        setHoveredZoneId(null);
        completionTimerRef.current = null;
      }, POINTER_DRAG_RETURN_DURATION_MS);
    };

    const handleCancel = (): void => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
      setDragState(null);
      setHoveredZoneId(null);
    };

    // Prevent page scroll while dragging
    const preventScroll = (event: TouchEvent): void => {
      if (event.cancelable) event.preventDefault();
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [isDragging]);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  const value: PointerDragContextValue = {
    dragState,
    hoveredZoneId,
    registerDropZone,
    unregisterDropZone,
    startDrag,
  };

  return (
    <PointerDragContext.Provider value={value}>
      {children}
      {dragState ? <DragOverlay state={dragState} /> : null}
    </PointerDragContext.Provider>
  );
}
