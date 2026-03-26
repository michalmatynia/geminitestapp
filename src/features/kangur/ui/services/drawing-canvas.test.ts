/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resolveKangurCanvasPoint,
  syncKangurCanvasContext,
} from './drawing-canvas';

const createRect = (input: { left: number; top: number; width: number; height: number }): DOMRect =>
  ({
    ...input,
    right: input.left + input.width,
    bottom: input.top + input.height,
    x: input.left,
    y: input.top,
    toJSON: () => ({}),
  }) as DOMRect;

describe('drawing-canvas', () => {
  const originalDevicePixelRatio = window.devicePixelRatio;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'devicePixelRatio', {
      value: originalDevicePixelRatio,
      configurable: true,
    });
  });

  it('maps pointer coordinates into logical canvas space', () => {
    const canvas = document.createElement('canvas');
    const rect = createRect({ left: 10, top: 20, width: 160, height: 110 });
    canvas.getBoundingClientRect = vi.fn(() => rect);

    const point = resolveKangurCanvasPoint(
      { clientX: 90, clientY: 75 },
      canvas,
      320,
      220
    );

    expect(point).toEqual({ x: 160, y: 110 });
  });

  it('maps pointer coordinates into logical svg space too', () => {
    const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = createRect({ left: 24, top: 12, width: 180, height: 90 });
    surface.getBoundingClientRect = vi.fn(() => rect);

    const point = resolveKangurCanvasPoint(
      { clientX: 114, clientY: 57 },
      surface,
      360,
      180
    );

    expect(point).toEqual({ x: 180, y: 90 });
  });

  it('syncs canvas backing store and context transform to render size and DPR', () => {
    const canvas = document.createElement('canvas');
    const rect = createRect({ left: 0, top: 0, width: 200, height: 100 });
    canvas.getBoundingClientRect = vi.fn(() => rect);

    const setTransform = vi.fn();
    const ctx = { setTransform } as unknown as CanvasRenderingContext2D;
    canvas.getContext = vi.fn(() => ctx);

    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });

    const result = syncKangurCanvasContext(canvas, 320, 220);

    expect(result).toBe(ctx);
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(200);
    expect(setTransform).toHaveBeenCalledWith(
      (200 / 320) * 2,
      0,
      0,
      (100 / 220) * 2,
      0,
      0
    );
  });
});
