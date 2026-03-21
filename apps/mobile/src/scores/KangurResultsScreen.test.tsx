/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  replaceMock,
  useLocalSearchParamsMock,
  useKangurMobileResultsMock,
  useKangurMobileResultsDuelsMock,
  useRouterMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useLocalSearchParamsMock: vi.fn(),
  useKangurMobileResultsMock: vi.fn(),
  useKangurMobileResultsDuelsMock: vi.fn(),
  useRouterMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
  useRouter: useRouterMock,
}));

vi.mock('./useKangurMobileResults', () => ({
  useKangurMobileResults: useKangurMobileResultsMock,
}));

vi.mock('./useKangurMobileResultsDuels', () => ({
  useKangurMobileResultsDuels: useKangurMobileResultsDuelsMock,
}));

import { KangurResultsScreen } from './KangurResultsScreen';

describe('KangurResultsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocalSearchParamsMock.mockReturnValue({});
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    useKangurMobileResultsMock.mockReturnValue({
      availableOperations: [],
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      operationPerformance: [],
      refresh: vi.fn(),
      scores: [],
      summary: {
        arithmeticSessions: 0,
        averageAccuracyPercent: 0,
        bestAccuracyPercent: 0,
        logicSessions: 0,
        timeSessions: 0,
        totalSessions: 0,
      },
    });
    useKangurMobileResultsDuelsMock.mockReturnValue({
      actionError: null,
      createRematch: vi.fn(),
      currentEntry: null,
      currentRank: null,
      error: null,
      isActionPending: false,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [],
      pendingOpponentLearnerId: null,
      refresh: vi.fn(),
    });
  });

  it('shows the restoring history state while results are loading', () => {
    useKangurMobileResultsMock.mockReturnValue({
      availableOperations: [],
      error: null,
      isEnabled: true,
      isLoading: true,
      isRestoringAuth: true,
      operationPerformance: [],
      refresh: vi.fn(),
      scores: [],
      summary: {
        arithmeticSessions: 0,
        averageAccuracyPercent: 0,
        bestAccuracyPercent: 0,
        logicSessions: 0,
        timeSessions: 0,
        totalSessions: 0,
      },
    });

    render(<KangurResultsScreen />);

    expect(screen.getByText('Historia wyników')).toBeTruthy();
    expect(screen.getByText('Ostatnie sesje mobilne')).toBeTruthy();
    expect(
      screen.getByText('Przywracamy sesję ucznia i historię wyników.'),
    ).toBeTruthy();
  });

  it('renders metrics, insights, and score rows after results settle', async () => {
    const createRematchMock = vi.fn().mockResolvedValue('duel-results-1');
    useKangurMobileResultsMock.mockReturnValue({
      availableOperations: ['clock', 'addition'],
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      operationPerformance: [
        {
          averageAccuracyPercent: 100,
          bestAccuracyPercent: 100,
          family: 'time',
          operation: 'clock',
          sessions: 2,
        },
        {
          averageAccuracyPercent: 52,
          bestAccuracyPercent: 63,
          family: 'arithmetic',
          operation: 'addition',
          sessions: 3,
        },
      ],
      refresh: vi.fn(),
      scores: [
        {
          id: 'score-1',
          created_date: '2026-03-21T08:00:00.000Z',
          operation: 'clock',
          correct_answers: 8,
          total_questions: 8,
          score: 8,
          time_taken: 33,
        },
      ],
      summary: {
        arithmeticSessions: 3,
        averageAccuracyPercent: 74,
        bestAccuracyPercent: 100,
        logicSessions: 0,
        timeSessions: 2,
        totalSessions: 5,
      },
    });
    useKangurMobileResultsDuelsMock.mockReturnValue({
      actionError: null,
      createRematch: createRematchMock,
      currentEntry: {
        displayName: 'Ada Learner',
        lastPlayedAt: '2026-03-21T08:07:00.000Z',
        learnerId: 'learner-1',
        losses: 2,
        matches: 5,
        ties: 0,
        winRate: 0.6,
        wins: 3,
      },
      currentRank: 2,
      error: null,
      isActionPending: false,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [
        {
          displayName: 'Leo Mentor',
          lastPlayedAt: '2026-03-21T08:05:00.000Z',
          learnerId: 'learner-2',
        },
      ],
      pendingOpponentLearnerId: null,
      refresh: vi.fn(),
    });

    render(<KangurResultsScreen />);

    expect(screen.getByText('Sesje')).toBeTruthy();
    expect(screen.getAllByText('Arytmetyka').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Czas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Wnioski po trybach')).toBeTruthy();
    expect(screen.getAllByText('Zegar').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Dodawanie').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pojedynki')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Szybki rewanż')).toBeTruthy();
    expect(screen.getByText('Pełna lista')).toBeTruthy();
    expect(screen.getByText('Trening czasu')).toBeTruthy();
    expect(screen.queryByText('Przywracamy sesję ucznia i historię wyników.')).toBeNull();

    fireEvent.click(screen.getByText('Szybki rewanż'));

    expect(createRematchMock).toHaveBeenCalledWith('learner-2');
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith({
        pathname: '/duels',
        params: {
          sessionId: 'duel-results-1',
        },
      });
    });
  });
});
