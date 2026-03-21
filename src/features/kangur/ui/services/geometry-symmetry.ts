import type { Point2d } from '@/shared/contracts/geometry';
import {
  translateKangurMiniGameWithFallback,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

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

type GeometrySymmetryLocalizer =
  | KangurMiniGameTranslate
  | {
      locale?: string | null;
      translate?: KangurMiniGameTranslate;
    };

type GeometrySymmetryFallbackCopy = {
  axis: {
    drawLonger: string;
    extendLine: string;
    keepStraightHorizontal: string;
    keepStraightVertical: string;
    moveToCenter: string;
    success: string;
  };
  mirror: {
    alignToGhost: string;
    drawMissingHalf: string;
    drawMore: string;
    expectedSide: string;
    success: string;
  };
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

const getGeometrySymmetryFallbackCopy = (
  locale: string | null | undefined
): GeometrySymmetryFallbackCopy => {
  const normalizedLocale = normalizeSiteLocale(locale);

  if (normalizedLocale === 'uk') {
    return {
      axis: {
        drawLonger: 'Намалюй довшу лінію осі, від одного краю фігури до іншого.',
        extendLine: 'Вісь повинна бути довшою - намалюй її майже через усю фігуру.',
        keepStraightHorizontal: 'Вісь симетрії повинна бути прямою і горизонтальною.',
        keepStraightVertical: 'Вісь симетрії повинна бути прямою і вертикальною.',
        moveToCenter: 'Посунь вісь ближче до центру фігури.',
        success: 'Чудово! Це правильна вісь симетрії.',
      },
      mirror: {
        alignToGhost: 'Спробуй домалювати фігуру ближче до пунктирного відбиття.',
        drawMissingHalf: 'Домалюй відсутню половину, щоб перевірити симетрію.',
        drawMore: 'Домалюй більше фігури - ще бракує великої частини відбиття.',
        expectedSide: 'Малюй по зеленому боці осі симетрії.',
        success: 'Браво! Відбиття підходить до осі.',
      },
    };
  }

  if (normalizedLocale === 'de') {
    return {
      axis: {
        drawLonger: 'Zeichne eine langere Achsenlinie, von einem Ende der Figur bis zum anderen.',
        extendLine: 'Die Achse sollte langer sein - zeichne sie fast durch die ganze Figur.',
        keepStraightHorizontal: 'Die Symmetrieachse sollte gerade und waagerecht sein.',
        keepStraightVertical: 'Die Symmetrieachse sollte gerade und senkrecht sein.',
        moveToCenter: 'Verschiebe die Achse naher zur Mitte der Figur.',
        success: 'Klasse! Das ist eine korrekte Symmetrieachse.',
      },
      mirror: {
        alignToGhost: 'Versuche, die Form naher an die gestrichelte Spiegelung zu zeichnen.',
        drawMissingHalf: 'Zeichne die fehlende Halfte, um die Symmetrie zu prufen.',
        drawMore: 'Zeichne mehr von der Form - ein grosser Teil der Spiegelung fehlt noch.',
        expectedSide: 'Zeichne auf der grunen Seite der Symmetrieachse.',
        success: 'Bravo! Die Spiegelung passt zur Achse.',
      },
    };
  }

  if (normalizedLocale === 'en') {
    return {
      axis: {
        drawLonger: 'Draw a longer axis line, from one end of the shape to the other.',
        extendLine: 'The axis should be longer. Draw it across almost the whole shape.',
        keepStraightHorizontal: 'The axis of symmetry should be straight and horizontal.',
        keepStraightVertical: 'The axis of symmetry should be straight and vertical.',
        moveToCenter: 'Move the axis closer to the centre of the shape.',
        success: 'Great! That is a correct axis of symmetry.',
      },
      mirror: {
        alignToGhost: 'Try drawing the shape closer to the dashed reflection.',
        drawMissingHalf: 'Draw the missing half to check the symmetry.',
        drawMore: 'Draw more of the shape. A large part of the reflection is still missing.',
        expectedSide: 'Draw on the green side of the symmetry axis.',
        success: 'Nice work! The reflection matches the axis.',
      },
    };
  }

  return {
    axis: {
      drawLonger: 'Narysuj dłuższą linię osi, od jednego końca figury do drugiego.',
      extendLine: 'Oś powinna być dłuższa — narysuj ją prawie przez całą figurę.',
      keepStraightHorizontal: 'Oś symetrii powinna być prosta i pozioma.',
      keepStraightVertical: 'Oś symetrii powinna być prosta i pionowa.',
      moveToCenter: 'Przesuń oś bliżej środka figury.',
      success: 'Świetnie! To poprawna oś symetrii.',
    },
    mirror: {
      alignToGhost: 'Spróbuj dorysować kształt bliżej przerywanego odbicia.',
      drawMissingHalf: 'Dorysuj brakującą połowę, żeby sprawdzić symetrię.',
      drawMore: 'Dorysuj więcej kształtu — jeszcze brakuje sporej części odbicia.',
      expectedSide: 'Rysuj po zielonej stronie osi symetrii.',
      success: 'Brawo! Odbicie pasuje do osi.',
    },
  };
};

const resolveGeometrySymmetryLocalizer = (
  localizer?: GeometrySymmetryLocalizer
): { fallbackCopy: GeometrySymmetryFallbackCopy; translate?: KangurMiniGameTranslate } => {
  if (typeof localizer === 'function') {
    return {
      fallbackCopy: getGeometrySymmetryFallbackCopy(null),
      translate: localizer,
    };
  }

  return {
    fallbackCopy: getGeometrySymmetryFallbackCopy(localizer?.locale),
    translate: localizer?.translate,
  };
};

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

const translateGeometrySymmetry = (
  translate: KangurMiniGameTranslate | undefined,
  key: string,
  fallback: string
): string => translateKangurMiniGameWithFallback(translate, key, fallback);

export const evaluateAxisDrawing = (
  points: Point2d[],
  axis: SymmetryAxis,
  localizer?: GeometrySymmetryLocalizer
): SymmetryAxisEvaluation => {
  const { fallbackCopy, translate } = resolveGeometrySymmetryLocalizer(localizer);
  const sanitized = sanitizePoints(points);
  if (sanitized.length < MIN_POINTS) {
    return {
      accepted: false,
      kind: 'info',
      offset: 0,
      deviation: 0,
      length: 0,
      message: translateGeometrySymmetry(
        translate,
        'geometrySymmetry.feedback.axis.drawLonger',
        fallbackCopy.axis.drawLonger
      ),
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
      message: translateGeometrySymmetry(
        translate,
        'geometrySymmetry.feedback.axis.extendLine',
        fallbackCopy.axis.extendLine
      ),
    };
  }

  if (crossRange > MAX_AXIS_CROSS_RANGE || deviation > MAX_AXIS_DEVIATION) {
    return {
      accepted: false,
      kind: 'error',
      offset,
      deviation,
      length,
      message: translateGeometrySymmetry(
        translate,
        axis.orientation === 'vertical'
          ? 'geometrySymmetry.feedback.axis.keepStraightVertical'
          : 'geometrySymmetry.feedback.axis.keepStraightHorizontal',
        axis.orientation === 'vertical'
          ? fallbackCopy.axis.keepStraightVertical
          : fallbackCopy.axis.keepStraightHorizontal
      ),
    };
  }

  if (offset > MAX_AXIS_OFFSET) {
    return {
      accepted: false,
      kind: 'error',
      offset,
      deviation,
      length,
      message: translateGeometrySymmetry(
        translate,
        'geometrySymmetry.feedback.axis.moveToCenter',
        fallbackCopy.axis.moveToCenter
      ),
    };
  }

  return {
    accepted: true,
    kind: 'success',
    offset,
    deviation,
    length,
    message: translateGeometrySymmetry(
      translate,
      'geometrySymmetry.feedback.axis.success',
      fallbackCopy.axis.success
    ),
  };
};

export const evaluateMirrorDrawing = ({
  points,
  template,
  axis,
  expectedSide,
  locale,
  translate: localizerTranslate,
}: {
  points: Point2d[];
  template: Point2d[];
  axis: SymmetryAxis;
  expectedSide: SymmetryExpectedSide;
  locale?: string | null;
  translate?: KangurMiniGameTranslate;
}): SymmetryMirrorEvaluation => {
  const { fallbackCopy, translate: resolvedTranslate } = resolveGeometrySymmetryLocalizer({
    locale,
    translate: localizerTranslate,
  });
  const sanitized = sanitizePoints(points);
  if (sanitized.length < MIN_POINTS) {
    return {
      accepted: false,
      kind: 'info',
      coverage: 0,
      avgDistance: 0,
      offsideRatio: 1,
      message: translateGeometrySymmetry(
        resolvedTranslate,
        'geometrySymmetry.feedback.mirror.drawMissingHalf',
        fallbackCopy.mirror.drawMissingHalf
      ),
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
      message: translateGeometrySymmetry(
        resolvedTranslate,
        'geometrySymmetry.feedback.mirror.drawMore',
        fallbackCopy.mirror.drawMore
      ),
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
      message: translateGeometrySymmetry(
        resolvedTranslate,
        'geometrySymmetry.feedback.mirror.expectedSide',
        fallbackCopy.mirror.expectedSide
      ),
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
      message: translateGeometrySymmetry(
        resolvedTranslate,
        'geometrySymmetry.feedback.mirror.alignToGhost',
        fallbackCopy.mirror.alignToGhost
      ),
    };
  }

  return {
    accepted: true,
    kind: 'success',
    coverage,
    avgDistance,
    offsideRatio,
    message: translateGeometrySymmetry(
      resolvedTranslate,
      'geometrySymmetry.feedback.mirror.success',
      fallbackCopy.mirror.success
    ),
  };
};
