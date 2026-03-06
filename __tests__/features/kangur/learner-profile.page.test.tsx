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
  scoreFilterMock,
  loadProgressMock,
  navigateToLoginMock,
  logKangurClientErrorMock,
} = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  scoreFilterMock: vi.fn(),
  loadProgressMock: vi.fn(),
  navigateToLoginMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      filter: scoreFilterMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    loadProgress: loadProgressMock,
  };
});

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
  operationsPlayed: ['addition', 'multiplication', 'division'],
};

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

const createUser = (overrides: Partial<KangurUser> = {}): KangurUser => ({
  id: 'user-jan',
  full_name: 'Jan',
  email: 'jan@example.com',
  role: 'user',
  ...overrides,
});

describe('LearnerProfile page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
    });
    loadProgressMock.mockReturnValue(baseProgress);
    useKangurAuthMock.mockReturnValue({
      user: createUser(),
      navigateToLogin: navigateToLoginMock,
    });
  });

  it('loads user scores and renders profile metrics', async () => {
    scoreFilterMock.mockImplementation(
      (criteria: Partial<KangurScoreRecord>): Promise<KangurScoreRecord[]> => {
        if (criteria.created_by) {
          return Promise.resolve([
            createScore({ id: 's1', operation: 'addition', correct_answers: 8 }),
            createScore({ id: 's2', operation: 'multiplication', correct_answers: 10, score: 10 }),
          ]);
        }
        if (criteria.player_name) {
          return Promise.resolve([
            createScore({ id: 's2', operation: 'multiplication', correct_answers: 10, score: 10 }),
            createScore({ id: 's3', operation: 'division', correct_answers: 6, score: 6 }),
          ]);
        }
        return Promise.resolve([]);
      }
    );

    render(<LearnerProfile />);

    await waitFor(() => expect(scoreFilterMock).toHaveBeenCalledTimes(2));
    expect(scoreFilterMock).toHaveBeenCalledWith({ created_by: 'jan@example.com' }, '-created_date', 120);
    expect(scoreFilterMock).toHaveBeenCalledWith({ player_name: 'Jan' }, '-created_date', 120);

    expect(screen.getByRole('heading', { name: 'Profil ucznia' })).toBeInTheDocument();
    expect(screen.getByText('Statystyki ucznia: Jan.')).toBeInTheDocument();
    expect(screen.getByText('Poziom 4 · 620 XP lacznie')).toBeInTheDocument();
    expect(screen.getByText('Wyniki wg operacji')).toBeInTheDocument();
    expect(screen.getByText('Plan na dzis')).toBeInTheDocument();
    expect(screen.getByText('Priorytet sredni')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Otworz lekcje' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=division'
    );
    expect(screen.getByRole('link', { name: 'Zagraj dzis' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=training'
    );
    expect(screen.getByText('➕ Dodawanie')).toBeInTheDocument();
    expect(screen.getByText('✖️ Mnozenie')).toBeInTheDocument();
    expect(screen.getByText('➗ Dzielenie')).toBeInTheDocument();
    const operationTrainingHrefs = screen
      .getAllByRole('link', { name: 'Trenuj' })
      .map((link) => link.getAttribute('href'));
    expect(operationTrainingHrefs).toEqual(
      expect.arrayContaining([
        '/kangur/game?quickStart=operation&operation=multiplication&difficulty=hard',
        '/kangur/game?quickStart=operation&operation=addition&difficulty=medium',
        '/kangur/game?quickStart=operation&operation=division&difficulty=easy',
      ])
    );
    expect(screen.queryByRole('button', { name: /Zaloguj sie/i })).not.toBeInTheDocument();
  });

  it('keeps profile in local mode when user is not authenticated', async () => {
    useKangurAuthMock.mockReturnValue({
      user: null,
      navigateToLogin: navigateToLoginMock,
    });

    render(<LearnerProfile />);

    expect(scoreFilterMock).not.toHaveBeenCalled();
    expect(screen.getByText('Statystyki ucznia: Tryb lokalny.')).toBeInTheDocument();

    const loginButton = screen.getByRole('button', { name: 'Zaloguj sie, aby synchronizowac postep' });
    await userEvent.click(loginButton);
    expect(navigateToLoginMock).toHaveBeenCalledTimes(1);
  });

  it('shows scores loading error when score provider fails', async () => {
    scoreFilterMock.mockRejectedValue(new Error('Network unavailable'));

    render(<LearnerProfile />);

    expect(await screen.findByText('Nie udalo sie pobrac historii wynikow.')).toBeInTheDocument();
    expect(logKangurClientErrorMock).toHaveBeenCalledTimes(1);
  });
});
