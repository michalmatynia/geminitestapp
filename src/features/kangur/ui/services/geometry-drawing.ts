import type { Point2d } from '@/shared/contracts/geometry';
import {
  translateKangurMiniGameWithFallback,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

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

type GeometryDrawingLocalizer =
  | KangurMiniGameTranslate
  | {
      locale?: string | null;
      translate?: KangurMiniGameTranslate;
    };

type GeometryDrawingFallbackCopy = {
  drawLonger: string;
  tooSmall: string;
  unreadable: string;
  closeShape: string;
  tooShortPath: string;
  tooJaggedPath: string;
  addMoreCorners: (idealCorners: number) => string;
  tooManyCorners: (idealCorners: number) => string;
  aspect: {
    circle: string;
    diamond: string;
    oval: string;
    rectangle: string;
    square: string;
  };
  success: Record<GeometryShapeId, string>;
  failureDefault: Record<GeometryShapeId, string>;
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

const getGeometryDrawingFallbackCopy = (
  locale: string | null | undefined
): GeometryDrawingFallbackCopy => {
  const normalizedLocale = normalizeSiteLocale(locale);

  if (normalizedLocale === 'uk') {
    return {
      drawLonger: 'Намалюй більшу фігуру одним рухом, щоб її можна було оцінити.',
      tooSmall: 'Фігура занадто мала. Намалюй її більшою.',
      unreadable: 'Не вдалося зчитати малюнок.',
      closeShape: 'Замкни фігуру. Початок і кінець лінії занадто далеко.',
      tooShortPath: 'Лінія занадто коротка. Обведи форму більше по колу.',
      tooJaggedPath: 'Лінія занадто рвана. Спробуй малювати плавніше.',
      addMoreCorners: (idealCorners) =>
        `Додай більше кутів. Ця фігура повинна мати приблизно ${idealCorners}.`,
      tooManyCorners: (idealCorners) =>
        `Кутів забагато. Спробуй намалювати приблизно ${idealCorners}.`,
      aspect: {
        circle: 'Коло повинно бути рівнішим і круглішим.',
        diamond: 'Ромб має бути менш сплюснутим або менш витягнутим.',
        oval: 'Овал має бути більш витягнутим.',
        rectangle: 'Прямокутник повинен мати дві сторони помітно довші.',
        square: 'Квадрат повинен мати сторони більш подібної довжини.',
      },
      success: {
        circle: 'Супер! Це схоже на коло.',
        oval: 'Чудово! Це схоже на овал.',
        triangle: 'Браво! Це правильний трикутник.',
        diamond: 'Браво! Це схоже на ромб.',
        square: 'Чудово! Це схоже на квадрат.',
        rectangle: 'Добре! Це схоже на прямокутник.',
        pentagon: 'Клас! Намальовано пʼятикутник.',
        hexagon: 'Чудово! Це схоже на шестикутник.',
      },
      failureDefault: {
        circle: 'Спробуй намалювати більш круглу лінію.',
        oval: 'Спробуй намалювати більш витягнутий овал.',
        triangle: 'Спробуй намалювати 3 виразні кути.',
        diamond: 'Спробуй намалювати похилі сторони і 4 виразні кути.',
        square: 'Спробуй намалювати 4 сторони схожої довжини.',
        rectangle: 'Спробуй намалювати 4 кути і одну сторону довшу за іншу.',
        pentagon: 'Спробуй намалювати 5 виразних кутів.',
        hexagon: 'Спробуй намалювати 6 виразних кутів.',
      },
    };
  }

  if (normalizedLocale === 'de') {
    return {
      drawLonger: 'Zeichne die Form etwas langer in einem Zug, damit sie bewertet werden kann.',
      tooSmall: 'Die Form ist zu klein. Zeichne sie grosser.',
      unreadable: 'Die Zeichnung konnte nicht gelesen werden.',
      closeShape: 'Schliesse die Form. Anfang und Ende der Linie liegen zu weit auseinander.',
      tooShortPath: 'Die Linie ist zu kurz. Umrunde die Form weiter.',
      tooJaggedPath: 'Die Linie ist zu zackig. Versuche flussiger zu zeichnen.',
      addMoreCorners: (idealCorners) =>
        `Fuge mehr Ecken hinzu. Diese Form sollte ungefahr ${idealCorners} haben.`,
      tooManyCorners: (idealCorners) =>
        `Du hast zu viele Ecken. Versuche ungefahr ${idealCorners} zu zeichnen.`,
      aspect: {
        circle: 'Ein Kreis sollte gleichmassiger und runder sein.',
        diamond: 'Eine Raute sollte weniger abgeflacht oder weniger langgezogen sein.',
        oval: 'Ein Oval sollte langer gezogen sein.',
        rectangle: 'Ein Rechteck sollte zwei deutlich langere Seiten haben.',
        square: 'Ein Quadrat sollte Seiten mit ahnlicherer Lange haben.',
      },
      success: {
        circle: 'Super! Das sieht wie ein Kreis aus.',
        oval: 'Klasse! Das sieht wie ein Oval aus.',
        triangle: 'Bravo! Das ist ein korrektes Dreieck.',
        diamond: 'Bravo! Das sieht wie eine Raute aus.',
        square: 'Klasse! Das sieht wie ein Quadrat aus.',
        rectangle: 'Gut! Das sieht wie ein Rechteck aus.',
        pentagon: 'Stark! Ein Funfeck wurde gezeichnet.',
        hexagon: 'Klasse! Das sieht wie ein Sechseck aus.',
      },
      failureDefault: {
        circle: 'Versuche eine rundere Linie zu zeichnen.',
        oval: 'Versuche ein langlicheres Oval zu zeichnen.',
        triangle: 'Versuche 3 deutliche Ecken zu zeichnen.',
        diamond: 'Versuche schräge Seiten und 4 deutliche Ecken zu zeichnen.',
        square: 'Versuche 4 Seiten mit ahnlicher Lange zu zeichnen.',
        rectangle: 'Versuche 4 Ecken und eine langere Seite als die andere zu zeichnen.',
        pentagon: 'Versuche 5 deutliche Ecken zu zeichnen.',
        hexagon: 'Versuche 6 deutliche Ecken zu zeichnen.',
      },
    };
  }

  if (normalizedLocale === 'en') {
    return {
      drawLonger: 'Draw the shape a bit longer in one stroke so it can be checked.',
      tooSmall: 'The shape is too small. Draw it bigger.',
      unreadable: 'The drawing could not be read.',
      closeShape: 'Close the shape. The start and end of the line are too far apart.',
      tooShortPath: 'The line is too short. Trace more of the shape.',
      tooJaggedPath: 'The line is too jagged. Try drawing more smoothly.',
      addMoreCorners: (idealCorners) =>
        `Add more corners. This shape should have about ${idealCorners}.`,
      tooManyCorners: (idealCorners) =>
        `You have too many corners. Try drawing about ${idealCorners}.`,
      aspect: {
        circle: 'A circle should be more even and round.',
        diamond: 'A diamond should be less flattened or less stretched.',
        oval: 'An oval should be more stretched out.',
        rectangle: 'A rectangle should have two clearly longer sides.',
        square: 'A square should have sides of more similar length.',
      },
      success: {
        circle: 'Great! That looks like a circle.',
        oval: 'Great! That looks like an oval.',
        triangle: 'Nice work! That is a correct triangle.',
        diamond: 'Nice work! That looks like a diamond.',
        square: 'Great! That looks like a square.',
        rectangle: 'Good! That looks like a rectangle.',
        pentagon: 'Awesome! You drew a pentagon.',
        hexagon: 'Great! That looks like a hexagon.',
      },
      failureDefault: {
        circle: 'Try drawing a rounder line.',
        oval: 'Try drawing a more stretched oval.',
        triangle: 'Try drawing 3 clear corners.',
        diamond: 'Try drawing slanted sides and 4 clear corners.',
        square: 'Try drawing 4 sides of similar length.',
        rectangle: 'Try drawing 4 corners and one side longer than the other.',
        pentagon: 'Try drawing 5 clear corners.',
        hexagon: 'Try drawing 6 clear corners.',
      },
    };
  }

  return {
    drawLonger: 'Narysuj większy kształt jednym ciągiem.',
    tooSmall: 'Kształt jest zbyt mały. Narysuj go większego.',
    unreadable: 'Nie udało się odczytać rysunku.',
    closeShape: 'Domknij figurę. Początek i koniec linii są zbyt daleko.',
    tooShortPath: 'Linia jest zbyt krótka. Obrysuj kształt bardziej dookoła.',
    tooJaggedPath: 'Linia jest zbyt poszarpana. Spróbuj rysować bardziej płynnie.',
    addMoreCorners: (idealCorners) =>
      `Dodaj więcej rogów. Ta figura powinna mieć około ${idealCorners}.`,
    tooManyCorners: (idealCorners) =>
      `Masz za dużo rogów. Spróbuj narysować około ${idealCorners}.`,
    aspect: {
      circle: 'Koło powinno być bardziej równe i okrągłe.',
      diamond: 'Romb powinien być mniej spłaszczony lub mniej wydłużony.',
      oval: 'Owal powinien być bardziej wydłużony.',
      rectangle: 'Prostokąt powinien mieć dwa boki wyraźnie dłuższe.',
      square: 'Kwadrat powinien mieć boki bardziej podobnej długości.',
    },
    success: {
      circle: 'Super! To wygląda jak koło.',
      oval: 'Świetnie! To wygląda jak owal.',
      triangle: 'Brawo! To poprawny trójkąt.',
      diamond: 'Brawo! To wygląda jak romb.',
      square: 'Świetnie! To wygląda jak kwadrat.',
      rectangle: 'Dobrze! To wygląda jak prostokąt.',
      pentagon: 'Mega! Narysowano pięciokąt.',
      hexagon: 'Świetnie! To wygląda jak sześciokąt.',
    },
    failureDefault: {
      circle: 'Spróbuj narysować bardziej okrągłą linię.',
      oval: 'Spróbuj narysować bardziej wydłużony owal.',
      triangle: 'Spróbuj narysować 3 wyraźne rogi.',
      diamond: 'Spróbuj narysować ukośne boki i 4 wyraźne rogi.',
      square: 'Spróbuj narysować 4 boki o podobnej długości.',
      rectangle: 'Spróbuj narysować 4 rogi i dłuższy bok niż drugi.',
      pentagon: 'Spróbuj narysować 5 wyraźnych rogów.',
      hexagon: 'Spróbuj narysować 6 wyraźnych rogów.',
    },
  };
};

const resolveGeometryDrawingLocalizer = (
  localizer?: GeometryDrawingLocalizer
): { fallbackCopy: GeometryDrawingFallbackCopy; translate?: KangurMiniGameTranslate } => {
  if (typeof localizer === 'function') {
    return {
      fallbackCopy: getGeometryDrawingFallbackCopy(null),
      translate: localizer,
    };
  }

  return {
    fallbackCopy: getGeometryDrawingFallbackCopy(localizer?.locale),
    translate: localizer?.translate,
  };
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

type SampledPathSegments = {
  lengths: number[];
  total: number;
};

const buildSampledPathSegments = (points: Point2d[]): SampledPathSegments => {
  const lengths: number[] = [];
  let total = 0;

  for (let i = 1; i < points.length; i += 1) {
    const start = points[i - 1];
    const end = points[i];
    if (!start || !end) {
      continue;
    }

    const length = distance(start, end);
    lengths.push(length);
    total += length;
  }

  return { lengths, total };
};

const resolvePointAtDistance = (
  points: Point2d[],
  segmentLengths: number[],
  targetDist: number
): Point2d | null => {
  let traversed = 0;

  for (let i = 1; i < points.length; i += 1) {
    const segmentLength = segmentLengths[i - 1] ?? 0;
    const start = points[i - 1];
    const end = points[i];
    if (!start || !end) {
      continue;
    }

    if (traversed + segmentLength >= targetDist) {
      const local = segmentLength > 0 ? (targetDist - traversed) / segmentLength : 0;
      return {
        x: start.x + (end.x - start.x) * local,
        y: start.y + (end.y - start.y) * local,
      };
    }

    traversed += segmentLength;
  }

  return null;
};

const samplePath = (points: Point2d[], sampleCount = 120): Point2d[] => {
  if (points.length <= 2) return points;

  const { lengths, total } = buildSampledPathSegments(points);
  if (total < 1) return points;

  const sampled: Point2d[] = [points[0]!];
  for (let step = 1; step < sampleCount - 1; step += 1) {
    const targetDist = (total * step) / (sampleCount - 1);
    const found = resolvePointAtDistance(points, lengths, targetDist);
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

const closeCornerPath = (points: Point2d[]): Point2d[] => {
  const closed = [...points];
  const first = points[0];
  const last = points[points.length - 1];

  if (first && last && distance(first, last) > 1) {
    closed.push(first);
  }

  return closed;
};

const resolveTurnDegrees = (a: Point2d, b: Point2d, c: Point2d): number | null => {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 < 0.01 || mag2 < 0.01) {
    return null;
  }

  const dot = (v1x * v2x + v1y * v2y) / (mag1 * mag2);
  const angleDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
  return 180 - angleDeg;
};

const shouldRecordCorner = (
  turnDeg: number | null,
  index: number,
  corners: number[],
  thresholdDeg: number,
  minCornerSpacing: number
): boolean => {
  if (turnDeg === null || turnDeg < thresholdDeg) {
    return false;
  }

  const previousCorner = corners[corners.length - 1];
  return typeof previousCorner !== 'number' || index - previousCorner >= minCornerSpacing;
};

const countCorners = (points: Point2d[]): number => {
  if (points.length < 7) return 0;
  const closed = closeCornerPath(points);

  const minCornerSpacing = 7;
  const thresholdDeg = 48;
  const corners: number[] = [];

  for (let i = 2; i < closed.length - 2; i += 1) {
    const a = closed[i - 2];
    const b = closed[i];
    const c = closed[i + 2];
    if (!a || !b || !c) continue;

    const turnDeg = resolveTurnDegrees(a, b, c);
    if (shouldRecordCorner(turnDeg, i, corners, thresholdDeg, minCornerSpacing)) {
      corners.push(i);
    }
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

const ASPECT_FAILURE_MESSAGES: Partial<
  Record<
    GeometryShapeId,
    { fallback: keyof GeometryDrawingFallbackCopy['aspect']; key: string }
  >
> = {
  square: {
    key: 'geometryDrawing.feedback.failure.aspect.square',
    fallback: 'square',
  },
  rectangle: {
    key: 'geometryDrawing.feedback.failure.aspect.rectangle',
    fallback: 'rectangle',
  },
  circle: {
    key: 'geometryDrawing.feedback.failure.aspect.circle',
    fallback: 'circle',
  },
  oval: {
    key: 'geometryDrawing.feedback.failure.aspect.oval',
    fallback: 'oval',
  },
  diamond: {
    key: 'geometryDrawing.feedback.failure.aspect.diamond',
    fallback: 'diamond',
  },
};

const resolveAspectFailureMessage = (
  target: GeometryShapeId,
  fallbackCopy: GeometryDrawingFallbackCopy,
  translate?: KangurMiniGameTranslate
): string | null => {
  const config = ASPECT_FAILURE_MESSAGES[target];
  if (!config) {
    return null;
  }

  return translateGeometryDrawing(
    translate,
    config.key,
    fallbackCopy.aspect[config.fallback]
  );
};

const resolveFailureMessage = (
  target: GeometryShapeId,
  rule: GeometryShapeRule,
  fallbackCopy: GeometryDrawingFallbackCopy,
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
      fallbackCopy.closeShape
    );
  }

  if (lengthRatio < minLengthRatio) {
    return translateGeometryDrawing(
      translate,
      'geometryDrawing.feedback.failure.tooShortPath',
      fallbackCopy.tooShortPath
    );
  }

  if (lengthRatio > maxLengthRatio) {
    return translateGeometryDrawing(
      translate,
      'geometryDrawing.feedback.failure.tooJaggedPath',
      fallbackCopy.tooJaggedPath
    );
  }

  if (corners < rule.minCorners) {
    return translateGeometryDrawing(
      translate,
      'geometryDrawing.feedback.failure.addMoreCorners',
      fallbackCopy.addMoreCorners(rule.idealCorners),
      { idealCorners: rule.idealCorners }
    );
  }

  if (corners > rule.maxCorners) {
    return translateGeometryDrawing(
      translate,
      'geometryDrawing.feedback.failure.tooManyCorners',
      fallbackCopy.tooManyCorners(rule.idealCorners),
      { idealCorners: rule.idealCorners }
    );
  }

  if (!isAspectInRange(aspectRatio, rule)) {
    const aspectFailureMessage = resolveAspectFailureMessage(
      target,
      fallbackCopy,
      translate
    );
    if (aspectFailureMessage) {
      return aspectFailureMessage;
    }
  }

  return translateGeometryDrawing(
    translate,
    rule.failureMessageKey,
    fallbackCopy.failureDefault[target]
  );
};

type GeometryDrawingMetrics = {
  aspectRatio: number;
  box: BoundingBox;
  closureLimit: number;
  closureRatio: number;
  closureScore: number;
  corners: number;
  first: Point2d | undefined;
  last: Point2d | undefined;
  lengthRatio: number;
  maxLengthRatio: number;
  minLengthRatio: number;
  sampled: Point2d[];
  score: number;
};

const computeGeometryDrawingMetrics = (
  target: GeometryShapeId,
  sanitized: Point2d[],
  rule: GeometryShapeRule
): GeometryDrawingMetrics => {
  const sampled = samplePath(sanitized);
  const box = computeBoundingBox(sampled);
  const first = sampled[0];
  const last = sampled[sampled.length - 1];
  const closureRatio = first && last ? distance(first, last) / box.diagonal : 1;
  const closureLimit = rule.maxClosureRatio ?? DEFAULT_MAX_CLOSURE_RATIO;
  const closureScore = clamp01(1 - closureRatio / closureLimit);
  const drawingPathLength = computePathLength(sanitized);
  const perimeter = Math.max(1, 2 * (box.width + box.height));
  const lengthRatio = drawingPathLength / perimeter;
  const minLengthRatio = rule.minLengthRatio ?? DEFAULT_MIN_LENGTH_RATIO;
  const maxLengthRatio = rule.maxLengthRatio ?? DEFAULT_MAX_LENGTH_RATIO;
  const corners = countCorners(target === 'hexagon' ? sampled : smoothPath(sampled, 1));
  const aspectRatio =
    Math.max(box.width, box.height) / Math.max(1, Math.min(box.width, box.height));
  const shapeScore =
    target === 'circle'
      ? evaluateCircleScore(sampled, box)
      : evaluatePolygonScore(rule, corners, aspectRatio);

  return {
    sampled,
    box,
    first,
    last,
    closureRatio,
    closureLimit,
    closureScore,
    lengthRatio,
    minLengthRatio,
    maxLengthRatio,
    corners,
    aspectRatio,
    score: shapeScore * 0.78 + closureScore * 0.22,
  };
};

const isAcceptedGeometryDrawing = (
  metrics: GeometryDrawingMetrics,
  rule: GeometryShapeRule
): boolean =>
  metrics.score >= rule.minScore &&
  metrics.closureRatio <= metrics.closureLimit &&
  metrics.lengthRatio >= metrics.minLengthRatio &&
  metrics.lengthRatio <= metrics.maxLengthRatio &&
  metrics.corners >= rule.minCorners &&
  metrics.corners <= rule.maxCorners &&
  isAspectInRange(metrics.aspectRatio, rule);

const buildGeometryDrawingMessage = (input: {
  accepted: boolean;
  fallbackCopy: GeometryDrawingFallbackCopy;
  metrics: GeometryDrawingMetrics;
  target: GeometryShapeId;
  translate?: KangurMiniGameTranslate;
  rule: GeometryShapeRule;
}): string => {
  if (input.accepted) {
    return translateGeometryDrawing(
      input.translate,
      input.rule.successMessageKey,
      input.fallbackCopy.success[input.target]
    );
  }

  return resolveFailureMessage(
    input.target,
    input.rule,
    input.fallbackCopy,
    input.metrics.corners,
    input.metrics.closureRatio,
    input.metrics.aspectRatio,
    input.metrics.closureLimit,
    input.metrics.lengthRatio,
    input.metrics.minLengthRatio,
    input.metrics.maxLengthRatio,
    input.translate
  );
};

export const evaluateGeometryDrawing = (
  target: GeometryShapeId,
  rawPoints: Point2d[],
  localizer?: GeometryDrawingLocalizer
): GeometryDrawingEvaluation => {
  const { fallbackCopy, translate } = resolveGeometryDrawingLocalizer(localizer);
  const rule = SHAPE_RULES[target];
  const lenientRule = applyDrawingLeniency(rule);
  const sanitized = sanitizePoints(rawPoints);

  if (sanitized.length < MIN_DRAWING_POINTS) {
    return toRejected(
      translate,
      'geometryDrawing.feedback.failure.drawLonger',
      fallbackCopy.drawLonger
    );
  }

  const metrics = computeGeometryDrawingMetrics(target, sanitized, lenientRule);
  if (metrics.box.width < MIN_DRAWING_SIZE || metrics.box.height < MIN_DRAWING_SIZE) {
    return toRejected(
      translate,
      'geometryDrawing.feedback.failure.tooSmall',
      fallbackCopy.tooSmall
    );
  }

  if (!metrics.first || !metrics.last) {
    return toRejected(
      translate,
      'geometryDrawing.feedback.failure.unreadable',
      fallbackCopy.unreadable
    );
  }

  const accepted = isAcceptedGeometryDrawing(metrics, lenientRule);

  return {
    accepted,
    score: Number(metrics.score.toFixed(3)),
    corners: metrics.corners,
    closureRatio: Number(metrics.closureRatio.toFixed(3)),
    aspectRatio: Number(metrics.aspectRatio.toFixed(3)),
    lengthRatio: Number(metrics.lengthRatio.toFixed(3)),
    message: buildGeometryDrawingMessage({
      accepted,
      fallbackCopy,
      metrics,
      target,
      translate,
      rule: lenientRule,
    }),
  };
};
