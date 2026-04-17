/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  logKangurClientErrorMock,
  reportKangurClientErrorMock,
  trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
  lobbyChatListMock,
  lobbyChatSendMock,
} = vi.hoisted(() => ({
  logKangurClientErrorMock: globalThis.__kangurClientErrorMocks().logKangurClientErrorMock,
  reportKangurClientErrorMock: globalThis.__kangurClientErrorMocks().reportKangurClientErrorMock,
  trackKangurClientEventMock: vi.fn(),
  withKangurClientError: globalThis.__kangurClientErrorMocks().withKangurClientError,
  withKangurClientErrorSync: globalThis.__kangurClientErrorMocks().withKangurClientErrorSync,
  lobbyChatListMock: vi.fn(),
  lobbyChatSendMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    lobbyChat: {
      list: lobbyChatListMock,
      send: lobbyChatSendMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  reportKangurClientError: reportKangurClientErrorMock,
  trackKangurClientEvent: trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

import { useKangurLobbyChat } from '@/features/kangur/ui/hooks/useKangurLobbyChat';

const createMessage = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'msg-1',
  lobbyId: 'duels_lobby',
  senderId: 'learner-1',
  senderName: 'Ada',
  senderAvatarId: null,
  message: 'Czesc!',
  createdAt: '2026-03-16T12:00:00.000Z',
  ...overrides,
});

describe('useKangurLobbyChat', () => {
  const eventSourceCtor = vi.fn();
  const eventSourceClose = vi.fn();
  const eventSources: MockEventSource[] = [];

  class MockEventSource {
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    close = eventSourceClose;

    constructor(url: string) {
      eventSourceCtor(url);
      eventSources.push(this);
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    eventSources.length = 0;
    lobbyChatListMock.mockResolvedValue({
      messages: [createMessage()],
      nextCursor: '2026-03-16T11:59:00.000Z',
      serverTime: '2026-03-16T12:00:00.000Z',
    });
    lobbyChatSendMock.mockResolvedValue({
      message: createMessage(),
      serverTime: '2026-03-16T12:00:00.000Z',
    });
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads lobby chat messages on mount when streaming is disabled', async () => {
    const { result } = renderHook(() =>
      useKangurLobbyChat({
        enabled: true,
        isOnline: true,
        refreshIntervalMs: 0,
        streamEnabled: false,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.messages).toHaveLength(1);
    });

    expect(result.current.messages[0]?.message).toBe('Czesc!');
    expect(result.current.lastUpdatedAt).toBe('2026-03-16T12:00:00.000Z');
    expect(result.current.nextCursor).toBe('2026-03-16T11:59:00.000Z');
    expect(eventSourceCtor).not.toHaveBeenCalled();
  });

  it('applies SSE snapshot payloads to the hook state', async () => {
    lobbyChatListMock.mockResolvedValue({
      messages: [],
      nextCursor: null,
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    const { result } = renderHook(() =>
      useKangurLobbyChat({
        enabled: true,
        isOnline: true,
        refreshIntervalMs: 0,
      })
    );

    await waitFor(() => {
      expect(eventSourceCtor).toHaveBeenCalledWith('/kangur-api/duels/lobby-chat/stream?limit=40');
    });

    act(() => {
      eventSources[0]?.onmessage?.({
        data: JSON.stringify({
          type: 'snapshot',
          data: {
            messages: [
              createMessage({
                id: 'msg-stream-1',
                message: 'Nowa wiadomosc',
              }),
            ],
            nextCursor: '2026-03-16T12:04:00.000Z',
            serverTime: '2026-03-16T12:05:00.000Z',
          },
        }),
      } as MessageEvent<string>);
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]?.message).toBe('Nowa wiadomosc');
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lastUpdatedAt).toBe('2026-03-16T12:05:00.000Z');
    expect(result.current.nextCursor).toBe('2026-03-16T12:04:00.000Z');
  });
});
