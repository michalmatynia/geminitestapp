import type { VectorShape } from '@/shared/lib/vector-drawing';

export type CanvasResizeDirection =
  | 'up-left'
  | 'up'
  | 'up-right'
  | 'left'
  | 'center'
  | 'right'
  | 'down-left'
  | 'down'
  | 'down-right';

export interface NormalizedImageFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

type AxisMode = 'left' | 'center' | 'right';
type VerticalMode = 'up' | 'center' | 'down';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const toSafeNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeCanvasDimension = (value: number): number =>
  Math.max(1, Math.floor(toSafeNumber(value, 1)));

const isPositiveFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const normalizeDirection = (direction: CanvasResizeDirection): CanvasResizeDirection => {
  switch (direction) {
    case 'up-left':
    case 'up':
    case 'up-right':
    case 'left':
    case 'center':
    case 'right':
    case 'down-left':
    case 'down':
    case 'down-right':
      return direction;
    default:
      return 'down-right';
  }
};

const resolveHorizontalMode = (direction: CanvasResizeDirection): AxisMode => {
  if (direction.endsWith('left') || direction === 'left') return 'left';
  if (direction.endsWith('right') || direction === 'right') return 'right';
  return 'center';
};

const resolveVerticalMode = (direction: CanvasResizeDirection): VerticalMode => {
  if (direction.startsWith('up') || direction === 'up') return 'up';
  if (direction.startsWith('down') || direction === 'down') return 'down';
  return 'center';
};

export function computeCanvasResizeShiftPx(params: {
  oldCanvasWidth: number;
  oldCanvasHeight: number;
  newCanvasWidth: number;
  newCanvasHeight: number;
  direction: CanvasResizeDirection;
}): { x: number; y: number } {
  const oldCanvasWidth = normalizeCanvasDimension(params.oldCanvasWidth);
  const oldCanvasHeight = normalizeCanvasDimension(params.oldCanvasHeight);
  const newCanvasWidth = normalizeCanvasDimension(params.newCanvasWidth);
  const newCanvasHeight = normalizeCanvasDimension(params.newCanvasHeight);
  const direction = normalizeDirection(params.direction);

  const deltaWidth = newCanvasWidth - oldCanvasWidth;
  const deltaHeight = newCanvasHeight - oldCanvasHeight;
  const horizontalMode = resolveHorizontalMode(direction);
  const verticalMode = resolveVerticalMode(direction);

  const x =
    horizontalMode === 'left' ? deltaWidth : horizontalMode === 'center' ? deltaWidth / 2 : 0;
  const y = verticalMode === 'up' ? deltaHeight : verticalMode === 'center' ? deltaHeight / 2 : 0;

  return { x, y };
}

export function remapMaskShapesForCanvasResize(
  shapes: VectorShape[],
  params: {
    oldCanvasWidth: number;
    oldCanvasHeight: number;
    newCanvasWidth: number;
    newCanvasHeight: number;
    direction: CanvasResizeDirection;
  }
): VectorShape[] {
  const oldCanvasWidth = normalizeCanvasDimension(params.oldCanvasWidth);
  const oldCanvasHeight = normalizeCanvasDimension(params.oldCanvasHeight);
  const newCanvasWidth = normalizeCanvasDimension(params.newCanvasWidth);
  const newCanvasHeight = normalizeCanvasDimension(params.newCanvasHeight);

  if (!Array.isArray(shapes) || shapes.length === 0) return [];
  if (oldCanvasWidth === newCanvasWidth && oldCanvasHeight === newCanvasHeight) {
    return shapes.map((shape: VectorShape) => ({
      ...shape,
      points: shape.points.map((point) => ({ ...point })),
    }));
  }

  const shift = computeCanvasResizeShiftPx({
    oldCanvasWidth,
    oldCanvasHeight,
    newCanvasWidth,
    newCanvasHeight,
    direction: params.direction,
  });

  return shapes.map((shape: VectorShape) => ({
    ...shape,
    points: shape.points.map((point) => {
      const pointX = clamp(toSafeNumber(point.x, 0), 0, 1);
      const pointY = clamp(toSafeNumber(point.y, 0), 0, 1);
      const oldX = pointX * oldCanvasWidth;
      const oldY = pointY * oldCanvasHeight;
      const nextX = oldX + shift.x;
      const nextY = oldY + shift.y;
      return {
        x: clamp(nextX / newCanvasWidth, 0, 1),
        y: clamp(nextY / newCanvasHeight, 0, 1),
      };
    }),
  }));
}

const resolveContainedContentSize = (
  canvasWidth: number,
  canvasHeight: number,
  sourceAspectRatio: number
): { width: number; height: number } => {
  const safeCanvasWidth = normalizeCanvasDimension(canvasWidth);
  const safeCanvasHeight = normalizeCanvasDimension(canvasHeight);
  if (!isPositiveFiniteNumber(sourceAspectRatio)) {
    return { width: safeCanvasWidth, height: safeCanvasHeight };
  }

  const canvasAspect = safeCanvasWidth / safeCanvasHeight;
  if (sourceAspectRatio > canvasAspect) {
    return {
      width: safeCanvasWidth,
      height: safeCanvasWidth / sourceAspectRatio,
    };
  }

  return {
    width: safeCanvasHeight * sourceAspectRatio,
    height: safeCanvasHeight,
  };
};

const resolveSourceAspectRatio = (
  sourceAspectRatio: number | null | undefined,
  currentImageFrame: NormalizedImageFrame | null | undefined,
  oldCanvasWidth: number,
  oldCanvasHeight: number
): number | null => {
  if (isPositiveFiniteNumber(sourceAspectRatio)) return sourceAspectRatio;
  if (
    !currentImageFrame ||
    !isPositiveFiniteNumber(currentImageFrame.width) ||
    !isPositiveFiniteNumber(currentImageFrame.height)
  ) {
    return null;
  }

  const frameWidthPx = currentImageFrame.width * oldCanvasWidth;
  const frameHeightPx = currentImageFrame.height * oldCanvasHeight;
  if (!isPositiveFiniteNumber(frameWidthPx) || !isPositiveFiniteNumber(frameHeightPx)) {
    return null;
  }
  return frameWidthPx / frameHeightPx;
};

export function resolveImageOffsetForCanvasResize(params: {
  oldCanvasWidth: number;
  oldCanvasHeight: number;
  newCanvasWidth: number;
  newCanvasHeight: number;
  direction: CanvasResizeDirection;
  currentOffset: { x: number; y: number };
  currentImageFrame?: NormalizedImageFrame | null | undefined;
  sourceAspectRatio?: number | null | undefined;
}): { x: number; y: number } {
  const oldCanvasWidth = normalizeCanvasDimension(params.oldCanvasWidth);
  const oldCanvasHeight = normalizeCanvasDimension(params.oldCanvasHeight);
  const newCanvasWidth = normalizeCanvasDimension(params.newCanvasWidth);
  const newCanvasHeight = normalizeCanvasDimension(params.newCanvasHeight);
  const currentOffset = {
    x: toSafeNumber(params.currentOffset.x, 0),
    y: toSafeNumber(params.currentOffset.y, 0),
  };

  if (oldCanvasWidth === newCanvasWidth && oldCanvasHeight === newCanvasHeight) {
    return currentOffset;
  }

  const shift = computeCanvasResizeShiftPx({
    oldCanvasWidth,
    oldCanvasHeight,
    newCanvasWidth,
    newCanvasHeight,
    direction: params.direction,
  });

  const sourceAspectRatio = resolveSourceAspectRatio(
    params.sourceAspectRatio,
    params.currentImageFrame,
    oldCanvasWidth,
    oldCanvasHeight
  );

  if (!isPositiveFiniteNumber(sourceAspectRatio)) {
    return {
      x: currentOffset.x + shift.x - (newCanvasWidth - oldCanvasWidth) / 2,
      y: currentOffset.y + shift.y - (newCanvasHeight - oldCanvasHeight) / 2,
    };
  }

  const oldContent = resolveContainedContentSize(
    oldCanvasWidth,
    oldCanvasHeight,
    sourceAspectRatio
  );
  const newContent = resolveContainedContentSize(
    newCanvasWidth,
    newCanvasHeight,
    sourceAspectRatio
  );

  const oldFrameX = params.currentImageFrame
    ? params.currentImageFrame.x * oldCanvasWidth
    : (oldCanvasWidth - oldContent.width) / 2 + currentOffset.x;
  const oldFrameY = params.currentImageFrame
    ? params.currentImageFrame.y * oldCanvasHeight
    : (oldCanvasHeight - oldContent.height) / 2 + currentOffset.y;

  const desiredFrameX = oldFrameX + shift.x;
  const desiredFrameY = oldFrameY + shift.y;

  const nextOffsetX = desiredFrameX - (newCanvasWidth - newContent.width) / 2;
  const nextOffsetY = desiredFrameY - (newCanvasHeight - newContent.height) / 2;

  return {
    x: Number.isFinite(nextOffsetX) ? nextOffsetX : currentOffset.x,
    y: Number.isFinite(nextOffsetY) ? nextOffsetY : currentOffset.y,
  };
}

export function applyCanvasResizeLocalTransform(params: {
  shapes: VectorShape[];
  oldCanvasWidth: number;
  oldCanvasHeight: number;
  newCanvasWidth: number;
  newCanvasHeight: number;
  direction: CanvasResizeDirection;
  currentImageOffset: { x: number; y: number };
  currentImageFrame?: NormalizedImageFrame | null | undefined;
  sourceAspectRatio?: number | null | undefined;
}): {
  shapes: VectorShape[];
  imageOffset: { x: number; y: number };
  shiftPx: { x: number; y: number };
} {
  const shiftPx = computeCanvasResizeShiftPx({
    oldCanvasWidth: params.oldCanvasWidth,
    oldCanvasHeight: params.oldCanvasHeight,
    newCanvasWidth: params.newCanvasWidth,
    newCanvasHeight: params.newCanvasHeight,
    direction: params.direction,
  });

  const shapes = remapMaskShapesForCanvasResize(params.shapes, {
    oldCanvasWidth: params.oldCanvasWidth,
    oldCanvasHeight: params.oldCanvasHeight,
    newCanvasWidth: params.newCanvasWidth,
    newCanvasHeight: params.newCanvasHeight,
    direction: params.direction,
  });

  const imageOffset = resolveImageOffsetForCanvasResize({
    oldCanvasWidth: params.oldCanvasWidth,
    oldCanvasHeight: params.oldCanvasHeight,
    newCanvasWidth: params.newCanvasWidth,
    newCanvasHeight: params.newCanvasHeight,
    direction: params.direction,
    currentOffset: params.currentImageOffset,
    currentImageFrame: params.currentImageFrame,
    sourceAspectRatio: params.sourceAspectRatio,
  });

  return { shapes, imageOffset, shiftPx };
}
