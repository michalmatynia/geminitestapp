/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { runAfterInteractionsMock, cancelInteractionTaskMock } = vi.hoisted(() => ({
  runAfterInteractionsMock: vi.fn(),
  cancelInteractionTaskMock: vi.fn(),
}));

vi.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: runAfterInteractionsMock,
  },
}));

let useHomeScreenDeferredPanels: typeof import('./useHomeScreenDeferredPanels').useHomeScreenDeferredPanels;
let useHomeScreenDeferredPanelGroup: typeof import('./useHomeScreenDeferredPanels').useHomeScreenDeferredPanelGroup;
let useHomeScreenDeferredPanelSequence: typeof import('./useHomeScreenDeferredPanels').useHomeScreenDeferredPanelSequence;

describe('useHomeScreenDeferredPanels', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();

    runAfterInteractionsMock.mockImplementation((callback: () => void) => {
      const interactionTimeoutId = setTimeout(callback, 0);
      return {
        cancel: () => {
          clearTimeout(interactionTimeoutId);
          cancelInteractionTaskMock();
        },
      };
    });

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        return setTimeout(() => {
          callback(16);
        }, 0) as unknown as number;
      }),
    );

    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((frameId: number) => {
        clearTimeout(frameId);
      }),
    );

    ({
      useHomeScreenDeferredPanels,
      useHomeScreenDeferredPanelGroup,
      useHomeScreenDeferredPanelSequence,
    } = await import(
      './useHomeScreenDeferredPanels'
    ));
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('waits until the home shell is unblocked before marking deferred panels ready', () => {
    const { result, rerender } = renderHook(
      ({ isBlocked }) => useHomeScreenDeferredPanels('home:duels', isBlocked),
      {
        initialProps: {
          isBlocked: true,
        },
      },
    );

    expect(result.current).toBe(false);
    expect(runAfterInteractionsMock).not.toHaveBeenCalled();

    rerender({
      isBlocked: false,
    });

    expect(result.current).toBe(false);

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe(true);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending interaction task on unmount', () => {
    const { unmount } = renderHook(() => useHomeScreenDeferredPanels('home:duels', false));

    unmount();

    expect(cancelInteractionTaskMock).toHaveBeenCalledTimes(1);
  });

  it('falls back open when interactions do not resolve', () => {
    runAfterInteractionsMock.mockImplementation(() => ({
      cancel: cancelInteractionTaskMock,
    }));

    const { result } = renderHook(() => useHomeScreenDeferredPanels('home:duels', false));

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(320);
      vi.runAllTimers();
    });

    expect(result.current).toBe(true);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(1);
  });

  it('batches multiple unblocked stage hooks into one interaction wakeup', () => {
    const { result } = renderHook(() => ({
      heroReady: useHomeScreenDeferredPanels('home:hero', false),
      insightsReady: useHomeScreenDeferredPanels('home:insights', false),
    }));

    expect(result.current.heroReady).toBe(false);
    expect(result.current.insightsReady).toBe(false);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(1);

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.heroReady).toBe(true);
    expect(result.current.insightsReady).toBe(true);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(1);
  });

  it('opens grouped panel keys together with one deferred state', () => {
    const { result } = renderHook(() =>
      useHomeScreenDeferredPanelGroup(
        ['home:hero:intro', 'home:hero:details', 'home:account:summary'],
        false,
      ),
    );

    expect(result.current).toEqual([false, false, false]);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(1);

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toEqual([true, true, true]);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(1);
  });

  it('advances strict panel sequences one stage at a time', () => {
    const { result } = renderHook(() =>
      useHomeScreenDeferredPanelSequence(
        ['home:duels', 'home:duels:secondary', 'home:duels:advanced'],
        false,
      ),
    );

    expect(result.current).toEqual([false, false, false]);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(1);

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current).toEqual([true, false, false]);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(2);

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current).toEqual([true, true, false]);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(3);

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current).toEqual([true, true, true]);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(3);
  });
});
