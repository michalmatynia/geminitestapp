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

const resolveContextImageFrame = (
  context: CropCanvasContext
): ImageContentFrame | null => {
  const normalizedFrame = normalizeImageContentFrame(
    context.imageFrame ?? context.imageContentFrame
  );
  if (!normalizedFrame) return null;
  if (!(context.canvasWidth > 0 && context.canvasHeight > 0)) return null;

  // Preview canvas reports image frame values in unit coordinates.
  if (normalizedFrame.width <= 1 && normalizedFrame.height <= 1) {
    return {
      x: normalizedFrame.x * context.canvasWidth,
      y: normalizedFrame.y * context.canvasHeight,
      width: normalizedFrame.width * context.canvasWidth,
      height: normalizedFrame.height * context.canvasHeight,
    };
  }

  return normalizedFrame;
};

const clampRectToBounds = (
  rect: CropRect,
  maxWidth: number,
  maxHeight: number
): CropRect | null => {
  if (
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height)
  ) {
    return null;
  }

  const left = Math.floor(rect.x);
  const top = Math.floor(rect.y);
  const right = Math.ceil(rect.x + rect.width);
  const bottom = Math.ceil(rect.y + rect.height);
  if (!(right > left && bottom > top)) return null;

  const clampedLeft = Math.max(0, left);
  const clampedTop = Math.max(0, top);
  const clampedRight = Math.min(maxWidth, right);
  const clampedBottom = Math.min(maxHeight, bottom);
  if (!(clampedRight > clampedLeft && clampedBottom > clampedTop)) return null;

  return {
    x: clampedLeft,
    y: clampedTop,
    width: clampedRight - clampedLeft,
    height: clampedBottom - clampedTop,
  };
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
    return {
      cropRect: canvasCropRect,
      diagnostics: {
        rawCanvasBounds: canvasCropRect,
        mappedImageBounds: null,
        imageContentFrame: normalizedFrame,
        usedImageContentFrameMapping: true,
      },
    };
  }

  if (isUnitNormalized) {
    const mapped = clampRectToBounds({
      x: Math.floor(shapeBounds.minX * imageWidth),
      y: Math.floor(shapeBounds.minY * imageHeight),
      width: Math.ceil((shapeBounds.maxX - shapeBounds.minX) * imageWidth),
      height: Math.ceil((shapeBounds.maxY - shapeBounds.minY) * imageHeight),
    }, imageWidth, imageHeight);
    if (!mapped) {
      return {
        cropRect: canvasCropRect,
        diagnostics: {
          rawCanvasBounds: canvasCropRect,
          mappedImageBounds: null,
          imageContentFrame: null,
          usedImageContentFrameMapping: false,
        },
      };
    }
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
  if (!(imageWidth > 0 && imageHeight > 0)) return null;
  const imageFrame = resolveContextImageFrame(context);
  if (!imageFrame) return null;
  if (!(imageFrame.width > 0 && imageFrame.height > 0)) return null;

  const relX = (canvasRect.x - imageFrame.x) / imageFrame.width;
  const relY = (canvasRect.y - imageFrame.y) / imageFrame.height;
  const relW = canvasRect.width / imageFrame.width;
  const relH = canvasRect.height / imageFrame.height;
  if (
    !Number.isFinite(relX) ||
    !Number.isFinite(relY) ||
    !Number.isFinite(relW) ||
    !Number.isFinite(relH) ||
    !(relW > 0 && relH > 0)
  ) {
    return null;
  }

  const epsilon = 1e-6;
  if (
    relX < -epsilon ||
    relY < -epsilon ||
    relX + relW > 1 + epsilon ||
    relY + relH > 1 + epsilon
  ) {
    return null;
  }

  return clampRectToBounds({
    x: Math.round(relX * imageWidth),
    y: Math.round(relY * imageHeight),
    width: Math.round(relW * imageWidth),
    height: Math.round(relH * imageHeight),
  }, imageWidth, imageHeight);
};

export const mapImageCropRectToCanvasRect = (
  imageCropRect: CropRect,
  imageWidth: number,
  imageHeight: number,
  context: CropCanvasContext
): CropRect | null => {
  if (!(imageWidth > 0 && imageHeight > 0)) return null;
  if (!(context.canvasWidth > 0 && context.canvasHeight > 0)) return null;
  const imageFrame = resolveContextImageFrame(context);
  if (!imageFrame) return null;
  if (!(imageFrame.width > 0 && imageFrame.height > 0)) return null;

  const relX = imageCropRect.x / imageWidth;
  const relY = imageCropRect.y / imageHeight;
  const relW = imageCropRect.width / imageWidth;
  const relH = imageCropRect.height / imageHeight;
  if (
    !Number.isFinite(relX) ||
    !Number.isFinite(relY) ||
    !Number.isFinite(relW) ||
    !Number.isFinite(relH) ||
    !(relW > 0 && relH > 0)
  ) {
    return null;
  }

  return clampRectToBounds({
    x: Math.round(imageFrame.x + relX * imageFrame.width),
    y: Math.round(imageFrame.y + relY * imageFrame.height),
    width: Math.round(relW * imageFrame.width),
    height: Math.round(relH * imageFrame.height),
  }, context.canvasWidth, context.canvasHeight);
};

export const resolveCanvasOverflowCropRect = (
  context: CropCanvasContext
): CropRect | null => {
  const { canvasWidth, canvasHeight } = context;
  if (!(canvasWidth > 0 && canvasHeight > 0)) return null;
  const imageFrame = resolveContextImageFrame(context);
  if (!imageFrame) return null;

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

  return clampRectToBounds({
    x: intersectX,
    y: intersectY,
    width: intersectMaxX - intersectX,
    height: intersectMaxY - intersectY,
  }, canvasWidth, canvasHeight);
};

export const hasCanvasOverflowFromImageFrame = (
  frame: ImageContentFrame | null | undefined
): boolean => {
  const normalized = normalizeImageContentFrame(frame);
  if (!normalized) return false;
  if (normalized.width <= 1 && normalized.height <= 1) {
    return (
      normalized.x < 0 ||
      normalized.y < 0 ||
      normalized.x + normalized.width > 1 ||
      normalized.y + normalized.height > 1
    );
  }
  return normalized.x < 0 || normalized.y < 0;
};
