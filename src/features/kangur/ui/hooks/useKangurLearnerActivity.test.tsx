/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  logKangurClientErrorMock,
  reportKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
  learnerActivityGetMock,
  learnerActivityUpdateMock,
  recordKangurOpenedTaskMock,
} = vi.hoisted(() => ({
  logKangurClientErrorMock: globalThis.__kangurClientErrorMocks().logKangurClientErrorMock,
  reportKangurClientErrorMock: globalThis.__kangurClientErrorMocks().reportKangurClientErrorMock,
  withKangurClientError: globalThis.__kangurClientErrorMocks().withKangurClientError,
  withKangurClientErrorSync: globalThis.__kangurClientErrorMocks().withKangurClientErrorSync,
  learnerActivityGetMock: vi.fn(),
  learnerActivityUpdateMock: vi.fn(),
  recordKangurOpenedTaskMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    learnerActivity: {
      get: learnerActivityGetMock,
      update: learnerActivityUpdateMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  reportKangurClientError: reportKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

vi.mock('@/features/kangur/ui/services/progress', () => ({
  recordKangurOpenedTask: recordKangurOpenedTaskMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurOptionalSubjectKey', () => ({
  useKangurOptionalSubjectKey: () => 'maths',
}));

import {
  resetKangurLearnerActivityStatusCacheForTests,
  useKangurLearnerActivityPing,
  useKangurLearnerActivityStatus,
} from '@/features/kangur/ui/hooks/useKangurLearnerActivity';

describe('useKangurLearnerActivityStatus', () => {
  const eventSourceCtor = vi.fn();
  const eventSourceClose = vi.fn();
  const eventSources: MockEventSource[] = [];

  class MockEventSource {
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    close = eventSourceClose;

    constructor(_url: string) {
      eventSourceCtor(_url);
      eventSources.push(this);
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    resetKangurLearnerActivityStatusCacheForTests();
    eventSources.length = 0;
    learnerActivityGetMock.mockResolvedValue({ snapshot: null, isOnline: false });
    learnerActivityUpdateMock.mockResolvedValue(undefined);
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('updates status from SSE snapshot events', async () => {
    const { result } = renderHook(() =>
      useKangurLearnerActivityStatus({
        enabled: true,
        learnerId: 'learner-1',
        refreshIntervalMs: 0,
      })
    );

    await waitFor(() => {
      expect(eventSourceCtor).toHaveBeenCalledWith(
        '/kangur-api/learner-activity/stream?learnerId=learner-1'
      );
    });

    const instance = eventSources[0]!;
    const payload = {
      type: 'snapshot',
      data: {
        snapshot: {
          learnerId: 'learner-1',
          kind: 'game',
          title: 'Gra: Dodawanie',
          href: '/kangur/game',
          startedAt: '2026-03-15T12:00:00.000Z',
          updatedAt: '2026-03-15T12:01:00.000Z',
        },
        isOnline: true,
      },
    };

    act(() => {
      instance.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent<string>);
    });

    await waitFor(() => {
      expect(result.current.status?.snapshot?.title).toBe('Gra: Dodawanie');
      expect(result.current.status?.isOnline).toBe(true);
    });
  });

  it('closes SSE on fallback event', async () => {
    renderHook(() =>
      useKangurLearnerActivityStatus({
        enabled: true,
        learnerId: 'learner-1',
        refreshIntervalMs: 0,
      })
    );

    await waitFor(() => {
      expect(eventSources).toHaveLength(1);
    });

    const instance = eventSources[0]!;
    act(() => {
      instance.onmessage?.({
        data: JSON.stringify({ type: 'fallback', data: { reason: 'redis_unavailable' } }),
      } as MessageEvent<string>);
    });

    await waitFor(() => {
      expect(eventSourceClose).toHaveBeenCalled();
    });
  });

  it('defers the initial refresh and SSE startup until the requested delay elapses', async () => {
    vi.useFakeTimers();

    renderHook(() =>
      useKangurLearnerActivityStatus({
        deferInitialRefreshMs: 1_200,
        enabled: true,
        learnerId: 'learner-1',
        refreshIntervalMs: 0,
      })
    );

    expect(learnerActivityGetMock).not.toHaveBeenCalled();
    expect(eventSourceCtor).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_199);
    });

    expect(learnerActivityGetMock).not.toHaveBeenCalled();
    expect(eventSourceCtor).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(learnerActivityGetMock).not.toHaveBeenCalled();
    expect(eventSourceCtor).toHaveBeenCalledWith(
      '/kangur-api/learner-activity/stream?learnerId=learner-1'
    );
  });

  it('reuses a fresh cached learner status across remounts without another immediate refresh', async () => {
    const cachedStatus = {
      snapshot: {
        learnerId: 'learner-cached',
        kind: 'lesson' as const,
        title: 'Lekcja: Zegar',
        href: '/kangur/lessons?component=clock',
        startedAt: '2026-03-15T12:00:00.000Z',
        updatedAt: '2026-03-15T12:01:00.000Z',
      },
      isOnline: true,
    };
    learnerActivityGetMock.mockResolvedValue(cachedStatus);

    const firstMount = renderHook(
      () =>
        useKangurLearnerActivityStatus({
          enabled: true,
          learnerId: 'learner-cached',
          refreshIntervalMs: 30_000,
          streamEnabled: false,
        })
    );

    await waitFor(() => {
      expect(firstMount.result.current.status?.snapshot?.title).toBe('Lekcja: Zegar');
      expect(firstMount.result.current.isLoading).toBe(false);
    });

    firstMount.unmount();

    const secondMount = renderHook(
      () =>
        useKangurLearnerActivityStatus({
          enabled: true,
          learnerId: 'learner-cached',
          refreshIntervalMs: 30_000,
          streamEnabled: false,
        })
    );

    expect(secondMount.result.current.status?.snapshot?.title).toBe('Lekcja: Zegar');
    expect(secondMount.result.current.isLoading).toBe(false);

    await waitFor(() => {
      expect(secondMount.result.current.status?.snapshot?.title).toBe('Lekcja: Zegar');
    });

    expect(learnerActivityGetMock).toHaveBeenCalledTimes(1);
  });

  it('does not poll while the learner activity stream stays active', async () => {
    vi.useFakeTimers();

    renderHook(() =>
      useKangurLearnerActivityStatus({
        enabled: true,
        learnerId: 'learner-streaming',
        refreshIntervalMs: 30_000,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(learnerActivityGetMock).toHaveBeenCalledTimes(0);
    expect(eventSources).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
      await Promise.resolve();
    });

    expect(learnerActivityGetMock).toHaveBeenCalledTimes(0);
  });

  it('falls back to an immediate refresh when the learner activity stream ends before a snapshot', async () => {
    renderHook(() =>
      useKangurLearnerActivityStatus({
        enabled: true,
        learnerId: 'learner-fallback',
        refreshIntervalMs: 30_000,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(learnerActivityGetMock).toHaveBeenCalledTimes(0);
    expect(eventSources).toHaveLength(1);

    const instance = eventSources[0]!;
    await act(async () => {
      instance.onmessage?.({
        data: JSON.stringify({ type: 'fallback', data: { reason: 'redis_unavailable' } }),
      } as MessageEvent<string>);
      await Promise.resolve();
    });

    expect(learnerActivityGetMock).toHaveBeenCalledTimes(1);
  });
});

describe('useKangurLearnerActivityPing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    learnerActivityUpdateMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dedupes mount and immediate focus/visibility pings for the same activity', async () => {
    vi.useFakeTimers();

    renderHook(() =>
      useKangurLearnerActivityPing({
        activity: {
          kind: 'game',
          title: 'Gra: Dodawanie',
          href: '/kangur/game',
        },
        enabled: true,
        intervalMs: 45_000,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(learnerActivityUpdateMock).toHaveBeenCalledTimes(1);
    expect(recordKangurOpenedTaskMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(learnerActivityUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('still sends the normal heartbeat after the dedupe window elapses', async () => {
    vi.useFakeTimers();

    renderHook(() =>
      useKangurLearnerActivityPing({
        activity: {
          kind: 'game',
          title: 'Gra: Dodawanie',
          href: '/kangur/game',
        },
        enabled: true,
        intervalMs: 45_000,
      })
    );

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(45_000);
      await Promise.resolve();
    });

    expect(learnerActivityUpdateMock).toHaveBeenCalledTimes(2);
  });
});
