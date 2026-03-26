import type { Point2d } from '@/shared/contracts/geometry';

export type KangurDrawingStroke<TMeta = undefined> = {
  meta: TMeta;
  points: Point2d[];
};

export type KangurFreeformDrawingTool = 'pen' | 'eraser';

export type KangurFreeformDrawingStrokeMeta = {
  color: string;
  isEraser: boolean;
  width: number;
};

export type KangurDrawingStrokeRenderMode = 'polyline' | 'smooth';

export type KangurDrawingStrokeRenderStyle = {
  compositeOperation?: GlobalCompositeOperation;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  lineWidth: number;
  renderMode?: KangurDrawingStrokeRenderMode;
  shadowBlur?: number;
  shadowColor?: string;
  strokeStyle: string;
};

export const mapKangurDrawingStrokesToPoints = <TMeta>(
  strokes: KangurDrawingStroke<TMeta>[]
): Point2d[][] => strokes.map((stroke) => stroke.points);
