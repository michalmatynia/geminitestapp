'use client';

import { Effect, BlendFunction } from 'postprocessing';
import { forwardRef, useMemo } from 'react';
import { Uniform, Vector2, type WebGLRenderTarget, type WebGLRenderer } from 'three';

import orderedDitheringShader from './OrderedDitheringShader';

export interface OrderedDitheringEffectOptions {
  time?: number;
  resolution?: Vector2;
  gridSize?: number;
  luminanceMethod?: number;
  invertColor?: boolean;
  pixelSizeRatio?: number;
  grayscaleOnly?: boolean;
  blendFunction?: BlendFunction;
}

type OrderedDitheringUniformOptions = Required<
  Omit<OrderedDitheringEffectOptions, 'blendFunction'>
>;
type ResolvedOrderedDitheringEffectOptions = Required<OrderedDitheringEffectOptions>;

const booleanUniformValue = (value: boolean): number => (value ? 1 : 0);

const withDefault = <Value,>(value: Value | undefined, fallback: Value): Value =>
  value ?? fallback;

const resolveOrderedDitheringOptions = (
  options: OrderedDitheringEffectOptions
): ResolvedOrderedDitheringEffectOptions => ({
  time: withDefault(options.time, 0),
  resolution: withDefault(options.resolution, new Vector2(1, 1)),
  gridSize: withDefault(options.gridSize, 4.0),
  luminanceMethod: withDefault(options.luminanceMethod, 0),
  invertColor: withDefault(options.invertColor, false),
  pixelSizeRatio: withDefault(options.pixelSizeRatio, 1),
  grayscaleOnly: withDefault(options.grayscaleOnly, false),
  blendFunction: withDefault(options.blendFunction, BlendFunction.NORMAL),
});

const createOrderedDitheringUniforms = ({
  time,
  resolution,
  gridSize,
  luminanceMethod,
  invertColor,
  pixelSizeRatio,
  grayscaleOnly,
}: OrderedDitheringUniformOptions): Map<string, Uniform> =>
  new Map<string, Uniform>([
    ['time', new Uniform(time)],
    ['resolution', new Uniform(resolution)],
    ['gridSize', new Uniform(gridSize)],
    ['luminanceMethod', new Uniform(luminanceMethod)],
    ['invertColor', new Uniform(booleanUniformValue(invertColor))],
    ['ditheringEnabled', new Uniform(1)],
    ['pixelSizeRatio', new Uniform(pixelSizeRatio)],
    ['grayscaleOnly', new Uniform(booleanUniformValue(grayscaleOnly))],
  ]);

export class OrderedDitheringEffectImpl extends Effect {
  constructor(options: OrderedDitheringEffectOptions = {}) {
    const resolvedOptions = resolveOrderedDitheringOptions(options);
    super('OrderedDitheringEffect', orderedDitheringShader, {
      blendFunction: resolvedOptions.blendFunction,
      uniforms: createOrderedDitheringUniforms(resolvedOptions),
    });
  }

  override update(
    _renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget,
    deltaTime: number
  ): void {
    const timeUniform = this.uniforms.get('time');
    if (timeUniform && typeof timeUniform.value === 'number') {
      timeUniform.value += deltaTime;
    }

    const resolutionUniform = this.uniforms.get('resolution');
    if (resolutionUniform?.value instanceof Vector2) {
      resolutionUniform.value.set(inputBuffer.width, inputBuffer.height);
    }
  }

  setGridSize(size: number): void {
    const gridSizeUniform = this.uniforms.get('gridSize');
    if (gridSizeUniform) {
      gridSizeUniform.value = size;
    }
  }

  setPixelSizeRatio(ratio: number): void {
    const pixelSizeRatioUniform = this.uniforms.get('pixelSizeRatio');
    if (pixelSizeRatioUniform) {
      pixelSizeRatioUniform.value = ratio;
    }
  }

  setGrayscaleOnly(grayscaleOnly: boolean): void {
    const grayscaleOnlyUniform = this.uniforms.get('grayscaleOnly');
    if (grayscaleOnlyUniform) {
      grayscaleOnlyUniform.value = grayscaleOnly ? 1 : 0;
    }
  }

  setInvertColor(invertColor: boolean): void {
    const invertColorUniform = this.uniforms.get('invertColor');
    if (invertColorUniform) {
      invertColorUniform.value = invertColor ? 1 : 0;
    }
  }

  setLuminanceMethod(luminanceMethod: number): void {
    const luminanceMethodUniform = this.uniforms.get('luminanceMethod');
    if (luminanceMethodUniform) {
      luminanceMethodUniform.value = luminanceMethod;
    }
  }
}

export interface OrderedDitheringPassProps {
  gridSize?: number;
  luminanceMethod?: number;
  invertColor?: boolean;
  pixelSizeRatio?: number;
  grayscaleOnly?: boolean;
  blendFunction?: BlendFunction;
}

export const OrderedDitheringPass = forwardRef<
  OrderedDitheringEffectImpl,
  OrderedDitheringPassProps
>((
  {
    gridSize = 4.0,
    luminanceMethod = 0,
    invertColor = false,
    pixelSizeRatio = 1,
    grayscaleOnly = false,
    blendFunction = BlendFunction.NORMAL,
  }: OrderedDitheringPassProps,
  ref: React.Ref<OrderedDitheringEffectImpl>
): React.JSX.Element => {
  const effect = useMemo(
    () =>
      new OrderedDitheringEffectImpl({
        gridSize,
        luminanceMethod,
        invertColor,
        pixelSizeRatio,
        grayscaleOnly,
        blendFunction,
      }),
    [gridSize, luminanceMethod, invertColor, pixelSizeRatio, grayscaleOnly, blendFunction]
  );

  return <primitive ref={ref} object={effect} />;
});
