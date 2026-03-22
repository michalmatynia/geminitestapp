/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useDuelsLobbyMock, useDuelStateMock, authState, navigationSpy } = vi.hoisted(() => ({
  useDuelsLobbyMock: vi.fn(),
  useDuelStateMock: vi.fn(),
  authState: {
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
  },
  navigationSpy: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => authState,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({
    basePath: '/kangur',
    embedded: false,
  }),
  useOptionalKangurRouting: () => ({
    basePath: '/kangur',
    embedded: false,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurGuestPlayerContext', () => ({
  useKangurGuestPlayer: () => ({
    guestPlayerName: 'Guest',
    setGuestPlayerName: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => ({
    openLoginModal: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({
  KangurTopNavigationController: ({ navigation }: { navigation: any }) => {
    navigationSpy(navigation);
    return <div data-testid='kangur-top-navigation' />;
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: () => undefined,
}));

vi.mock('./duels/useDuelsLobby', () => ({
  useDuelsLobby: (...args: any[]) => useDuelsLobbyMock(...args),
}));

vi.mock('./duels/useDuelState', () => ({
  useDuelState: (...args: any[]) => useDuelStateMock(...args),
}));

vi.mock('./duels/DuelsLobbyPanel', () => ({
  DuelsLobbyPanel: ({ filteredPublicLobbyEntries = [], isLobbyLoading = false }: any) => (
    <div data-testid='duels-lobby-panel'>
      <div data-testid='lobby-count'>{filteredPublicLobbyEntries.length}</div>
      <div data-testid='lobby-loading'>{String(isLobbyLoading)}</div>
    </div>
  ),
}));

import Duels from '@/features/kangur/ui/pages/Duels';

describe('Duels page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isAuthenticated = false;
    authState.user = null;
    useDuelsLobbyMock.mockReturnValue({
      lobbyEntries: [],
      isLobbyLoading: false,
      lobbyLastUpdatedAt: null,
      lobbyError: null,
      relativeNow: Date.now(),
      lobbyFresh: new Map(),
      loadLobby: vi.fn(),
    });
  });

  it('renders lobby panel with entries from the lobby hook', () => {
    useDuelsLobbyMock.mockReturnValue({
      lobbyEntries: [{ sessionId: 'duel-1' }],
      isLobbyLoading: true,
      lobbyLastUpdatedAt: null,
      lobbyError: null,
      relativeNow: Date.now(),
      lobbyFresh: new Map(),
      loadLobby: vi.fn(),
    });

    render(<Duels />);

    expect(screen.getByTestId('duels-lobby-panel')).toBeInTheDocument();
    expect(screen.getByTestId('lobby-count')).toHaveTextContent('1');
    expect(screen.getByTestId('lobby-loading')).toHaveTextContent('true');
  });

  it('configures lobby hook for guests by default', () => {
    render(<Duels />);

    expect(useDuelsLobbyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        canPlay: false,
        isGuest: true,
      })
    );
  });

  it('configures lobby hook for authenticated users with an active learner', () => {
    authState.isAuthenticated = true;
    authState.user = {
      id: 'user-1',
      full_name: 'Parent',
      email: 'parent@example.com',
      role: 'user',
      actorType: 'parent',
      canManageLearners: true,
      ownerUserId: 'user-1',
      ownerEmailVerified: true,
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'user-1',
        displayName: 'Learner',
        loginName: 'learner',
        status: 'active',
        legacyUserKey: null,
        aiTutor: {
          mood: 'calm',
          level: 'primary',
          voice: 'neutral',
          emoji: 'smile',
          voiceStyle: 'gentle',
          tone: 'encouraging',
          language: 'pl',
          defaultSupportMode: 'encourage',
          intensity: 0.5,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      learners: [],
    } as any;

    render(<Duels />);

    expect(useDuelsLobbyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        canPlay: true,
        isGuest: false,
      })
    );
  });

  it('disables lobby play when no active learner is selected', () => {
    authState.isAuthenticated = true;
    authState.user = {
      id: 'user-2',
      full_name: 'Parent',
      email: 'parent@example.com',
      role: 'user',
      actorType: 'parent',
      canManageLearners: true,
      ownerUserId: 'user-2',
      ownerEmailVerified: true,
      activeLearner: null,
      learners: [],
    } as any;

    render(<Duels />);

    expect(useDuelsLobbyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        canPlay: false,
      })
    );
  });

  it('registers top navigation for the Duels page', () => {
    render(<Duels />);

    expect(navigationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: '/kangur',
        currentPage: 'Duels',
        isAuthenticated: false,
      })
    );
  });

  it('uses the shared Kangur main content id for accessibility contracts', () => {
    render(<Duels />);

    expect(document.getElementById('kangur-main-content')).toBeInTheDocument();
  });
});
