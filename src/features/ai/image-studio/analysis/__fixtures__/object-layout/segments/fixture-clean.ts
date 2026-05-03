import {
  createRgbaCanvas,
  paintRect,
} from '../generators';
import { exactExpectation } from './expectations';
import { type ObjectLayoutGoldenFixture } from './types';

export const fixtureTransparentCore = (): ObjectLayoutGoldenFixture => {
  const width = 96;
  const height = 72;
  const coreBounds = { left: 28, top: 18, width: 34, height: 28 } as const;
  const rgba = createRgbaCanvas(width, height, { r: 255, g: 255, b: 255, a: 0 });

  paintRect(
    rgba,
    width,
    height,
    { left: 26, top: 16, width: 38, height: 32 },
    {
      r: 70,
      g: 138,
      b: 228,
      a: 6,
    }
  );
  paintRect(rgba, width, height, coreBounds, { r: 47, g: 109, b: 210, a: 255 });

  return {
    id: 'transparent_core_alpha_primary',
    title: 'Transparent product with faint alpha halo',
    category: 'clean',
    width,
    height,
    rgba,
    groundTruthBounds: coreBounds,
    expectations: {
      auto: exactExpectation(coreBounds, {
        minConfidence: 0.55,
      }),
      alpha: exactExpectation(coreBounds, {
        detectionUsed: 'alpha_bbox',
        minConfidence: 0.55,
      }),
      white_include_shadow: exactExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minConfidence: 0.45,
      }),
      white_exclude_shadow: exactExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minConfidence: 0.45,
      }),
    },
  };
};

export const fixtureOpaqueWhiteCore = (): ObjectLayoutGoldenFixture => {
  const width = 100;
  const height = 80;
  const coreBounds = { left: 30, top: 24, width: 34, height: 24 } as const;
  const rgba = createRgbaCanvas(width, height, { r: 255, g: 255, b: 255, a: 255 });

  paintRect(rgba, width, height, coreBounds, { r: 36, g: 126, b: 200, a: 255 });

  return {
    id: 'opaque_white_clean_core',
    title: 'Opaque white background with centered product',
    category: 'clean',
    width,
    height,
    rgba,
    groundTruthBounds: coreBounds,
    expectations: {
      auto: exactExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minConfidence: 0.55,
      }),
      alpha: exactExpectation(
        { left: 0, top: 0, width, height },
        { detectionUsed: 'alpha_bbox', minConfidence: 0.25 }
      ),
      white_include_shadow: exactExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minConfidence: 0.55,
      }),
      white_exclude_shadow: exactExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minConfidence: 0.55,
      }),
    },
  };
};
