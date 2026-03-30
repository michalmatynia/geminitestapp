import { describe, expect, it } from 'vitest';

import {
  evaluateGeometryDrawing,
  type GeometryShapeId,
} from '@/features/kangur/ui/services/geometry-drawing';
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

const buildPolygon = (vertices: Point2d[]): Point2d[] => {
  const points: Point2d[] = [];
  for (let i = 0; i < vertices.length; i += 1) {
    const start = vertices[i];
    const end = vertices[(i + 1) % vertices.length];
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

const buildCircle = (
  center: Point2d,
  radius: number,
  pointsCount = 120
): Point2d[] =>
  Array.from({ length: pointsCount }, (_, index): Point2d => {
    const angle = (Math.PI * 2 * index) / Math.max(1, pointsCount - 1);
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  });

const buildEllipse = (
  center: Point2d,
  radiusX: number,
  radiusY: number,
  pointsCount = 140
): Point2d[] =>
  Array.from({ length: pointsCount }, (_, index): Point2d => {
    const angle = (Math.PI * 2 * index) / Math.max(1, pointsCount - 1);
    return {
      x: center.x + radiusX * Math.cos(angle),
      y: center.y + radiusY * Math.sin(angle),
    };
  });

const createTranslate = (dictionary: Record<string, string>) =>
  (key: string, values?: Record<string, string | number>): string => {
    const template = dictionary[key];
    if (!template) return key;
    return template.replace(/\{(\w+)\}/g, (_, token: string) =>
      String(values?.[token] ?? `{${token}}`)
    );
  };

const EXPECT_ACCEPTED: Record<GeometryShapeId, Point2d[]> = {
  oval: buildEllipse({ x: 145, y: 120 }, 110, 60),
  triangle: buildPolygon([
    { x: 140, y: 28 },
    { x: 34, y: 190 },
    { x: 246, y: 190 },
  ]),
  diamond: buildPolygon([
    { x: 145, y: 20 },
    { x: 260, y: 120 },
    { x: 145, y: 220 },
    { x: 30, y: 120 },
  ]),
  square: buildPolygon([
    { x: 44, y: 44 },
    { x: 244, y: 44 },
    { x: 244, y: 204 },
    { x: 44, y: 204 },
  ]),
  rectangle: buildPolygon([
    { x: 28, y: 60 },
    { x: 262, y: 60 },
    { x: 262, y: 196 },
    { x: 28, y: 196 },
  ]),
  pentagon: buildPolygon([
    { x: 144, y: 24 },
    { x: 246, y: 96 },
    { x: 208, y: 208 },
    { x: 78, y: 208 },
    { x: 40, y: 96 },
  ]),
  hexagon: buildPolygon([
    { x: 130, y: 24 },
    { x: 228, y: 72 },
    { x: 228, y: 170 },
    { x: 130, y: 220 },
    { x: 34, y: 170 },
    { x: 34, y: 72 },
  ]),
  circle: buildCircle({ x: 145, y: 120 }, 84),
};

describe('geometry drawing evaluator', () => {
  it.each([
    ['oval' as const],
    ['triangle' as const],
    ['diamond' as const],
    ['square' as const],
    ['rectangle' as const],
    ['pentagon' as const],
    ['hexagon' as const],
    ['circle' as const],
  ])('accepts clean %s-like path', (shape) => {
    const result = evaluateGeometryDrawing(shape, EXPECT_ACCEPTED[shape]);
    expect(result.accepted).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('rejects tiny/short doodles', () => {
    const points = [
      { x: 20, y: 20 },
      { x: 22, y: 20 },
      { x: 24, y: 22 },
      { x: 25, y: 24 },
      { x: 24, y: 26 },
      { x: 22, y: 28 },
    ];
    const result = evaluateGeometryDrawing('circle', points);
    expect(result.accepted).toBe(false);
  });

  it('rejects obvious mismatch (triangle request with circular drawing)', () => {
    const result = evaluateGeometryDrawing('triangle', EXPECT_ACCEPTED.circle);
    expect(result.accepted).toBe(false);
  });

  it('rejects clearly open polygon paths for pentagon target', () => {
    const openPentagon = EXPECT_ACCEPTED.pentagon.slice(0, -18);
    const result = evaluateGeometryDrawing('pentagon', openPentagon);
    expect(result.accepted).toBe(false);
    expect(result.closureRatio).toBeGreaterThan(0.2);
  });

  it('rejects open square drawings even when corners look right', () => {
    const openSquare = EXPECT_ACCEPTED.square.slice(0, -24);
    const result = evaluateGeometryDrawing('square', openSquare);
    expect(result.accepted).toBe(false);
    expect(result.closureRatio).toBeGreaterThan(0.2);
  });

  it('returns translated feedback when a translator is provided', () => {
    const translate = createTranslate({
      'geometryDrawing.feedback.success.circle': 'Great! That looks like a circle.',
      'geometryDrawing.feedback.failure.addMoreCorners':
        'Add more corners. This shape should have about {idealCorners}.',
    });

    expect(evaluateGeometryDrawing('circle', EXPECT_ACCEPTED.circle, translate).message).toBe(
      'Great! That looks like a circle.'
    );
    expect(
      evaluateGeometryDrawing(
        'triangle',
        EXPECT_ACCEPTED.circle,
        translate
      ).message
    ).toBe('Add more corners. This shape should have about 3.');
  });

  it('returns locale-aware fallback feedback when only a locale is provided', () => {
    expect(
      evaluateGeometryDrawing('circle', EXPECT_ACCEPTED.circle, { locale: 'en' }).message
    ).toBe('Great! That looks like a circle.');
    expect(
      evaluateGeometryDrawing('triangle', EXPECT_ACCEPTED.circle, { locale: 'de' }).message
    ).toBe('Fuge mehr Ecken hinzu. Diese Form sollte ungefahr 3 haben.');
  });
});
