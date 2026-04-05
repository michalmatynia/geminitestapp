import { describe, expect, it } from 'vitest';

import type { VectorShape } from '@/shared/lib/vector-drawing';

import {
  applyCanvasResizeLocalTransform,
  computeCanvasResizeShiftPx,
  remapMaskShapesForCanvasResize,
  resolveImageOffsetForCanvasResize,
} from '../canvas-resize';

describe('canvas-resize utilities', () => {
  it('computes directional shift for canvas extension', () => {
    expect(
      computeCanvasResizeShiftPx({
        oldCanvasWidth: 100,
        oldCanvasHeight: 100,
        newCanvasWidth: 120,
        newCanvasHeight: 140,
        direction: 'down-right',
      })
    ).toEqual({ x: 0, y: 0 });

    expect(
      computeCanvasResizeShiftPx({
        oldCanvasWidth: 100,
        oldCanvasHeight: 100,
        newCanvasWidth: 120,
        newCanvasHeight: 140,
        direction: 'up-left',
      })
    ).toEqual({ x: 20, y: 40 });

    expect(
      computeCanvasResizeShiftPx({
        oldCanvasWidth: 100,
        oldCanvasHeight: 100,
        newCanvasWidth: 120,
        newCanvasHeight: 140,
        direction: 'invalid' as never,
      })
    ).toEqual({ x: 0, y: 0 });
  });

  it('remaps normalized mask points to preserve canvas-space position', () => {
    const shapes: VectorShape[] = [
      {
        id: 'shape-1',
        name: 'Rect 1',
        type: 'rect',
        role: 'custom',
        style: {},
        points: [
          { x: 0.5, y: 0.5 },
          { x: 0.8, y: 0.9 },
        ],
        closed: true,
        visible: true,
      },
    ];

    const resized = remapMaskShapesForCanvasResize(shapes, {
      oldCanvasWidth: 100,
      oldCanvasHeight: 100,
      newCanvasWidth: 120,
      newCanvasHeight: 140,
      direction: 'down-right',
    });

    expect(resized[0]?.points[0]?.x).toBeCloseTo(50 / 120, 6);
    expect(resized[0]?.points[0]?.y).toBeCloseTo(50 / 140, 6);
    expect(resized[0]?.points[1]?.x).toBeCloseTo(80 / 120, 6);
    expect(resized[0]?.points[1]?.y).toBeCloseTo(90 / 140, 6);
  });

  it('recomputes image offset for extend-right canvas growth', () => {
    const nextOffset = resolveImageOffsetForCanvasResize({
      oldCanvasWidth: 1000,
      oldCanvasHeight: 1000,
      newCanvasWidth: 1200,
      newCanvasHeight: 1000,
      direction: 'right',
      currentOffset: { x: 0, y: 0 },
      currentImageFrame: {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      },
      sourceAspectRatio: 1,
    });

    expect(nextOffset.x).toBeCloseTo(-100, 6);
    expect(nextOffset.y).toBeCloseTo(0, 6);
  });

  it('applies combined shape and image transforms', () => {
    const shapes: VectorShape[] = [
      {
        id: 'shape-2',
        name: 'Point',
        type: 'polygon',
        role: 'custom',
        style: {},
        points: [
          { x: 0.25, y: 0.25 },
          { x: 0.3, y: 0.25 },
          { x: 0.3, y: 0.3 },
        ],
        closed: true,
        visible: true,
      },
    ];

    const result = applyCanvasResizeLocalTransform({
      shapes,
      oldCanvasWidth: 100,
      oldCanvasHeight: 100,
      newCanvasWidth: 120,
      newCanvasHeight: 100,
      direction: 'left',
      currentImageOffset: { x: 0, y: 0 },
      sourceAspectRatio: 1,
      currentImageFrame: {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      },
    });

    expect(result.shiftPx).toEqual({ x: 20, y: 0 });
    expect(result.shapes[0]?.points[0]?.x).toBeCloseTo((25 + 20) / 120, 6);
    expect(result.shapes[0]?.points[0]?.y).toBeCloseTo(0.25, 6);
    expect(result.imageOffset.x).toBeCloseTo(10, 6);
  });
});
