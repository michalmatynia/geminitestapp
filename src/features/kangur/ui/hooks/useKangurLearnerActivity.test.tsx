/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const {
  learnerActivityGetMock,
  logKangurClientErrorMock,
  reportKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
} = vi.hoisted(() => ({
  learnerActivityGetMock: vi.fn(),
  ...globalThis.__kangurClientErrorMocks(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    learnerActivity: {
      get: learnerActivityGetMock,
      update: vi.fn(),
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  reportKangurClientError: reportKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

import { useKangurLearnerActivityStatus } from '@/features/kangur/ui/hooks/useKangurLearnerActivity';

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
    eventSources.length = 0;
    learnerActivityGetMock.mockResolvedValue({ snapshot: null, isOnline: false });
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
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
        '/api/kangur/learner-activity/stream?learnerId=learner-1'
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
});
