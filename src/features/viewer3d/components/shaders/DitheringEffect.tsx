"use client";

import { Effect, BlendFunction } from "postprocessing";
import { Uniform } from "three";
import { forwardRef, useMemo } from "react";

// Bayer 8x8 ordered dithering shader for black & white effect
const ditheringFragmentShader = `
  uniform float intensity;

  // Bayer 8x8 dithering matrix (normalized 0-1)
  float getBayerValue(vec2 coord) {
    int x = int(mod(coord.x, 8.0));
    int y = int(mod(coord.y, 8.0));

    // Bayer 8x8 matrix values (0-63 normalized to 0-1)
    int bayerMatrix[64] = int[64](
      0, 32, 8, 40, 2, 34, 10, 42,
      48, 16, 56, 24, 50, 18, 58, 26,
      12, 44, 4, 36, 14, 46, 6, 38,
      60, 28, 52, 20, 62, 30, 54, 22,
      3, 35, 11, 43, 1, 33, 9, 41,
      51, 19, 59, 27, 49, 17, 57, 25,
      15, 47, 7, 39, 13, 45, 5, 37,
      63, 31, 55, 23, 61, 29, 53, 21
    );

    return float(bayerMatrix[y * 8 + x]) / 64.0;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Convert to grayscale using luminance formula
    float luminance = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));

    // Get screen coordinates for dithering pattern
    vec2 screenCoord = uv * resolution;
    float bayerValue = getBayerValue(screenCoord);

    // Apply dithering threshold
    float dithered = step(bayerValue, luminance * intensity);

    // Output black or white based on threshold
    outputColor = vec4(vec3(dithered), inputColor.a);
  }
`;

export class DitheringEffectImpl extends Effect {
  constructor({
    intensity = 1.0,
    blendFunction = BlendFunction.NORMAL,
  }: {
    intensity?: number;
    blendFunction?: BlendFunction;
  } = {}) {
    super("DitheringEffect", ditheringFragmentShader, {
      blendFunction,
      uniforms: new Map<string, Uniform>([
        ["intensity", new Uniform(intensity)],
      ]),
    });
  }

  get intensity(): number {
    return this.uniforms.get("intensity")!.value as number;
  }

  set intensity(value: number) {
    this.uniforms.get("intensity")!.value = value;
  }
}

export interface DitheringPassProps {
  intensity?: number;
  blendFunction?: BlendFunction;
}

export const DitheringPass = forwardRef<DitheringEffectImpl, DitheringPassProps>(
  function DitheringPass({ intensity = 1.0, blendFunction = BlendFunction.NORMAL }, ref) {
    const effect = useMemo(
      () => new DitheringEffectImpl({ intensity, blendFunction }),
      [intensity, blendFunction]
    );

    // eslint-disable-next-line react/no-unknown-property
    return <primitive ref={ref} object={effect} />;
  }
);
