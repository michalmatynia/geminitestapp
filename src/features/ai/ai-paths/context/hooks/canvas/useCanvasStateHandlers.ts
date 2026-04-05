'use client';

import { useCallback, useRef } from 'react';

import type { Toast } from '@/shared/contracts/ui/base';
import type { AiNode, RuntimeState, Edge } from '@/shared/lib/ai-paths';
import { clampTranslate } from '@/shared/lib/ai-paths';

import {
  getMarqueeRect,
  setPointerCaptureSafe,
  releasePointerCaptureSafe,
} from '../useCanvasInteractions.helpers';

import type { MarqueeSelectionState } from '../useCanvasInteractions.helpers';

export interface UseCanvasStateHandlersValue {
  notifyLocked: () => void;
  resolveViewportPointFromClient: (
    clientX: number,
    clientY: number
  ) => { x: number; y: number } | null;
  updateLastPointerCanvasPosFromClient: (
    clientX: number,
    clientY: number
  ) => { x: number; y: number } | null;
  pruneRuntimeInputsInternal: (
    state: RuntimeState,
    removedEdges: Edge[],
    remainingEdges: Edge[]
  ) => RuntimeState;
  resolveActiveNodeSelectionIds: () => string[];
  resolveNodesWithinMarquee: (marquee: MarqueeSelectionState) => string[];
  handlePanStart: (event: React.MouseEvent | React.PointerEvent | React.TouchEvent) => void;
  handlePanMove: (event: React.MouseEvent | React.PointerEvent | React.TouchEvent) => void;
  handlePanEnd: (event: React.MouseEvent | React.PointerEvent | React.TouchEvent) => void;
  forcePanEnd: () => void;
  lastPointerCanvasPosRef: React.MutableRefObject<{ x: number; y: number }>;
  hasCanvasKeyboardFocusRef: React.MutableRefObject<boolean>;
}

type PanCaptureTarget =
  | (Element & {
      releasePointerCapture?: (pointerId: number) => void;
      hasPointerCapture?: (pointerId: number) => boolean;
    })
  | null;

export function useCanvasStateHandlers(args: {
  toast: Toast;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  nodes: AiNode[];
  selectedNodeIds: string[];
  startPan: (x: number, y: number) => void;
  endPan: () => void;
  setIsPanning: (isPanning: boolean) => void;
  updateView: (next: { x: number; y: number }) => void;
  panState: { startX: number; startY: number; originX: number; originY: number } | null;
  viewScale: number;
}): UseCanvasStateHandlersValue {
  const { toast, viewportRef, startPan, endPan, setIsPanning, updateView } = args;

  const lastPointerCanvasPosRef = useRef({ x: 0, y: 0 });
  const hasCanvasKeyboardFocusRef = useRef(false);
  const panPointerIdRef = useRef<number | null>(null);
  const panCaptureTargetRef = useRef<PanCaptureTarget>(null);

  const notifyLocked = useCallback((): void => {
    toast('This path is locked. Unlock it in Path Settings to make changes.', {
      variant: 'info',
    });
  }, [toast]);

  const resolveViewportPointFromClient = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    [viewportRef]
  );

  const updateLastPointerCanvasPosFromClient = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const point = resolveViewportPointFromClient(clientX, clientY);
      if (point) {
        lastPointerCanvasPosRef.current = point;
      }
      return point;
    },
    [resolveViewportPointFromClient]
  );

  const pruneRuntimeInputsInternal = useCallback(
    (state: RuntimeState, removedEdges: Edge[], remainingEdges: Edge[]): RuntimeState => {
      if (removedEdges.length === 0) return state;
      const remainingTargets = new Set<string>();
      remainingEdges.forEach((edge: Edge) => {
        if (!edge.to || !edge.toPort) return;
        remainingTargets.add(`${edge.to}:${edge.toPort}`);
      });

      const existingInputs = state.inputs ?? {};
      let nextInputs = existingInputs;
      let changed = false;

      removedEdges.forEach((edge: Edge) => {
        if (!edge.to || !edge.toPort) return;
        const targetKey = `${edge.to}:${edge.toPort}`;
        if (remainingTargets.has(targetKey)) return;
        const nodeInputs = nextInputs?.[edge.to] ?? {};
        if (!(edge.toPort in nodeInputs)) return;
        if (!changed) {
          nextInputs = { ...existingInputs };
          changed = true;
        }
        const nextNodeInputs = { ...nodeInputs };
        delete nextNodeInputs[edge.toPort];
        if (Object.keys(nextNodeInputs).length === 0) {
          delete nextInputs[edge.to];
        } else {
          nextInputs[edge.to] = nextNodeInputs;
        }
      });

      if (!changed) return state;
      return { ...state, inputs: nextInputs };
    },
    []
  );

  const resolveActiveNodeSelectionIds = useCallback((): string[] => {
    const existingNodeIds = new Set(args.nodes.map((node: AiNode): string => node.id));
    const normalizedSelection = Array.from(
      new Set(
        args.selectedNodeIds
          .map((value: string): string => value.trim())
          .filter((value: string): boolean => value.length > 0 && existingNodeIds.has(value))
      )
    );
    if (normalizedSelection.length > 0) {
      return normalizedSelection;
    }
    return [];
  }, [args.nodes, args.selectedNodeIds]);

  const resolveNodesWithinMarquee = useCallback(
    (marquee: MarqueeSelectionState): string[] => {
      const rect = getMarqueeRect(marquee);
      return args.nodes
        .filter((node: AiNode): boolean => {
          const nodeWidth = 260; // NODE_WIDTH
          const nodeHeight = 184; // NODE_MIN_HEIGHT
          const nodeRight = node.position.x + nodeWidth;
          const nodeBottom = node.position.y + nodeHeight;
          return (
            node.position.x < rect.left + rect.width &&
            nodeRight > rect.left &&
            node.position.y < rect.top + rect.height &&
            nodeBottom > rect.top
          );
        })
        .map((node: AiNode): string => node.id);
    },
    [args.nodes]
  );

  const handlePanStart = useCallback(
    (event: React.MouseEvent | React.PointerEvent | React.TouchEvent): void => {
      if (!event) return;
      let clientX: number | undefined;
      let clientY: number | undefined;

      if ('touches' in event) {
        clientX = event.touches[0]?.clientX;
        clientY = event.touches[0]?.clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      if (clientX === undefined || clientY === undefined) return;

      updateLastPointerCanvasPosFromClient(clientX, clientY);

      if (
        'button' in event &&
        typeof event.button === 'number' &&
        event.button !== 0 &&
        event.button !== -1
      ) {
        return;
      }

      if (!('touches' in event) && 'pointerId' in event) {
        const pointerTarget = event.currentTarget instanceof Element ? event.currentTarget : null;
        setPointerCaptureSafe(pointerTarget, event.pointerId);
        panPointerIdRef.current = event.pointerId;
        panCaptureTargetRef.current = pointerTarget;
      }

      startPan(clientX, clientY);
      setIsPanning(true);
    },
    [args.viewportRef, setIsPanning, startPan, updateLastPointerCanvasPosFromClient]
  );

  const handlePanMove = useCallback(
    (event: React.MouseEvent | React.PointerEvent | React.TouchEvent): void => {
      if (!event) return;
      if (!args.panState) return;

      let clientX: number | undefined;
      let clientY: number | undefined;
      if ('touches' in event) {
        clientX = event.touches[0]?.clientX;
        clientY = event.touches[0]?.clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }
      if (clientX === undefined || clientY === undefined) return;

      updateLastPointerCanvasPosFromClient(clientX, clientY);
      const nextX = args.panState.originX + (clientX - args.panState.startX);
      const nextY = args.panState.originY + (clientY - args.panState.startY);
      const viewportRect = args.viewportRef.current?.getBoundingClientRect() ?? null;
      const viewport = viewportRect
        ? {
          width: viewportRect.width,
          height: viewportRect.height,
        }
        : null;
      const scale = Number.isFinite(args.viewScale) && args.viewScale > 0 ? args.viewScale : 1;
      const clamped = clampTranslate(nextX, nextY, scale, viewport);
      updateView({ x: clamped.x, y: clamped.y });
    },
    [
      args.panState,
      args.viewScale,
      args.viewportRef,
      updateView,
      updateLastPointerCanvasPosFromClient,
    ]
  );

  const forcePanEnd = useCallback((): void => {
    const pointerId = panPointerIdRef.current;
    if (pointerId !== null) {
      releasePointerCaptureSafe(panCaptureTargetRef.current, pointerId);
    }
    panPointerIdRef.current = null;
    panCaptureTargetRef.current = null;
    endPan();
    setIsPanning(false);
  }, [endPan, setIsPanning]);

  const handlePanEnd = useCallback(
    (event: React.MouseEvent | React.PointerEvent | React.TouchEvent): void => {
      if (!event) return;
      forcePanEnd();
    },
    [forcePanEnd]
  );

  return {
    notifyLocked,
    resolveViewportPointFromClient,
    updateLastPointerCanvasPosFromClient,
    pruneRuntimeInputsInternal,
    resolveActiveNodeSelectionIds,
    resolveNodesWithinMarquee,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    forcePanEnd,
    lastPointerCanvasPosRef,
    hasCanvasKeyboardFocusRef,
  };
}
