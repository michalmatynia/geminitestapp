/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { redrawKangurCanvasStrokes } from '../render';

const createRect = (input: { left: number; top: number; width: number; height: number }): DOMRect =>
  ({
    ...input,
    right: input.left + input.width,
    bottom: input.top + input.height,
    x: input.left,
    y: input.top,
    toJSON: () => ({}),
  }) as DOMRect;

describe('redrawKangurCanvasStrokes', () => {
  const originalDevicePixelRatio = window.devicePixelRatio;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: originalDevicePixelRatio,
    });
  });

  it('syncs the canvas, fills the background, runs pre-stroke drawing, and renders strokes', () => {
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = vi.fn(() => createRect({ left: 0, top: 0, width: 160, height: 110 }));

    const ctx = {
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 0,
      shadowBlur: 0,
      shadowColor: '',
      strokeStyle: '',
    } as unknown as CanvasRenderingContext2D;

    canvas.getContext = vi.fn(() => ctx);

    const beforeStrokes = vi.fn();

    redrawKangurCanvasStrokes({
      backgroundFill: '#ffffff',
      beforeStrokes,
      canvas,
      logicalHeight: 220,
      logicalWidth: 320,
      resolveStyle: () => ({
        lineWidth: 4,
        strokeStyle: '#0f172a',
      }),
      strokes: [
        {
          meta: null,
          points: [
            { x: 10, y: 20 },
            { x: 80, y: 120 },
          ],
        },
      ],
    });

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 320, 220);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 320, 220);
    expect(beforeStrokes).toHaveBeenCalledWith(ctx);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 20);
    expect(ctx.lineTo).toHaveBeenCalledWith(80, 120);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('uses quadratic smoothing when the stroke style requests smooth rendering', () => {
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = vi.fn(() =>
      createRect({ left: 0, top: 0, width: 160, height: 110 })
    );

    const ctx = {
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 0,
      shadowBlur: 0,
      shadowColor: '',
      strokeStyle: '',
    } as unknown as CanvasRenderingContext2D;

    canvas.getContext = vi.fn(() => ctx);

    redrawKangurCanvasStrokes({
      canvas,
      logicalHeight: 220,
      logicalWidth: 320,
      resolveStyle: () => ({
        lineWidth: 4,
        renderMode: 'smooth',
        strokeStyle: '#0f172a',
      }),
      strokes: [
        {
          meta: null,
          points: [
            { x: 10, y: 20 },
            { x: 40, y: 60 },
            { x: 90, y: 130 },
          ],
        },
      ],
    });

    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('reuses a cached base layer for repeated redraws with the same cache key and rebuilds it when the key changes', () => {
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = vi.fn(() =>
      createRect({ left: 0, top: 0, width: 160, height: 110 })
    );

    const baseCanvas = document.createElement('canvas');
    baseCanvas.getBoundingClientRect = vi.fn(() =>
      createRect({ left: 0, top: 0, width: 0, height: 0 })
    );

    const mainCtx = {
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 0,
      shadowBlur: 0,
      shadowColor: '',
      strokeStyle: '',
    } as unknown as CanvasRenderingContext2D;

    const baseCtx = {
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 0,
      shadowBlur: 0,
      shadowColor: '',
      strokeStyle: '',
    } as unknown as CanvasRenderingContext2D;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string): HTMLElement => {
      if (tagName === 'canvas') {
        return baseCanvas;
      }

      return originalCreateElement(tagName);
    });

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement
    ) {
      if (this === canvas) {
        return mainCtx;
      }

      if (this === baseCanvas) {
        return baseCtx;
      }

      return null;
    });

    const beforeStrokes = vi.fn();
    const baseLayerCache = { current: null };

    redrawKangurCanvasStrokes({
      backgroundFill: '#ffffff',
      baseLayerCache,
      baseLayerCacheKey: 'round-1',
      beforeStrokes,
      canvas,
      logicalHeight: 220,
      logicalWidth: 320,
      resolveStyle: () => ({
        lineWidth: 4,
        strokeStyle: '#0f172a',
      }),
      strokes: [],
    });

    redrawKangurCanvasStrokes({
      backgroundFill: '#ffffff',
      baseLayerCache,
      baseLayerCacheKey: 'round-1',
      beforeStrokes,
      canvas,
      logicalHeight: 220,
      logicalWidth: 320,
      resolveStyle: () => ({
        lineWidth: 4,
        strokeStyle: '#0f172a',
      }),
      strokes: [],
    });

    redrawKangurCanvasStrokes({
      backgroundFill: '#ffffff',
      baseLayerCache,
      baseLayerCacheKey: 'round-2',
      beforeStrokes,
      canvas,
      logicalHeight: 220,
      logicalWidth: 320,
      resolveStyle: () => ({
        lineWidth: 4,
        strokeStyle: '#0f172a',
      }),
      strokes: [],
    });

    expect(beforeStrokes).toHaveBeenCalledTimes(2);
    expect(baseCtx.fillRect).toHaveBeenCalledTimes(2);
    expect(mainCtx.drawImage).toHaveBeenCalledTimes(3);
    expect(mainCtx.drawImage).toHaveBeenCalledWith(baseCanvas, 0, 0, 320, 220);
  });
});
