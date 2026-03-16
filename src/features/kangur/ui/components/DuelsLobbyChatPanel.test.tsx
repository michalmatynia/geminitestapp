/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurLobbyChatMock } = vi.hoisted(() => ({
  useKangurLobbyChatMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLobbyChat', () => ({
  useKangurLobbyChat: useKangurLobbyChatMock,
}));

import { DuelsLobbyChatPanel } from '@/features/kangur/ui/components/DuelsLobbyChatPanel';

describe('DuelsLobbyChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders lobby chat messages and actions', () => {
    useKangurLobbyChatMock.mockReturnValue({
      messages: [
        {
          id: 'msg-1',
          lobbyId: 'duels_lobby',
          senderId: 'learner-1',
          senderName: 'Ada',
          senderAvatarId: null,
          message: 'Cześć!',
          createdAt: '2026-03-16T12:00:00.000Z',
        },
      ],
      isLoading: false,
      isLoadingOlder: false,
      isSending: false,
      isStreaming: true,
      error: null,
      lastUpdatedAt: '2026-03-16T12:00:00.000Z',
      nextCursor: null,
      refresh: vi.fn(),
      loadOlder: vi.fn(),
      sendMessage: vi.fn(),
      maxMessageLength: 280,
    });

    render(
      <DuelsLobbyChatPanel
        enabled
        isOnline
        canPost
        relativeNow={Date.now()}
        activeLearnerId='learner-1'
        onRequireLogin={vi.fn()}
      />
    );

    expect(screen.getByText('Czat lobby')).toBeInTheDocument();
    expect(screen.getByText('Ty')).toBeInTheDocument();
    expect(screen.getByText('Cześć!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wyślij' })).toBeInTheDocument();
  });

  it('shows login prompt when posting is disabled', () => {
    const onRequireLogin = vi.fn();
    useKangurLobbyChatMock.mockReturnValue({
      messages: [],
      isLoading: false,
      isLoadingOlder: false,
      isSending: false,
      isStreaming: false,
      error: null,
      lastUpdatedAt: null,
      nextCursor: null,
      refresh: vi.fn(),
      loadOlder: vi.fn(),
      sendMessage: vi.fn(),
      maxMessageLength: 280,
    });

    render(
      <DuelsLobbyChatPanel
        enabled
        isOnline
        canPost={false}
        relativeNow={Date.now()}
        activeLearnerId={null}
        onRequireLogin={onRequireLogin}
      />
    );

    const loginButton = screen.getByRole('button', { name: 'Zaloguj się' });
    fireEvent.click(loginButton);
    expect(onRequireLogin).toHaveBeenCalledTimes(1);
  });
});
