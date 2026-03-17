import type { VectorCanvasRect, VectorViewTransform } from '@/shared/contracts/ui';
import { type VectorPoint, type VectorShape } from '@/shared/contracts/vector';

export type { VectorCanvasRect, VectorViewTransform };

export const DEFAULT_VECTOR_VIEWBOX = 1000;
export const MIN_VECTOR_VIEW_SCALE = 0.5;
export const MAX_VECTOR_VIEW_SCALE = 8;
export const CENTERED_SQUARE_SENSITIVITY_EXPONENT = 2.1;

export const formatPathNumber = (value: number): string => {
  const rounded = Number(value.toFixed(2));
  return Number.isFinite(rounded) ? String(rounded) : '0';
};

export const toSvgCoord = (value: number, viewBoxSize: number): number => value * viewBoxSize;
export const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));
export const resolveSignedAxisLimit = (origin: number, direction: number): number =>
  direction >= 0 ? 1 - origin : origin;

export function resolveRectDragPoints(
  anchor: VectorPoint,
  pointer: VectorPoint,
  options?: {
    scaleFromCenter?: boolean;
    lockSquare?: boolean;
    viewportWidth?: number;
    viewportHeight?: number;
    centeredSquareExponent?: number;
  }
): [VectorPoint, VectorPoint] {
  const scaleFromCenter = options?.scaleFromCenter ?? false;
  const lockSquare = options?.lockSquare ?? false;
  const viewportWidth =
    Number.isFinite(options?.viewportWidth) && (options?.viewportWidth ?? 0) > 0
      ? (options?.viewportWidth as number)
      : 1;
  const viewportHeight =
    Number.isFinite(options?.viewportHeight) && (options?.viewportHeight ?? 0) > 0
      ? (options?.viewportHeight as number)
      : 1;
  const centeredSquareExponent =
    options?.centeredSquareExponent ?? CENTERED_SQUARE_SENSITIVITY_EXPONENT;
  const rawDx = pointer.x - anchor.x;
  const rawDy = pointer.y - anchor.y;
  const directionX = rawDx < 0 ? -1 : 1;
  const directionY = rawDy < 0 ? -1 : 1;
  const limitX = resolveSignedAxisLimit(anchor.x, directionX);
  const limitY = resolveSignedAxisLimit(anchor.y, directionY);

  if (scaleFromCenter) {
    let deltaX = Math.min(Math.abs(rawDx), limitX);
    let deltaY = Math.min(Math.abs(rawDy), limitY);

    if (lockSquare) {
      const deltaXPx = deltaX * viewportWidth;
      const deltaYPx = deltaY * viewportHeight;
      const limitXPx = limitX * viewportWidth;
      const limitYPx = limitY * viewportHeight;
      const maxHalfSidePx = Math.min(limitXPx, limitYPx);
      const requestedHalfSidePx = Math.min(Math.min(deltaXPx, deltaYPx), maxHalfSidePx);
      const progress =
        maxHalfSidePx > 0 ? Math.max(0, Math.min(1, requestedHalfSidePx / maxHalfSidePx)) : 0;
      const easedHalfSidePx = maxHalfSidePx * Math.pow(progress, centeredSquareExponent);
      deltaX = easedHalfSidePx / viewportWidth;
      deltaY = easedHalfSidePx / viewportHeight;
    }

    return [
      {
        x: clampUnit(anchor.x - directionX * deltaX),
        y: clampUnit(anchor.y - directionY * deltaY),
      },
      {
        x: clampUnit(anchor.x + directionX * deltaX),
        y: clampUnit(anchor.y + directionY * deltaY),
      },
    ];
  }

  if (!lockSquare) {
    return [anchor, pointer];
  }

  const deltaXPx = Math.abs(rawDx) * viewportWidth;
  const deltaYPx = Math.abs(rawDy) * viewportHeight;
  const limitXPx = limitX * viewportWidth;
  const limitYPx = limitY * viewportHeight;
  const sidePx = Math.min(Math.min(deltaXPx, deltaYPx), limitXPx, limitYPx);
  return [
    anchor,
    {
      x: clampUnit(anchor.x + directionX * (sidePx / viewportWidth)),
      y: clampUnit(anchor.y + directionY * (sidePx / viewportHeight)),
    },
  ];
}

export function resolveRectResizePoints(
  points: VectorPoint[],
  draggedPointIndex: number,
  pointer: VectorPoint,
  options?: {
    scaleFromCenter?: boolean;
    lockSquare?: boolean;
    viewportWidth?: number;
    viewportHeight?: number;
    centeredSquareExponent?: number;
  }
): [VectorPoint, VectorPoint] | null {
  const first = points[0];
  const second = points[1];
  if (!first || !second) return null;

  const scaleFromCenter = options?.scaleFromCenter ?? false;
  const lockSquare = options?.lockSquare ?? false;
  const viewportOptions: {
    viewportWidth?: number;
    viewportHeight?: number;
    centeredSquareExponent?: number;
  } = {
    ...(typeof options?.viewportWidth === 'number' ? { viewportWidth: options.viewportWidth } : {}),
    ...(typeof options?.viewportHeight === 'number'
      ? { viewportHeight: options.viewportHeight }
      : {}),
    ...(typeof options?.centeredSquareExponent === 'number'
      ? { centeredSquareExponent: options.centeredSquareExponent }
      : {}),
  };

  if (scaleFromCenter) {
    const center = {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    };
    return resolveRectDragPoints(center, pointer, {
      scaleFromCenter: true,
      lockSquare,
      ...viewportOptions,
    });
  }

  const dragIndex = draggedPointIndex === 0 ? 0 : 1;
  const anchor = dragIndex === 0 ? second : first;
  const [anchorPoint, movedPoint] = resolveRectDragPoints(anchor, pointer, {
    scaleFromCenter: false,
    lockSquare,
    ...viewportOptions,
  });
  return dragIndex === 0 ? [movedPoint, anchorPoint] : [anchorPoint, movedPoint];
}

export const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const rotatePoint = (
  point: { x: number; y: number },
  angleRad: number
): { x: number; y: number } => {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
};

export const normalizeAngleDelta = (radians: number): number => {
  let normalized = radians;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
};

export const screenPointToWorld = (
  point: { x: number; y: number },
  transform: VectorViewTransform
): { x: number; y: number } => {
  const safeScale = Math.max(1e-6, transform.scale);
  const scaled = {
    x: (point.x - transform.panX) / safeScale,
    y: (point.y - transform.panY) / safeScale,
  };
  return rotatePoint(scaled, -toRadians(transform.rotateDeg));
};

export const worldPointToScreen = (
  point: { x: number; y: number },
  transform: VectorViewTransform
): { x: number; y: number } => {
  const rotated = rotatePoint(point, toRadians(transform.rotateDeg));
  return {
    x: rotated.x * transform.scale + transform.panX,
    y: rotated.y * transform.scale + transform.panY,
  };
};

export function vectorShapeToPath(
  shape: VectorShape,
  viewBoxSize = DEFAULT_VECTOR_VIEWBOX
): string | null {
  if (!shape.visible || shape.points.length === 0) return null;
  if (shape.type === 'rect' && shape.points.length >= 2) {
    const a = shape.points[0]!;
    const b = shape.points[1]!;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const x1 = formatPathNumber(toSvgCoord(minX, viewBoxSize));
    const x2 = formatPathNumber(toSvgCoord(maxX, viewBoxSize));
    const y1 = formatPathNumber(toSvgCoord(minY, viewBoxSize));
    const y2 = formatPathNumber(toSvgCoord(maxY, viewBoxSize));
    return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2} L ${x1} ${y2} Z`;
  }
  if (shape.type === 'ellipse' && shape.points.length >= 2) {
    const a = shape.points[0]!;
    const b = shape.points[1]!;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const rx = Math.abs(a.x - b.x) / 2;
    const ry = Math.abs(a.y - b.y) / 2;
    if (rx === 0 || ry === 0) return null;
    const cySvg = formatPathNumber(toSvgCoord(cy, viewBoxSize));
    const rxSvg = formatPathNumber(toSvgCoord(rx, viewBoxSize));
    const rySvg = formatPathNumber(toSvgCoord(ry, viewBoxSize));
    const startX = formatPathNumber(toSvgCoord(cx + rx, viewBoxSize));
    return `M ${startX} ${cySvg} A ${rxSvg} ${rySvg} 0 1 0 ${formatPathNumber(toSvgCoord(cx - rx, viewBoxSize))} ${cySvg} A ${rxSvg} ${rySvg} 0 1 0 ${startX} ${cySvg} Z`;
  }

  const points = shape.points;
  const start = points[0]!;
  const commands: string[] = [
    `M ${formatPathNumber(toSvgCoord(start.x, viewBoxSize))} ${formatPathNumber(toSvgCoord(start.y, viewBoxSize))}`,
  ];
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i]!;
    commands.push(
      `L ${formatPathNumber(toSvgCoord(p.x, viewBoxSize))} ${formatPathNumber(toSvgCoord(p.y, viewBoxSize))}`
    );
  }
  if (shape.closed && points.length >= 3) commands.push('Z');
  return commands.join(' ');
}

export function vectorShapesToPath(
  shapes: VectorShape[],
  viewBoxSize = DEFAULT_VECTOR_VIEWBOX
): string {
  return shapes
    .map((shape) => vectorShapeToPath(shape, viewBoxSize))
    .filter((value): value is string => Boolean(value))
    .join(' ');
}

export function vectorShapeToPathWithBounds(
  shape: VectorShape,
  width: number,
  height: number
): string | null {
  if (!shape.visible || shape.points.length === 0) return null;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  if (shape.type === 'rect' && shape.points.length >= 2) {
    const a = shape.points[0]!;
    const b = shape.points[1]!;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const x1 = formatPathNumber(minX * width);
    const x2 = formatPathNumber(maxX * width);
    const y1 = formatPathNumber(minY * height);
    const y2 = formatPathNumber(maxY * height);
    return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2} L ${x1} ${y2} Z`;
  }
  if (shape.type === 'ellipse' && shape.points.length >= 2) {
    const a = shape.points[0]!;
    const b = shape.points[1]!;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const rx = Math.abs(a.x - b.x) / 2;
    const ry = Math.abs(a.y - b.y) / 2;
    if (rx === 0 || ry === 0) return null;
    const cySvg = formatPathNumber(cy * height);
    const rxSvg = formatPathNumber(rx * width);
    const rySvg = formatPathNumber(ry * height);
    const startX = formatPathNumber((cx + rx) * width);
    const endX = formatPathNumber((cx - rx) * width);
    return `M ${startX} ${cySvg} A ${rxSvg} ${rySvg} 0 1 0 ${endX} ${cySvg} A ${rxSvg} ${rySvg} 0 1 0 ${startX} ${cySvg} Z`;
  }

  const points = shape.points;
  const start = points[0]!;
  const commands: string[] = [
    `M ${formatPathNumber(start.x * width)} ${formatPathNumber(start.y * height)}`,
  ];
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i]!;
    commands.push(`L ${formatPathNumber(p.x * width)} ${formatPathNumber(p.y * height)}`);
  }
  if (shape.closed && points.length >= 3) commands.push('Z');
  return commands.join(' ');
}

export function vectorShapesToPathWithBounds(
  shapes: VectorShape[],
  width: number,
  height: number
): string {
  return shapes
    .map((shape) => vectorShapeToPathWithBounds(shape, width, height))
    .filter((value): value is string => Boolean(value))
    .join(' ');
}
