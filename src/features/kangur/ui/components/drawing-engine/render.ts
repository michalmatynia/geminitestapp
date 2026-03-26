import type { KangurDrawingStroke, KangurDrawingStrokeRenderStyle } from './types';

const DEFAULT_LINE_CAP: CanvasLineCap = 'round';
const DEFAULT_LINE_JOIN: CanvasLineJoin = 'round';

export const renderKangurDrawingStrokes = <TMeta>(
  ctx: CanvasRenderingContext2D,
  strokes: KangurDrawingStroke<TMeta>[],
  resolveStyle: (
    stroke: KangurDrawingStroke<TMeta>,
    index: number
  ) => KangurDrawingStrokeRenderStyle
): void => {
  strokes.forEach((stroke, index) => {
    if (stroke.points.length === 0) {
      return;
    }

    const style = resolveStyle(stroke, index);
    const firstPoint = stroke.points[0];
    if (!firstPoint) {
      return;
    }

    ctx.beginPath();
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = style.lineCap ?? DEFAULT_LINE_CAP;
    ctx.lineJoin = style.lineJoin ?? DEFAULT_LINE_JOIN;
    ctx.strokeStyle = style.strokeStyle;
    ctx.shadowColor = style.shadowColor ?? 'transparent';
    ctx.shadowBlur = style.shadowBlur ?? 0;
    ctx.globalCompositeOperation = style.compositeOperation ?? 'source-over';
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let pointIndex = 1; pointIndex < stroke.points.length; pointIndex += 1) {
      const point = stroke.points[pointIndex];
      if (!point) {
        continue;
      }
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
  });

  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
};
