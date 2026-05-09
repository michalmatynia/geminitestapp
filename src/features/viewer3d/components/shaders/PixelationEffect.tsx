/**
 * Pixelation Post-Processing Effect
 * 
 * Custom shader effect for pixelating 3D rendered scenes.
 * Provides:
 * - Configurable pixel size for retro/stylized rendering
 * - Real-time pixelation adjustment
 * - Integration with React Three Fiber post-processing
 * - Performance-optimized fragment shader
 * - Uniform-based parameter control
 */

'use client';

import { Effect, BlendFunction } from 'postprocessing';
import { forwardRef, useMemo } from 'react';
import { Uniform } from 'three';

/** Fragment shader for pixelation effect */
const pixelationFragmentShader = `
  uniform float pixelSize;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 screenCoord = uv * resolution;
    vec2 pixelCoord = floor(screenCoord / pixelSize) * pixelSize + vec2(0.5);
    vec2 pixelUv = pixelCoord / resolution;

    vec4 color = texture2D(inputBuffer, pixelUv);
    outputColor = color;
  }
`;

export class PixelationEffectImpl extends Effect {
  constructor({
    pixelSize = 6.0,
    blendFunction = BlendFunction.NORMAL,
  }: {
    pixelSize?: number;
    blendFunction?: BlendFunction;
  } = {}) {
    super('PixelationEffect', pixelationFragmentShader, {
      blendFunction,
      uniforms: new Map<string, Uniform>([['pixelSize', new Uniform(pixelSize)]]),
    });
  }

  private get pixelSizeUniform(): Uniform {
    const uniform = this.uniforms.get('pixelSize');
    if (uniform === undefined) {
      // Shader uniform for pixelSize was not properly initialized
      throw new Error('PixelationEffect pixelSize uniform is missing.');
    }
    return uniform;
  }

  get pixelSize(): number {
    return this.pixelSizeUniform.value as number;
  }

  set pixelSize(value: number) {
    this.pixelSizeUniform.value = value;
  }
}

export interface PixelationPassProps {
  pixelSize?: number;
  blendFunction?: BlendFunction;
}

export const PixelationPass = forwardRef<PixelationEffectImpl, PixelationPassProps>(
  (
    { pixelSize = 6.0, blendFunction = BlendFunction.NORMAL }: PixelationPassProps,
    ref: React.Ref<PixelationEffectImpl>
  ) => {
    const effect = useMemo(
      () => new PixelationEffectImpl({ pixelSize, blendFunction }),
      [pixelSize, blendFunction]
    );

    return <primitive ref={ref} object={effect} />;
  }
);
