import { screen } from '@testing-library/react';
import { expect } from 'vitest';

const buildGameRuntime = (screenKey: string) => ({
  activePracticeAssignment: null,
  basePath: '/kangur',
  canAccessParentAssignments: false,
  currentQuestion: null,
  currentQuestionIndex: 0,
  difficulty: 'medium',
  kangurMode: null,
  launchableGameInstanceId: null,
  operation: null,
  progress: {},
  resultPracticeAssignment: null,
  score: 0,
  screen: screenKey,
  totalQuestions: 0,
  user: null,
  xpToast: {
    xpGained: 0,
    newBadges: [],
    breakdown: [],
    nextBadge: null,
    dailyQuest: null,
    recommendation: null,
    visible: false,
  },
});

const buildLaunchableGameInstance = (
  overrides: Partial<{
    id: string;
    gameId: string;
    launchableRuntimeId: string;
    contentSetId: string;
    title: string;
    description: string;
    emoji: string;
    enabled: boolean;
    sortOrder: number;
    engineOverrides: Record<string, unknown>;
  }>
) => ({
  id: 'launchable-instance',
  gameId: 'clock_training',
  launchableRuntimeId: 'clock_quiz',
  contentSetId: 'clock_training:clock-minutes',
  title: 'Custom session',
  description: 'Persisted custom launchable game instance.',
  emoji: '🕒',
  enabled: true,
  sortOrder: 1,
  engineOverrides: {},
  ...overrides,
});

const buildLaunchableGameContentSet = (
  overrides: Partial<{
    id: string;
    gameId: string;
    engineId: string;
    launchableRuntimeId: string;
    label: string;
    description: string;
    contentKind: string;
    rendererProps: Record<string, unknown>;
    sortOrder: number;
  }>
) => ({
  id: 'clock_training:clock-minutes',
  gameId: 'clock_training',
  engineId: 'clock_training_engine',
  launchableRuntimeId: 'clock_quiz',
  label: 'Custom session',
  description: 'Persisted custom launchable content set.',
  contentKind: 'clock_section',
  rendererProps: {
    clockSection: 'minutes',
  },
  sortOrder: 1,
  ...overrides,
});

const expectStandardMobileGameLayout = (
  gameMain: HTMLElement | null,
  options: {
    expectBottomClearance?: boolean;
    expectFullWidth?: boolean;
  } = {}
) => {
  const { expectBottomClearance = true, expectFullWidth = false } = options;

  expect(gameMain).not.toBeNull();
  if (expectFullWidth) {
    expect(gameMain?.className).toContain('w-full');
  }
  ['min-w-0', 'overflow-x-clip', 'overflow-y-auto'].forEach((className) => {
    expect(gameMain?.className).toContain(className);
  });
  if (expectBottomClearance) {
    expect(gameMain?.className).toContain(
      'var(--kangur-mobile-bottom-clearance,env(safe-area-inset-bottom))+32px'
    );
  }
  [
    'var(--kangur-shell-viewport-height,100dvh)-var(--kangur-top-bar-height,88px)',
  ].forEach((className) => {
    expect(gameMain?.className).not.toContain(className);
  });
  [
    'kangur-game-phone-simulation-scroll-container',
    'kangur-game-phone-simulation-scroll-up',
    'kangur-game-phone-simulation-scroll-down',
  ].forEach((testId) => {
    expect(screen.queryByTestId(testId)).toBeNull();
  });
  expect(screen.queryByRole('button', { name: 'Przewiń w dół' })).toBeNull();
};

export {
  buildGameRuntime,
  buildLaunchableGameContentSet,
  buildLaunchableGameInstance,
  expectStandardMobileGameLayout,
};
