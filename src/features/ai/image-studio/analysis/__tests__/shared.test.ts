import { describe, expect, it } from 'vitest';

import {
  analyzeImageObjectFromRgba,
  detectObjectBoundsForLayoutFromRgba,
  normalizeImageStudioAnalysisLayoutConfig,
} from '@/features/ai/image-studio/analysis/shared';

const createWhiteCanvas = (width: number, height: number): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
  return data;
};

const paintRect = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  rect: { left: number; top: number; width: number; height: number },
  color: { r: number; g: number; b: number; a?: number }
): void => {
  const right = Math.min(width, rect.left + rect.width);
  const bottom = Math.min(height, rect.top + rect.height);
  for (let y = Math.max(0, rect.top); y < bottom; y += 1) {
    for (let x = Math.max(0, rect.left); x < right; x += 1) {
      const offset = ((y * width) + x) * 4;
      data[offset] = color.r;
      data[offset + 1] = color.g;
      data[offset + 2] = color.b;
      data[offset + 3] = color.a ?? 255;
    }
  }
};

describe('image-studio analysis shared', () => {
  it('normalizes layout with shadow policy defaults', () => {
    expect(
      normalizeImageStudioAnalysisLayoutConfig({
        paddingXPercent: 6,
        paddingYPercent: 10,
      })
    ).toEqual({
      paddingPercent: 8,
      paddingXPercent: 6,
      paddingYPercent: 10,
      fillMissingCanvasWhite: false,
      targetCanvasWidth: null,
      targetCanvasHeight: null,
      whiteThreshold: 16,
      chromaThreshold: 10,
      shadowPolicy: 'auto',
      detection: 'auto',
    });
  });

  it('detects white-background object and supports include/exclude shadow policy', () => {
    const width = 20;
    const height = 20;
    const rgba = createWhiteCanvas(width, height);

    // Soft gray shadow region around the product object.
    paintRect(rgba, width, height, { left: 5, top: 5, width: 7, height: 7 }, { r: 255, g: 242, b: 255 });
    // High-chroma product core.
    paintRect(rgba, width, height, { left: 6, top: 6, width: 5, height: 5 }, { r: 220, g: 15, b: 15 });

    const includeShadow = detectObjectBoundsForLayoutFromRgba(rgba, width, height, {
      detection: 'white_bg_first_colored_pixel',
      shadowPolicy: 'include_shadow',
    });
    const excludeShadow = detectObjectBoundsForLayoutFromRgba(rgba, width, height, {
      detection: 'white_bg_first_colored_pixel',
      shadowPolicy: 'exclude_shadow',
    });

    expect(includeShadow).not.toBeNull();
    expect(excludeShadow).not.toBeNull();
    expect(includeShadow?.bounds).toEqual({ left: 5, top: 5, width: 7, height: 7 });
    expect(excludeShadow?.bounds).toEqual({ left: 6, top: 6, width: 5, height: 5 });
    expect(includeShadow?.detectionUsed).toBe('white_bg_first_colored_pixel');
    expect(excludeShadow?.detectionUsed).toBe('white_bg_first_colored_pixel');
    expect(includeShadow?.confidence).toBeGreaterThan(0);
    expect(excludeShadow?.confidence).toBeGreaterThan(0);
    expect(includeShadow?.detectionDetails?.shadowPolicyApplied).toBe('include_shadow');
    expect(excludeShadow?.detectionDetails?.shadowPolicyApplied).toBe('exclude_shadow');
    expect(includeShadow?.detectionDetails?.maskSource).toBe('foreground');
    expect(excludeShadow?.detectionDetails?.maskSource).toBe('core');
  });

  it('returns confidence and detection details in analysis summary', () => {
    const width = 16;
    const height = 16;
    const rgba = createWhiteCanvas(width, height);
    paintRect(rgba, width, height, { left: 4, top: 3, width: 8, height: 9 }, { r: 25, g: 140, b: 240 });

    const analysis = analyzeImageObjectFromRgba({
      pixelData: rgba,
      width,
      height,
      layout: {
        detection: 'white_bg_first_colored_pixel',
        shadowPolicy: 'auto',
      },
    });

    expect(analysis).not.toBeNull();
    expect(analysis?.sourceObjectBounds).toEqual({ left: 4, top: 3, width: 8, height: 9 });
    expect(analysis?.detectionUsed).toBe('white_bg_first_colored_pixel');
    expect(analysis?.confidence).toBeGreaterThan(0);
    expect(analysis?.detectionDetails).not.toBeNull();
    expect(analysis?.layout.shadowPolicy).toBe('auto');
  });
});
