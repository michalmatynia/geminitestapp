import { type ImageStudioCenterObjectBounds } from '@/shared/contracts/image-studio';
import { IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD } from '@/shared/contracts/image-studio';
import { type PixelData } from './types';

export const resolveAlphaObjectBoundsFromRgba = (
  pixelData: PixelData,
  width: number,
  height: number
): ImageStudioCenterObjectBounds | null => {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = pixelData[(y * width + x) * 4 + 3];
      if (typeof a === 'number' && a > IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return {
    left: minX,
    top: minY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  };
};
