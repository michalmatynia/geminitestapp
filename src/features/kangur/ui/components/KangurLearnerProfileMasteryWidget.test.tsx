/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurLearnerProfileRuntimeMock, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

import { KangurLearnerProfileMasteryWidget } from './KangurLearnerProfileMasteryWidget';

describe('KangurLearnerProfileMasteryWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('uses Mongo-backed mastery intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      entry: {
        id: 'learner-profile-mastery',
        title: 'Opanowanie lekcji',
        summary: 'Mongo opis tematów do powtórki i najmocniejszych obszarów.',
      },
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      progress: {
        totalXp: 480,
        gamesPlayed: 18,
        perfectGames: 5,
        lessonsCompleted: 11,
        clockPerfect: 2,
        calendarPerfect: 1,
        geometryPerfect: 1,
        badges: ['first_game'],
        operationsPlayed: ['addition'],
        lessonMastery: {
          division: {
            attempts: 2,
            completions: 2,
            masteryPercent: 45,
            bestScorePercent: 60,
            lastScorePercent: 40,
            lastCompletedAt: '2026-03-06T10:00:00.000Z',
          },
          clock: {
            attempts: 4,
            completions: 4,
            masteryPercent: 92,
            bestScorePercent: 100,
            lastScorePercent: 90,
            lastCompletedAt: '2026-03-06T12:00:00.000Z',
          },
        },
      },
    });

    render(<KangurLearnerProfileMasteryWidget />);

    expect(screen.getByText('Opanowanie lekcji')).toBeInTheDocument();
    expect(
      screen.getByText('Mongo opis tematów do powtórki i najmocniejszych obszarów.')
    ).toBeInTheDocument();
    expect(screen.getByText(/Nauka zegara/)).toBeInTheDocument();
    expect(screen.getAllByText(/Dzielenie/).length).toBeGreaterThan(0);
  });
});
