/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurMobileLeaderboardMock } = vi.hoisted(() => ({
  useKangurMobileLeaderboardMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('./useKangurMobileLeaderboard', () => ({
  useKangurMobileLeaderboard: useKangurMobileLeaderboardMock,
}));

import { KangurLeaderboardScreen } from './KangurLeaderboardScreen';

describe('KangurLeaderboardScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurMobileLeaderboardMock.mockReturnValue({
      error: null,
      isLoading: false,
      isLoadingAuth: false,
      isRestoringAuth: false,
      items: [],
      operationFilter: 'all',
      operationOptions: [
        { id: 'all', label: 'Wszystkie', emoji: '⭐' },
        { id: 'clock', label: 'Zegar', emoji: '🕐' },
      ],
      refresh: vi.fn(),
      setOperationFilter: vi.fn(),
      setUserFilter: vi.fn(),
      userFilter: 'all',
      userOptions: [
        { id: 'all', label: 'Wszyscy' },
        { id: 'mine', label: 'Ty' },
      ],
      visibleCount: 0,
    });
  });

  it('shows the restoring leaderboard shell while auth is still loading', () => {
    useKangurMobileLeaderboardMock.mockReturnValue({
      error: null,
      isLoading: true,
      isLoadingAuth: true,
      isRestoringAuth: true,
      items: [],
      operationFilter: 'all',
      operationOptions: [
        { id: 'all', label: 'Wszystkie', emoji: '⭐' },
      ],
      refresh: vi.fn(),
      setOperationFilter: vi.fn(),
      setUserFilter: vi.fn(),
      userFilter: 'all',
      userOptions: [{ id: 'all', label: 'Wszyscy' }],
      visibleCount: 0,
    });

    render(<KangurLeaderboardScreen />);

    expect(screen.getByText('Ranking')).toBeTruthy();
    expect(
      screen.getByText(
        'Mobilny ranking korzysta z tych samych kontraktów wyników i logiki mapowania rankingu co wspólny Kangur.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Przywracamy sesję ucznia i ranking...')).toBeTruthy();
  });

  it('renders leaderboard rows after the shell settles', () => {
    useKangurMobileLeaderboardMock.mockReturnValue({
      error: null,
      isLoading: false,
      isLoadingAuth: false,
      isRestoringAuth: false,
      items: [
        {
          id: 'item-1',
          currentUserBadgeLabel: 'Ty',
          isCurrentUser: true,
          metaLabel: 'Dzisiaj · 1 sesja',
          operationSummary: 'Zegar',
          playerName: 'Ada Learner',
          rankLabel: '#1',
          scoreLabel: '8 pkt',
          timeLabel: '33s',
        },
      ],
      operationFilter: 'clock',
      operationOptions: [
        { id: 'all', label: 'Wszystkie', emoji: '⭐' },
        { id: 'clock', label: 'Zegar', emoji: '🕐' },
      ],
      refresh: vi.fn(),
      setOperationFilter: vi.fn(),
      setUserFilter: vi.fn(),
      userFilter: 'mine',
      userOptions: [
        { id: 'all', label: 'Wszyscy' },
        { id: 'mine', label: 'Ty' },
      ],
      visibleCount: 1,
    });

    render(<KangurLeaderboardScreen />);

    expect(screen.getByText('Widoczne wyniki: 1')).toBeTruthy();
    expect(screen.getByText('Ada Learner')).toBeTruthy();
    expect(screen.getByText('#1')).toBeTruthy();
    expect(screen.getAllByText('Ty').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Zegar')).toBeTruthy();
    expect(screen.getByText('8 pkt')).toBeTruthy();
    expect(screen.queryByText('Przywracamy sesję ucznia i ranking...')).toBeNull();
  });
});
