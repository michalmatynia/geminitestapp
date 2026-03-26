'use client';

export { exportKangurCanvasDataUrl } from '@/features/kangur/ui/components/drawing-engine/canvas-export';

import type { KangurDrawingStroke, KangurFreeformDrawingStrokeMeta } from './types';

export type KangurFreeformDrawingSnapshot = {
  logicalHeight: number;
  logicalWidth: number;
  strokes: KangurDrawingStroke<KangurFreeformDrawingStrokeMeta>[];
  version: 1;
};

const SNAPSHOT_VERSION = 1 as const;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPoint = (value: unknown): value is { x: number; y: number } =>
  typeof value === 'object' &&
  value !== null &&
  isFiniteNumber((value as { x?: unknown }).x) &&
  isFiniteNumber((value as { y?: unknown }).y);

const isStrokeMeta = (value: unknown): value is KangurFreeformDrawingStrokeMeta =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { color?: unknown }).color === 'string' &&
  typeof (value as { isEraser?: unknown }).isEraser === 'boolean' &&
  isFiniteNumber((value as { width?: unknown }).width);

const isFreeformStroke = (
  value: unknown
): value is KangurDrawingStroke<KangurFreeformDrawingStrokeMeta> =>
  typeof value === 'object' &&
  value !== null &&
  isStrokeMeta((value as { meta?: unknown }).meta) &&
  Array.isArray((value as { points?: unknown }).points) &&
  (value as { points: unknown[] }).points.every(isPoint);

export const createKangurFreeformDrawingSnapshot = ({
  logicalHeight,
  logicalWidth,
  strokes,
}: Omit<KangurFreeformDrawingSnapshot, 'version'>): KangurFreeformDrawingSnapshot => ({
  logicalHeight,
  logicalWidth,
  strokes: strokes.map((stroke) => ({
    meta: { ...stroke.meta },
    points: stroke.points.map((point) => ({ ...point })),
  })),
  version: SNAPSHOT_VERSION,
});

export const serializeKangurFreeformDrawingSnapshot = (
  snapshot: KangurFreeformDrawingSnapshot
): string => JSON.stringify(snapshot);

export const parseKangurFreeformDrawingSnapshot = (
  raw: string
): KangurFreeformDrawingSnapshot | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const candidate =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as {
            logicalHeight?: unknown;
            logicalWidth?: unknown;
            strokes?: unknown;
            version?: unknown;
          })
        : null;
    const logicalWidth = candidate?.logicalWidth;
    const logicalHeight = candidate?.logicalHeight;
    const strokes = candidate?.strokes;

    if (
      candidate?.version !== SNAPSHOT_VERSION ||
      !isFiniteNumber(logicalWidth) ||
      !isFiniteNumber(logicalHeight) ||
      !Array.isArray(strokes) ||
      !strokes.every(isFreeformStroke)
    ) {
      return null;
    }

    return createKangurFreeformDrawingSnapshot({
      logicalHeight,
      logicalWidth,
      strokes,
    });
  } catch {
    return null;
  }
};

export const rescaleKangurFreeformDrawingSnapshot = (
  snapshot: KangurFreeformDrawingSnapshot,
  logicalWidth: number,
  logicalHeight: number
): KangurDrawingStroke<KangurFreeformDrawingStrokeMeta>[] => {
  const scaleX = snapshot.logicalWidth > 0 ? logicalWidth / snapshot.logicalWidth : 1;
  const scaleY = snapshot.logicalHeight > 0 ? logicalHeight / snapshot.logicalHeight : 1;

  return snapshot.strokes.map((stroke) => ({
    meta: { ...stroke.meta },
    points: stroke.points.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    })),
  }));
};
