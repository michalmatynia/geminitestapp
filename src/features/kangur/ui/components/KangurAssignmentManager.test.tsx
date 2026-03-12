/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useKangurProgressStateMock = vi.hoisted(() => vi.fn());
const useKangurAssignmentsMock = vi.hoisted(() => vi.fn());
const useSettingsStoreMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: useSettingsStoreMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/services/delegated-assignments', () => ({
  buildKangurAssignmentCatalog: () => [],
  buildKangurAssignmentListItems: () => [],
  buildRecommendedKangurAssignmentCatalog: () => [],
  filterKangurAssignmentCatalog: () => [],
  buildKangurAssignmentHref: () => '/kangur/game',
  formatKangurAssignmentPriorityLabel: (priority: 'high' | 'medium' | 'low') =>
    priority === 'high'
      ? 'Priorytet wysoki'
      : priority === 'medium'
        ? 'Priorytet sredni'
        : 'Priorytet niski',
  getKangurAssignmentActionLabel: () => 'Otworz zadanie',
  resolveKangurAssignmentPriorityAccent: (priority: 'high' | 'medium' | 'low') =>
    priority === 'high' ? 'rose' : priority === 'medium' ? 'amber' : 'emerald',
}));

vi.mock('@/features/kangur/ui/components/KangurAssignmentsList', () => ({
  default: ({ title }: { title: string }) => <div data-testid={`assignment-list-${title}`}>{title}</div>,
}));

vi.mock('@/features/kangur/ui/components/KangurTransitionLink', () => ({
  KangurTransitionLink: ({
    children,
    href,
    targetPageKey: _targetPageKey,
    transitionAcknowledgeMs: _transitionAcknowledgeMs,
    transitionSourceId: _transitionSourceId,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    targetPageKey?: string;
    transitionAcknowledgeMs?: number;
    transitionSourceId?: string | null;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import KangurAssignmentManager from '@/features/kangur/ui/components/KangurAssignmentManager';
import type { KangurDailyQuestState } from '@/features/kangur/ui/services/daily-quests';

const progress = {
  totalXp: 480,
  gamesPlayed: 4,
  perfectGames: 1,
  lessonsCompleted: 2,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: [],
  operationsPlayed: [],
  totalCorrectAnswers: 20,
  totalQuestionsAnswered: 25,
  dailyQuestsCompleted: 1,
  bestWinStreak: 2,
  activityStats: {},
  lessonMastery: {
    division: {
      attempts: 2,
      completions: 2,
      masteryPercent: 82,
      bestScorePercent: 90,
      lastScorePercent: 82,
      lastCompletedAt: '2026-03-10T11:00:00.000Z',
    },
  },
};

const featuredDailyQuest: KangurDailyQuestState = {
  assignment: {
    id: 'mixed-practice',
    title: 'Trening mieszany',
    description: 'Podtrzymaj rytm nauki krotszym treningiem mieszanym.',
    target: '12 pytan',
    priority: 'medium',
    action: {
      label: 'Uruchom trening',
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    },
    questLabel: 'Misja dnia',
    rewardXp: 36,
    progressLabel: 'Rytm dnia: 1 gra',
    questMetric: {
      kind: 'games_played',
      targetDelta: 1,
    },
  },
  createdAt: '2026-03-10T08:00:00.000Z',
  dateKey: '2026-03-10',
  expiresAt: '2026-03-10T23:59:59.999Z',
  expiresLabel: 'Wygasa dzisiaj',
  progress: {
    current: 1,
    target: 1,
    percent: 100,
    summary: '1/1 runda dzisiaj',
    status: 'completed',
  },
  reward: {
    xp: 36,
    status: 'ready',
    label: 'Nagroda gotowa +36 XP',
  },
};

describe('KangurAssignmentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStoreMock.mockReturnValue({
      get: vi.fn(),
    });
    useKangurProgressStateMock.mockReturnValue(progress);
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
    });
  });

  it('renders the featured daily quest card with progress and action', () => {
    render(<KangurAssignmentManager basePath='/kangur' featuredDailyQuest={featuredDailyQuest} />);

    expect(screen.getByTestId('assignment-manager-daily-quest')).toHaveTextContent('Misja dnia ucznia');
    expect(screen.getByTestId('assignment-manager-daily-quest')).toHaveTextContent('Trening mieszany');
    expect(screen.getByTestId('assignment-manager-daily-quest')).toHaveTextContent('1/1 runda dzisiaj');
    expect(screen.getByTestId('assignment-manager-daily-quest')).toHaveTextContent(
      'Nagroda gotowa +36 XP'
    );
    expect(screen.getByRole('link', { name: 'Uruchom trening' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=training'
    );
    expect(screen.getByTestId('assignment-manager-track-summary')).toHaveTextContent(
      'Sciezki postepu ucznia'
    );
    expect(screen.getByTestId('assignment-manager-track-quest')).toHaveTextContent('Misje');
    expect(screen.getByTestId('assignment-manager-track-quest')).toHaveTextContent('1/4 odznak');
    expect(screen.getByTestId('assignment-manager-track-mastery')).toHaveTextContent(
      'Mistrzostwo'
    );
  });
});
