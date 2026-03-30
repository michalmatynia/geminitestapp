'use client';

import type { Point2d } from '@/shared/contracts/geometry';

import {
  computeKangurStrokeLength,
  computeKangurTotalStrokeLength,
  flattenKangurStrokePoints,
  getKangurPointDistance,
} from '@/features/kangur/ui/components/drawing-engine/stroke-metrics';

describe('stroke-metrics', () => {
  it('computes point distance and stroke length from shared geometry math', () => {
    const stroke: Point2d[] = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 6, y: 8 },
    ];

    expect(getKangurPointDistance(stroke[0] as Point2d, stroke[1] as Point2d)).toBe(5);
    expect(computeKangurStrokeLength(stroke)).toBe(10);
  });

  it('flattens strokes and sums total stroke length', () => {
    const strokes: Point2d[][] = [
      [
        { x: 0, y: 0 },
        { x: 0, y: 5 },
      ],
      [
        { x: 0, y: 0 },
        { x: 12, y: 0 },
      ],
    ];

    expect(flattenKangurStrokePoints(strokes)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 5 },
      { x: 0, y: 0 },
      { x: 12, y: 0 },
    ]);
    expect(computeKangurTotalStrokeLength(strokes)).toBe(17);
  });

  it('returns zero length for empty or single-point strokes', () => {
    expect(computeKangurStrokeLength([])).toBe(0);
    expect(computeKangurStrokeLength([{ x: 4, y: 9 }])).toBe(0);
  });
});
