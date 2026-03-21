/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useLocalSearchParamsMock,
  useKangurMobileResultsMock,
} = vi.hoisted(() => ({
  useLocalSearchParamsMock: vi.fn(),
  useKangurMobileResultsMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
}));

vi.mock('./useKangurMobileResults', () => ({
  useKangurMobileResults: useKangurMobileResultsMock,
}));

import { KangurResultsScreen } from './KangurResultsScreen';

describe('KangurResultsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocalSearchParamsMock.mockReturnValue({});
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

  it('renders metrics, insights, and score rows after results settle', () => {
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

    render(<KangurResultsScreen />);

    expect(screen.getByText('Sesje')).toBeTruthy();
    expect(screen.getAllByText('Arytmetyka').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Czas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Wnioski po trybach')).toBeTruthy();
    expect(screen.getAllByText('Zegar').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Dodawanie').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pełna lista')).toBeTruthy();
    expect(screen.getByText('Trening czasu')).toBeTruthy();
    expect(screen.queryByText('Przywracamy sesję ucznia i historię wyników.')).toBeNull();
  });
});
