import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';

import { useCanvasInteractionsNavigation } from '../hooks/useCanvasInteractions.navigation';

const buildViewportRect = (): DOMRect =>
  ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1200,
    bottom: 800,
    width: 1200,
    height: 800,
    toJSON: () => ({}),
  }) as DOMRect;

const runWheelZoomScenario = (ctrlKey: boolean): number => {
  const viewportElement = document.createElement('div');
  Object.defineProperty(viewportElement, 'getBoundingClientRect', {
    value: (): DOMRect => buildViewportRect(),
  });

  const latestViewRef = { current: { x: 0, y: 0, scale: 1 } };
  const viewportRef = { current: viewportElement } as React.RefObject<HTMLDivElement | null>;

  const rafQueue: FrameRequestCallback[] = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
    (callback: FrameRequestCallback): number => {
      rafQueue.push(callback);
      return rafQueue.length;
    }
  );
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((): void => undefined);

  const { result, unmount } = renderHook(() =>
    useCanvasInteractionsNavigation({
      view: latestViewRef.current,
      latestViewRef,
      updateView: (next): void => {
        latestViewRef.current = next;
      },
      viewportRef,
      nodes: [],
      resolveActiveNodeSelectionIds: (): string[] => [],
      updateLastPointerCanvasPosFromClient: (): { x: number; y: number } | null =>
        null,
    })
  );

  act(() => {
    result.current.applyWheelZoom(0.05, 120, 90, 0, ctrlKey);
  });

  act(() => {
    for (let step = 0; step < 240 && rafQueue.length > 0; step += 1) {
      const callback = rafQueue.shift();
      if (!callback) break;
      callback(performance.now() + (step + 1) * 16);
    }
  });

  unmount();
  return latestViewRef.current.scale;
};

describe('useCanvasInteractionsNavigation wheel zoom', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies stronger scaling for ctrl+wheel trackpad-like deltas', () => {
    const nonCtrlScale = runWheelZoomScenario(false);
    const ctrlScale = runWheelZoomScenario(true);

    expect(nonCtrlScale).not.toBe(1);
    expect(Math.abs(ctrlScale - 1)).toBeGreaterThan(Math.abs(nonCtrlScale - 1));
  });
});
