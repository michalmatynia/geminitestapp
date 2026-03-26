import type { Point2d } from '@/shared/contracts/geometry';

export type KangurDrawingStroke<TMeta = undefined> = {
  meta: TMeta;
  points: Point2d[];
};

export type KangurDrawingStrokeRenderStyle = {
  compositeOperation?: GlobalCompositeOperation;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  lineWidth: number;
  shadowBlur?: number;
  shadowColor?: string;
  strokeStyle: string;
};

export const mapKangurDrawingStrokesToPoints = <TMeta>(
  strokes: KangurDrawingStroke<TMeta>[]
): Point2d[][] => strokes.map((stroke) => stroke.points);
