import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterObjectBounds,
} from '@/features/ai/image-studio/contracts/center';

import {
  createRgbaCanvas,
  paintRect,
  paintVerticalGradientBackground,
  sprinkleBorderNoise,
} from './generators';

export type ObjectLayoutFixtureVariant =
  | 'auto'
  | 'alpha'
  | 'white_include_shadow'
  | 'white_exclude_shadow';

type DetectionUsed = Exclude<ImageStudioCenterDetectionMode, 'auto'>;

export type ObjectLayoutFixtureExpectation = {
  bounds: ImageStudioCenterObjectBounds;
  minIou: number;
  maxEdgeDeltaPx: number;
  minConfidence: number;
  detectionUsed?: DetectionUsed;
};

export type ObjectLayoutGoldenFixture = {
  id: string;
  title: string;
  category: 'clean' | 'challenging';
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  groundTruthBounds: ImageStudioCenterObjectBounds;
  expectations: Partial<Record<ObjectLayoutFixtureVariant, ObjectLayoutFixtureExpectation>>;
};

const exactExpectation = (
  bounds: ImageStudioCenterObjectBounds,
  options?: Partial<ObjectLayoutFixtureExpectation>
): ObjectLayoutFixtureExpectation => ({
  bounds,
  minIou: 0.995,
  maxEdgeDeltaPx: 0,
  minConfidence: 0.45,
  ...(options ?? {}),
});

const tolerantExpectation = (
  bounds: ImageStudioCenterObjectBounds,
  options?: Partial<ObjectLayoutFixtureExpectation>
): ObjectLayoutFixtureExpectation => ({
  bounds,
  minIou: 0.9,
  maxEdgeDeltaPx: 3,
  minConfidence: 0.2,
  ...(options ?? {}),
});

const fixtureTransparentCore = (): ObjectLayoutGoldenFixture => {
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

const fixtureOpaqueWhiteCore = (): ObjectLayoutGoldenFixture => {
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

const fixtureShadowedProduct = (): ObjectLayoutGoldenFixture => {
  const width = 120;
  const height = 90;
  const shadowBounds = { left: 28, top: 20, width: 56, height: 46 } as const;
  const coreBounds = { left: 36, top: 28, width: 40, height: 30 } as const;
  const rgba = createRgbaCanvas(width, height, { r: 255, g: 255, b: 255, a: 255 });

  paintRect(rgba, width, height, shadowBounds, { r: 255, g: 244, b: 255, a: 255 });
  paintRect(rgba, width, height, coreBounds, { r: 199, g: 33, b: 31, a: 255 });

  return {
    id: 'white_background_shadowed_product',
    title: 'Product with soft cast shadow on white background',
    category: 'challenging',
    width,
    height,
    rgba,
    groundTruthBounds: coreBounds,
    expectations: {
      auto: tolerantExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minIou: 0.96,
        maxEdgeDeltaPx: 2,
        minConfidence: 0.5,
      }),
      alpha: exactExpectation(
        { left: 0, top: 0, width, height },
        { detectionUsed: 'alpha_bbox', minConfidence: 0.25 }
      ),
      white_include_shadow: exactExpectation(shadowBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minConfidence: 0.4,
      }),
      white_exclude_shadow: exactExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minConfidence: 0.45,
      }),
    },
  };
};

const fixtureOffWhiteDrift = (): ObjectLayoutGoldenFixture => {
  const width = 128;
  const height = 96;
  const coreBounds = { left: 44, top: 24, width: 38, height: 44 } as const;
  const rgba = createRgbaCanvas(width, height, { r: 248, g: 247, b: 245, a: 255 });
  paintVerticalGradientBackground(
    rgba,
    width,
    height,
    { r: 246, g: 245, b: 243, a: 255 },
    { r: 251, g: 250, b: 248, a: 255 }
  );

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((x + y) % 17 !== 0) continue;
      const offset = (y * width + x) * 4;
      rgba[offset] = Math.min(255, (rgba[offset] ?? 0) + 1);
      rgba[offset + 1] = Math.max(0, (rgba[offset + 1] ?? 0) - 1);
      rgba[offset + 2] = Math.max(0, (rgba[offset + 2] ?? 0) - 2);
      rgba[offset + 3] = 255;
    }
  }

  paintRect(rgba, width, height, coreBounds, { r: 63, g: 81, b: 190, a: 255 });

  return {
    id: 'off_white_drift_background',
    title: 'Off-white background drift with mild color noise',
    category: 'challenging',
    width,
    height,
    rgba,
    groundTruthBounds: coreBounds,
    expectations: {
      auto: tolerantExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minIou: 0.95,
        maxEdgeDeltaPx: 2,
        minConfidence: 0.45,
      }),
      alpha: exactExpectation(
        { left: 0, top: 0, width, height },
        { detectionUsed: 'alpha_bbox', minConfidence: 0.25 }
      ),
      white_include_shadow: tolerantExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minIou: 0.95,
        maxEdgeDeltaPx: 2,
        minConfidence: 0.45,
      }),
      white_exclude_shadow: tolerantExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minIou: 0.95,
        maxEdgeDeltaPx: 2,
        minConfidence: 0.45,
      }),
    },
  };
};

const fixtureBorderNoise = (): ObjectLayoutGoldenFixture => {
  const width = 110;
  const height = 82;
  const coreBounds = { left: 38, top: 20, width: 34, height: 40 } as const;
  const rgba = createRgbaCanvas(width, height, { r: 255, g: 255, b: 255, a: 255 });

  paintRect(rgba, width, height, coreBounds, { r: 17, g: 131, b: 107, a: 255 });
  sprinkleBorderNoise(rgba, width, height, {
    seed: 20260220,
    count: 120,
    borderThickness: 3,
    minColor: 230,
    maxColor: 250,
  });

  return {
    id: 'white_background_border_noise',
    title: 'White background with border dust/noise artifacts',
    category: 'challenging',
    width,
    height,
    rgba,
    groundTruthBounds: coreBounds,
    expectations: {
      auto: tolerantExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minIou: 0.92,
        maxEdgeDeltaPx: 3,
        minConfidence: 0.4,
      }),
      alpha: exactExpectation(
        { left: 0, top: 0, width, height },
        { detectionUsed: 'alpha_bbox', minConfidence: 0.25 }
      ),
      white_include_shadow: tolerantExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minIou: 0.92,
        maxEdgeDeltaPx: 3,
        minConfidence: 0.35,
      }),
      white_exclude_shadow: tolerantExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minIou: 0.92,
        maxEdgeDeltaPx: 3,
        minConfidence: 0.35,
      }),
    },
  };
};

const fixtureTouchesBorder = (): ObjectLayoutGoldenFixture => {
  const width = 104;
  const height = 84;
  const coreBounds = { left: 0, top: 22, width: 48, height: 36 } as const;
  const rgba = createRgbaCanvas(width, height, { r: 252, g: 251, b: 250, a: 255 });

  paintRect(rgba, width, height, coreBounds, { r: 204, g: 96, b: 40, a: 255 });

  return {
    id: 'object_touching_left_border',
    title: 'Object clipped against left border',
    category: 'challenging',
    width,
    height,
    rgba,
    groundTruthBounds: coreBounds,
    expectations: {
      auto: tolerantExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minIou: 0.95,
        maxEdgeDeltaPx: 2,
        minConfidence: 0.25,
      }),
      alpha: exactExpectation(
        { left: 0, top: 0, width, height },
        { detectionUsed: 'alpha_bbox', minConfidence: 0.25 }
      ),
      white_include_shadow: tolerantExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minIou: 0.95,
        maxEdgeDeltaPx: 2,
        minConfidence: 0.25,
      }),
      white_exclude_shadow: tolerantExpectation(coreBounds, {
        detectionUsed: 'white_bg_first_colored_pixel',
        minIou: 0.95,
        maxEdgeDeltaPx: 2,
        minConfidence: 0.25,
      }),
    },
  };
};

export const OBJECT_LAYOUT_GOLDEN_FIXTURES: ObjectLayoutGoldenFixture[] = [
  fixtureTransparentCore(),
  fixtureOpaqueWhiteCore(),
  fixtureShadowedProduct(),
  fixtureOffWhiteDrift(),
  fixtureBorderNoise(),
  fixtureTouchesBorder(),
];
