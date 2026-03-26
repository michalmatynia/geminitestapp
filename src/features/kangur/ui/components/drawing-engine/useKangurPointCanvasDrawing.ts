'use client';

import type { RefObject } from 'react';

import { redrawKangurCanvasStrokes } from '@/features/kangur/ui/components/drawing-engine/render';
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
  beforeStrokes?: (ctx: CanvasRenderingContext2D) => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  enabled?: boolean;
  logicalHeight: number;
  logicalWidth: number;
  minPointDistance?: number;
  onPointerStart?: (payload: KangurPointCanvasDrawingEventPayload) => void;
  onPointerUp?: (payload: KangurPointCanvasDrawingEventPayload) => void;
  onStartRejected?: (payload: KangurPointCanvasDrawingEventPayload) => void;
  resolveStyle: (stroke: Point2d[], index: number) => KangurDrawingStrokeRenderStyle;
  shouldAddPoint?: (payload: KangurPointCanvasDrawingStrokePayload) => boolean;
  shouldCommitStroke?: (stroke: Point2d[]) => boolean;
  shouldStartStroke?: (payload: KangurPointCanvasDrawingEventPayload) => boolean;
  touchLockEnabled?: boolean;
};

export const useKangurPointCanvasDrawing = ({
  backgroundFill,
  beforeStrokes,
  canvasRef,
  enabled = true,
  logicalHeight,
  logicalWidth,
  minPointDistance = 2,
  onPointerStart,
  onPointerUp,
  onStartRejected,
  resolveStyle,
  shouldAddPoint,
  shouldCommitStroke,
  shouldStartStroke,
  touchLockEnabled = true,
}: UseKangurPointCanvasDrawingOptions): UseKangurPointDrawingEngineResult =>
  useKangurPointDrawingEngine({
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
