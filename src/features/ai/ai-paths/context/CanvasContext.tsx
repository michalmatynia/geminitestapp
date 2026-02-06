'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
  type RefObject,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ViewState {
  x: number;
  y: number;
  scale: number;
}

export interface PanState {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

export interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

export interface ConnectingState {
  fromNodeId: string;
  fromPort: string;
  start: { x: number; y: number };
}

export interface CanvasState {
  view: ViewState;
  panState: PanState | null;
  dragState: DragState | null;
  connecting: ConnectingState | null;
  connectingPos: { x: number; y: number } | null;
  lastDrop: { x: number; y: number } | null;
}

export interface CanvasRefs {
  viewportRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLDivElement | null>;
}

export interface CanvasActions {
  // View actions
  setView: (view: ViewState) => void;
  updateView: (update: Partial<ViewState>) => void;
  zoomTo: (targetScale: number) => void;
  resetView: () => void;

  // Pan actions
  setPanState: (panState: PanState | null) => void;
  startPan: (startX: number, startY: number) => void;
  endPan: () => void;

  // Drag actions
  setDragState: (dragState: DragState | null) => void;
  startDrag: (nodeId: string, offsetX: number, offsetY: number) => void;
  endDrag: () => void;

  // Connecting actions
  setConnecting: (connecting: ConnectingState | null) => void;
  setConnectingPos: (pos: { x: number; y: number } | null) => void;
  startConnection: (fromNodeId: string, fromPort: string, start: { x: number; y: number }) => void;
  endConnection: () => void;

  // Drop actions
  setLastDrop: (pos: { x: number; y: number } | null) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_VIEW: ViewState = { x: -600, y: -320, scale: 1 };

// ---------------------------------------------------------------------------
// Contexts (split for re-render optimization)
// ---------------------------------------------------------------------------

const CanvasStateContext = createContext<CanvasState | null>(null);
const CanvasActionsContext = createContext<CanvasActions | null>(null);
const CanvasRefsContext = createContext<CanvasRefs | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface CanvasProviderProps {
  children: ReactNode;
  initialView?: ViewState | undefined;
}

export function CanvasProvider({
  children,
  initialView = DEFAULT_VIEW,
}: CanvasProviderProps): React.ReactNode {
  const [view, setViewState] = useState<ViewState>(initialView);
  const [panState, setPanStateInternal] = useState<PanState | null>(null);
  const [dragState, setDragStateInternal] = useState<DragState | null>(null);
  const [connecting, setConnectingInternal] = useState<ConnectingState | null>(null);
  const [connectingPos, setConnectingPosInternal] = useState<{ x: number; y: number } | null>(null);
  const [lastDrop, setLastDropInternal] = useState<{ x: number; y: number } | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const lastDropTimerRef = useRef<number | null>(null);

  // Auto-clear lastDrop after delay
  useEffect(() => {
    if (!lastDrop) return;
    if (lastDropTimerRef.current) {
      window.clearTimeout(lastDropTimerRef.current);
    }
    lastDropTimerRef.current = window.setTimeout(() => {
      setLastDropInternal(null);
      lastDropTimerRef.current = null;
    }, 1600);
    return () => {
      if (lastDropTimerRef.current) {
        window.clearTimeout(lastDropTimerRef.current);
        lastDropTimerRef.current = null;
      }
    };
  }, [lastDrop]);

  // Actions are stable (empty deps array ensures they never change)
  const actions = useMemo<CanvasActions>(
    () => ({
      // View
      setView: setViewState,
      updateView: (update) => setViewState((prev) => ({ ...prev, ...update })),
      zoomTo: (targetScale) => {
        setViewState((prev) => ({ ...prev, scale: Math.max(0.25, Math.min(2, targetScale)) }));
      },
      resetView: () => setViewState(DEFAULT_VIEW),

      // Pan
      setPanState: setPanStateInternal,
      startPan: (startX, startY) => {
        setViewState((currentView) => {
          setPanStateInternal({
            startX,
            startY,
            originX: currentView.x,
            originY: currentView.y,
          });
          return currentView;
        });
      },
      endPan: () => setPanStateInternal(null),

      // Drag
      setDragState: setDragStateInternal,
      startDrag: (nodeId, offsetX, offsetY) => {
        setDragStateInternal({ nodeId, offsetX, offsetY });
      },
      endDrag: () => setDragStateInternal(null),

      // Connecting
      setConnecting: setConnectingInternal,
      setConnectingPos: setConnectingPosInternal,
      startConnection: (fromNodeId, fromPort, start) => {
        setConnectingInternal({ fromNodeId, fromPort, start });
        setConnectingPosInternal(start);
      },
      endConnection: () => {
        setConnectingInternal(null);
        setConnectingPosInternal(null);
      },

      // Drop
      setLastDrop: setLastDropInternal,
    }),
    []
  );

  const state = useMemo<CanvasState>(
    () => ({
      view,
      panState,
      dragState,
      connecting,
      connectingPos,
      lastDrop,
    }),
    [view, panState, dragState, connecting, connectingPos, lastDrop]
  );

  const refs = useMemo<CanvasRefs>(
    () => ({
      viewportRef,
      canvasRef,
    }),
    []
  );

  return (
    <CanvasActionsContext.Provider value={actions}>
      <CanvasRefsContext.Provider value={refs}>
        <CanvasStateContext.Provider value={state}>
          {children}
        </CanvasStateContext.Provider>
      </CanvasRefsContext.Provider>
    </CanvasActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer Hooks
// ---------------------------------------------------------------------------

/**
 * Get the current canvas state.
 * Components using this will re-render when canvas state changes.
 */
export function useCanvasState(): CanvasState {
  const context = useContext(CanvasStateContext);
  if (!context) {
    throw new Error('useCanvasState must be used within a CanvasProvider');
  }
  return context;
}

/**
 * Get canvas actions.
 * Components using this will NOT re-render when state changes.
 */
export function useCanvasActions(): CanvasActions {
  const context = useContext(CanvasActionsContext);
  if (!context) {
    throw new Error('useCanvasActions must be used within a CanvasProvider');
  }
  return context;
}

/**
 * Get canvas refs (viewport and canvas DOM elements).
 */
export function useCanvasRefs(): CanvasRefs {
  const context = useContext(CanvasRefsContext);
  if (!context) {
    throw new Error('useCanvasRefs must be used within a CanvasProvider');
  }
  return context;
}

/**
 * Combined hook for components that need state, actions, and refs.
 */
export function useCanvas(): CanvasState & CanvasActions & CanvasRefs {
  const state = useCanvasState();
  const actions = useCanvasActions();
  const refs = useCanvasRefs();
  return { ...state, ...actions, ...refs };
}
