import type { Point2d } from '@/shared/contracts/geometry';

import { loosenMax, loosenMin } from './drawing-leniency';

export type SymmetryAxisOrientation = 'vertical' | 'horizontal';

export type SymmetryAxis = {
  orientation: SymmetryAxisOrientation;
  position: number;
};

export type SymmetryExpectedSide = 'left' | 'right' | 'top' | 'bottom';

export type SymmetryEvaluationKind = 'success' | 'error' | 'info';

export type SymmetryAxisEvaluation = {
  accepted: boolean;
  kind: SymmetryEvaluationKind;
  offset: number;
  deviation: number;
  length: number;
  message: string;
};

export type SymmetryMirrorEvaluation = {
  accepted: boolean;
  kind: SymmetryEvaluationKind;
  coverage: number;
  avgDistance: number;
  offsideRatio: number;
  message: string;
};

const MIN_POINTS = loosenMin(12);
const MIN_AXIS_LENGTH = loosenMin(80);
const MAX_AXIS_DEVIATION = loosenMax(12);
const MAX_AXIS_OFFSET = loosenMax(16);
const MAX_AXIS_CROSS_RANGE = loosenMax(30);
const MIRROR_DISTANCE_TOLERANCE = loosenMax(6);
const MIN_MIRROR_COVERAGE = loosenMin(0.825);
const MAX_MIRROR_AVG_DISTANCE = loosenMax(7);
const MAX_OFFSIDE_RATIO = loosenMax(0.1);
const MIN_MIRROR_LENGTH_RATIO = loosenMin(0.85);

const distance = (a: Point2d, b: Point2d): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

const sanitizePoints = (points: Point2d[]): Point2d[] => {
  if (points.length === 0) return [];
  const sanitized: Point2d[] = [points[0]!];
  for (let i = 1; i < points.length; i += 1) {
    const current = points[i];
    const previous = sanitized[sanitized.length - 1];
    if (!current || !previous) continue;
    if (distance(current, previous) < 1.5) continue;
    sanitized.push(current);
  }
  return sanitized;
};

const samplePath = (points: Point2d[], sampleCount = 120): Point2d[] => {
  if (points.length <= 2) return points;

  const segments: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const len = distance(a, b);
    segments.push(len);
    total += len;
  }
  if (total < 1) return points;

  const sampled: Point2d[] = [points[0]!];
  for (let step = 1; step < sampleCount - 1; step += 1) {
    const targetDist = (total * step) / (sampleCount - 1);
    let traversed = 0;
    let found: Point2d | null = null;

    for (let i = 1; i < points.length; i += 1) {
      const segLen = segments[i - 1] ?? 0;
      const start = points[i - 1];
      const end = points[i];
      if (!start || !end) continue;

      if (traversed + segLen >= targetDist) {
        const local = segLen > 0 ? (targetDist - traversed) / segLen : 0;
        found = {
          x: start.x + (end.x - start.x) * local,
          y: start.y + (end.y - start.y) * local,
        };
        break;
      }
      traversed += segLen;
    }

    if (found) sampled.push(found);
  }

  sampled.push(points[points.length - 1]!);
  return sampled;
};

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const meanAbsDeviation = (values: number[], center: number): number => {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + Math.abs(value - center), 0);
  return total / values.length;
};

const pathLength = (points: Point2d[]): number => {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    total += distance(a, b);
  }
  return total;
};

const computeAxisMeasures = (
  points: Point2d[],
  axis: SymmetryAxis
): { length: number; crossRange: number; deviation: number; offset: number } => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const length = axis.orientation === 'vertical' ? maxY - minY : maxX - minX;
  const crossRange = axis.orientation === 'vertical' ? maxX - minX : maxY - minY;
  const center = axis.orientation === 'vertical' ? mean(xs) : mean(ys);
  const deviation = meanAbsDeviation(axis.orientation === 'vertical' ? xs : ys, center);
  const offset = Math.abs(center - axis.position);

  return { length, crossRange, deviation, offset };
};

export const mirrorPoints = (points: Point2d[], axis: SymmetryAxis): Point2d[] =>
  points.map((point) =>
    axis.orientation === 'vertical'
      ? { x: 2 * axis.position - point.x, y: point.y }
      : { x: point.x, y: 2 * axis.position - point.y }
  );

const isOnExpectedSide = (
  point: Point2d,
  axis: SymmetryAxis,
  expectedSide: SymmetryExpectedSide
): boolean => {
  const margin = loosenMin(4);
  if (axis.orientation === 'vertical') {
    if (expectedSide === 'left') return point.x < axis.position - margin;
    if (expectedSide === 'right') return point.x > axis.position + margin;
  }
  if (axis.orientation === 'horizontal') {
    if (expectedSide === 'top') return point.y < axis.position - margin;
    if (expectedSide === 'bottom') return point.y > axis.position + margin;
  }
  return true;
};

export const evaluateAxisDrawing = (
  points: Point2d[],
  axis: SymmetryAxis
): SymmetryAxisEvaluation => {
  const sanitized = sanitizePoints(points);
  if (sanitized.length < MIN_POINTS) {
    return {
      accepted: false,
      kind: 'info',
      offset: 0,
      deviation: 0,
      length: 0,
      message: 'Narysuj dłuższą linię osi, od jednego końca figury do drugiego.',
    };
  }

  const { length, crossRange, deviation, offset } = computeAxisMeasures(sanitized, axis);

  if (length < MIN_AXIS_LENGTH) {
    return {
      accepted: false,
      kind: 'info',
      offset,
      deviation,
      length,
      message: 'Oś powinna być dłuższa — narysuj ją prawie przez całą figurę.',
    };
  }

  if (crossRange > MAX_AXIS_CROSS_RANGE || deviation > MAX_AXIS_DEVIATION) {
    return {
      accepted: false,
      kind: 'error',
      offset,
      deviation,
      length,
      message:
        axis.orientation === 'vertical'
          ? 'Oś symetrii powinna być prosta i pionowa.'
          : 'Oś symetrii powinna być prosta i pozioma.',
    };
  }

  if (offset > MAX_AXIS_OFFSET) {
    return {
      accepted: false,
      kind: 'error',
      offset,
      deviation,
      length,
      message: 'Przesuń oś bliżej środka figury.',
    };
  }

  return {
    accepted: true,
    kind: 'success',
    offset,
    deviation,
    length,
    message: 'Świetnie! To poprawna oś symetrii.',
  };
};

export const evaluateMirrorDrawing = ({
  points,
  template,
  axis,
  expectedSide,
}: {
  points: Point2d[];
  template: Point2d[];
  axis: SymmetryAxis;
  expectedSide: SymmetryExpectedSide;
}): SymmetryMirrorEvaluation => {
  const sanitized = sanitizePoints(points);
  if (sanitized.length < MIN_POINTS) {
    return {
      accepted: false,
      kind: 'info',
      coverage: 0,
      avgDistance: 0,
      offsideRatio: 1,
      message: 'Dorysuj brakującą połowę, żeby sprawdzić symetrię.',
    };
  }

  const sampledUser = samplePath(sanitized, 160);
  const expected = samplePath(mirrorPoints(template, axis), 140);
  const expectedLength = pathLength(template);
  const userLength = pathLength(sanitized);

  if (expectedLength > 0 && userLength < expectedLength * MIN_MIRROR_LENGTH_RATIO) {
    return {
      accepted: false,
      kind: 'info',
      coverage: 0,
      avgDistance: 0,
      offsideRatio: 0,
      message: 'Dorysuj więcej kształtu — jeszcze brakuje sporej części odbicia.',
    };
  }

  const offsideCount = sampledUser.filter(
    (point) => !isOnExpectedSide(point, axis, expectedSide)
  ).length;
  const offsideRatio = sampledUser.length > 0 ? offsideCount / sampledUser.length : 1;

  if (offsideRatio > MAX_OFFSIDE_RATIO) {
    return {
      accepted: false,
      kind: 'error',
      coverage: 0,
      avgDistance: 0,
      offsideRatio,
      message: 'Rysuj po zielonej stronie osi symetrii.',
    };
  }

  let within = 0;
  let totalDistance = 0;
  for (const point of expected) {
    let minDistance = Number.POSITIVE_INFINITY;
    for (const userPoint of sampledUser) {
      const dist = distance(point, userPoint);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    totalDistance += minDistance;
    if (minDistance <= MIRROR_DISTANCE_TOLERANCE) {
      within += 1;
    }
  }

  const coverage = expected.length > 0 ? within / expected.length : 0;
  const avgDistance = expected.length > 0 ? totalDistance / expected.length : 999;

  if (coverage < MIN_MIRROR_COVERAGE || avgDistance > MAX_MIRROR_AVG_DISTANCE) {
    return {
      accepted: false,
      kind: 'error',
      coverage,
      avgDistance,
      offsideRatio,
      message: 'Spróbuj dorysować kształt bliżej przerywanego odbicia.',
    };
  }

  return {
    accepted: true,
    kind: 'success',
    coverage,
    avgDistance,
    offsideRatio,
    message: 'Brawo! Odbicie pasuje do osi.',
  };
};
