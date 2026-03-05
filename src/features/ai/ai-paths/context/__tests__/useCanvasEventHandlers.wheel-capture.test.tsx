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

const buildHarness = (): {
  viewportElement: HTMLDivElement;
  applyWheelZoom: ReturnType<typeof vi.fn>;
  handleWheel: (event: React.WheelEvent) => void;
  unmount: () => void;
} => {
  const viewportElement = document.createElement('div');
  Object.defineProperty(viewportElement, 'getBoundingClientRect', {
    value: (): DOMRect => buildViewportRect(),
  });

  const viewportRef = { current: viewportElement } as React.RefObject<HTMLDivElement>;
  const applyWheelZoom = vi.fn();
  const updateLastPointerCanvasPosFromClient = vi.fn();
  const nav = {
    applyWheelZoom,
  } as unknown as UseCanvasInteractionsNavigationValue;

  const { result, unmount } = renderHook(() =>
    useCanvasEventHandlers({
      viewportRef,
      view: { scale: 1, panX: 0, panY: 0 },
      nav,
      updateLastPointerCanvasPosFromClient,
    })
  );

  return {
    viewportElement,
    applyWheelZoom,
    handleWheel: result.current.handleWheel,
    unmount,
  };
};

const buildWheelEvent = (patch: Partial<React.WheelEvent> = {}): {
  event: React.WheelEvent;
  preventDefault: ReturnType<typeof vi.fn>;
  stopPropagation: ReturnType<typeof vi.fn>;
} => {
  const preventDefault = vi.fn();
  const stopPropagation = vi.fn();
  const event = {
    defaultPrevented: false,
    preventDefault,
    stopPropagation,
    deltaMode: WheelEvent.DOM_DELTA_PIXEL,
    deltaX: 0,
    deltaY: 1,
    clientX: 0,
    clientY: 0,
    ctrlKey: false,
    metaKey: false,
    target: null,
    ...patch,
  } as unknown as React.WheelEvent;
  return { event, preventDefault, stopPropagation };
};

describe('useCanvasEventHandlers wheel capture boundaries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('treats unmodified in-canvas wheel as zoom', () => {
    const { viewportElement, applyWheelZoom, handleWheel, unmount } = buildHarness();
    const { event, preventDefault } = buildWheelEvent({
      clientX: 260,
      clientY: 240,
      deltaY: 80,
      target: viewportElement,
    });
    act(() => {
      handleWheel(event);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(applyWheelZoom).toHaveBeenCalledTimes(1);
    expect(applyWheelZoom).toHaveBeenCalledWith(80, 260, 240, WheelEvent.DOM_DELTA_PIXEL, false, false, 0);

    unmount();
  });

  it('does not block outside-page wheel scrolling after an in-canvas zoom event', () => {
    let now = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { viewportElement, applyWheelZoom, handleWheel, unmount } = buildHarness();
    const insideEvent = buildWheelEvent({
      clientX: 260,
      clientY: 240,
      deltaY: 0.2,
      ctrlKey: true,
      target: viewportElement,
    });
    act(() => {
      handleWheel(insideEvent.event);
    });
    expect(insideEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(applyWheelZoom).toHaveBeenCalledTimes(1);

    now = 200;
    const outsideEvent = buildWheelEvent({
      clientX: 2200,
      clientY: 1800,
      deltaY: 120,
      target: document.body,
    });
    act(() => {
      handleWheel(outsideEvent.event);
    });
    expect(outsideEvent.preventDefault).toHaveBeenCalledTimes(0);
    expect(applyWheelZoom).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('keeps in-canvas wheel zoom enabled after ctrl+wheel zoom starts', () => {
    let now = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { viewportElement, applyWheelZoom, handleWheel, unmount } = buildHarness();
    const ctrlWheelEvent = buildWheelEvent({
      clientX: 280,
      clientY: 260,
      deltaY: 0.2,
      ctrlKey: true,
      target: viewportElement,
    });
    act(() => {
      handleWheel(ctrlWheelEvent.event);
    });
    expect(ctrlWheelEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(applyWheelZoom).toHaveBeenCalledTimes(1);

    now = 140;
    const followupWheelEvent = buildWheelEvent({
      clientX: 285,
      clientY: 268,
      deltaY: 120,
      target: viewportElement,
    });
    act(() => {
      handleWheel(followupWheelEvent.event);
    });

    expect(followupWheelEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(applyWheelZoom).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('does not hijack wheel events from marked in-canvas scroll regions', () => {
    const { viewportElement, applyWheelZoom, handleWheel, unmount } = buildHarness();
    const scrollRegion = document.createElement('div');
    scrollRegion.setAttribute('data-canvas-scroll-region', 'true');
    viewportElement.appendChild(scrollRegion);
    const { event, preventDefault, stopPropagation } = buildWheelEvent({
      target: scrollRegion,
      deltaY: 64,
      clientX: 240,
      clientY: 220,
    });

    act(() => {
      handleWheel(event);
    });

    expect(preventDefault).toHaveBeenCalledTimes(0);
    expect(stopPropagation).toHaveBeenCalledTimes(0);
    expect(applyWheelZoom).toHaveBeenCalledTimes(0);

    unmount();
  });
});
