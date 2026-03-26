'use client';

import type { Point2d } from '@/shared/contracts/geometry';

export type KangurPointDrawingSnapshot = {
  logicalHeight: number;
  logicalWidth: number;
  strokes: Point2d[][];
  version: 1;
};

const SNAPSHOT_VERSION = 1 as const;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPoint = (value: unknown): value is Point2d =>
  typeof value === 'object' &&
  value !== null &&
  isFiniteNumber((value as { x?: unknown }).x) &&
  isFiniteNumber((value as { y?: unknown }).y);

const isPointStroke = (value: unknown): value is Point2d[] =>
  Array.isArray(value) && value.every(isPoint);

export const createKangurPointDrawingSnapshot = ({
  logicalHeight,
  logicalWidth,
  strokes,
}: Omit<KangurPointDrawingSnapshot, 'version'>): KangurPointDrawingSnapshot => ({
  logicalHeight,
  logicalWidth,
  strokes: strokes.map((stroke) => stroke.map((point) => ({ ...point }))),
  version: SNAPSHOT_VERSION,
});

export const serializeKangurPointDrawingSnapshot = (
  snapshot: KangurPointDrawingSnapshot
): string => JSON.stringify(snapshot);

export const parseKangurPointDrawingSnapshot = (
  raw: string
): KangurPointDrawingSnapshot | null => {
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
      !strokes.every(isPointStroke)
    ) {
      return null;
    }

    return createKangurPointDrawingSnapshot({
      logicalHeight,
      logicalWidth,
      strokes,
    });
  } catch {
    return null;
  }
};

export const rescaleKangurPointDrawingSnapshot = (
  snapshot: KangurPointDrawingSnapshot,
  logicalWidth: number,
  logicalHeight: number
): Point2d[][] => {
  const scaleX = snapshot.logicalWidth > 0 ? logicalWidth / snapshot.logicalWidth : 1;
  const scaleY = snapshot.logicalHeight > 0 ? logicalHeight / snapshot.logicalHeight : 1;

  return snapshot.strokes.map((stroke) =>
    stroke.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    }))
  );
};
