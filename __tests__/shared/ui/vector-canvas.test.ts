import { describe, expect, it } from 'vitest';

import { resolveRectDragPoints, resolveRectResizePoints } from '@/shared/ui/vector-canvas';

describe('resolveRectDragPoints', () => {
  it('returns anchor and pointer when no modifiers are active', () => {
    const anchor = { x: 0.2, y: 0.3 };
    const pointer = { x: 0.8, y: 0.9 };

    const [first, second] = resolveRectDragPoints(anchor, pointer);

    expect(first).toEqual(anchor);
    expect(second).toEqual(pointer);
  });

  it('draws a centered rectangle when Alt is held', () => {
    const anchor = { x: 0.5, y: 0.5 };
    const pointer = { x: 0.8, y: 0.7 };

    const [first, second] = resolveRectDragPoints(anchor, pointer, {
      scaleFromCenter: true,
      lockSquare: false,
    });

    expect(first.x).toBeCloseTo(0.2);
    expect(first.y).toBeCloseTo(0.3);
    expect(second.x).toBeCloseTo(0.8);
    expect(second.y).toBeCloseTo(0.7);
  });

  it('draws a centered square when Alt+Shift are held', () => {
    const anchor = { x: 0.5, y: 0.5 };
    const pointer = { x: 0.8, y: 0.7 };

    const [first, second] = resolveRectDragPoints(anchor, pointer, {
      scaleFromCenter: true,
      lockSquare: true,
    });

    expect((first.x + second.x) / 2).toBeCloseTo(anchor.x);
    expect((first.y + second.y) / 2).toBeCloseTo(anchor.y);
    expect(Math.abs(second.x - first.x)).toBeCloseTo(Math.abs(second.y - first.y));
    expect(Math.abs(second.x - first.x)).toBeLessThan(0.2);
  });

  it('clamps Alt+Shift square drawing to canvas bounds', () => {
    const anchor = { x: 0.9, y: 0.9 };
    const pointer = { x: 1, y: 1 };

    const [first, second] = resolveRectDragPoints(anchor, pointer, {
      scaleFromCenter: true,
      lockSquare: true,
    });

    expect(first.x).toBeCloseTo(0.8);
    expect(first.y).toBeCloseTo(0.8);
    expect(second.x).toBeCloseTo(1);
    expect(second.y).toBeCloseTo(1);
    expect(Math.abs(second.x - first.x)).toBeCloseTo(Math.abs(second.y - first.y));
  });

  it('uses viewport dimensions to keep Alt+Shift square sizing predictable', () => {
    const anchor = { x: 0.5, y: 0.5 };
    const pointer = { x: 0.8, y: 0.7 };

    const [first, second] = resolveRectDragPoints(anchor, pointer, {
      scaleFromCenter: true,
      lockSquare: true,
      viewportWidth: 1600,
      viewportHeight: 800,
    });

    expect((first.x + second.x) / 2).toBeCloseTo(anchor.x);
    expect((first.y + second.y) / 2).toBeCloseTo(anchor.y);

    const widthPx = Math.abs(second.x - first.x) * 1600;
    const heightPx = Math.abs(second.y - first.y) * 800;
    expect(widthPx).toBeCloseTo(heightPx);
    expect(widthPx).toBeLessThan(140);
  });

  it('resizes an existing rect from center when Alt+Shift are held', () => {
    const points = [{ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 }];
    const pointer = { x: 0.75, y: 0.65 };

    const resized = resolveRectResizePoints(points, 1, pointer, {
      scaleFromCenter: true,
      lockSquare: true,
      centeredSquareExponent: 1,
      viewportWidth: 1200,
      viewportHeight: 800,
    });

    expect(resized).not.toBeNull();
    const [first, second] = resized!;
    expect((first.x + second.x) / 2).toBeCloseTo(0.5);
    expect((first.y + second.y) / 2).toBeCloseTo(0.5);
    const widthPx = Math.abs(second.x - first.x) * 1200;
    const heightPx = Math.abs(second.y - first.y) * 800;
    expect(widthPx).toBeCloseTo(heightPx);
    expect(widthPx).toBeGreaterThan(200);
  });

  it('resizes an existing rect proportionally from opposite corner when Shift is held', () => {
    const points = [{ x: 0.2, y: 0.2 }, { x: 0.4, y: 0.5 }];
    const pointer = { x: 0.7, y: 0.8 };

    const resized = resolveRectResizePoints(points, 1, pointer, {
      scaleFromCenter: false,
      lockSquare: true,
      viewportWidth: 1000,
      viewportHeight: 1000,
    });

    expect(resized).not.toBeNull();
    const [first, second] = resized!;
    expect(first).toEqual(points[0]);
    expect(Math.abs(second.x - first.x)).toBeCloseTo(Math.abs(second.y - first.y));
    expect(second.x).toBeCloseTo(0.7);
    expect(second.y).toBeCloseTo(0.7);
  });
});
