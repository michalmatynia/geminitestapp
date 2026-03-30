'use client';

import type { Point2d } from '@/shared/contracts/geometry';

export const getKangurPointDistance = (a: Point2d, b: Point2d): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const flattenKangurStrokePoints = (strokes: Point2d[][]): Point2d[] =>
  strokes.flatMap((stroke) => stroke);

export const computeKangurStrokeLength = (stroke: Point2d[]): number => {
  if (stroke.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < stroke.length; i += 1) {
    total += getKangurPointDistance(stroke[i - 1] as Point2d, stroke[i] as Point2d);
  }

  return total;
};

export const computeKangurTotalStrokeLength = (strokes: Point2d[][]): number =>
  strokes.reduce((sum, stroke) => sum + computeKangurStrokeLength(stroke), 0);
