/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock, homeHeroPropsMock, homeActionsPropsMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
  homeHeroPropsMock: vi.fn(),
  homeActionsPropsMock: vi.fn(),
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

vi.mock('@/features/kangur/ui/components/KangurGameNavigationWidget', () => ({
  KangurGameNavigationWidget: () => <div data-testid='kangur-game-navigation-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameHomeHeroWidget', () => ({
  KangurGameHomeHeroWidget: (props: { hideWhenScreenMismatch?: boolean }) => {
    homeHeroPropsMock(props);
    return <div data-testid='kangur-home-hero-widget' />;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurGameHomeActionsWidget', () => ({
  KangurGameHomeActionsWidget: (props: { hideWhenScreenMismatch?: boolean }) => {
    homeActionsPropsMock(props);
    return <div data-testid='kangur-home-actions-widget' />;
  },
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

vi.mock('@/features/kangur/ui/components/KangurGameTrainingSetupWidget', () => ({
  KangurGameTrainingSetupWidget: () => <div data-testid='kangur-training-setup-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameKangurSetupWidget', () => ({
  KangurGameKangurSetupWidget: () => <div data-testid='kangur-kangur-setup-widget' />,
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

vi.mock('@/features/kangur/ui/components/KangurGameOperationSelectorWidget', () => ({
  KangurGameOperationSelectorWidget: () => <div data-testid='kangur-operation-selector-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameQuestionWidget', () => ({
  KangurGameQuestionWidget: () => <div data-testid='kangur-question-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurGameResultWidget', () => ({
  KangurGameResultWidget: () => <div data-testid='kangur-result-widget' />,
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: () => ({ enabled: false }),
}));

import Game from '@/features/kangur/ui/pages/Game';

describe('Game page', () => {
  it('pins home hero and action widgets during the home-screen exit transition', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canAccessParentAssignments: false,
      progress: {},
      screen: 'home',
      user: null,
      xpToast: {
        xpGained: 0,
        newBadges: [],
        visible: false,
      },
    });

    render(<Game />);

    expect(screen.getByTestId('kangur-home-hero-widget')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-home-actions-widget')).toBeInTheDocument();
    expect(homeHeroPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({ hideWhenScreenMismatch: false })
    );
    expect(homeActionsPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({ hideWhenScreenMismatch: false })
    );
  });
});
