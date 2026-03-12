/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  KangurGameRuntimeBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorSessionSync: () => null,
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: () => ({ enabled: false }),
}));

vi.mock('@/features/kangur/ui/components/KangurGameNavigationWidget', () => ({
  KangurGameNavigationWidget: () => <div data-testid='kangur-game-navigation-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameHomeHeroWidget', () => ({
  KangurGameHomeHeroWidget: () => <div data-testid='kangur-home-hero-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurAssignmentSpotlight', () => ({
  KangurAssignmentSpotlight: () => <div data-testid='kangur-assignment-spotlight-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameHomeActionsWidget', () => ({
  KangurGameHomeActionsWidget: () => <div data-testid='kangur-home-actions-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameHomeQuestWidget', () => ({
  KangurGameHomeQuestWidget: () => <div data-testid='kangur-home-quest-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurPriorityAssignments', () => ({
  KangurPriorityAssignments: () => <div data-testid='kangur-priority-assignments-widget' />,
}));

vi.mock('@/features/kangur/ui/components/Leaderboard', () => ({
  default: () => <div data-testid='leaderboard-widget' />,
}));

vi.mock('@/features/kangur/ui/components/progress', () => ({
  PlayerProgressCard: () => <div data-testid='player-progress-widget' />,
  XpToast: () => <div data-testid='xp-toast-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameKangurSessionWidget', () => ({
  KangurGameKangurSessionWidget: () => <div data-testid='kangur-kangur-session-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameCalendarTrainingWidget', () => ({
  KangurGameCalendarTrainingWidget: () => <div data-testid='kangur-calendar-training-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameGeometryTrainingWidget', () => ({
  KangurGameGeometryTrainingWidget: () => <div data-testid='kangur-geometry-training-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameQuestionWidget', () => ({
  KangurGameQuestionWidget: () => <div data-testid='kangur-question-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameResultWidget', () => ({
  KangurGameResultWidget: () => <div data-testid='kangur-result-widget' />,
}));

vi.mock('@/features/kangur/ui/components/OperationSelector', () => ({
  default: () => <div data-testid='mock-operation-selector'>Mock operation selector</div>,
}));

vi.mock('@/features/kangur/ui/components/TrainingSetup', () => ({
  default: () => <div data-testid='mock-training-setup'>Mock training setup</div>,
}));

vi.mock('@/features/kangur/ui/components/KangurSetup', () => ({
  default: () => <div data-testid='mock-kangur-setup'>Mock Kangur setup</div>,
}));

vi.mock('@/features/kangur/ui/components/KangurPracticeAssignmentBanner', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-practice-assignment-banner'>Mock assignment banner</div>,
}));

import Game from '@/features/kangur/ui/pages/Game';

type EntryScreenCase = {
  artTestId: string;
  heading: string;
  screen: 'operation' | 'training' | 'kangur_setup';
  topSectionTestId: string;
  widgetTestId: string;
};

const ENTRY_SCREEN_CASES: EntryScreenCase[] = [
  {
    artTestId: 'kangur-grajmy-heading-art',
    heading: 'Grajmy!',
    screen: 'operation',
    topSectionTestId: 'kangur-game-operation-top-section',
    widgetTestId: 'mock-operation-selector',
  },
  {
    artTestId: 'kangur-training-heading-art',
    heading: 'Trening',
    screen: 'training',
    topSectionTestId: 'kangur-game-training-top-section',
    widgetTestId: 'mock-training-setup',
  },
  {
    artTestId: 'kangur-kangur-heading-art',
    heading: 'Kangur',
    screen: 'kangur_setup',
    topSectionTestId: 'kangur-game-kangur-setup-top-section',
    widgetTestId: 'mock-kangur-setup',
  },
];

const buildRuntime = (
  screenKey: EntryScreenCase['screen']
): Record<string, unknown> => ({
  activePracticeAssignment: null,
  basePath: '/kangur',
  canAccessParentAssignments: false,
  currentQuestion: null,
  currentQuestionIndex: 0,
  handleHome: vi.fn(),
  handleSelectOperation: vi.fn(),
  handleStartKangur: vi.fn(),
  handleStartTraining: vi.fn(),
  practiceAssignmentsByOperation: {},
  progress: createDefaultKangurProgressState(),
  resultPracticeAssignment: null,
  score: 0,
  screen: screenKey,
  setScreen: vi.fn(),
  totalQuestions: 0,
  user: null,
  xpToast: {
    newBadges: [],
    visible: false,
    xpGained: 0,
  },
});

describe('Game page entry shells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(ENTRY_SCREEN_CASES)(
    'keeps the restored intro card visible on the $screen screen',
    ({ artTestId, heading, screen: runtimeScreen, topSectionTestId, widgetTestId }) => {
      useKangurGameRuntimeMock.mockReturnValue(buildRuntime(runtimeScreen));

      render(<Game />);

      expect(screen.getByTestId(topSectionTestId)).toHaveClass(
        'glass-panel',
        'border-white/78',
        'bg-white/68',
        'text-center'
      );
      expect(screen.getByRole('heading', { name: heading })).toHaveClass('text-3xl');
      expect(screen.getByTestId(artTestId)).toBeInTheDocument();
      expect(screen.getByTestId(widgetTestId)).toBeInTheDocument();
    }
  );
});
