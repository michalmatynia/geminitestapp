import { describe, expect, it } from 'vitest';

import {
  evaluateAxisDrawing,
  evaluateMirrorDrawing,
  mirrorPoints,
  type SymmetryAxis,
} from '@/features/kangur/ui/services/geometry-symmetry';
import type { Point2d } from '@/shared/contracts/geometry';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const interpolateSegment = (
  start: Point2d,
  end: Point2d,
  steps = 14
): Point2d[] =>
  Array.from({ length: steps }, (_, index): Point2d => {
    const t = index / Math.max(1, steps - 1);
    return {
      x: lerp(start.x, end.x, t),
      y: lerp(start.y, end.y, t),
    };
  });

const buildPolyline = (vertices: Point2d[]): Point2d[] => {
  const points: Point2d[] = [];
  for (let i = 0; i < vertices.length - 1; i += 1) {
    const start = vertices[i];
    const end = vertices[i + 1];
    if (!start || !end) continue;
    const segment = interpolateSegment(start, end);
    if (i > 0) {
      points.push(...segment.slice(1));
    } else {
      points.push(...segment);
    }
  }
  return points;
};

const createTranslate = (dictionary: Record<string, string>) =>
  (key: string): string => dictionary[key] ?? key;

describe('geometry symmetry evaluator', () => {
  it('accepts a clean vertical axis line', () => {
    const axis: SymmetryAxis = { orientation: 'vertical', position: 160 };
    const points = buildPolyline([
      { x: 160, y: 20 },
      { x: 160, y: 200 },
    ]);
    const result = evaluateAxisDrawing(points, axis);
    expect(result.accepted).toBe(true);
  });

  it('rejects a horizontal line for a vertical axis', () => {
    const axis: SymmetryAxis = { orientation: 'vertical', position: 160 };
    const points = buildPolyline([
      { x: 40, y: 110 },
      { x: 280, y: 110 },
    ]);
    const result = evaluateAxisDrawing(points, axis);
    expect(result.accepted).toBe(false);
  });

  it('accepts a mirrored drawing on the correct side', () => {
    const axis: SymmetryAxis = { orientation: 'vertical', position: 160 };
    const template = buildPolyline([
      { x: 160, y: 60 },
      { x: 125, y: 80 },
      { x: 115, y: 120 },
      { x: 140, y: 155 },
    ]);
    const mirrored = mirrorPoints(template, axis);
    const result = evaluateMirrorDrawing({
      points: mirrored,
      template,
      axis,
      expectedSide: 'right',
    });
    expect(result.accepted).toBe(true);
  });

  it('rejects drawing on the wrong side of the axis', () => {
    const axis: SymmetryAxis = { orientation: 'vertical', position: 160 };
    const template = buildPolyline([
      { x: 160, y: 60 },
      { x: 125, y: 80 },
      { x: 115, y: 120 },
      { x: 140, y: 155 },
    ]);
    const result = evaluateMirrorDrawing({
      points: template,
      template,
      axis,
      expectedSide: 'right',
    });
    expect(result.accepted).toBe(false);
  });

  it('returns translated feedback when a translator is provided', () => {
    const translate = createTranslate({
      'geometrySymmetry.feedback.axis.success':
        'Great! That is a correct axis of symmetry.',
      'geometrySymmetry.feedback.mirror.expectedSide':
        'Draw on the green side of the symmetry axis.',
    });
    const axis: SymmetryAxis = { orientation: 'vertical', position: 160 };
    const template = buildPolyline([
      { x: 160, y: 60 },
      { x: 125, y: 80 },
      { x: 115, y: 120 },
      { x: 140, y: 155 },
    ]);

    expect(
      evaluateAxisDrawing(
        buildPolyline([
          { x: 160, y: 20 },
          { x: 160, y: 200 },
        ]),
        axis,
        translate
      ).message
    ).toBe('Great! That is a correct axis of symmetry.');
    expect(
      evaluateMirrorDrawing({
        points: template,
        template,
        axis,
        expectedSide: 'right',
        translate,
      }).message
    ).toBe('Draw on the green side of the symmetry axis.');
  });
});
