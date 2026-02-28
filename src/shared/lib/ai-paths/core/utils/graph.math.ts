import { CANVAS_HEIGHT, CANVAS_WIDTH, MAX_SCALE, MIN_SCALE, VIEW_MARGIN } from '../constants';

export const clampScale = (value: number): number =>
  Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));

export const clampTranslate = (
  x: number,
  y: number,
  scale: number,
  viewport: { width: number; height: number } | null
): { x: number; y: number } => {
  if (!viewport) return { x, y };

  const scaledWidth = CANVAS_WIDTH * scale;
  const scaledHeight = CANVAS_HEIGHT * scale;

  // Boundary calculations: allow panning such that at least a margin of the canvas is always visible
  // or that the canvas can't be panned entirely out of view.
  const minX = viewport.width - scaledWidth - VIEW_MARGIN;
  const maxX = VIEW_MARGIN;
  const minY = viewport.height - scaledHeight - VIEW_MARGIN;
  const maxY = VIEW_MARGIN;

  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
};
