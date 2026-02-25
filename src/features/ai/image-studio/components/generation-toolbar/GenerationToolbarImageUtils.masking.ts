import {
  type ImageContentFrame,
  type MaskShapeForExport,
} from './GenerationToolbarImageUtils.types';
import {
  clamp01,
  normalizeImageContentFrame,
} from './GenerationToolbarImageUtils.helpers';

const toNormalizedUnit = (value: number, sourceSize: number): number | null => {
  if (!Number.isFinite(value)) return null;
  if (value >= 0 && value <= 1) return clamp01(value);
  if (!(sourceSize > 0)) return null;
  return clamp01(value / sourceSize);
};

const normalizeImageFrameToUnitRect = (
  frame: ImageContentFrame | null | undefined,
  sourceWidth: number,
  sourceHeight: number
): ImageContentFrame | null => {
  const normalizedFrame = normalizeImageContentFrame(frame);
  if (!normalizedFrame) return null;
  const x = toNormalizedUnit(normalizedFrame.x, sourceWidth);
  const y = toNormalizedUnit(normalizedFrame.y, sourceHeight);
  const width = toNormalizedUnit(normalizedFrame.width, sourceWidth);
  const height = toNormalizedUnit(normalizedFrame.height, sourceHeight);
  if (x === null || y === null || width === null || height === null) return null;
  if (!(width > 0 && height > 0)) return null;
  return {
    x,
    y,
    width,
    height,
  };
};

const mapCanvasUnitToImageUnit = (
  value: number,
  frameStart: number,
  frameSize: number
): number | null => {
  if (!Number.isFinite(value) || !Number.isFinite(frameStart) || !Number.isFinite(frameSize)) {
    return null;
  }
  if (!(frameSize > 0)) return null;
  return clamp01((value - frameStart) / frameSize);
};

const toUnitPoint = (
  point: { x: number; y: number },
  sourceWidth: number,
  sourceHeight: number,
  imageFrame: ImageContentFrame | null
): { x: number; y: number } | null => {
  const canvasUnitX = toNormalizedUnit(point.x, sourceWidth);
  const canvasUnitY = toNormalizedUnit(point.y, sourceHeight);
  if (canvasUnitX === null || canvasUnitY === null) return null;

  if (!imageFrame) {
    return { x: canvasUnitX, y: canvasUnitY };
  }

  const imageUnitX = mapCanvasUnitToImageUnit(canvasUnitX, imageFrame.x, imageFrame.width);
  const imageUnitY = mapCanvasUnitToImageUnit(canvasUnitY, imageFrame.y, imageFrame.height);
  if (imageUnitX === null || imageUnitY === null) return null;

  return {
    x: imageUnitX,
    y: imageUnitY,
  };
};

export const normalizeShapeToPolygons = (
  shape: MaskShapeForExport,
  sourceWidth: number,
  sourceHeight: number,
  options?: {
    imageFrame?: ImageContentFrame | null;
    imageContentFrame?: ImageContentFrame | null;
  }
): Array<Array<{ x: number; y: number }>> => {
  const unitImageFrame = normalizeImageFrameToUnitRect(
    options?.imageContentFrame ?? options?.imageFrame ?? null,
    sourceWidth,
    sourceHeight
  );

  if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
    if (!shape.closed || shape.points.length < 3) return [];
    const polygon = shape.points
      .map((point) => toUnitPoint(point, sourceWidth, sourceHeight, unitImageFrame))
      .filter((point): point is { x: number; y: number } => point !== null);
    if (polygon.length < 3) return [];
    return [polygon];
  }

  if (shape.type === 'rect') {
    if (shape.points.length < 2) return [];
    const unitPoints = shape.points
      .map((point) => toUnitPoint(point, sourceWidth, sourceHeight, unitImageFrame))
      .filter((point): point is { x: number; y: number } => point !== null);
    if (unitPoints.length < 2) return [];
    const xs = unitPoints.map((point) => point.x);
    const ys = unitPoints.map((point) => point.y);
    const minX = clamp01(Math.min(...xs));
    const maxX = clamp01(Math.max(...xs));
    const minY = clamp01(Math.min(...ys));
    const maxY = clamp01(Math.max(...ys));
    if (!(maxX > minX && maxY > minY)) return [];
    return [[
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ]];
  }

  if (shape.type === 'ellipse') {
    if (shape.points.length < 2) return [];
    const unitPoints = shape.points
      .map((point) => toUnitPoint(point, sourceWidth, sourceHeight, unitImageFrame))
      .filter((point): point is { x: number; y: number } => point !== null);
    if (unitPoints.length < 2) return [];
    const xs = unitPoints.map((point) => point.x);
    const ys = unitPoints.map((point) => point.y);
    const minX = clamp01(Math.min(...xs));
    const maxX = clamp01(Math.max(...xs));
    const minY = clamp01(Math.min(...ys));
    const maxY = clamp01(Math.max(...ys));
    if (!(maxX > minX && maxY > minY)) return [];

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    const steps = 24;

    const polygon = Array.from({ length: steps }, (_, index) => {
      const theta = (index / steps) * Math.PI * 2;
      return {
        x: clamp01(cx + rx * Math.cos(theta)),
        y: clamp01(cy + ry * Math.sin(theta)),
      };
    });

    return [polygon];
  }

  return [];
};

export const shapeHasUsableCropGeometry = (shape: MaskShapeForExport): boolean => {
  if (!shape.visible) return false;
  if (shape.type === 'rect' || shape.type === 'ellipse') {
    if (shape.points.length < 2) return false;
    return shape.points
      .slice(0, 2)
      .every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
    if (!shape.closed || shape.points.length < 3) return false;
    return shape.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  return false;
};

export const polygonsFromShapes = (
  shapes: MaskShapeForExport[],
  sourceWidth: number,
  sourceHeight: number,
  options?: {
    imageFrame?: ImageContentFrame | null;
    imageContentFrame?: ImageContentFrame | null;
  }
): Array<Array<{ x: number; y: number }>> =>
  shapes
    .filter((shape) => shape.visible)
    .flatMap((shape) => normalizeShapeToPolygons(shape, sourceWidth, sourceHeight, options));

const resolveMaskColors = (
  variant: 'white' | 'black',
  inverted: boolean
): { background: '#000000' | '#ffffff'; fill: '#000000' | '#ffffff' } => {
  const preferWhite = variant === 'white';
  const background =
    (preferWhite && !inverted) || (!preferWhite && inverted)
      ? '#000000'
      : '#ffffff';
  const fill = background === '#000000' ? '#ffffff' : '#000000';
  return { background, fill };
};

export const renderMaskDataUrlFromPolygons = (
  polygons: Array<Array<{ x: number; y: number }>>,
  width: number,
  height: number,
  variant: 'white' | 'black',
  inverted: boolean
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context2d = canvas.getContext('2d');
  if (!context2d) {
    throw new Error('Canvas context is unavailable.');
  }

  const { background, fill } = resolveMaskColors(variant, inverted);
  context2d.clearRect(0, 0, width, height);
  context2d.fillStyle = background;
  context2d.fillRect(0, 0, width, height);
  context2d.fillStyle = fill;

  polygons.forEach((polygon) => {
    if (polygon.length < 3) return;
    context2d.beginPath();
    const firstX = polygon[0]!.x <= 1 ? polygon[0]!.x * width : polygon[0]!.x;
    const firstY = polygon[0]!.y <= 1 ? polygon[0]!.y * height : polygon[0]!.y;
    context2d.moveTo(firstX, firstY);

    for (let index = 1; index < polygon.length; index += 1) {
      const point = polygon[index]!;
      const x = point.x <= 1 ? point.x * width : point.x;
      const y = point.y <= 1 ? point.y * height : point.y;
      context2d.lineTo(x, y);
    }

    context2d.closePath();
    context2d.fill();
  });

  return canvas.toDataURL('image/png');
};
