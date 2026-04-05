'use client';

import { useCallback, useRef, type RefObject } from 'react';

import {
  redrawKangurCanvasStrokes,
  type KangurDrawingCanvasBaseLayerCache,
  type KangurDrawingCanvasStrokeLayerCache,
} from '@/features/kangur/ui/components/drawing-engine/render';
import {
  createKangurPointDrawingSnapshot,
  parseKangurPointDrawingSnapshot,
  rescaleKangurPointDrawingSnapshot,
  serializeKangurPointDrawingSnapshot,
  type KangurPointDrawingSnapshot,
} from '@/features/kangur/ui/components/drawing-engine/point-snapshots';
import type { KangurDrawingStrokeRenderStyle } from '@/features/kangur/ui/components/drawing-engine/types';
import { useKangurCanvasSnapshotState } from '@/features/kangur/ui/components/drawing-engine/useKangurCanvasSnapshotState';
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

export type UseKangurPointCanvasDrawingOptions = {
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
  exportDataUrl: (options?: { mimeType?: string; quality?: number }) => string | null;
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
  const strokeLayerCacheRef = useRef<KangurDrawingCanvasStrokeLayerCache<null> | null>(null);
  const engineRef = useRef<Point2d[][]>([]);
  const resolveMappedStyle = useCallback(
    (stroke: { meta: null; points: Point2d[] }, index: number) =>
      resolveStyle(engineRef.current[index] ?? stroke.points, index),
    [resolveStyle]
  );

  const engine = useKangurPointDrawingEngine({
    canvasRef,
    enabled,
    logicalHeight,
    logicalWidth,
    minPointDistance,
    onPointerStart,
    onPointerUp,
    onStartRejected,
    redraw: ({ activeStroke, strokes }) => {
      engineRef.current = strokes;
      const mappedStrokes = strokes.map((points) => ({ meta: null, points }));
      redrawKangurCanvasStrokes({
        activeStroke: activeStroke ? { meta: null, points: activeStroke } : null,
        backgroundFill,
        baseLayerCache: baseLayerCacheRef,
        baseLayerCacheKey,
        beforeStrokes,
        canvas: canvasRef.current,
        logicalHeight,
        logicalWidth,
        resolveStyle: resolveMappedStyle,
        strokeLayerCache: strokeLayerCacheRef,
        strokes: mappedStrokes,
      });
    },
    shouldAddPoint,
    shouldCommitStroke,
    shouldStartStroke,
    touchLockEnabled,
  });

  engineRef.current = engine.strokes;

  const {
    exportDataUrl,
    restoreSerializedSnapshot,
    restoreSnapshot,
    serializedSnapshot,
    serializeSnapshot,
    snapshot,
  } = useKangurCanvasSnapshotState<KangurPointDrawingSnapshot, Point2d[][]>({
    canvasRef,
    clearSnapshot: engine.clearStrokes,
    createSnapshot: createKangurPointDrawingSnapshot,
    hasDrawableContent: engine.strokes.length > 0,
    initialSerializedSnapshot,
    logicalHeight,
    logicalWidth,
    onSerializedSnapshotChange,
    parseSnapshot: parseKangurPointDrawingSnapshot,
    rescaleSnapshot: rescaleKangurPointDrawingSnapshot,
    serializeSnapshotData: serializeKangurPointDrawingSnapshot,
    setStrokes: engine.setStrokes,
    strokes: engine.strokes,
  });

  return {
    ...engine,
    exportDataUrl,
    hasDrawableContent: engine.strokes.length > 0,
    restoreSerializedSnapshot,
    restoreSnapshot,
    serializedSnapshot,
    serializeSnapshot,
    snapshot,
  };
};
