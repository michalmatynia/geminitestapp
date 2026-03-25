/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurAppBootstrapProvider } from '../boot/KangurAppBootstrapContext';

const { runAfterInteractionsMock, cancelInteractionTaskMock } = vi.hoisted(() => ({
  runAfterInteractionsMock: vi.fn(),
  cancelInteractionTaskMock: vi.fn(),
}));

vi.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: runAfterInteractionsMock,
  },
}));

import { useLessonsScreenBootState } from './useLessonsScreenBootState';

describe('useLessonsScreenBootState', () => {
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

  it('stays in a preparing state until interactions and the first frame finish', () => {
    const { result } = renderHook(() => useLessonsScreenBootState('catalog'));

    expect(result.current).toBe(true);

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe(false);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(1);
  });

  it('skips the initial lessons shell after the app bootstrap hands off control', () => {
    const consumeInitialRouteBootstrapBypass = vi.fn(() => true);
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <KangurAppBootstrapProvider
        value={{
          consumeInitialRouteBootstrapBypass,
        }}
      >
        {children}
      </KangurAppBootstrapProvider>
    );

    const { result } = renderHook(() => useLessonsScreenBootState('catalog'), {
      wrapper,
    });

    expect(result.current).toBe(false);
    expect(consumeInitialRouteBootstrapBypass).toHaveBeenCalledTimes(1);
    expect(runAfterInteractionsMock).not.toHaveBeenCalled();
  });

  it('cancels the pending interaction task on unmount', () => {
    const { unmount } = renderHook(() => useLessonsScreenBootState('catalog'));

    unmount();

    expect(cancelInteractionTaskMock).toHaveBeenCalledTimes(1);
  });

  it('returns to the preparing state when the focused lesson key changes', () => {
    const { result, rerender } = renderHook(
      ({ bootKey }) => useLessonsScreenBootState(bootKey),
      {
        initialProps: {
          bootKey: 'catalog',
        },
      },
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe(false);

    rerender({
      bootKey: 'clock',
    });

    expect(result.current).toBe(true);

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe(false);
  });

  it('falls back to the first frame when interactions do not resolve', () => {
    runAfterInteractionsMock.mockImplementation(() => ({
      cancel: cancelInteractionTaskMock,
    }));

    const { result } = renderHook(() => useLessonsScreenBootState('catalog'));

    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(480);
      vi.runAllTimers();
    });

    expect(result.current).toBe(false);
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(1);
  });
});
