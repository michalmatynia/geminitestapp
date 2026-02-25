import {
  type MaskShapeForExport,
  type ImageContentFrame,
} from './GenerationToolbarImageUtils.types';
import { normalizeImageContentFrame } from './GenerationToolbarImageUtils.helpers';

export const polygonsFromShapes = (
  shapes: MaskShapeForExport[],
  width: number,
  height: number,
  options?: { imageFrame?: ImageContentFrame | null }
): Array<Array<{ x: number; y: number }>> => {
  const normalizedFrame = normalizeImageContentFrame(options?.imageFrame);
  return shapes
    .filter((shape) => shape.visible && (shape.type === 'rect' || shape.type === 'ellipse' || (shape.closed && shape.points.length >= 3)))
    .map((shape) => {
      const points = shape.points.map((p) => {
        let absX = p.x * width;
        let absY = p.y * height;
        if (normalizedFrame) {
          // If points are relative to canvas, map them to image relative
          const relX = (p.x * width - normalizedFrame.x) / normalizedFrame.width;
          const relY = (p.y * height - normalizedFrame.y) / normalizedFrame.height;
          absX = relX * width;
          absY = relY * height;
        }
        return { x: Math.round(absX), y: Math.round(absY) };
      });
      return points;
    });
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
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context.');

  const bg = inverted ? (variant === 'white' ? 'white' : 'black') : (variant === 'white' ? 'black' : 'white');
  const fg = inverted ? (variant === 'white' ? 'black' : 'white') : (variant === 'white' ? 'white' : 'black');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = fg;
  polygons.forEach((poly) => {
    if (poly.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(poly[0]!.x, poly[0]!.y);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i]!.x, poly[i]!.y);
    }
    ctx.closePath();
    ctx.fill();
  });

  return canvas.toDataURL('image/png');
};
