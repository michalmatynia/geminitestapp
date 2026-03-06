/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurScoreRecord, KangurUser } from '@/features/kangur/services/ports';
import type { KangurProgressState } from '@/features/kangur/ui/types';

const {
  useKangurRoutingMock,
  useKangurAuthMock,
  useKangurProgressStateMock,
  scoreFilterMock,
  navigateToLoginMock,
} = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  scoreFilterMock: vi.fn(),
  navigateToLoginMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      filter: scoreFilterMock,
    },
  }),
}));

import LearnerProfile from '@/features/kangur/ui/pages/LearnerProfile';

const baseProgress: KangurProgressState = {
  totalXp: 620,
  gamesPlayed: 22,
  perfectGames: 6,
  lessonsCompleted: 9,
  clockPerfect: 2,
  calendarPerfect: 1,
  geometryPerfect: 1,
  badges: ['first_game', 'perfect_10', 'lesson_hero', 'ten_games'],
  operationsPlayed: ['addition', 'division'],
  lessonMastery: {},
};

const createUser = (overrides: Partial<KangurUser> = {}): KangurUser => ({
  id: 'user-jan',
  full_name: 'Jan',
  email: 'jan@example.com',
  role: 'user',
  ...overrides,
});

const createScore = (overrides: Partial<KangurScoreRecord>): KangurScoreRecord => ({
  id: 'score-1',
  player_name: 'Jan',
  score: 8,
  operation: 'addition',
  total_questions: 10,
  correct_answers: 8,
  time_taken: 42,
  created_date: '2026-03-06T12:00:00.000Z',
  created_by: 'jan@example.com',
  ...overrides,
});

describe('Kangur accessibility smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
    });
    useKangurProgressStateMock.mockReturnValue(baseProgress);
    useKangurAuthMock.mockReturnValue({
      user: createUser(),
      navigateToLogin: navigateToLoginMock,
    });
  });

  it('exposes profile landmarks and action links by accessible role/name', async () => {
    scoreFilterMock.mockImplementation(
      async (criteria: Partial<KangurScoreRecord>): Promise<KangurScoreRecord[]> => {
        if (criteria.created_by) {
          return [createScore({ id: 's1', operation: 'addition', score: 9, correct_answers: 9 })];
        }
        if (criteria.player_name) {
          return [createScore({ id: 's2', operation: 'division', score: 6, correct_answers: 6 })];
        }
        return [];
      }
    );

    render(<LearnerProfile />);

    await waitFor(() => expect(scoreFilterMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('heading', { name: 'Profil ucznia' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Strona glowna/i })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Lekcje' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Rodzic' })).toBeVisible();
    expect(screen.getByText('Plan na dzis')).toBeVisible();

    expect(screen.getByRole('link', { name: 'Zagraj teraz' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Otworz lekcje' })).toBeVisible();
  });

  it('supports keyboard-triggered login action in local mode', async () => {
    useKangurAuthMock.mockReturnValue({
      user: null,
      navigateToLogin: navigateToLoginMock,
    });

    render(<LearnerProfile />);

    const loginButton = screen.getByRole('button', {
      name: 'Zaloguj sie, aby synchronizowac postep',
    });
    loginButton.focus();

    const user = userEvent.setup();
    await user.keyboard('{Enter}');

    expect(navigateToLoginMock).toHaveBeenCalledTimes(1);
  });
});
