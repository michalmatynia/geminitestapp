/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurProgressState } from '@/features/kangur/ui/types';

const getCurrentKangurDailyQuestMock = vi.hoisted(() => vi.fn());
const getNextLockedBadgeMock = vi.hoisted(() => vi.fn());
const getProgressAverageXpPerSessionMock = vi.hoisted(() => vi.fn());
const useKangurSubjectFocusMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  getCurrentKangurDailyQuest: getCurrentKangurDailyQuestMock,
}));

vi.mock('@/features/kangur/ui/services/progress', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/kangur/ui/services/progress')
  >('@/features/kangur/ui/services/progress');

  return {
    ...actual,
    getNextLockedBadge: getNextLockedBadgeMock,
    getProgressAverageXpPerSession: getProgressAverageXpPerSessionMock,
  };
});

import KangurGameSetupMomentumCard from '@/features/kangur/ui/components/KangurGameSetupMomentumCard';

const buildProgress = (
  overrides: Partial<KangurProgressState> = {}
): KangurProgressState => ({
  totalXp: 420,
  gamesPlayed: 8,
  perfectGames: 2,
  lessonsCompleted: 3,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: ['first_game'],
  operationsPlayed: ['division'],
  lessonMastery: {},
  totalCorrectAnswers: 32,
  totalQuestionsAnswered: 40,
  currentWinStreak: 2,
  bestWinStreak: 4,
  activityStats: {},
  ...overrides,
});

describe('KangurGameSetupMomentumCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentKangurDailyQuestMock.mockReturnValue(null);
    getNextLockedBadgeMock.mockReturnValue(null);
    getProgressAverageXpPerSessionMock.mockReturnValue(36);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
  });

  it('prioritizes a games-played daily quest on training setup', () => {
    getCurrentKangurDailyQuestMock.mockReturnValue({
      assignment: {
        title: 'Trening mieszany',
        questMetric: {
          kind: 'games_played',
          targetDelta: 1,
        },
      },
      progress: {
        summary: '0/1 runda dzisiaj',
        status: 'not_started',
      },
      reward: {
        label: 'Nagroda +36 XP',
        status: 'locked',
      },
    });

    render(<KangurGameSetupMomentumCard mode='training' progress={buildProgress()} />);

    expect(screen.getByTestId('kangur-game-setup-momentum-label-training')).toHaveTextContent(
      'Misja dnia'
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-title-training')).toHaveTextContent(
      'Ta sesja przybliza misje dnia'
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-title-training')).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-description-training')).toHaveTextContent(
      'Trening mieszany. 0/1 runda dzisiaj. Nagroda +36 XP.'
    );
    expect(
      screen.getByTestId('kangur-game-setup-momentum-description-training')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
  });

  it('falls back to the next badge on kangur setup', () => {
    getNextLockedBadgeMock.mockReturnValue({
      name: 'Pół tysiąca XP',
      summary: '420/500 XP',
    });

    render(<KangurGameSetupMomentumCard mode='kangur' progress={buildProgress()} />);

    expect(screen.getByTestId('kangur-game-setup-momentum-label-kangur')).toHaveTextContent(
      'Nastepna odznaka'
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-title-kangur')).toHaveTextContent(
      'Zagraj o kolejny prog'
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-description-kangur')).toHaveTextContent(
      'Mocny wynik w tej rundzie przybliza odznake Pół tysiąca XP. 420/500 XP.'
    );
  });

  it('prioritizes guided momentum before the generic next-badge fallback', () => {
    getNextLockedBadgeMock.mockReturnValue({
      name: 'Pół tysiąca XP',
      summary: '420/500 XP',
    });

    render(
      <KangurGameSetupMomentumCard
        mode='training'
        progress={buildProgress({ recommendedSessionsCompleted: 2 })}
      />
    );

    expect(screen.getByTestId('kangur-game-setup-momentum-label-training')).toHaveTextContent(
      'Polecony kierunek'
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-title-training')).toHaveTextContent(
      'Dopnij polecany kierunek'
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-description-training')).toHaveTextContent(
      'Ta sesja pcha polecany kierunek do odznaki Trzymam kierunek.'
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-description-training')).toHaveTextContent(
      '2/3'
    );
  });

  it('stays hidden when there is no meaningful momentum to show', () => {
    getProgressAverageXpPerSessionMock.mockReturnValue(0);

    const { container } = render(
      <KangurGameSetupMomentumCard
        mode='training'
        progress={buildProgress({
          gamesPlayed: 0,
          currentWinStreak: 0,
        })}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
