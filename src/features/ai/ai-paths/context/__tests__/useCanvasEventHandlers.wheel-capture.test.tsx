import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UseCanvasInteractionsNavigationValue } from '../hooks/useCanvasInteractions.navigation';
import { useCanvasEventHandlers } from '../hooks/canvas/useCanvasEventHandlers';

const buildViewportRect = (): DOMRect =>
  ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 900,
    bottom: 700,
    width: 900,
    height: 700,
    toJSON: () => ({}),
  }) as DOMRect;

const dispatchWheel = (init?: WheelEventInit): WheelEvent => {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    deltaMode: WheelEvent.DOM_DELTA_PIXEL,
    deltaX: 0,
    deltaY: 1,
    clientX: 0,
    clientY: 0,
    ...init,
  });
  window.dispatchEvent(event);
  return event;
};

describe('useCanvasEventHandlers wheel capture boundaries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not hijack unmodified wheel scrolling inside canvas bounds', () => {
    const viewportElement = document.createElement('div');
    Object.defineProperty(viewportElement, 'getBoundingClientRect', {
      value: (): DOMRect => buildViewportRect(),
    });

    const viewportRef = { current: viewportElement } as React.RefObject<HTMLDivElement>;
    const setViewClamped = vi.fn();
    const getZoomTargetView = vi.fn((scale: number) => ({ x: 0, y: 0, scale }));
    const updateLastPointerCanvasPosFromClient = vi.fn();
    const resolveViewportPointFromClient = vi.fn((x: number, y: number) => ({ x, y }));

    const nav = {
      getZoomTargetView,
      setViewClamped,
    } as unknown as UseCanvasInteractionsNavigationValue;

    const { unmount } = renderHook(() =>
      useCanvasEventHandlers({
        viewportRef,
        view: { scale: 1, panX: 0, panY: 0 },
        nav,
        updateLastPointerCanvasPosFromClient,
        resolveViewportPointFromClient,
      })
    );

    let insideScroll: WheelEvent | null = null;
    act(() => {
      insideScroll = dispatchWheel({
        clientX: 260,
        clientY: 240,
        deltaY: 80,
        ctrlKey: false,
        metaKey: false,
      });
    });

    expect(insideScroll?.defaultPrevented).toBe(false);
    expect(setViewClamped).not.toHaveBeenCalled();

    unmount();
  });

  it('does not block outside-page wheel scrolling after an in-canvas zoom event', () => {
    const viewportElement = document.createElement('div');
    Object.defineProperty(viewportElement, 'getBoundingClientRect', {
      value: (): DOMRect => buildViewportRect(),
    });

    const viewportRef = { current: viewportElement } as React.RefObject<HTMLDivElement>;
    const setViewClamped = vi.fn();
    const getZoomTargetView = vi.fn((scale: number) => ({ x: 0, y: 0, scale }));
    const updateLastPointerCanvasPosFromClient = vi.fn();
    const resolveViewportPointFromClient = vi.fn((x: number, y: number) => ({ x, y }));

    let now = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const nav = {
      getZoomTargetView,
      setViewClamped,
    } as unknown as UseCanvasInteractionsNavigationValue;

    const { unmount } = renderHook(() =>
      useCanvasEventHandlers({
        viewportRef,
        view: { scale: 1, panX: 0, panY: 0 },
        nav,
        updateLastPointerCanvasPosFromClient,
        resolveViewportPointFromClient,
      })
    );

    let insideZoom: WheelEvent | null = null;
    act(() => {
      insideZoom = dispatchWheel({
        clientX: 260,
        clientY: 240,
        deltaY: 0.2,
        ctrlKey: true,
      });
    });
    expect(insideZoom?.defaultPrevented).toBe(true);
    expect(setViewClamped).toHaveBeenCalledTimes(1);

    now = 200;
    let outsideScroll: WheelEvent | null = null;
    act(() => {
      outsideScroll = dispatchWheel({
        clientX: 2200,
        clientY: 1800,
        deltaY: 120,
      });
    });
    expect(outsideScroll?.defaultPrevented).toBe(false);
    expect(setViewClamped).toHaveBeenCalledTimes(1);

    unmount();
  });
});
