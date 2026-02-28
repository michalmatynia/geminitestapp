import { describe, expect, it } from 'vitest';

import {
  hasCanvasOverflowFromImageFrame,
  mapImageCropRectToCanvasRect,
  normalizeCenterLayoutConfig,
  polygonsFromShapes,
  resolveCanvasOverflowCropRect,
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
        points: [
          { x: 0.25, y: 0.25 },
          { x: 0.75, y: 0.75 },
        ],
        closed: true,
        visible: true,
      },
    ];

    const result = resolveCropRectFromShapesWithDiagnostics(
      shapes,
      1617,
      2420,
      1617,
      2420,
      'rect-1',
      IMAGE_FRAME
    );

    expect(result.cropRect).toEqual({
      x: 202,
      y: 605,
      width: 1214,
      height: 1210,
    });
    expect(result.diagnostics?.usedImageContentFrameMapping).toBe(true);
    expect(result.diagnostics?.rawCanvasBounds?.width).toBeLessThan(
      result.diagnostics?.mappedImageBounds?.width ?? 0
    );
  });

  it('keeps canvas-space crop even when selected shape is outside the image content frame', () => {
    const shapes: MaskShapeForExport[] = [
      {
        id: 'rect-outside',
        type: 'rect',
        points: [
          { x: 0.02, y: 0.2 },
          { x: 0.1, y: 0.8 },
        ],
        closed: true,
        visible: true,
      },
    ];

    const result = resolveCropRectFromShapesWithDiagnostics(
      shapes,
      1617,
      2420,
      1617,
      2420,
      'rect-outside',
      IMAGE_FRAME
    );

    expect(result.cropRect).toEqual({
      x: 32,
      y: 484,
      width: 130,
      height: 1453,
    });
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

  it('maps image-space crop rectangles into canvas-space frame coordinates', () => {
    const mapped = mapImageCropRectToCanvasRect(
      { x: 100, y: 50, width: 400, height: 250 },
      1000,
      500,
      {
        canvasWidth: 800,
        canvasHeight: 800,
        imageFrame: {
          x: 0.1,
          y: 0.2,
          width: 0.5,
          height: 0.25,
        },
      }
    );

    expect(mapped).toEqual({
      x: 120,
      y: 180,
      width: 160,
      height: 100,
    });
  });

  it('clips mapped canvas-space crop rectangles to the canvas bounds', () => {
    const mapped = mapImageCropRectToCanvasRect(
      { x: 0, y: 0, width: 300, height: 400 },
      1000,
      1000,
      {
        canvasWidth: 1000,
        canvasHeight: 1000,
        imageFrame: {
          x: -0.2,
          y: 0,
          width: 1,
          height: 1,
        },
      }
    );

    expect(mapped).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 400,
    });
  });

  it('detects canvas overflow from moved image frame', () => {
    expect(
      hasCanvasOverflowFromImageFrame({
        x: -0.1,
        y: 0.1,
        width: 0.8,
        height: 0.8,
      })
    ).toBe(true);
    expect(
      hasCanvasOverflowFromImageFrame({
        x: 0.1,
        y: 0.1,
        width: 0.8,
        height: 0.8,
      })
    ).toBe(false);
  });

  it('resolves full-canvas crop rect when image overflows canvas bounds', () => {
    const cropRect = resolveCanvasOverflowCropRect({
      canvasWidth: 1600,
      canvasHeight: 1200,
      imageFrame: {
        x: -0.2,
        y: 0,
        width: 1,
        height: 1,
      },
      imageContentFrame: {
        x: -0.2,
        y: 0,
        width: 1,
        height: 1,
      },
    });

    expect(cropRect).toEqual({
      x: 0,
      y: 0,
      width: 1280,
      height: 1200,
    });
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
      shadowPolicy: 'auto',
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
      shadowPolicy: 'auto',
      detection: 'white_bg_first_colored_pixel',
    });
  });
});
