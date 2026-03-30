/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurMobileRuntimeMock } = vi.hoisted(() => ({
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import {
  KangurMobileHomeProgressSnapshotProvider,
  useKangurMobileHomeProgressSnapshot,
} from './KangurMobileHomeProgressSnapshotContext';

describe('KangurMobileHomeProgressSnapshotContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to the runtime progress store when no shared home snapshot is provided', () => {
    const progressSnapshot = createDefaultKangurProgressState();
    const subscribeToProgress = vi.fn(() => () => {});
    const loadProgress = vi.fn(() => progressSnapshot);

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        subscribeToProgress,
        loadProgress,
      },
    });

    const { result } = renderHook(() => useKangurMobileHomeProgressSnapshot());

    expect(result.current).toEqual(progressSnapshot);
    expect(subscribeToProgress).toHaveBeenCalledTimes(1);
    expect(loadProgress).toHaveBeenCalled();
  });

  it('reuses the provided home snapshot without subscribing again', () => {
    const progressSnapshot = {
      ...createDefaultKangurProgressState(),
      gamesPlayed: 4,
    };
    const subscribeToProgress = vi.fn(() => () => {});
    const loadProgress = vi.fn(() => createDefaultKangurProgressState());

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        subscribeToProgress,
        loadProgress,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <KangurMobileHomeProgressSnapshotProvider progress={progressSnapshot}>
        {children}
      </KangurMobileHomeProgressSnapshotProvider>
    );

    const { result } = renderHook(() => useKangurMobileHomeProgressSnapshot(), {
      wrapper,
    });

    expect(result.current).toEqual(progressSnapshot);
    expect(subscribeToProgress).not.toHaveBeenCalled();
    expect(loadProgress).not.toHaveBeenCalled();
  });

  it('can promote a provided home snapshot into a live runtime subscription later', async () => {
    const progressSnapshot = {
      ...createDefaultKangurProgressState(),
      gamesPlayed: 4,
    };
    const liveProgressSnapshot = {
      ...createDefaultKangurProgressState(),
      gamesPlayed: 7,
    };
    const subscribeToProgress = vi.fn(() => () => {});
    const loadProgress = vi.fn(() => liveProgressSnapshot);

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        subscribeToProgress,
        loadProgress,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <KangurMobileHomeProgressSnapshotProvider
        progress={progressSnapshot}
        subscribeToProgressStore
      >
        {children}
      </KangurMobileHomeProgressSnapshotProvider>
    );

    const { result } = renderHook(() => useKangurMobileHomeProgressSnapshot(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual(liveProgressSnapshot);
    });
    expect(subscribeToProgress).toHaveBeenCalledTimes(1);
    expect(loadProgress).toHaveBeenCalled();
  });
});
