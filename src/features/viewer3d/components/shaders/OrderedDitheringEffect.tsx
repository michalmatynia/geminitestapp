"use client";

import { Effect, BlendFunction } from "postprocessing";
import { Uniform, Vector2, WebGLRenderTarget, WebGLRenderer } from "three";
import { forwardRef, useMemo } from "react";
import orderedDitheringShader from "./OrderedDitheringShader";

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

export class OrderedDitheringEffectImpl extends Effect {
  constructor({
    time = 0,
    resolution = new Vector2(1, 1),
    gridSize = 4.0,
    luminanceMethod = 0,
    invertColor = false,
    pixelSizeRatio = 1,
    grayscaleOnly = false,
    blendFunction = BlendFunction.NORMAL,
  }: OrderedDitheringEffectOptions = {}) {
    const uniforms = new Map<string, Uniform>([
      ["time", new Uniform(time)],
      ["resolution", new Uniform(resolution)],
      ["gridSize", new Uniform(gridSize)],
      ["luminanceMethod", new Uniform(luminanceMethod)],
      ["invertColor", new Uniform(invertColor ? 1 : 0)],
      ["ditheringEnabled", new Uniform(1)],
      ["pixelSizeRatio", new Uniform(pixelSizeRatio)],
      ["grayscaleOnly", new Uniform(grayscaleOnly ? 1 : 0)],
    ]);

    super("OrderedDitheringEffect", orderedDitheringShader, {
      blendFunction,
      uniforms,
    });
  }

  update(
    _renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget,
    deltaTime: number
  ): void {
    const timeUniform = this.uniforms.get("time");
    if (timeUniform && typeof timeUniform.value === "number") {
      timeUniform.value += deltaTime;
    }

    const resolutionUniform = this.uniforms.get("resolution");
    if (resolutionUniform?.value instanceof Vector2) {
      resolutionUniform.value.set(inputBuffer.width, inputBuffer.height);
    }
  }

  setGridSize(size: number) {
    const gridSizeUniform = this.uniforms.get("gridSize");
    if (gridSizeUniform) {
      gridSizeUniform.value = size;
    }
  }

  setPixelSizeRatio(ratio: number) {
    const pixelSizeRatioUniform = this.uniforms.get("pixelSizeRatio");
    if (pixelSizeRatioUniform) {
      pixelSizeRatioUniform.value = ratio;
    }
  }

  setGrayscaleOnly(grayscaleOnly: boolean) {
    const grayscaleOnlyUniform = this.uniforms.get("grayscaleOnly");
    if (grayscaleOnlyUniform) {
      grayscaleOnlyUniform.value = grayscaleOnly ? 1 : 0;
    }
  }

  setInvertColor(invertColor: boolean) {
    const invertColorUniform = this.uniforms.get("invertColor");
    if (invertColorUniform) {
      invertColorUniform.value = invertColor ? 1 : 0;
    }
  }

  setLuminanceMethod(luminanceMethod: number) {
    const luminanceMethodUniform = this.uniforms.get("luminanceMethod");
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
>(function OrderedDitheringPass(
  {
    gridSize = 4.0,
    luminanceMethod = 0,
    invertColor = false,
    pixelSizeRatio = 1,
    grayscaleOnly = false,
    blendFunction = BlendFunction.NORMAL,
  },
  ref
) {
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

  // eslint-disable-next-line react/no-unknown-property
  return <primitive ref={ref} object={effect} />;
});
