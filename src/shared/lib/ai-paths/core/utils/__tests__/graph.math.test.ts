import { describe, it, expect } from 'vitest';
import { clampScale, clampTranslate } from '../graph.math';
import { MIN_SCALE, MAX_SCALE, VIEW_MARGIN, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../constants';

describe('Graph Math Utilities', () => {
  describe('clampScale', () => {
    it('clumps values within MIN_SCALE and MAX_SCALE', () => {
      expect(clampScale(MIN_SCALE - 0.1)).toBe(MIN_SCALE);
      expect(clampScale(MAX_SCALE + 0.1)).toBe(MAX_SCALE);
      expect(clampScale((MIN_SCALE + MAX_SCALE) / 2)).toBe((MIN_SCALE + MAX_SCALE) / 2);
    });
  });

  describe('clampTranslate', () => {
    const viewport = { width: 1000, height: 800 };
    const scale = 1;

    it('returns original values if viewport is null', () => {
      expect(clampTranslate(100, 200, 1, null)).toEqual({ x: 100, y: 200 });
    });

    it('clamps translation within calculated boundaries', () => {
      // CANVAS_WIDTH = 8800, VIEW_MARGIN = 40
      // scaledWidth = 8800, scaledHeight = 5600
      // minX = 1000 - 8800 - 40 = -7840
      // maxX = 40
      
      const result1 = clampTranslate(500, 500, scale, viewport);
      expect(result1.x).toBe(VIEW_MARGIN);
      expect(result1.y).toBe(VIEW_MARGIN);

      const result2 = clampTranslate(-10000, -10000, scale, viewport);
      const minX = viewport.width - CANVAS_WIDTH * scale - VIEW_MARGIN;
      const minY = viewport.height - CANVAS_HEIGHT * scale - VIEW_MARGIN;
      
      expect(result2.x).toBe(minX);
      expect(result2.y).toBe(minY);
    });
  });
});
