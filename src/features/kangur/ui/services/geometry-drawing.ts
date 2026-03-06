export type GeometryShapeId =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'rectangle'
  | 'pentagon'
  | 'hexagon';

export type GeometryDrawPoint = {
  x: number;
  y: number;
};

export type GeometryDrawingEvaluation = {
  accepted: boolean;
  score: number;
  corners: number;
  closureRatio: number;
  aspectRatio: number;
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
  minAspect?: number;
  maxAspect?: number;
  idealAspect?: number;
  aspectTolerance?: number;
  successMessage: string;
  failureMessage: string;
};

const SHAPE_RULES: Record<GeometryShapeId, GeometryShapeRule> = {
  circle: {
    idealCorners: 0,
    minCorners: 0,
    maxCorners: 5,
    minScore: 0.59,
    minAspect: 0.75,
    maxAspect: 1.35,
    idealAspect: 1,
    aspectTolerance: 0.62,
    successMessage: 'Super! To wygląda jak koło.',
    failureMessage: 'Spróbuj narysować bardziej okrągłą linię.',
  },
  triangle: {
    idealCorners: 3,
    minCorners: 2,
    maxCorners: 5,
    minScore: 0.54,
    minAspect: 0.65,
    maxAspect: 2.2,
    successMessage: 'Brawo! To poprawny trójkąt.',
    failureMessage: 'Spróbuj narysować 3 wyraźne rogi.',
  },
  square: {
    idealCorners: 4,
    minCorners: 3,
    maxCorners: 6,
    minScore: 0.56,
    minAspect: 0.75,
    maxAspect: 1.42,
    idealAspect: 1,
    aspectTolerance: 0.5,
    successMessage: 'Świetnie! To wygląda jak kwadrat.',
    failureMessage: 'Spróbuj narysować 4 boki o podobnej długości.',
  },
  rectangle: {
    idealCorners: 4,
    minCorners: 3,
    maxCorners: 6,
    minScore: 0.55,
    minAspect: 1.15,
    maxAspect: 3.4,
    idealAspect: 1.9,
    aspectTolerance: 1.4,
    successMessage: 'Dobrze! To wygląda jak prostokąt.',
    failureMessage: 'Spróbuj narysować 4 rogi i dłuższy bok niż drugi.',
  },
  pentagon: {
    idealCorners: 5,
    minCorners: 4,
    maxCorners: 7,
    minScore: 0.52,
    minAspect: 0.62,
    maxAspect: 1.95,
    successMessage: 'Mega! Narysowano pięciokąt.',
    failureMessage: 'Spróbuj narysować 5 wyraźnych rogów.',
  },
  hexagon: {
    idealCorners: 6,
    minCorners: 5,
    maxCorners: 8,
    minScore: 0.51,
    minAspect: 0.62,
    maxAspect: 2.1,
    successMessage: 'Świetnie! To wygląda jak sześciokąt.',
    failureMessage: 'Spróbuj narysować 6 wyraźnych rogów.',
  },
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const distance = (a: GeometryDrawPoint, b: GeometryDrawPoint): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

const computeBoundingBox = (points: GeometryDrawPoint[]): BoundingBox => {
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

const sanitizePoints = (points: GeometryDrawPoint[]): GeometryDrawPoint[] => {
  if (points.length === 0) return [];
  const sanitized: GeometryDrawPoint[] = [points[0]!];
  for (let i = 1; i < points.length; i += 1) {
    const current = points[i];
    const previous = sanitized[sanitized.length - 1];
    if (!current || !previous) continue;
    if (distance(current, previous) < 1.2) continue;
    sanitized.push(current);
  }
  return sanitized;
};

const samplePath = (points: GeometryDrawPoint[], sampleCount = 120): GeometryDrawPoint[] => {
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

  const sampled: GeometryDrawPoint[] = [points[0]!];
  for (let step = 1; step < sampleCount - 1; step += 1) {
    const targetDist = (total * step) / (sampleCount - 1);
    let traversed = 0;
    let found: GeometryDrawPoint | null = null;

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

const countCorners = (points: GeometryDrawPoint[]): number => {
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

const evaluateCircleScore = (points: GeometryDrawPoint[], box: BoundingBox): number => {
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
  const radialScore = clamp01(1 - radialCv / 0.35);
  const aspect = Math.max(box.width, box.height) / Math.max(1, Math.min(box.width, box.height));
  const aspectScore = clamp01(1 - Math.abs(aspect - 1) / 0.6);

  return radialScore * 0.65 + aspectScore * 0.35;
};

const evaluateAspectScore = (aspectRatio: number, rule: GeometryShapeRule): number => {
  if (typeof rule.idealAspect === 'number') {
    const tolerance = rule.aspectTolerance ?? 0.8;
    return clamp01(1 - Math.abs(aspectRatio - rule.idealAspect) / tolerance);
  }

  if (typeof rule.minAspect === 'number' && aspectRatio < rule.minAspect) {
    return clamp01(1 - (rule.minAspect - aspectRatio) / 0.8);
  }

  if (typeof rule.maxAspect === 'number' && aspectRatio > rule.maxAspect) {
    return clamp01(1 - (aspectRatio - rule.maxAspect) / 0.8);
  }

  return 0.8;
};

const evaluatePolygonScore = (rule: GeometryShapeRule, corners: number, aspectRatio: number): number => {
  const cornerScore = clamp01(1 - Math.abs(corners - rule.idealCorners) / 2.3);
  const ratioScore = evaluateAspectScore(aspectRatio, rule);
  return cornerScore * 0.72 + ratioScore * 0.28;
};

const isAspectInRange = (aspectRatio: number, rule: GeometryShapeRule): boolean => {
  if (typeof rule.minAspect === 'number' && aspectRatio < rule.minAspect) return false;
  if (typeof rule.maxAspect === 'number' && aspectRatio > rule.maxAspect) return false;
  return true;
};

const toRejected = (message: string): GeometryDrawingEvaluation => ({
  accepted: false,
  score: 0,
  corners: 0,
  closureRatio: 1,
  aspectRatio: 99,
  message,
});

const resolveFailureMessage = (
  target: GeometryShapeId,
  rule: GeometryShapeRule,
  corners: number,
  closureRatio: number,
  aspectRatio: number
): string => {
  if (closureRatio > 0.34) {
    return 'Domknij figurę. Początek i koniec linii są zbyt daleko.';
  }

  if (corners < rule.minCorners) {
    return `Dodaj więcej rogów. Ta figura powinna mieć około ${rule.idealCorners}.`;
  }

  if (corners > rule.maxCorners) {
    return `Masz za dużo rogów. Spróbuj narysować około ${rule.idealCorners}.`;
  }

  if (!isAspectInRange(aspectRatio, rule)) {
    if (target === 'square') return 'Kwadrat powinien mieć boki bardziej podobnej długości.';
    if (target === 'rectangle') return 'Prostokąt powinien mieć dwa boki wyraźnie dłuższe.';
    if (target === 'circle') return 'Koło powinno być bardziej równe i okrągłe.';
  }

  return rule.failureMessage;
};

export const evaluateGeometryDrawing = (
  target: GeometryShapeId,
  rawPoints: GeometryDrawPoint[]
): GeometryDrawingEvaluation => {
  const rule = SHAPE_RULES[target];
  const sanitized = sanitizePoints(rawPoints);

  if (sanitized.length < 14) {
    return toRejected('Narysuj większy kształt jednym ciągiem.');
  }

  const sampled = samplePath(sanitized);
  const box = computeBoundingBox(sampled);
  if (box.width < 24 || box.height < 24) {
    return toRejected('Kształt jest zbyt mały. Narysuj go większego.');
  }

  const first = sampled[0];
  const last = sampled[sampled.length - 1];
  if (!first || !last) {
    return toRejected('Nie udało się odczytać rysunku.');
  }

  const closureRatio = distance(first, last) / box.diagonal;
  const closureScore = clamp01(1 - closureRatio / 0.28);
  const corners = countCorners(sampled);
  const aspectRatio = Math.max(box.width, box.height) / Math.max(1, Math.min(box.width, box.height));

  const shapeScore =
    target === 'circle'
      ? evaluateCircleScore(sampled, box)
      : evaluatePolygonScore(rule, corners, aspectRatio);
  const score = shapeScore * 0.78 + closureScore * 0.22;

  const accepted =
    score >= rule.minScore &&
    corners >= rule.minCorners &&
    corners <= rule.maxCorners &&
    isAspectInRange(aspectRatio, rule);

  return {
    accepted,
    score: Number(score.toFixed(3)),
    corners,
    closureRatio: Number(closureRatio.toFixed(3)),
    aspectRatio: Number(aspectRatio.toFixed(3)),
    message: accepted
      ? rule.successMessage
      : resolveFailureMessage(target, rule, corners, closureRatio, aspectRatio),
  };
};
