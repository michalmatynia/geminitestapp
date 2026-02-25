import {
  type CropCanvasContext,
  type CropRect,
  type CropRectResolutionDiagnostics,
  type MaskShapeForExport,
  type ImageContentFrame,
} from './GenerationToolbarImageUtils.types';
import {
  normalizeImageContentFrame,
  shapePointsAreUnitNormalized,
} from './GenerationToolbarImageUtils.helpers';

type ShapeBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export const resolveCropRectFromShapesWithDiagnostics = (
  shapes: MaskShapeForExport[],
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number,
  activeShapeId?: string | null,
  imageContentFrame?: ImageContentFrame | null
): { cropRect: CropRect | null; diagnostics: CropRectResolutionDiagnostics | null } => {
  const normalizedFrame = normalizeImageContentFrame(imageContentFrame);
  const eligibleShapes = shapes.filter(
    (shape) =>
      shape.visible &&
      (activeShapeId ? shape.id === activeShapeId : true) &&
      (shape.type === 'rect' || shape.type === 'ellipse' || (shape.closed && shape.points.length >= 3))
  );

  if (eligibleShapes.length === 0) {
    return {
      cropRect: null,
      diagnostics: {
        rawCanvasBounds: null,
        mappedImageBounds: null,
        imageContentFrame: normalizedFrame,
        usedImageContentFrameMapping: false,
      },
    };
  }

  const shapeBounds: ShapeBounds = eligibleShapes.reduce(
    (acc: ShapeBounds, shape) => {
      shape.points.forEach((point) => {
        acc.minX = Math.min(acc.minX, point.x);
        acc.maxX = Math.max(acc.maxX, point.x);
        acc.minY = Math.min(acc.minY, point.y);
        acc.maxY = Math.max(acc.maxY, point.y);
      });
      return acc;
    },
    { minX: 1, maxX: 0, minY: 1, maxY: 0 }
  );

  const canvasCropRect: CropRect = {
    x: Math.floor(shapeBounds.minX * canvasWidth),
    y: Math.floor(shapeBounds.minY * canvasHeight),
    width: Math.ceil((shapeBounds.maxX - shapeBounds.minX) * canvasWidth),
    height: Math.ceil((shapeBounds.maxY - shapeBounds.minY) * canvasHeight),
  };

  const isUnitNormalized = eligibleShapes.every(shapePointsAreUnitNormalized);

  if (normalizedFrame) {
    const mapped = mapCanvasRectToImageRect(
      canvasCropRect,
      imageWidth,
      imageHeight,
      { canvasWidth, canvasHeight, imageFrame: normalizedFrame }
    );
    if (mapped) {
      return {
        cropRect: mapped,
        diagnostics: {
          rawCanvasBounds: canvasCropRect,
          mappedImageBounds: mapped,
          imageContentFrame: normalizedFrame,
          usedImageContentFrameMapping: true,
        },
      };
    }
  }

  if (isUnitNormalized) {
    const mapped: CropRect = {
      x: Math.floor(shapeBounds.minX * imageWidth),
      y: Math.floor(shapeBounds.minY * imageHeight),
      width: Math.ceil((shapeBounds.maxX - shapeBounds.minX) * imageWidth),
      height: Math.ceil((shapeBounds.maxY - shapeBounds.minY) * imageHeight),
    };
    return {
      cropRect: mapped,
      diagnostics: {
        rawCanvasBounds: canvasCropRect,
        mappedImageBounds: mapped,
        imageContentFrame: normalizedFrame,
        usedImageContentFrameMapping: false,
      },
    };
  }

  return {
    cropRect: canvasCropRect,
    diagnostics: {
      rawCanvasBounds: canvasCropRect,
      mappedImageBounds: null,
      imageContentFrame: normalizedFrame,
      usedImageContentFrameMapping: false,
    },
  };
};

export const mapCanvasRectToImageRect = (
  canvasRect: CropRect,
  imageWidth: number,
  imageHeight: number,
  context: CropCanvasContext
): CropRect | null => {
  const { imageFrame } = context;
  if (imageFrame.width <= 0 || imageFrame.height <= 0) return null;

  const relX = (canvasRect.x - imageFrame.x) / imageFrame.width;
  const relY = (canvasRect.y - imageFrame.y) / imageFrame.height;
  const relW = canvasRect.width / imageFrame.width;
  const relH = canvasRect.height / imageFrame.height;

  return {
    x: Math.round(relX * imageWidth),
    y: Math.round(relY * imageHeight),
    width: Math.round(relW * imageWidth),
    height: Math.round(relH * imageHeight),
  };
};

export const mapImageCropRectToCanvasRect = (
  imageCropRect: CropRect,
  imageWidth: number,
  imageHeight: number,
  context: CropCanvasContext
): CropRect | null => {
  const { imageFrame } = context;
  if (imageWidth <= 0 || imageHeight <= 0) return null;

  const relX = imageCropRect.x / imageWidth;
  const relY = imageCropRect.y / imageHeight;
  const relW = imageCropRect.width / imageWidth;
  const relH = imageCropRect.height / imageHeight;

  return {
    x: Math.round(imageFrame.x + relX * imageFrame.width),
    y: Math.round(imageFrame.y + relY * imageFrame.height),
    width: Math.round(relW * imageFrame.width),
    height: Math.round(relH * imageFrame.height),
  };
};

export const resolveCanvasOverflowCropRect = (
  context: CropCanvasContext
): CropRect | null => {
  const { canvasWidth, canvasHeight, imageFrame } = context;
  if (
    imageFrame.x >= 0 &&
    imageFrame.y >= 0 &&
    imageFrame.x + imageFrame.width <= canvasWidth &&
    imageFrame.y + imageFrame.height <= canvasHeight
  ) {
    return null;
  }

  const intersectX = Math.max(0, imageFrame.x);
  const intersectY = Math.max(0, imageFrame.y);
  const intersectMaxX = Math.min(canvasWidth, imageFrame.x + imageFrame.width);
  const intersectMaxY = Math.min(canvasHeight, imageFrame.y + imageFrame.height);

  if (intersectMaxX <= intersectX || intersectMaxY <= intersectY) {
    return null;
  }

  const canvasCropRect: CropRect = {
    x: intersectX,
    y: intersectY,
    width: intersectMaxX - intersectX,
    height: intersectMaxY - intersectY,
  };

  return canvasCropRect;
};

export const hasCanvasOverflowFromImageFrame = (
  frame: ImageContentFrame | null | undefined
): boolean => {
  const normalized = normalizeImageContentFrame(frame);
  if (!normalized) return false;
  return normalized.x < 0 || normalized.y < 0;
};
