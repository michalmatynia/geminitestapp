import type { Point2d } from '@/shared/contracts/geometry';

type PointerLike = {
  clientX: number;
  clientY: number;
};

const resolveRenderSize = (
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number
): { width: number; height: number } => {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width > 0 ? rect.width : logicalWidth;
  const height = rect.height > 0 ? rect.height : logicalHeight;
  return { width, height };
};

const resolveCanvasDevicePixelRatio = (): number =>
  typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

const syncCanvasBitmapSize = (
  canvas: HTMLCanvasElement,
  nextWidth: number,
  nextHeight: number
): void => {
  if (canvas.width === nextWidth && canvas.height === nextHeight) {
    return;
  }

  canvas.width = nextWidth;
  canvas.height = nextHeight;
};

const applyCanvasContextScale = (
  ctx: CanvasRenderingContext2D,
  scaleX: number,
  scaleY: number,
  dpr: number
): void => {
  if (typeof ctx.setTransform === 'function') {
    ctx.setTransform(scaleX * dpr, 0, 0, scaleY * dpr, 0, 0);
    return;
  }

  if (typeof ctx.resetTransform === 'function') {
    ctx.resetTransform();
  }
  if (typeof ctx.scale === 'function') {
    ctx.scale(scaleX * dpr, scaleY * dpr);
  }
};

export const syncKangurCanvasContext = (
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number
): CanvasRenderingContext2D | null => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const { width, height } = resolveRenderSize(canvas, logicalWidth, logicalHeight);
  const dpr = resolveCanvasDevicePixelRatio();
  const nextWidth = Math.round(width * dpr);
  const nextHeight = Math.round(height * dpr);
  syncCanvasBitmapSize(canvas, nextWidth, nextHeight);

  const scaleX = width / logicalWidth;
  const scaleY = height / logicalHeight;
  applyCanvasContextScale(ctx, scaleX, scaleY, dpr);
  return ctx;
};

export const resolveKangurCanvasPoint = (
  event: PointerLike,
  surface: Pick<HTMLElement, 'getBoundingClientRect'> | Pick<SVGElement, 'getBoundingClientRect'>,
  logicalWidth: number,
  logicalHeight: number
): Point2d => {
  const rect = surface.getBoundingClientRect();
  const width = rect.width > 0 ? rect.width : logicalWidth;
  const height = rect.height > 0 ? rect.height : logicalHeight;
  const scaleX = logicalWidth / width;
  const scaleY = logicalHeight / height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
};
