'use client';

import { useCallback, useRef, type RefObject } from 'react';

import {
  redrawKangurCanvasStrokes,
  type KangurDrawingCanvasStrokeLayerCache,
} from '@/features/kangur/ui/components/drawing-engine/render';
import {
  createKangurFreeformDrawingSnapshot,
  parseKangurFreeformDrawingSnapshot,
  rescaleKangurFreeformDrawingSnapshot,
  serializeKangurFreeformDrawingSnapshot,
  type KangurFreeformDrawingSnapshot,
} from '@/features/kangur/ui/components/drawing-engine/freeform-snapshots';
import {
  resolveKangurFreeformDrawingToolConfig,
  type KangurFreeformDrawingToolConfig,
} from '@/features/kangur/ui/components/drawing-engine/freeform-config';
import type {
  KangurDrawingStroke,
  KangurFreeformDrawingStrokeMeta,
} from '@/features/kangur/ui/components/drawing-engine/types';
import { useKangurCanvasSnapshotState } from '@/features/kangur/ui/components/drawing-engine/useKangurCanvasSnapshotState';
import {
  useKangurDrawingEngine,
  type UseKangurDrawingEngineResult,
} from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingEngine';
import {
  useKangurFreeformDrawingTools,
  type UseKangurFreeformDrawingToolsResult,
} from '@/features/kangur/ui/components/drawing-engine/useKangurFreeformDrawingTools';
import type { Point2d } from '@/shared/contracts/geometry';

import type { PointerEvent as ReactPointerEvent } from 'react';

type KangurFreeformCanvasDrawingPayload = {
  point: Point2d;
  stroke: KangurDrawingStroke<KangurFreeformDrawingStrokeMeta> | null;
  strokes: KangurDrawingStroke<KangurFreeformDrawingStrokeMeta>[];
};

type KangurFreeformCanvasDrawingEventPayload = KangurFreeformCanvasDrawingPayload & {
  event: ReactPointerEvent<HTMLCanvasElement>;
};

export type UseKangurFreeformCanvasDrawingOptions = {
  backgroundFill?: string;
  beforeStrokes?: (ctx: CanvasRenderingContext2D) => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  config?: KangurFreeformDrawingToolConfig;
  enabled?: boolean;
  initialSerializedSnapshot?: string | null;
  isCoarsePointer?: boolean;
  logicalHeight: number;
  logicalWidth: number;
  minPointDistance?: number;
  onSerializedSnapshotChange?: (raw: string | null) => void;
  onPointerStart?: (payload: KangurFreeformCanvasDrawingEventPayload) => void;
  onPointerUp?: (payload: KangurFreeformCanvasDrawingEventPayload) => void;
  onStartRejected?: (payload: KangurFreeformCanvasDrawingEventPayload) => void;
  shouldCommitStroke?: (
    stroke: KangurDrawingStroke<KangurFreeformDrawingStrokeMeta>
  ) => boolean;
  shouldStartStroke?: (payload: KangurFreeformCanvasDrawingEventPayload) => boolean;
  touchLockEnabled?: boolean;
};

export type UseKangurFreeformCanvasDrawingResult =
  UseKangurDrawingEngineResult<KangurFreeformDrawingStrokeMeta> & {
    exportDataUrl: (options?: { mimeType?: string; quality?: number }) => string | null;
    hasDrawableContent: boolean;
    restoreSerializedSnapshot: (raw: string) => boolean;
    restoreSnapshot: (snapshot: KangurFreeformDrawingSnapshot) => void;
    serializedSnapshot: string | null;
    serializeSnapshot: () => string;
    snapshot: KangurFreeformDrawingSnapshot;
    tools: UseKangurFreeformDrawingToolsResult;
  };

export const useKangurFreeformCanvasDrawing = ({
  backgroundFill,
  beforeStrokes,
  canvasRef,
  config,
  enabled = true,
  initialSerializedSnapshot = null,
  isCoarsePointer = false,
  logicalHeight,
  logicalWidth,
  minPointDistance = isCoarsePointer ? 4 : 2,
  onSerializedSnapshotChange,
  onPointerStart,
  onPointerUp,
  onStartRejected,
  shouldCommitStroke,
  shouldStartStroke,
  touchLockEnabled = true,
}: UseKangurFreeformCanvasDrawingOptions): UseKangurFreeformCanvasDrawingResult => {
  const resolvedConfig = resolveKangurFreeformDrawingToolConfig(config);
  const tools = useKangurFreeformDrawingTools({
    config,
    isCoarsePointer,
  });
  const strokeLayerCacheRef =
    useRef<KangurDrawingCanvasStrokeLayerCache<KangurFreeformDrawingStrokeMeta> | null>(null);
  const resolveStrokeStyle = useCallback(
    ({ meta }: KangurDrawingStroke<KangurFreeformDrawingStrokeMeta>) => ({
      compositeOperation: (meta.isEraser ? 'destination-out' : 'source-over') as GlobalCompositeOperation,
      lineWidth: meta.width,
      renderMode: resolvedConfig.strokeRenderMode,
      strokeStyle: meta.isEraser ? 'rgba(0,0,0,1)' : meta.color,
    }),
    [resolvedConfig.strokeRenderMode]
  );

  const engine = useKangurDrawingEngine<KangurFreeformDrawingStrokeMeta>({
    canvasRef,
    createStroke: ({ point }) => ({
      meta: tools.strokeMeta,
      points: [point],
    }),
    enabled,
    logicalHeight,
    logicalWidth,
    minPointDistance,
    onPointerStart,
    onPointerUp,
    onStartRejected,
    redraw: ({ activeStroke, strokes }) => {
      redrawKangurCanvasStrokes({
        activeStroke,
        backgroundFill,
        beforeStrokes,
        canvas: canvasRef.current,
        logicalHeight,
        logicalWidth,
        resolveStyle: resolveStrokeStyle,
        strokeLayerCache: strokeLayerCacheRef,
        strokes,
      });
    },
    shouldCommitStroke,
    shouldStartStroke,
    touchLockEnabled,
  });

  const {
    exportDataUrl,
    restoreSerializedSnapshot,
    restoreSnapshot,
    serializedSnapshot,
    serializeSnapshot,
    snapshot,
  } = useKangurCanvasSnapshotState<
    KangurFreeformDrawingSnapshot,
    KangurDrawingStroke<KangurFreeformDrawingStrokeMeta>[]
  >({
    canvasRef,
    clearSnapshot: engine.clearStrokes,
    createSnapshot: createKangurFreeformDrawingSnapshot,
    hasDrawableContent: engine.strokes.length > 0,
    initialSerializedSnapshot,
    logicalHeight,
    logicalWidth,
    onSerializedSnapshotChange,
    parseSnapshot: parseKangurFreeformDrawingSnapshot,
    rescaleSnapshot: rescaleKangurFreeformDrawingSnapshot,
    serializeSnapshotData: serializeKangurFreeformDrawingSnapshot,
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
    tools,
  };
};
