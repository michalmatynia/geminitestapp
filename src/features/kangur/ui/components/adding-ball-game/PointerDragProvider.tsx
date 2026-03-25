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
  /** Offset from the pointer to the top-left corner of the grabbed element. */
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
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

// ---------------------------------------------------------------------------
// Floating preview
// ---------------------------------------------------------------------------

function DragOverlay({ state }: { state: DragState }): JSX.Element {
  const left = state.currentX - state.offsetX;
  const top = state.currentY - state.offsetY;

  return createPortal(
    <div
      aria-hidden='true'
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 9999,
        pointerEvents: 'none',
        transform: 'scale(1.15)',
        transition: 'transform 80ms ease-out',
        willChange: 'transform',
        filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.18))',
      }}
    >
      <Ball ball={state.ball} isCoarsePointer />
    </div>,
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
  const dropZonesRef = useRef(new Map<string, HTMLElement>());
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

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
      const rect = element.getBoundingClientRect();
      setDragState({
        ballId,
        ball,
        sourceZoneId,
        offsetX: pointerX - rect.left,
        offsetY: pointerY - rect.top,
        currentX: pointerX,
        currentY: pointerY,
      });
    },
    [disabled],
  );

  // Global pointer move & up while dragging
  useEffect(() => {
    if (!dragState) return;

    const handleMove = (event: PointerEvent): void => {
      event.preventDefault();
      const x = event.clientX;
      const y = event.clientY;
      setDragState((prev) => (prev ? { ...prev, currentX: x, currentY: y } : null));
      setHoveredZoneId(findDropZoneAtPoint(x, y, dropZonesRef.current));
    };

    const handleUp = (event: PointerEvent): void => {
      const current = dragStateRef.current;
      if (!current) return;
      const zone = findDropZoneAtPoint(event.clientX, event.clientY, dropZonesRef.current);
      if (zone && zone !== current.sourceZoneId) {
        onDropRef.current(current.ballId, current.sourceZoneId, zone);
      }
      setDragState(null);
      setHoveredZoneId(null);
    };

    const handleCancel = (): void => {
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
  }, [dragState !== null]); // eslint-disable-line react-hooks/exhaustive-deps

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
