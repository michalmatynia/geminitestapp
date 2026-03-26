'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useKangurCanvasTouchLock } from '@/features/kangur/ui/hooks/useKangurCanvasTouchLock';
import { useKangurCanvasRedraw } from '@/features/kangur/ui/hooks/useKangurCanvasRedraw';
import { resolveKangurCanvasPoint } from '@/features/kangur/ui/services/drawing-canvas';
import type { Point2d } from '@/shared/contracts/geometry';

import { getKangurPointDistance } from './stroke-metrics';
import type { KangurDrawingStroke } from './types';
import { mapKangurDrawingStrokesToPoints } from './types';

import type {
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
} from 'react';

export type KangurDrawingSurfaceElement = HTMLElement | SVGElement;

type KangurDrawingPointerPayload<TMeta, TElement extends KangurDrawingSurfaceElement> = {
  event: ReactPointerEvent<TElement>;
  point: Point2d;
  stroke: KangurDrawingStroke<TMeta> | null;
  strokes: KangurDrawingStroke<TMeta>[];
};

type UseKangurDrawingEngineOptions<
  TMeta,
  TElement extends KangurDrawingSurfaceElement = HTMLCanvasElement,
> = {
  canvasRef: RefObject<TElement | null>;
  createStroke: (payload: {
    event: ReactPointerEvent<TElement>;
    point: Point2d;
  }) => KangurDrawingStroke<TMeta> | null;
  enabled?: boolean;
  logicalHeight: number;
  logicalWidth: number;
  minPointDistance?: number;
  onPointerStart?: (payload: KangurDrawingPointerPayload<TMeta, TElement>) => void;
  onPointerUp?: (payload: KangurDrawingPointerPayload<TMeta, TElement>) => void;
  onStartRejected?: (payload: KangurDrawingPointerPayload<TMeta, TElement>) => void;
  redraw: (payload: {
    activeStroke: KangurDrawingStroke<TMeta> | null;
    strokes: KangurDrawingStroke<TMeta>[];
  }) => void;
  shouldAddPoint?: (payload: KangurDrawingPointerPayload<TMeta, TElement>) => boolean;
  shouldCommitStroke?: (stroke: KangurDrawingStroke<TMeta>) => boolean;
  shouldStartStroke?: (payload: KangurDrawingPointerPayload<TMeta, TElement>) => boolean;
  touchLockEnabled?: boolean;
};

export type UseKangurDrawingEngineResult<
  TMeta,
  TElement extends KangurDrawingSurfaceElement = HTMLCanvasElement,
> = {
  activeStroke: KangurDrawingStroke<TMeta> | null;
  canRedo: boolean;
  canUndo: boolean;
  clearStrokes: () => void;
  handlePointerDown: (event: ReactPointerEvent<TElement>) => void;
  handlePointerMove: (event: ReactPointerEvent<TElement>) => void;
  handlePointerUp: (event: ReactPointerEvent<TElement>) => void;
  isPointerDrawing: boolean;
  pointStrokes: Point2d[][];
  redoLastStroke: () => void;
  setStrokes: (
    next:
      | KangurDrawingStroke<TMeta>[]
      | ((current: KangurDrawingStroke<TMeta>[]) => KangurDrawingStroke<TMeta>[])
  ) => void;
  strokes: KangurDrawingStroke<TMeta>[];
  undoLastStroke: () => void;
};

export const useKangurDrawingEngine = <
  TMeta,
  TElement extends KangurDrawingSurfaceElement = HTMLCanvasElement,
>({
  canvasRef,
  createStroke,
  enabled = true,
  logicalHeight,
  logicalWidth,
  minPointDistance = 2,
  onPointerStart,
  onPointerUp,
  onStartRejected,
  redraw,
  shouldAddPoint,
  shouldCommitStroke,
  shouldStartStroke,
  touchLockEnabled = true,
}: UseKangurDrawingEngineOptions<TMeta, TElement>): UseKangurDrawingEngineResult<TMeta, TElement> => {
  const [strokes, setCommittedStrokes] = useState<KangurDrawingStroke<TMeta>[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<KangurDrawingStroke<TMeta>[]>([]);
  const [activeStroke, setActiveStroke] = useState<KangurDrawingStroke<TMeta> | null>(null);
  const [isPointerDrawing, setIsPointerDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const redrawFrameRef = useRef<number | null>(null);
  const redrawRef = useRef(redraw);
  const strokesRef = useRef(strokes);
  const activeStrokeRef = useRef(activeStroke);

  useEffect(() => {
    redrawRef.current = redraw;
  }, [redraw]);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    activeStrokeRef.current = activeStroke;
  }, [activeStroke]);

  const flushRedraw = useCallback((): void => {
    redrawFrameRef.current = null;
    redrawRef.current({
      activeStroke: activeStrokeRef.current,
      strokes: strokesRef.current,
    });
  }, []);

  const scheduleRedraw = useCallback((): void => {
    if (
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      flushRedraw();
      return;
    }

    if (redrawFrameRef.current !== null) {
      return;
    }

    redrawFrameRef.current = window.requestAnimationFrame(() => {
      flushRedraw();
    });
  }, [flushRedraw]);

  useEffect(() => {
    scheduleRedraw();
  }, [activeStroke, scheduleRedraw, strokes]);

  useEffect(
    () => () => {
      if (
        redrawFrameRef.current !== null &&
        typeof window !== 'undefined' &&
        typeof window.cancelAnimationFrame === 'function'
      ) {
        window.cancelAnimationFrame(redrawFrameRef.current);
        redrawFrameRef.current = null;
      }
    },
    []
  );

  useKangurCanvasRedraw({
    canvasRef,
    redraw: scheduleRedraw,
  });

  useKangurCanvasTouchLock(canvasRef, { enabled: touchLockEnabled });

  const setStrokes = useCallback(
    (
      next:
        | KangurDrawingStroke<TMeta>[]
        | ((current: KangurDrawingStroke<TMeta>[]) => KangurDrawingStroke<TMeta>[])
    ): void => {
      setCommittedStrokes((current) =>
        typeof next === 'function' ? next(current) : next
      );
      setRedoStrokes([]);
      setActiveStroke(null);
      isDrawingRef.current = false;
      setIsPointerDrawing(false);
    },
    []
  );

  const clearStrokes = useCallback((): void => {
    setCommittedStrokes([]);
    setRedoStrokes([]);
    setActiveStroke(null);
    isDrawingRef.current = false;
    setIsPointerDrawing(false);
  }, []);

  const undoLastStroke = useCallback((): void => {
    setCommittedStrokes((current) => {
      const lastStroke = current[current.length - 1];
      if (!lastStroke) {
        return current;
      }
      setRedoStrokes((redoCurrent) => [...redoCurrent, lastStroke]);
      return current.slice(0, -1);
    });
    setActiveStroke(null);
    isDrawingRef.current = false;
    setIsPointerDrawing(false);
  }, []);

  const redoLastStroke = useCallback((): void => {
    setRedoStrokes((current) => {
      const nextStroke = current[current.length - 1];
      if (!nextStroke) {
        return current;
      }
      setCommittedStrokes((strokeCurrent) => [...strokeCurrent, nextStroke]);
      return current.slice(0, -1);
    });
    setActiveStroke(null);
    isDrawingRef.current = false;
    setIsPointerDrawing(false);
  }, []);

  const resolvePoint = useCallback(
    (event: ReactPointerEvent<TElement>): Point2d => {
      const surface = canvasRef.current;
      if (!surface) {
        return { x: 0, y: 0 };
      }

      return resolveKangurCanvasPoint(event, surface, logicalWidth, logicalHeight);
    },
    [canvasRef, logicalHeight, logicalWidth]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<TElement>): void => {
      if (!enabled) {
        return;
      }

      const surface = canvasRef.current;
      if (!surface) {
        return;
      }

      const point = resolvePoint(event);
      const payload = {
        event,
        point,
        stroke: null,
        strokes: strokesRef.current,
      };

      if (shouldStartStroke && !shouldStartStroke(payload)) {
        event.preventDefault();
        onStartRejected?.(payload);
        return;
      }

      const nextStroke = createStroke({ event, point });
      if (!nextStroke) {
        return;
      }

      event.preventDefault();
      surface.setPointerCapture?.(event.pointerId);
      isDrawingRef.current = true;
      setIsPointerDrawing(true);
      setActiveStroke(nextStroke);
      onPointerStart?.({
        ...payload,
        stroke: nextStroke,
      });
    },
    [
      canvasRef,
      createStroke,
      enabled,
      onPointerStart,
      onStartRejected,
      resolvePoint,
      shouldStartStroke,
    ]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<TElement>): void => {
      const currentStroke = activeStrokeRef.current;
      if (!isDrawingRef.current || !currentStroke) {
        return;
      }

      event.preventDefault();
      const point = resolvePoint(event);
      const lastPoint = currentStroke.points[currentStroke.points.length - 1];
      if (lastPoint && getKangurPointDistance(lastPoint, point) < minPointDistance) {
        return;
      }

      const payload = {
        event,
        point,
        stroke: currentStroke,
        strokes: strokesRef.current,
      };

      if (shouldAddPoint && !shouldAddPoint(payload)) {
        return;
      }

      setActiveStroke({
        ...currentStroke,
        points: [...currentStroke.points, point],
      });
    },
    [minPointDistance, resolvePoint, shouldAddPoint]
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<TElement>): void => {
      if (!isDrawingRef.current) {
        return;
      }

      const currentStroke = activeStrokeRef.current;
      const surface = canvasRef.current;

      event.preventDefault();
      surface?.releasePointerCapture?.(event.pointerId);
      isDrawingRef.current = false;
      setIsPointerDrawing(false);
      setActiveStroke(null);

      if (
        currentStroke &&
        (shouldCommitStroke ? shouldCommitStroke(currentStroke) : true)
      ) {
        setCommittedStrokes((current) => [...current, currentStroke]);
        setRedoStrokes([]);
      }

      onPointerUp?.({
        event,
        point: resolvePoint(event),
        stroke: currentStroke,
        strokes: strokesRef.current,
      });
    },
    [canvasRef, onPointerUp, resolvePoint, shouldCommitStroke]
  );

  const pointStrokes = useMemo(
    () =>
      activeStroke
        ? [...mapKangurDrawingStrokesToPoints(strokes), activeStroke.points]
        : mapKangurDrawingStrokesToPoints(strokes),
    [activeStroke, strokes]
  );

  return {
    activeStroke,
    canRedo: redoStrokes.length > 0,
    canUndo: strokes.length > 0,
    clearStrokes,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isPointerDrawing,
    pointStrokes,
    redoLastStroke,
    setStrokes,
    strokes,
    undoLastStroke,
  };
};

type UseKangurPointDrawingEngineOptions<
  TElement extends KangurDrawingSurfaceElement = HTMLCanvasElement,
> = {
  canvasRef: RefObject<TElement | null>;
  enabled?: boolean;
  logicalHeight: number;
  logicalWidth: number;
  minPointDistance?: number;
  onPointerStart?: (payload: {
    event: ReactPointerEvent<TElement>;
    point: Point2d;
    strokes: Point2d[][];
  }) => void;
  onPointerUp?: (payload: {
    event: ReactPointerEvent<TElement>;
    point: Point2d;
    strokes: Point2d[][];
  }) => void;
  onStartRejected?: (payload: {
    event: ReactPointerEvent<TElement>;
    point: Point2d;
    strokes: Point2d[][];
  }) => void;
  redraw: (strokes: Point2d[][]) => void;
  shouldAddPoint?: (payload: {
    event: ReactPointerEvent<TElement>;
    point: Point2d;
    stroke: Point2d[];
    strokes: Point2d[][];
  }) => boolean;
  shouldCommitStroke?: (stroke: Point2d[]) => boolean;
  shouldStartStroke?: (payload: {
    event: ReactPointerEvent<TElement>;
    point: Point2d;
    strokes: Point2d[][];
  }) => boolean;
  touchLockEnabled?: boolean;
};

export type UseKangurPointDrawingEngineResult<
  TElement extends KangurDrawingSurfaceElement = HTMLCanvasElement,
> = {
  canRedo: boolean;
  canUndo: boolean;
  clearStrokes: () => void;
  handlePointerDown: (event: ReactPointerEvent<TElement>) => void;
  handlePointerMove: (event: ReactPointerEvent<TElement>) => void;
  handlePointerUp: (event: ReactPointerEvent<TElement>) => void;
  isPointerDrawing: boolean;
  redoLastStroke: () => void;
  setStrokes: (next: SetStateAction<Point2d[][]>) => void;
  strokes: Point2d[][];
  undoLastStroke: () => void;
};

export const useKangurPointDrawingEngine = <
  TElement extends KangurDrawingSurfaceElement = HTMLCanvasElement,
>({
  canvasRef,
  enabled = true,
  logicalHeight,
  logicalWidth,
  minPointDistance = 2,
  onPointerStart,
  onPointerUp,
  onStartRejected,
  redraw,
  shouldAddPoint,
  shouldCommitStroke,
  shouldStartStroke,
  touchLockEnabled = true,
}: UseKangurPointDrawingEngineOptions<TElement>): UseKangurPointDrawingEngineResult<TElement> => {
  const engine = useKangurDrawingEngine<null, TElement>({
    canvasRef,
    createStroke: ({ point }) => ({
      meta: null,
      points: [point],
    }),
    enabled,
    logicalHeight,
    logicalWidth,
    minPointDistance,
    onPointerStart: (payload) => {
      onPointerStart?.({
        event: payload.event,
        point: payload.point,
        strokes: mapKangurDrawingStrokesToPoints(payload.strokes),
      });
    },
    onPointerUp: (payload) => {
      onPointerUp?.({
        event: payload.event,
        point: payload.point,
        strokes: mapKangurDrawingStrokesToPoints(payload.strokes),
      });
    },
    onStartRejected: (payload) => {
      onStartRejected?.({
        event: payload.event,
        point: payload.point,
        strokes: mapKangurDrawingStrokesToPoints(payload.strokes),
      });
    },
    redraw: ({ activeStroke, strokes }) => {
      const pointStrokes = activeStroke
        ? [...mapKangurDrawingStrokesToPoints(strokes), activeStroke.points]
        : mapKangurDrawingStrokesToPoints(strokes);
      redraw(pointStrokes);
    },
    shouldAddPoint: shouldAddPoint
      ? (payload) =>
          shouldAddPoint({
            event: payload.event,
            point: payload.point,
            stroke: payload.stroke?.points ?? [],
            strokes: mapKangurDrawingStrokesToPoints(payload.strokes),
          })
      : undefined,
    shouldCommitStroke: shouldCommitStroke
      ? (stroke) => shouldCommitStroke(stroke.points)
      : undefined,
    shouldStartStroke: shouldStartStroke
      ? (payload) =>
          shouldStartStroke({
            event: payload.event,
            point: payload.point,
            strokes: mapKangurDrawingStrokesToPoints(payload.strokes),
          })
      : undefined,
    touchLockEnabled,
  });

  const setStrokes = useCallback((next: SetStateAction<Point2d[][]>): void => {
    engine.setStrokes((current) => {
      const currentPoints = mapKangurDrawingStrokesToPoints(current);
      const nextPoints = typeof next === 'function' ? next(currentPoints) : next;
      return nextPoints.map((points) => ({ meta: null, points }));
    });
  }, [engine]);

  return {
    canRedo: engine.canRedo,
    canUndo: engine.canUndo,
    clearStrokes: engine.clearStrokes,
    handlePointerDown: engine.handlePointerDown,
    handlePointerMove: engine.handlePointerMove,
    handlePointerUp: engine.handlePointerUp,
    isPointerDrawing: engine.isPointerDrawing,
    redoLastStroke: engine.redoLastStroke,
    setStrokes,
    strokes: engine.pointStrokes,
    undoLastStroke: engine.undoLastStroke,
  };
};
