import type {
  SymmetryAxis,
  SymmetryExpectedSide,
} from '@/features/kangur/ui/services/geometry-symmetry';

import type { ShapeBounds, TemplateShape } from './GeometrySymmetryGame.types';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GRID_STEP,
  flattenPaths,
  mirrorShape,
} from './GeometrySymmetryGame.data';

export const computeShapeBounds = (shape: TemplateShape): ShapeBounds => {
  const points = flattenPaths(shape);
  if (points.length === 0) {
    return { minX: 16, maxX: CANVAS_WIDTH - 16, minY: 16, maxY: CANVAS_HEIGHT - 16 };
  }
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
  const padding = 10;
  const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));
  return {
    minX: clamp(minX - padding, 8, CANVAS_WIDTH - 8),
    maxX: clamp(maxX + padding, 8, CANVAS_WIDTH - 8),
    minY: clamp(minY - padding, 8, CANVAS_HEIGHT - 8),
    maxY: clamp(maxY + padding, 8, CANVAS_HEIGHT - 8),
  };
};

export const drawGrid = (ctx: CanvasRenderingContext2D): void => {
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let x = GRID_STEP; x < CANVAS_WIDTH; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = GRID_STEP; y < CANVAS_HEIGHT; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
};

export const drawShape = (
  ctx: CanvasRenderingContext2D,
  shape: TemplateShape,
  strokeStyle: string,
  lineWidth = 4,
  dashed = false
): void => {
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (dashed) {
    ctx.setLineDash([6, 6]);
  }
  for (const path of shape.paths) {
    if (path.points.length === 0) continue;
    ctx.beginPath();
    const [first] = path.points;
    if (!first) continue;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < path.points.length; i += 1) {
      const point = path.points[i];
      if (!point) continue;
      ctx.lineTo(point.x, point.y);
    }
    if (path.closed) {
      ctx.closePath();
    }
    ctx.stroke();
  }
  ctx.restore();
};

export const drawAxis = (ctx: CanvasRenderingContext2D, axis: SymmetryAxis): void => {
  ctx.save();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  if (axis.orientation === 'vertical') {
    ctx.moveTo(axis.position, 16);
    ctx.lineTo(axis.position, CANVAS_HEIGHT - 16);
  } else {
    ctx.moveTo(16, axis.position);
    ctx.lineTo(CANVAS_WIDTH - 16, axis.position);
  }
  ctx.stroke();
  ctx.restore();
};

export const drawAxisCorridor = (
  ctx: CanvasRenderingContext2D,
  axis: SymmetryAxis,
  bounds: ShapeBounds
): void => {
  const corridorWidth = 12;
  const half = corridorWidth / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  if (axis.orientation === 'vertical') {
    ctx.fillRect(axis.position - half, bounds.minY, corridorWidth, bounds.maxY - bounds.minY);
  } else {
    ctx.fillRect(bounds.minX, axis.position - half, bounds.maxX - bounds.minX, corridorWidth);
  }

  const drawMarker = (x: number, y: number): void => {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  if (axis.orientation === 'vertical') {
    drawMarker(axis.position, bounds.minY);
    drawMarker(axis.position, bounds.maxY);
  } else {
    drawMarker(bounds.minX, axis.position);
    drawMarker(bounds.maxX, axis.position);
  }
  ctx.restore();
};

export const drawTargetZone = (
  ctx: CanvasRenderingContext2D,
  axis: SymmetryAxis,
  expectedSide: SymmetryExpectedSide,
  { shadeOpposite = true }: { shadeOpposite?: boolean } = {}
): void => {
  ctx.save();
  const drawZone = (x: number, y: number, width: number, height: number): void => {
    ctx.fillRect(x, y, width, height);
  };
  const drawHatch = (x: number, y: number, width: number, height: number): void => {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    const step = 14;
    for (let offset = -height; offset < width; offset += step) {
      ctx.beginPath();
      ctx.moveTo(x + offset, y + height);
      ctx.lineTo(x + offset + height, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  if (axis.orientation === 'vertical') {
    const leftWidth = axis.position;
    const rightWidth = CANVAS_WIDTH - axis.position;
    if (shadeOpposite) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.016)';
      if (expectedSide === 'right') {
        drawZone(0, 0, leftWidth, CANVAS_HEIGHT);
        drawHatch(0, 0, leftWidth, CANVAS_HEIGHT);
      } else {
        drawZone(axis.position, 0, rightWidth, CANVAS_HEIGHT);
        drawHatch(axis.position, 0, rightWidth, CANVAS_HEIGHT);
      }
    }
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    if (expectedSide === 'right') {
      drawZone(axis.position, 0, rightWidth, CANVAS_HEIGHT);
    } else {
      drawZone(0, 0, leftWidth, CANVAS_HEIGHT);
    }
    ctx.restore();
    return;
  }

  const topHeight = axis.position;
  const bottomHeight = CANVAS_HEIGHT - axis.position;
  if (shadeOpposite) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.016)';
    if (expectedSide === 'bottom') {
      drawZone(0, 0, CANVAS_WIDTH, topHeight);
      drawHatch(0, 0, CANVAS_WIDTH, topHeight);
    } else {
      drawZone(0, axis.position, CANVAS_WIDTH, bottomHeight);
      drawHatch(0, axis.position, CANVAS_WIDTH, bottomHeight);
    }
  }
  ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
  if (expectedSide === 'bottom') {
    drawZone(0, axis.position, CANVAS_WIDTH, CANVAS_HEIGHT - axis.position);
  } else {
    drawZone(0, 0, CANVAS_WIDTH, axis.position);
  }
  ctx.restore();
};

export const drawGhostShape = (
  ctx: CanvasRenderingContext2D,
  shape: TemplateShape,
  axis: SymmetryAxis
): void => {
  drawShape(ctx, mirrorShape(shape, axis), '#34d399', 3, true);
};
