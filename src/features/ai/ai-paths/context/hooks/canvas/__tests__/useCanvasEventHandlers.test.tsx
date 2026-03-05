import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCanvasEventHandlers } from '../useCanvasEventHandlers';
import type { UseCanvasInteractionsNavigationValue } from '../../useCanvasInteractions.navigation';

const setViewportRect = (
  element: HTMLElement,
  rect: { left: number; top: number; width: number; height: number }
): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: (): DOMRect =>
      ({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        x: rect.left,
        y: rect.top,
        toJSON: () => ({}),
      }) as DOMRect,
  });
};

const createGestureEvent = (
  type: 'gesturestart' | 'gesturechange',
  props: { scale: number; clientX: number; clientY: number }
): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'scale', { configurable: true, value: props.scale });
  Object.defineProperty(event, 'clientX', { configurable: true, value: props.clientX });
  Object.defineProperty(event, 'clientY', { configurable: true, value: props.clientY });
  return event;
};

function TestHarness({
  nav,
  updateLastPointerCanvasPosFromClient,
}: {
  nav: UseCanvasInteractionsNavigationValue;
  updateLastPointerCanvasPosFromClient: (x: number, y: number) => void;
}): React.JSX.Element {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const { handleWheel } = useCanvasEventHandlers({
    viewportRef,
    view: { scale: 1, panX: 0, panY: 0 },
    nav,
    updateLastPointerCanvasPosFromClient,
  });

  return <div ref={viewportRef} data-testid='viewport' onWheel={handleWheel} />;
}

describe('useCanvasEventHandlers', () => {
  it('processes wheel zoom once per wheel event on the viewport', () => {
    const nav = {
      applyWheelZoom: vi.fn(),
      getZoomTargetView: vi.fn(),
      setViewClamped: vi.fn(),
    } as unknown as UseCanvasInteractionsNavigationValue;
    const updateLastPointerCanvasPosFromClient = vi.fn();

    const { getByTestId } = render(
      <TestHarness
        nav={nav}
        updateLastPointerCanvasPosFromClient={updateLastPointerCanvasPosFromClient}
      />
    );

    const viewport = getByTestId('viewport');
    setViewportRect(viewport, { left: 100, top: 50, width: 1000, height: 800 });

    fireEvent.wheel(viewport, {
      deltaY: 12,
      deltaX: 0,
      deltaMode: 0,
      clientX: 400,
      clientY: 300,
      ctrlKey: false,
      metaKey: false,
    });

    expect(nav.applyWheelZoom).toHaveBeenCalledTimes(1);
  });

  it('anchors safari gesture zoom using client coordinates', () => {
    const targetView = { x: 12, y: 34, scale: 1.2 };
    const nav = {
      applyWheelZoom: vi.fn(),
      getZoomTargetView: vi.fn(() => targetView),
      setViewClamped: vi.fn(),
    } as unknown as UseCanvasInteractionsNavigationValue;
    const updateLastPointerCanvasPosFromClient = vi.fn();

    const { getByTestId } = render(
      <TestHarness
        nav={nav}
        updateLastPointerCanvasPosFromClient={updateLastPointerCanvasPosFromClient}
      />
    );

    const viewport = getByTestId('viewport');
    setViewportRect(viewport, { left: 100, top: 50, width: 1000, height: 800 });

    viewport.dispatchEvent(
      createGestureEvent('gesturestart', { scale: 1, clientX: 400, clientY: 300 })
    );
    viewport.dispatchEvent(
      createGestureEvent('gesturechange', { scale: 1.2, clientX: 400, clientY: 300 })
    );

    expect(nav.getZoomTargetView).toHaveBeenCalled();
    const call = (nav.getZoomTargetView as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      number,
      { x: number; y: number } | undefined,
    ];
    expect(call?.[1]).toEqual({ x: 400, y: 300 });
    expect(nav.setViewClamped).toHaveBeenCalledWith(targetView);
    expect(updateLastPointerCanvasPosFromClient).toHaveBeenCalledWith(400, 300);
  });
});

