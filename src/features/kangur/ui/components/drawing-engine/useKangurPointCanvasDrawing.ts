'use client';

import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';

import {
  redrawKangurCanvasStrokes,
  type KangurDrawingCanvasBaseLayerCache,
} from '@/features/kangur/ui/components/drawing-engine/render';
import {
  createKangurPointDrawingSnapshot,
  parseKangurPointDrawingSnapshot,
  rescaleKangurPointDrawingSnapshot,
  serializeKangurPointDrawingSnapshot,
  type KangurPointDrawingSnapshot,
} from '@/features/kangur/ui/components/drawing-engine/point-snapshots';
import type { KangurDrawingStrokeRenderStyle } from '@/features/kangur/ui/components/drawing-engine/types';
import {
  useKangurPointDrawingEngine,
  type UseKangurPointDrawingEngineResult,
} from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingEngine';
import type { Point2d } from '@/shared/contracts/geometry';

import type { PointerEvent as ReactPointerEvent } from 'react';

type KangurPointCanvasDrawingPayload = {
  point: Point2d;
  strokes: Point2d[][];
};

type KangurPointCanvasDrawingEventPayload = KangurPointCanvasDrawingPayload & {
  event: ReactPointerEvent<HTMLCanvasElement>;
};

type KangurPointCanvasDrawingStrokePayload = KangurPointCanvasDrawingEventPayload & {
  stroke: Point2d[];
};

type UseKangurPointCanvasDrawingOptions = {
  backgroundFill?: string;
  baseLayerCacheKey?: number | string | null;
  beforeStrokes?: (ctx: CanvasRenderingContext2D) => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  enabled?: boolean;
  initialSerializedSnapshot?: string | null;
  logicalHeight: number;
  logicalWidth: number;
  minPointDistance?: number;
  onSerializedSnapshotChange?: (raw: string | null) => void;
  onPointerStart?: (payload: KangurPointCanvasDrawingEventPayload) => void;
  onPointerUp?: (payload: KangurPointCanvasDrawingEventPayload) => void;
  onStartRejected?: (payload: KangurPointCanvasDrawingEventPayload) => void;
  resolveStyle: (stroke: Point2d[], index: number) => KangurDrawingStrokeRenderStyle;
  shouldAddPoint?: (payload: KangurPointCanvasDrawingStrokePayload) => boolean;
  shouldCommitStroke?: (stroke: Point2d[]) => boolean;
  shouldStartStroke?: (payload: KangurPointCanvasDrawingEventPayload) => boolean;
  touchLockEnabled?: boolean;
};

export type UseKangurPointCanvasDrawingResult = UseKangurPointDrawingEngineResult & {
  hasDrawableContent: boolean;
  restoreSerializedSnapshot: (raw: string) => boolean;
  restoreSnapshot: (snapshot: KangurPointDrawingSnapshot) => void;
  serializedSnapshot: string | null;
  serializeSnapshot: () => string;
  snapshot: KangurPointDrawingSnapshot;
};

export const useKangurPointCanvasDrawing = ({
  backgroundFill,
  baseLayerCacheKey,
  beforeStrokes,
  canvasRef,
  enabled = true,
  initialSerializedSnapshot = null,
  logicalHeight,
  logicalWidth,
  minPointDistance = 2,
  onSerializedSnapshotChange,
  onPointerStart,
  onPointerUp,
  onStartRejected,
  resolveStyle,
  shouldAddPoint,
  shouldCommitStroke,
  shouldStartStroke,
  touchLockEnabled = true,
}: UseKangurPointCanvasDrawingOptions): UseKangurPointCanvasDrawingResult => {
  const baseLayerCacheRef = useRef<KangurDrawingCanvasBaseLayerCache | null>(null);
  const previousIncomingSnapshotRef = useRef<string | null | undefined>(undefined);
  const skipSnapshotEmissionRef = useRef(Boolean(initialSerializedSnapshot));

  const engine = useKangurPointDrawingEngine({
    canvasRef,
    enabled,
    logicalHeight,
    logicalWidth,
    minPointDistance,
    onPointerStart,
    onPointerUp,
    onStartRejected,
    redraw: (strokes) => {
      const mappedStrokes = strokes.map((points) => ({ meta: null, points }));
      redrawKangurCanvasStrokes({
        backgroundFill,
        baseLayerCache: baseLayerCacheRef,
        baseLayerCacheKey,
        beforeStrokes,
        canvas: canvasRef.current,
        logicalHeight,
        logicalWidth,
        resolveStyle: (_, index) => resolveStyle(strokes[index] ?? [], index),
        strokes: mappedStrokes,
      });
    },
    shouldAddPoint,
    shouldCommitStroke,
    shouldStartStroke,
    touchLockEnabled,
  });

  const snapshot = useMemo(
    () =>
      createKangurPointDrawingSnapshot({
        logicalHeight,
        logicalWidth,
        strokes: engine.strokes,
      }),
    [engine.strokes, logicalHeight, logicalWidth]
  );

  const serializedSnapshot = useMemo(
    () =>
      engine.strokes.length > 0
        ? serializeKangurPointDrawingSnapshot(snapshot)
        : null,
    [engine.strokes.length, snapshot]
  );

  const serializeSnapshot = useCallback(
    (): string => serializeKangurPointDrawingSnapshot(snapshot),
    [snapshot]
  );

  const restoreSnapshot = useCallback(
    (nextSnapshot: KangurPointDrawingSnapshot): void => {
      engine.setStrokes(
        rescaleKangurPointDrawingSnapshot(nextSnapshot, logicalWidth, logicalHeight)
      );
    },
    [engine, logicalHeight, logicalWidth]
  );

  const restoreSerializedSnapshot = useCallback(
    (raw: string): boolean => {
      const parsed = parseKangurPointDrawingSnapshot(raw);
      if (!parsed) {
        return false;
      }

      restoreSnapshot(parsed);
      return true;
    },
    [restoreSnapshot]
  );

  useEffect(() => {
    if (initialSerializedSnapshot === previousIncomingSnapshotRef.current) {
      return;
    }

    previousIncomingSnapshotRef.current = initialSerializedSnapshot;

    if (initialSerializedSnapshot === serializedSnapshot) {
      skipSnapshotEmissionRef.current = false;
      return;
    }

    if (!initialSerializedSnapshot) {
      skipSnapshotEmissionRef.current = true;
      if (engine.strokes.length > 0) {
        engine.clearStrokes();
      }
      return;
    }

    skipSnapshotEmissionRef.current = restoreSerializedSnapshot(initialSerializedSnapshot);
  }, [
    engine,
    initialSerializedSnapshot,
    restoreSerializedSnapshot,
    serializedSnapshot,
  ]);

  useEffect(() => {
    if (!onSerializedSnapshotChange) {
      return;
    }

    if (
      skipSnapshotEmissionRef.current &&
      serializedSnapshot !== initialSerializedSnapshot
    ) {
      return;
    }

    skipSnapshotEmissionRef.current = false;
    onSerializedSnapshotChange(serializedSnapshot);
  }, [initialSerializedSnapshot, onSerializedSnapshotChange, serializedSnapshot]);

  return {
    ...engine,
    hasDrawableContent: engine.strokes.length > 0,
    restoreSerializedSnapshot,
    restoreSnapshot,
    serializedSnapshot,
    serializeSnapshot,
    snapshot,
  };
};
