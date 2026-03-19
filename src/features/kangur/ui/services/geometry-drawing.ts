import type { Point2d } from '@/shared/contracts/geometry';
import {
  translateKangurMiniGameWithFallback,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';

import { loosenMax, loosenMin, loosenMinInt } from './drawing-leniency';

export type GeometryShapeId =
  | 'circle'
  | 'oval'
  | 'triangle'
  | 'diamond'
  | 'square'
  | 'rectangle'
  | 'pentagon'
  | 'hexagon';

export type GeometryDrawingEvaluation = {
  accepted: boolean;
  score: number;
  corners: number;
  closureRatio: number;
  aspectRatio: number;
  lengthRatio: number;
  message: string;
};

type BoundingBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  diagonal: number;
};

type GeometryShapeRule = {
  idealCorners: number;
  minCorners: number;
  maxCorners: number;
  minScore: number;
  maxClosureRatio?: number;
  minLengthRatio?: number;
  maxLengthRatio?: number;
  minAspect?: number;
  maxAspect?: number;
  idealAspect?: number;
  aspectTolerance?: number;
  successMessageKey: string;
  successMessage: string;
  failureMessageKey: string;
  failureMessage: string;
};

const MIN_DRAWING_POINTS = loosenMinInt(14);
const MIN_DRAWING_SIZE = loosenMin(24);
const CIRCLE_RADIAL_CV_LIMIT = loosenMax(0.35);
const CIRCLE_ASPECT_TOLERANCE = loosenMax(0.6);
const DEFAULT_MAX_CLOSURE_RATIO = loosenMax(0.28);
const DEFAULT_MIN_LENGTH_RATIO = loosenMin(0.6);
const DEFAULT_MAX_LENGTH_RATIO = loosenMax(2.8);
const DEFAULT_ASPECT_SCORE_TOLERANCE = loosenMax(0.8);

const SHAPE_RULES: Record<GeometryShapeId, GeometryShapeRule> = {
  circle: {
    idealCorners: 0,
    minCorners: 0,
    maxCorners: 5,
    minScore: 0.59,
    maxClosureRatio: 0.26,
    minAspect: 0.75,
    maxAspect: 1.35,
    idealAspect: 1,
    aspectTolerance: 0.62,
    successMessageKey: 'geometryDrawing.feedback.success.circle',
    successMessage: 'Super! To wygląda jak koło.',
    failureMessageKey: 'geometryDrawing.feedback.failure.default.circle',
    failureMessage: 'Spróbuj narysować bardziej okrągłą linię.',
  },
  oval: {
    idealCorners: 0,
    minCorners: 0,
    maxCorners: 5,
    minScore: 0.52,
    maxClosureRatio: 0.28,
    minAspect: 1.15,
    maxAspect: 3.0,
    idealAspect: 1.7,
    aspectTolerance: 1.1,
    successMessageKey: 'geometryDrawing.feedback.success.oval',
    successMessage: 'Świetnie! To wygląda jak owal.',
    failureMessageKey: 'geometryDrawing.feedback.failure.default.oval',
    failureMessage: 'Spróbuj narysować bardziej wydłużony owal.',
  },
  triangle: {
    idealCorners: 3,
    minCorners: 2,
    maxCorners: 5,
    minScore: 0.54,
    maxClosureRatio: 0.24,
    minAspect: 0.65,
    maxAspect: 2.2,
    successMessageKey: 'geometryDrawing.feedback.success.triangle',
    successMessage: 'Brawo! To poprawny trójkąt.',
    failureMessageKey: 'geometryDrawing.feedback.failure.default.triangle',
    failureMessage: 'Spróbuj narysować 3 wyraźne rogi.',
  },
  square: {
    idealCorners: 4,
    minCorners: 3,
    maxCorners: 6,
    minScore: 0.56,
    maxClosureRatio: 0.23,
    minAspect: 0.75,
    maxAspect: 1.42,
    idealAspect: 1,
    aspectTolerance: 0.5,
    successMessageKey: 'geometryDrawing.feedback.success.square',
    successMessage: 'Świetnie! To wygląda jak kwadrat.',
    failureMessageKey: 'geometryDrawing.feedback.failure.default.square',
    failureMessage: 'Spróbuj narysować 4 boki o podobnej długości.',
  },
  diamond: {
    idealCorners: 4,
    minCorners: 3,
    maxCorners: 6,
    minScore: 0.54,
    maxClosureRatio: 0.26,
    minAspect: 1,
    maxAspect: 2.4,
    idealAspect: 1.2,
    aspectTolerance: 1.1,
    successMessageKey: 'geometryDrawing.feedback.success.diamond',
    successMessage: 'Brawo! To wygląda jak romb.',
    failureMessageKey: 'geometryDrawing.feedback.failure.default.diamond',
    failureMessage: 'Spróbuj narysować ukośne boki i 4 wyraźne rogi.',
  },
  rectangle: {
    idealCorners: 4,
    minCorners: 3,
    maxCorners: 6,
    minScore: 0.55,
    maxClosureRatio: 0.26,
    minAspect: 1.15,
    maxAspect: 3.4,
    idealAspect: 1.9,
    aspectTolerance: 1.4,
    successMessageKey: 'geometryDrawing.feedback.success.rectangle',
    successMessage: 'Dobrze! To wygląda jak prostokąt.',
    failureMessageKey: 'geometryDrawing.feedback.failure.default.rectangle',
    failureMessage: 'Spróbuj narysować 4 rogi i dłuższy bok niż drugi.',
  },
  pentagon: {
    idealCorners: 5,
    minCorners: 4,
    maxCorners: 7,
    minScore: 0.52,
    maxClosureRatio: 0.26,
    minAspect: 0.62,
    maxAspect: 1.95,
    successMessageKey: 'geometryDrawing.feedback.success.pentagon',
    successMessage: 'Mega! Narysowano pięciokąt.',
    failureMessageKey: 'geometryDrawing.feedback.failure.default.pentagon',
    failureMessage: 'Spróbuj narysować 5 wyraźnych rogów.',
  },
  hexagon: {
    idealCorners: 6,
    minCorners: 5,
    maxCorners: 8,
    minScore: 0.51,
    maxClosureRatio: 0.27,
    minAspect: 0.62,
    maxAspect: 2.1,
    successMessageKey: 'geometryDrawing.feedback.success.hexagon',
    successMessage: 'Świetnie! To wygląda jak sześciokąt.',
    failureMessageKey: 'geometryDrawing.feedback.failure.default.hexagon',
    failureMessage: 'Spróbuj narysować 6 wyraźnych rogów.',
  },
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const distance = (a: Point2d, b: Point2d): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

const computePathLength = (points: Point2d[]): number => {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    if (!prev || !next) continue;
    total += distance(prev, next);
  }
  return total;
};

const computeBoundingBox = (points: Point2d[]): BoundingBox => {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  const diagonal = Math.max(1, Math.hypot(width, height));

  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    height,
    diagonal,
  };
};

const sanitizePoints = (points: Point2d[]): Point2d[] => {
  if (points.length === 0) return [];
  const sanitized: Point2d[] = [points[0]!];
  for (let i = 1; i < points.length; i += 1) {
    const current = points[i];
    const previous = sanitized[sanitized.length - 1];
    if (!current || !previous) continue;
    if (distance(current, previous) < 1.2) continue;
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

const smoothPath = (points: Point2d[], windowSize = 2): Point2d[] => {
  if (points.length === 0 || windowSize <= 0) return points;
  const smoothed: Point2d[] = [];
  const lastIndex = points.length - 1;

  for (let i = 0; i <= lastIndex; i += 1) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    const start = Math.max(0, i - windowSize);
    const end = Math.min(lastIndex, i + windowSize);
    for (let j = start; j <= end; j += 1) {
      const point = points[j];
      if (!point) continue;
      sumX += point.x;
      sumY += point.y;
      count += 1;
    }
    if (count === 0) continue;
    smoothed.push({ x: sumX / count, y: sumY / count });
  }

  return smoothed;
};

const applyDrawingLeniency = (rule: GeometryShapeRule): GeometryShapeRule => ({
  ...rule,
  minScore: loosenMin(rule.minScore),
  maxClosureRatio:
    typeof rule.maxClosureRatio === 'number' ? loosenMax(rule.maxClosureRatio) : undefined,
  minLengthRatio:
    typeof rule.minLengthRatio === 'number' ? loosenMin(rule.minLengthRatio) : undefined,
  maxLengthRatio:
    typeof rule.maxLengthRatio === 'number' ? loosenMax(rule.maxLengthRatio) : undefined,
  minAspect: typeof rule.minAspect === 'number' ? loosenMin(rule.minAspect) : undefined,
  maxAspect: typeof rule.maxAspect === 'number' ? loosenMax(rule.maxAspect) : undefined,
  aspectTolerance:
    typeof rule.aspectTolerance === 'number' ? loosenMax(rule.aspectTolerance) : undefined,
});

const countCorners = (points: Point2d[]): number => {
  if (points.length < 7) return 0;
  const closed = [...points];
  const first = points[0];
  const last = points[points.length - 1];
  if (first && last && distance(first, last) > 1) {
    closed.push(first);
  }

  const minCornerSpacing = 7;
  const thresholdDeg = 48;
  const corners: number[] = [];

  for (let i = 2; i < closed.length - 2; i += 1) {
    const a = closed[i - 2];
    const b = closed[i];
    const c = closed[i + 2];
    if (!a || !b || !c) continue;

    const v1x = a.x - b.x;
    const v1y = a.y - b.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const mag1 = Math.hypot(v1x, v1y);
    const mag2 = Math.hypot(v2x, v2y);
    if (mag1 < 0.01 || mag2 < 0.01) continue;

    const dot = (v1x * v2x + v1y * v2y) / (mag1 * mag2);
    const angleDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
    const turnDeg = 180 - angleDeg;

    if (turnDeg < thresholdDeg) continue;
    const previousCorner = corners[corners.length - 1];
    if (typeof previousCorner === 'number' && i - previousCorner < minCornerSpacing) continue;
    corners.push(i);
  }

  return corners.length;
};

const evaluateCircleScore = (points: Point2d[], box: BoundingBox): number => {
  const centerX = (box.minX + box.maxX) / 2;
  const centerY = (box.minY + box.maxY) / 2;
  const radii = points.map((point) => Math.hypot(point.x - centerX, point.y - centerY));
  const mean = radii.reduce((sum, value) => sum + value, 0) / Math.max(1, radii.length);
  const variance =
    radii.reduce((sum, value) => {
      const delta = value - mean;
      return sum + delta * delta;
    }, 0) / Math.max(1, radii.length);

  const stdDev = Math.sqrt(variance);
  const radialCv = mean > 0 ? stdDev / mean : 1;
  const radialScore = clamp01(1 - radialCv / CIRCLE_RADIAL_CV_LIMIT);
  const aspect = Math.max(box.width, box.height) / Math.max(1, Math.min(box.width, box.height));
  const aspectScore = clamp01(1 - Math.abs(aspect - 1) / CIRCLE_ASPECT_TOLERANCE);

  return radialScore * 0.65 + aspectScore * 0.35;
};

const evaluateAspectScore = (aspectRatio: number, rule: GeometryShapeRule): number => {
  if (typeof rule.idealAspect === 'number') {
    const tolerance = rule.aspectTolerance ?? DEFAULT_ASPECT_SCORE_TOLERANCE;
    return clamp01(1 - Math.abs(aspectRatio - rule.idealAspect) / tolerance);
  }

  if (typeof rule.minAspect === 'number' && aspectRatio < rule.minAspect) {
    return clamp01(1 - (rule.minAspect - aspectRatio) / DEFAULT_ASPECT_SCORE_TOLERANCE);
  }

  if (typeof rule.maxAspect === 'number' && aspectRatio > rule.maxAspect) {
    return clamp01(1 - (aspectRatio - rule.maxAspect) / DEFAULT_ASPECT_SCORE_TOLERANCE);
  }

  return 0.8;
};

const evaluatePolygonScore = (
  rule: GeometryShapeRule,
  corners: number,
  aspectRatio: number
): number => {
  const cornerScore = clamp01(1 - Math.abs(corners - rule.idealCorners) / 2.3);
  const ratioScore = evaluateAspectScore(aspectRatio, rule);
  return cornerScore * 0.72 + ratioScore * 0.28;
};

const isAspectInRange = (aspectRatio: number, rule: GeometryShapeRule): boolean => {
  if (typeof rule.minAspect === 'number' && aspectRatio < rule.minAspect) return false;
  if (typeof rule.maxAspect === 'number' && aspectRatio > rule.maxAspect) return false;
  return true;
};

const translateGeometryDrawing = (
  translate: KangurMiniGameTranslate | undefined,
  key: string,
  fallback: string,
  values?: Record<string, number | string>
): string =>
  translateKangurMiniGameWithFallback(translate, key, fallback, values);

const toRejected = (
  translate: KangurMiniGameTranslate | undefined,
  key: string,
  fallback: string,
  values?: Record<string, number | string>
): GeometryDrawingEvaluation => ({
  accepted: false,
  score: 0,
  corners: 0,
  closureRatio: 1,
  aspectRatio: 99,
  lengthRatio: 0,
  message: translateGeometryDrawing(translate, key, fallback, values),
});

const resolveFailureMessage = (
  target: GeometryShapeId,
  rule: GeometryShapeRule,
  corners: number,
  closureRatio: number,
  aspectRatio: number,
  closureLimit: number,
  lengthRatio: number,
  minLengthRatio: number,
  maxLengthRatio: number,
  translate?: KangurMiniGameTranslate
): string => {
  if (closureRatio > closureLimit) {
    return translateGeometryDrawing(
      translate,
      'geometryDrawing.feedback.failure.closeShape',
      'Domknij figurę. Początek i koniec linii są zbyt daleko.'
    );
  }

  if (lengthRatio < minLengthRatio) {
    return translateGeometryDrawing(
      translate,
      'geometryDrawing.feedback.failure.tooShortPath',
      'Linia jest zbyt krótka. Obrysuj kształt bardziej dookoła.'
    );
  }

  if (lengthRatio > maxLengthRatio) {
    return translateGeometryDrawing(
      translate,
      'geometryDrawing.feedback.failure.tooJaggedPath',
      'Linia jest zbyt poszarpana. Spróbuj rysować bardziej płynnie.'
    );
  }

  if (corners < rule.minCorners) {
    return translateGeometryDrawing(
      translate,
      'geometryDrawing.feedback.failure.addMoreCorners',
      `Dodaj więcej rogów. Ta figura powinna mieć około ${rule.idealCorners}.`,
      { idealCorners: rule.idealCorners }
    );
  }

  if (corners > rule.maxCorners) {
    return translateGeometryDrawing(
      translate,
      'geometryDrawing.feedback.failure.tooManyCorners',
      `Masz za dużo rogów. Spróbuj narysować około ${rule.idealCorners}.`,
      { idealCorners: rule.idealCorners }
    );
  }

  if (!isAspectInRange(aspectRatio, rule)) {
    if (target === 'square') {
      return translateGeometryDrawing(
        translate,
        'geometryDrawing.feedback.failure.aspect.square',
        'Kwadrat powinien mieć boki bardziej podobnej długości.'
      );
    }
    if (target === 'rectangle') {
      return translateGeometryDrawing(
        translate,
        'geometryDrawing.feedback.failure.aspect.rectangle',
        'Prostokąt powinien mieć dwa boki wyraźnie dłuższe.'
      );
    }
    if (target === 'circle') {
      return translateGeometryDrawing(
        translate,
        'geometryDrawing.feedback.failure.aspect.circle',
        'Koło powinno być bardziej równe i okrągłe.'
      );
    }
    if (target === 'oval') {
      return translateGeometryDrawing(
        translate,
        'geometryDrawing.feedback.failure.aspect.oval',
        'Owal powinien być bardziej wydłużony.'
      );
    }
    if (target === 'diamond') {
      return translateGeometryDrawing(
        translate,
        'geometryDrawing.feedback.failure.aspect.diamond',
        'Romb powinien być mniej spłaszczony lub mniej wydłużony.'
      );
    }
  }

  return translateGeometryDrawing(translate, rule.failureMessageKey, rule.failureMessage);
};

export const evaluateGeometryDrawing = (
  target: GeometryShapeId,
  rawPoints: Point2d[],
  translate?: KangurMiniGameTranslate
): GeometryDrawingEvaluation => {
  const rule = SHAPE_RULES[target];
  const lenientRule = applyDrawingLeniency(rule);
  const sanitized = sanitizePoints(rawPoints);

  if (sanitized.length < MIN_DRAWING_POINTS) {
    return toRejected(
      translate,
      'geometryDrawing.feedback.failure.drawLonger',
      'Narysuj większy kształt jednym ciągiem.'
    );
  }

  const sampled = samplePath(sanitized);
  const box = computeBoundingBox(sampled);
  if (box.width < MIN_DRAWING_SIZE || box.height < MIN_DRAWING_SIZE) {
    return toRejected(
      translate,
      'geometryDrawing.feedback.failure.tooSmall',
      'Kształt jest zbyt mały. Narysuj go większego.'
    );
  }

  const first = sampled[0];
  const last = sampled[sampled.length - 1];
  if (!first || !last) {
    return toRejected(
      translate,
      'geometryDrawing.feedback.failure.unreadable',
      'Nie udało się odczytać rysunku.'
    );
  }

  const closureRatio = distance(first, last) / box.diagonal;
  const closureLimit = lenientRule.maxClosureRatio ?? DEFAULT_MAX_CLOSURE_RATIO;
  const closureScore = clamp01(1 - closureRatio / closureLimit);
  const pathLength = computePathLength(sanitized);
  const perimeter = Math.max(1, 2 * (box.width + box.height));
  const lengthRatio = pathLength / perimeter;
  const minLengthRatio = lenientRule.minLengthRatio ?? DEFAULT_MIN_LENGTH_RATIO;
  const maxLengthRatio = lenientRule.maxLengthRatio ?? DEFAULT_MAX_LENGTH_RATIO;
  const corners = countCorners(target === 'hexagon' ? sampled : smoothPath(sampled, 1));
  const aspectRatio =
    Math.max(box.width, box.height) / Math.max(1, Math.min(box.width, box.height));

  const shapeScore =
    target === 'circle'
      ? evaluateCircleScore(sampled, box)
      : evaluatePolygonScore(lenientRule, corners, aspectRatio);
  const score = shapeScore * 0.78 + closureScore * 0.22;

  const accepted =
    score >= lenientRule.minScore &&
    closureRatio <= closureLimit &&
    lengthRatio >= minLengthRatio &&
    lengthRatio <= maxLengthRatio &&
    corners >= rule.minCorners &&
    corners <= rule.maxCorners &&
    isAspectInRange(aspectRatio, lenientRule);

  return {
    accepted,
    score: Number(score.toFixed(3)),
    corners,
    closureRatio: Number(closureRatio.toFixed(3)),
    aspectRatio: Number(aspectRatio.toFixed(3)),
    lengthRatio: Number(lengthRatio.toFixed(3)),
    message: accepted
      ? translateGeometryDrawing(translate, rule.successMessageKey, rule.successMessage)
      : resolveFailureMessage(
          target,
          lenientRule,
          corners,
          closureRatio,
          aspectRatio,
          closureLimit,
          lengthRatio,
          minLengthRatio,
          maxLengthRatio,
          translate
        ),
  };
};
