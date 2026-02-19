import { describe, expect, it } from 'vitest';

import {
  normalizeCenterLayoutConfig,
  polygonsFromShapes,
  resolveCropRectFromShapesWithDiagnostics,
  type ImageContentFrame,
  type MaskShapeForExport,
} from '../GenerationToolbarImageUtils';

const IMAGE_FRAME: ImageContentFrame = {
  x: 1 / 6,
  y: 0,
  width: 2 / 3,
  height: 1,
};

describe('GenerationToolbarImageUtils coordinate mapping', () => {
  it('maps rectangle crop bounds from canvas-space to image-space', () => {
    const shapes: MaskShapeForExport[] = [
      {
        id: 'rect-1',
        type: 'rect',
        points: [{ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 }],
        closed: true,
        visible: true,
      },
    ];

    const result = resolveCropRectFromShapesWithDiagnostics(
      shapes,
      1617,
      2420,
      'rect-1',
      IMAGE_FRAME
    );

    expect(result.cropRect).toEqual({
      x: 202,
      y: 605,
      width: 1213,
      height: 1210,
    });
    expect(result.diagnostics?.usedImageContentFrameMapping).toBe(true);
    expect(result.diagnostics?.rawCanvasBounds?.width).toBeLessThan(
      result.diagnostics?.mappedImageBounds?.width ?? 0
    );
  });

  it('rejects crop when selected shape is fully outside the image content frame', () => {
    const shapes: MaskShapeForExport[] = [
      {
        id: 'rect-outside',
        type: 'rect',
        points: [{ x: 0.02, y: 0.2 }, { x: 0.1, y: 0.8 }],
        closed: true,
        visible: true,
      },
    ];

    const result = resolveCropRectFromShapesWithDiagnostics(
      shapes,
      1617,
      2420,
      'rect-outside',
      IMAGE_FRAME
    );

    expect(result.cropRect).toBeNull();
    expect(result.diagnostics?.usedImageContentFrameMapping).toBe(true);
    expect(result.diagnostics?.rawCanvasBounds).not.toBeNull();
    expect(result.diagnostics?.mappedImageBounds).toBeNull();
  });

  it('maps mask polygons through the same frame transform', () => {
    const shapes: MaskShapeForExport[] = [
      {
        id: 'poly-1',
        type: 'polygon',
        points: [
          { x: 0.25, y: 0.3 },
          { x: 0.5, y: 0.7 },
          { x: 0.75, y: 0.3 },
        ],
        closed: true,
        visible: true,
      },
    ];

    const polygons = polygonsFromShapes(shapes, 1000, 1000, {
      imageContentFrame: IMAGE_FRAME,
    });

    expect(polygons).toHaveLength(1);
    expect(polygons[0]?.[0]?.x ?? 0).toBeCloseTo(0.125, 5);
    expect(polygons[0]?.[0]?.y ?? 0).toBeCloseTo(0.3, 5);
    expect(polygons[0]?.[2]?.x ?? 0).toBeCloseTo(0.875, 5);
  });

  it('normalizes object layout config defaults and clamps', () => {
    expect(normalizeCenterLayoutConfig(null)).toEqual({
      paddingPercent: 8,
      paddingXPercent: 8,
      paddingYPercent: 8,
      fillMissingCanvasWhite: false,
      targetCanvasWidth: null,
      targetCanvasHeight: null,
      whiteThreshold: 16,
      chromaThreshold: 10,
      detection: 'auto',
    });

    expect(
      normalizeCenterLayoutConfig({
        paddingPercent: 200,
        paddingXPercent: 6,
        paddingYPercent: 14,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 2000.9,
        targetCanvasHeight: 4000.1,
        whiteThreshold: 0,
        chromaThreshold: 900,
        detection: 'white_bg_first_colored_pixel',
      })
    ).toEqual({
      paddingPercent: 40,
      paddingXPercent: 6,
      paddingYPercent: 14,
      fillMissingCanvasWhite: true,
      targetCanvasWidth: 2000,
      targetCanvasHeight: 4000,
      whiteThreshold: 1,
      chromaThreshold: 80,
      detection: 'white_bg_first_colored_pixel',
    });
  });
});
