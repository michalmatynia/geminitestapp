import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';

import type { AiNode } from '@/shared/lib/ai-paths';

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

const runWheelZoomScenario = (options?: {
  ctrlKey?: boolean;
  metaKey?: boolean;
  deltaY?: number;
  deltaX?: number;
}): number => {
  const { ctrlKey = false, metaKey = false, deltaY = 0.05, deltaX = 0 } = options ?? {};
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
    result.current.applyWheelZoom(deltaY, 120, 90, 0, ctrlKey, metaKey, deltaX);
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
    const nonCtrlScale = runWheelZoomScenario();
    const ctrlScale = runWheelZoomScenario({ ctrlKey: true });

    expect(nonCtrlScale).not.toBe(1);
    expect(Math.abs(ctrlScale - 1)).toBeGreaterThan(Math.abs(nonCtrlScale - 1));
  });

  it('treats meta+wheel as pinch-like for macOS trackpads', () => {
    const nonMetaScale = runWheelZoomScenario();
    const metaScale = runWheelZoomScenario({ metaKey: true });
    expect(Math.abs(metaScale - 1)).toBeGreaterThan(Math.abs(nonMetaScale - 1));
  });

  it('falls back to deltaX when deltaY is effectively zero', () => {
    const scale = runWheelZoomScenario({ deltaY: 0, deltaX: 0.2, metaKey: true });
    expect(scale).not.toBe(1);
  });

  it('allows higher upward pan when nodes exist above canvas origin', () => {
    const viewportElement = document.createElement('div');
    Object.defineProperty(viewportElement, 'getBoundingClientRect', {
      value: (): DOMRect => buildViewportRect(),
    });

    const latestViewRef = { current: { x: 0, y: 0, scale: 1 } };
    const viewportRef = { current: viewportElement } as React.RefObject<HTMLDivElement | null>;
    const nodeAboveOrigin: AiNode = {
      id: 'node-negative-y',
      type: 'mapper',
      title: 'Negative Y',
      description: '',
      inputs: [],
      outputs: [],
      position: { x: 80, y: -300 },
      data: {},
    };

    const { result, unmount } = renderHook(() =>
      useCanvasInteractionsNavigation({
        view: latestViewRef.current,
        latestViewRef,
        updateView: (next): void => {
          latestViewRef.current = next;
        },
        viewportRef,
        nodes: [nodeAboveOrigin],
        resolveActiveNodeSelectionIds: (): string[] => [],
        updateLastPointerCanvasPosFromClient: (): { x: number; y: number } | null =>
          null,
      })
    );

    act(() => {
      result.current.setViewClamped({ x: 0, y: 9999, scale: 1 });
    });

    expect(latestViewRef.current.y).toBeGreaterThan(40);
    expect(latestViewRef.current.y).toBeCloseTo(340, 0);
    unmount();
  });
});
