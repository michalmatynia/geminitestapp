import { syncKangurCanvasContext } from '@/features/kangur/ui/services/drawing-canvas';

import type { KangurDrawingStroke, KangurDrawingStrokeRenderStyle } from './types';

const DEFAULT_LINE_CAP: CanvasLineCap = 'round';
const DEFAULT_LINE_JOIN: CanvasLineJoin = 'round';

export type KangurDrawingCanvasBaseLayerCache = {
  canvas: HTMLCanvasElement;
  logicalHeight: number;
  logicalWidth: number;
  key: number | string | null;
};

export type KangurDrawingCanvasStrokeLayerCache<TMeta> = {
  canvas: HTMLCanvasElement;
  logicalHeight: number;
  logicalWidth: number;
  resolveStyle: (
    stroke: KangurDrawingStroke<TMeta>,
    index: number
  ) => KangurDrawingStrokeRenderStyle;
  strokes: KangurDrawingStroke<TMeta>[];
};

const renderSmoothKangurStrokePath = (
  ctx: CanvasRenderingContext2D,
  stroke: KangurDrawingStroke<unknown>
): void => {
  const firstPoint = stroke.points[0];
  if (!firstPoint) {
    return;
  }

  if (stroke.points.length === 1) {
    ctx.lineTo(firstPoint.x, firstPoint.y);
    return;
  }

  if (stroke.points.length === 2) {
    const secondPoint = stroke.points[1];
    if (secondPoint) {
      ctx.lineTo(secondPoint.x, secondPoint.y);
    }
    return;
  }

  for (let pointIndex = 1; pointIndex < stroke.points.length - 1; pointIndex += 1) {
    const point = stroke.points[pointIndex];
    const nextPoint = stroke.points[pointIndex + 1];
    if (!point || !nextPoint) {
      continue;
    }

    const midPointX = (point.x + nextPoint.x) / 2;
    const midPointY = (point.y + nextPoint.y) / 2;
    ctx.quadraticCurveTo(point.x, point.y, midPointX, midPointY);
  }

  const penultimatePoint = stroke.points[stroke.points.length - 2];
  const lastPoint = stroke.points[stroke.points.length - 1];
  if (penultimatePoint && lastPoint) {
    ctx.quadraticCurveTo(
      penultimatePoint.x,
      penultimatePoint.y,
      lastPoint.x,
      lastPoint.y
    );
  }
};

export const renderKangurDrawingStrokes = <TMeta>(
  ctx: CanvasRenderingContext2D,
  strokes: KangurDrawingStroke<TMeta>[],
  resolveStyle: (
    stroke: KangurDrawingStroke<TMeta>,
    index: number
  ) => KangurDrawingStrokeRenderStyle
): void => {
  let currentStyle: KangurDrawingStrokeRenderStyle | null = null;
  let hasActivePath = false;

  const areStylesEqual = (
    left: KangurDrawingStrokeRenderStyle,
    right: KangurDrawingStrokeRenderStyle
  ): boolean =>
    left.lineWidth === right.lineWidth &&
    (left.lineCap ?? DEFAULT_LINE_CAP) === (right.lineCap ?? DEFAULT_LINE_CAP) &&
    (left.lineJoin ?? DEFAULT_LINE_JOIN) === (right.lineJoin ?? DEFAULT_LINE_JOIN) &&
    left.strokeStyle === right.strokeStyle &&
    (left.shadowColor ?? 'transparent') === (right.shadowColor ?? 'transparent') &&
    (left.shadowBlur ?? 0) === (right.shadowBlur ?? 0) &&
    (left.compositeOperation ?? 'source-over') === (right.compositeOperation ?? 'source-over');

  const applyStyle = (style: KangurDrawingStrokeRenderStyle): void => {
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = style.lineCap ?? DEFAULT_LINE_CAP;
    ctx.lineJoin = style.lineJoin ?? DEFAULT_LINE_JOIN;
    ctx.strokeStyle = style.strokeStyle;
    ctx.shadowColor = style.shadowColor ?? 'transparent';
    ctx.shadowBlur = style.shadowBlur ?? 0;
    ctx.globalCompositeOperation = style.compositeOperation ?? 'source-over';
  };

  const flushPath = (): void => {
    if (!hasActivePath) {
      return;
    }
    ctx.stroke();
    hasActivePath = false;
  };

  strokes.forEach((stroke, index) => {
    if (stroke.points.length === 0) {
      return;
    }

    const style = resolveStyle(stroke, index);
    const firstPoint = stroke.points[0];
    if (!firstPoint) {
      return;
    }

    if (!currentStyle || !areStylesEqual(currentStyle, style)) {
      flushPath();
      currentStyle = style;
      applyStyle(style);
      ctx.beginPath();
    }

    ctx.moveTo(firstPoint.x, firstPoint.y);

    if (style.renderMode === 'smooth') {
      renderSmoothKangurStrokePath(
        ctx,
        stroke as KangurDrawingStroke<unknown>
      );
    } else {
      for (let pointIndex = 1; pointIndex < stroke.points.length; pointIndex += 1) {
        const point = stroke.points[pointIndex];
        if (!point) {
          continue;
        }
        ctx.lineTo(point.x, point.y);
      }
    }

    hasActivePath = true;
  });

  flushPath();
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
};

type RedrawKangurCanvasStrokesOptions<TMeta> = {
  activeStroke?: KangurDrawingStroke<TMeta> | null;
  backgroundFill?: string;
  baseLayerCache?: {
    current: KangurDrawingCanvasBaseLayerCache | null;
  };
  baseLayerCacheKey?: number | string | null;
  beforeStrokes?: (ctx: CanvasRenderingContext2D) => void;
  canvas: HTMLCanvasElement | null;
  logicalHeight: number;
  logicalWidth: number;
  resolveStyle: (
    stroke: KangurDrawingStroke<TMeta>,
    index: number
  ) => KangurDrawingStrokeRenderStyle;
  strokeLayerCache?: {
    current: KangurDrawingCanvasStrokeLayerCache<TMeta> | null;
  };
  strokes: KangurDrawingStroke<TMeta>[];
};

const drawKangurCanvasBaseLayer = ({
  backgroundFill,
  beforeStrokes,
  ctx,
  logicalHeight,
  logicalWidth,
}: {
  backgroundFill?: string;
  beforeStrokes?: (ctx: CanvasRenderingContext2D) => void;
  ctx: CanvasRenderingContext2D;
  logicalHeight: number;
  logicalWidth: number;
}): void => {
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);
  if (backgroundFill) {
    ctx.fillStyle = backgroundFill;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
  }
  beforeStrokes?.(ctx);
};

export const redrawKangurCanvasStrokes = <TMeta>({
  activeStroke = null,
  backgroundFill,
  baseLayerCache,
  baseLayerCacheKey,
  beforeStrokes,
  canvas,
  logicalHeight,
  logicalWidth,
  resolveStyle,
  strokeLayerCache,
  strokes,
}: RedrawKangurCanvasStrokesOptions<TMeta>): void => {
  if (!canvas) {
    return;
  }

  const ctx = syncKangurCanvasContext(canvas, logicalWidth, logicalHeight);
  if (!ctx) {
    return;
  }

  if (baseLayerCache && baseLayerCacheKey !== undefined) {
    const cachedLayer = baseLayerCache.current;
    const shouldRefreshBaseLayer =
      cachedLayer?.key !== baseLayerCacheKey ||
      cachedLayer?.logicalWidth !== logicalWidth ||
      cachedLayer?.logicalHeight !== logicalHeight;

    if (shouldRefreshBaseLayer) {
      const nextBaseCanvas = cachedLayer?.canvas ?? document.createElement('canvas');
      const baseCtx = syncKangurCanvasContext(nextBaseCanvas, logicalWidth, logicalHeight);
      if (baseCtx) {
        drawKangurCanvasBaseLayer({
          backgroundFill,
          beforeStrokes,
          ctx: baseCtx,
          logicalHeight,
          logicalWidth,
        });
      }
      baseLayerCache.current = {
        canvas: nextBaseCanvas,
        key: baseLayerCacheKey,
        logicalHeight,
        logicalWidth,
      };
    }

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    const nextCachedLayer = baseLayerCache.current;
    if (nextCachedLayer) {
      ctx.drawImage && ctx.drawImage(nextCachedLayer.canvas, 0, 0, logicalWidth, logicalHeight);
    }
  } else {
    drawKangurCanvasBaseLayer({
      backgroundFill,
      beforeStrokes,
      ctx,
      logicalHeight,
      logicalWidth,
    });
  }

  if (strokeLayerCache) {
    const cachedStrokeLayer = strokeLayerCache.current;
    const shouldRefreshStrokeLayer =
      cachedStrokeLayer?.strokes !== strokes ||
      cachedStrokeLayer?.resolveStyle !== resolveStyle ||
      cachedStrokeLayer?.logicalWidth !== logicalWidth ||
      cachedStrokeLayer?.logicalHeight !== logicalHeight;

    if (strokes.length === 0) {
      strokeLayerCache.current = null;
    } else if (shouldRefreshStrokeLayer) {
      const nextStrokeCanvas = cachedStrokeLayer?.canvas ?? document.createElement('canvas');
      const strokeCtx = syncKangurCanvasContext(nextStrokeCanvas, logicalWidth, logicalHeight);

      if (strokeCtx) {
        strokeCtx.clearRect(0, 0, logicalWidth, logicalHeight);
        renderKangurDrawingStrokes(strokeCtx, strokes, resolveStyle);
      }

      strokeLayerCache.current = {
        canvas: nextStrokeCanvas,
        logicalHeight,
        logicalWidth,
        resolveStyle,
        strokes,
      };
    }

    const nextCachedStrokeLayer = strokeLayerCache.current;
    if (nextCachedStrokeLayer) {
      ctx.drawImage && ctx.drawImage(nextCachedStrokeLayer.canvas, 0, 0, logicalWidth, logicalHeight);
    }
  } else {
    renderKangurDrawingStrokes(ctx, strokes, resolveStyle);
  }

  if (activeStroke) {
    renderKangurDrawingStrokes(ctx, [activeStroke], (stroke) =>
      resolveStyle(stroke, strokes.length)
    );
  }
};
