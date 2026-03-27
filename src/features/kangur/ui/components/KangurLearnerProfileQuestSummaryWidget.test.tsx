/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useKangurLearnerProfileRuntimeMock, useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: useKangurSubjectFocusMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  getCurrentKangurDailyQuest: () => ({
    assignment: {
      id: 'quest-1',
      title: '➗ Powtórka: Dzielenie',
      action: {
        label: 'Otwórz lekcję',
        page: 'Lessons',
        query: {
          focus: 'division',
        },
      },
      questLabel: 'Misja ratunkowa',
    },
    progress: {
      status: 'in_progress',
      percent: 60,
      summary: '45% / 75% opanowania',
    },
    reward: {
      status: 'ready',
      label: 'Nagroda +55 XP',
    },
  }),
}));

vi.mock('@/features/kangur/ui/components/KangurTransitionLink', () => ({
  KangurTransitionLink: ({
    children,
    href,
    prefetch: _prefetch,
    targetPageKey: _targetPageKey,
    transitionAcknowledgeMs: _transitionAcknowledgeMs,
    transitionSourceId: _transitionSourceId,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
    targetPageKey?: string;
    transitionAcknowledgeMs?: number;
    transitionSourceId?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurDailyQuestHighlightCardContent', () => ({
  default: ({
    action,
    description,
    questLabel,
    rewardLabel,
    title,
  }: {
    action: React.ReactNode;
    description: string;
    questLabel: string;
    rewardLabel: string;
    title: React.ReactNode;
  }) => (
    <div data-testid='kangur-daily-quest-highlight-card'>
      <div>{questLabel}</div>
      <div>{title}</div>
      <div>{description}</div>
      <div>{rewardLabel}</div>
      {action}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurHeroMilestoneSummary', () => ({
  default: () => <div data-testid='kangur-hero-milestone-summary' />,
}));

vi.mock('@/features/kangur/ui/components/KangurBadgeTrackHighlights', () => ({
  default: () => <div data-testid='kangur-badge-track-highlights' />,
}));

import { KangurLearnerProfileQuestSummaryWidget } from './KangurLearnerProfileQuestSummaryWidget';

describe('KangurLearnerProfileQuestSummaryWidget', () => {
  it('widens the daily quest action for coarse-pointer profile usage', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      progress: {
        totalXp: 540,
        gamesPlayed: 12,
        perfectGames: 3,
        lessonsCompleted: 7,
        clockPerfect: 1,
        calendarPerfect: 1,
        geometryPerfect: 0,
        badges: ['first_game'],
        operationsPlayed: ['division'],
        currentWinStreak: 3,
        bestWinStreak: 5,
        totalCorrectAnswers: 42,
        totalQuestionsAnswered: 56,
        lessonMastery: {},
        activityStats: {},
      },
      user: {
        activeLearner: {
          displayName: 'Ada',
        },
      },
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });

    render(<KangurLearnerProfileQuestSummaryWidget />);

    const actionLink = screen.getByRole('link', { name: 'Otwórz lekcję' });
    expect(actionLink).toHaveAttribute('href', '/kangur/lessons?focus=division');
    expect(actionLink).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');
    expect(screen.getByTestId('kangur-learner-profile-track-summary')).toBeInTheDocument();
  });
});
