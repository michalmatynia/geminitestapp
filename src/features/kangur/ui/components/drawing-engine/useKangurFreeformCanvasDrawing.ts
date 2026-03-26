'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';

import { redrawKangurCanvasStrokes } from '@/features/kangur/ui/components/drawing-engine/render';
import {
  createKangurFreeformDrawingSnapshot,
  exportKangurCanvasDataUrl,
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

type UseKangurFreeformCanvasDrawingOptions = {
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
  const previousIncomingSnapshotRef = useRef<string | null | undefined>(undefined);
  const skipSnapshotEmissionRef = useRef(Boolean(initialSerializedSnapshot));
  const tools = useKangurFreeformDrawingTools({
    config,
    isCoarsePointer,
  });

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
        backgroundFill,
        beforeStrokes,
        canvas: canvasRef.current,
        logicalHeight,
        logicalWidth,
        resolveStyle: ({ meta }) => ({
          compositeOperation: meta.isEraser ? 'destination-out' : 'source-over',
          lineWidth: meta.width,
          renderMode: resolvedConfig.strokeRenderMode,
          strokeStyle: meta.isEraser ? 'rgba(0,0,0,1)' : meta.color,
        }),
        strokes: activeStroke ? [...strokes, activeStroke] : strokes,
      });
    },
    shouldCommitStroke,
    shouldStartStroke,
    touchLockEnabled,
  });

  const snapshot = createKangurFreeformDrawingSnapshot({
    logicalHeight,
    logicalWidth,
    strokes: engine.strokes,
  });
  const serializedSnapshot = useMemo(
    () =>
      engine.strokes.length > 0
        ? serializeKangurFreeformDrawingSnapshot(snapshot)
        : null,
    [engine.strokes.length, snapshot]
  );

  const serializeSnapshot = useCallback(
    (): string => serializeKangurFreeformDrawingSnapshot(snapshot),
    [snapshot]
  );

  const restoreSnapshot = useCallback(
    (nextSnapshot: KangurFreeformDrawingSnapshot): void => {
      engine.setStrokes(
        rescaleKangurFreeformDrawingSnapshot(
          nextSnapshot,
          logicalWidth,
          logicalHeight
        )
      );
    },
    [engine, logicalHeight, logicalWidth]
  );

  const restoreSerializedSnapshot = useCallback(
    (raw: string): boolean => {
      const parsed = parseKangurFreeformDrawingSnapshot(raw);
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

  const exportDataUrl = useCallback(
    (options?: { mimeType?: string; quality?: number }): string | null =>
      exportKangurCanvasDataUrl(canvasRef.current, options),
    [canvasRef]
  );

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
