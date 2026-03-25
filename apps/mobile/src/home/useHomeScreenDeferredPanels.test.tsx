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

import { useHomeScreenDeferredPanels } from './useHomeScreenDeferredPanels';

describe('useHomeScreenDeferredPanels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
