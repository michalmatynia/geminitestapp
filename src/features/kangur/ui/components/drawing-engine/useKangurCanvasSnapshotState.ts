'use client';

import { useCallback, useMemo, type RefObject } from 'react';

import {
  exportKangurCanvasDataUrl,
  type KangurDrawingExportOptions,
} from '@/features/kangur/ui/components/drawing-engine/canvas-export';
import { useKangurSerializedSnapshotSync } from '@/features/kangur/ui/components/drawing-engine/useKangurSerializedSnapshotSync';

type CreateSnapshotArgs<Strokes> = {
  logicalHeight: number;
  logicalWidth: number;
  strokes: Strokes;
};

type UseKangurCanvasSnapshotStateOptions<Snapshot, Strokes> = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  clearSnapshot: () => void;
  createSnapshot: (args: CreateSnapshotArgs<Strokes>) => Snapshot;
  hasDrawableContent: boolean;
  initialSerializedSnapshot?: string | null;
  logicalHeight: number;
  logicalWidth: number;
  onSerializedSnapshotChange?: (raw: string | null) => void;
  parseSnapshot: (raw: string) => Snapshot | null;
  rescaleSnapshot: (
    snapshot: Snapshot,
    logicalWidth: number,
    logicalHeight: number
  ) => Strokes;
  serializeSnapshotData: (snapshot: Snapshot) => string;
  setStrokes: (strokes: Strokes) => void;
  strokes: Strokes;
};

export type UseKangurCanvasSnapshotStateResult<Snapshot> = {
  exportDataUrl: (options?: KangurDrawingExportOptions) => string | null;
  hasDrawableContent: boolean;
  restoreSerializedSnapshot: (raw: string) => boolean;
  restoreSnapshot: (snapshot: Snapshot) => void;
  serializedSnapshot: string | null;
  serializeSnapshot: () => string;
  snapshot: Snapshot;
};

export const useKangurCanvasSnapshotState = <Snapshot, Strokes>({
  canvasRef,
  clearSnapshot,
  createSnapshot,
  hasDrawableContent,
  initialSerializedSnapshot = null,
  logicalHeight,
  logicalWidth,
  onSerializedSnapshotChange,
  parseSnapshot,
  rescaleSnapshot,
  serializeSnapshotData,
  setStrokes,
  strokes,
}: UseKangurCanvasSnapshotStateOptions<Snapshot, Strokes>): UseKangurCanvasSnapshotStateResult<Snapshot> => {
  const snapshot = useMemo(
    () =>
      createSnapshot({
        logicalHeight,
        logicalWidth,
        strokes,
      }),
    [createSnapshot, logicalHeight, logicalWidth, strokes]
  );

  const serializedSnapshot = useMemo(
    () => (hasDrawableContent ? serializeSnapshotData(snapshot) : null),
    [hasDrawableContent, serializeSnapshotData, snapshot]
  );

  const serializeSnapshot = useCallback(
    (): string => serializeSnapshotData(snapshot),
    [serializeSnapshotData, snapshot]
  );

  const restoreSnapshot = useCallback(
    (nextSnapshot: Snapshot): void => {
      setStrokes(rescaleSnapshot(nextSnapshot, logicalWidth, logicalHeight));
    },
    [logicalHeight, logicalWidth, rescaleSnapshot, setStrokes]
  );

  const restoreSerializedSnapshot = useCallback(
    (raw: string): boolean => {
      const parsed = parseSnapshot(raw);
      if (!parsed) {
        return false;
      }

      restoreSnapshot(parsed);
      return true;
    },
    [parseSnapshot, restoreSnapshot]
  );

  useKangurSerializedSnapshotSync({
    clearSnapshot,
    initialSerializedSnapshot,
    onSerializedSnapshotChange,
    restoreSerializedSnapshot,
    serializedSnapshot,
  });

  const exportDataUrl = useCallback(
    (options?: KangurDrawingExportOptions): string | null =>
      exportKangurCanvasDataUrl(canvasRef.current, options),
    [canvasRef]
  );

  return {
    exportDataUrl,
    hasDrawableContent,
    restoreSerializedSnapshot,
    restoreSnapshot,
    serializedSnapshot,
    serializeSnapshot,
    snapshot,
  };
};
