import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
} from '../constants';

export const clampScale = (value: number): number =>
  Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));

export const clampTranslate = (
  value: { x: number; y: number },
  scale: number
): { x: number; y: number } => {
  const scaledWidth = CANVAS_WIDTH * scale;
  const scaledHeight = CANVAS_HEIGHT * scale;
  const minX = -scaledWidth;
  const maxX = CANVAS_WIDTH;
  const minY = -scaledHeight;
  const maxY = CANVAS_HEIGHT;
  return {
    x: Math.max(minX, Math.min(maxX, value.x)),
    y: Math.max(minY, Math.min(maxY, value.y)),
  };
};
