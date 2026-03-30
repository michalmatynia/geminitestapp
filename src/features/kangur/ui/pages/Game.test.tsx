'use client';

/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildGameRuntime, expectStandardMobileGameLayout } from './Game.test-support';

const {
  useKangurGameRuntimeMock,
  useKangurGameContentSetsMock,
  useKangurGameInstancesMock,
  useKangurMobileBreakpointMock,
  routeNavigatorPrefetchMock,
  routeNavigatorPushMock,
  homeHeroPropsMock,
  assignmentSpotlightPropsMock,
  homeActionsPropsMock,
  homeDuelsInvitesPropsMock,
  tutorSessionSyncPropsMock,
  xpToastPropsMock,
  addingBallGamePropsMock,
  addingSynthesisGamePropsMock,
  calendarTrainingGamePropsMock,
  clockTrainingGamePropsMock,
  divisionGamePropsMock,
  multiplicationArrayGamePropsMock,
  subtractingGamePropsMock,
  englishComparativesCrownGamePropsMock,
  englishAdverbsActionStudioGamePropsMock,
  logicalPatternsWorkshopGamePropsMock,
  disabledDocsTooltipsMock,
  getDisabledDocsTooltipsMock,
} = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
  useKangurGameContentSetsMock: vi.fn(),
  useKangurGameInstancesMock: vi.fn(),
  useKangurMobileBreakpointMock: vi.fn(),
  routeNavigatorPrefetchMock: vi.fn(),
  routeNavigatorPushMock: vi.fn(),
  homeHeroPropsMock: vi.fn(),
  assignmentSpotlightPropsMock: vi.fn(),
  homeActionsPropsMock: vi.fn(),
  homeDuelsInvitesPropsMock: vi.fn(),
  tutorSessionSyncPropsMock: vi.fn(),
  xpToastPropsMock: vi.fn(),
  addingBallGamePropsMock: vi.fn(),
  addingSynthesisGamePropsMock: vi.fn(),
  calendarTrainingGamePropsMock: vi.fn(),
  clockTrainingGamePropsMock: vi.fn(),
  divisionGamePropsMock: vi.fn(),
  multiplicationArrayGamePropsMock: vi.fn(),
  subtractingGamePropsMock: vi.fn(),
  englishComparativesCrownGamePropsMock: vi.fn(),
  englishAdverbsActionStudioGamePropsMock: vi.fn(),
  logicalPatternsWorkshopGamePropsMock: vi.fn(),
  disabledDocsTooltipsMock: { enabled: false },
  getDisabledDocsTooltipsMock: vi.fn(),
}));

getDisabledDocsTooltipsMock.mockReturnValue(disabledDocsTooltipsMock);

vi.mock('framer-motion', () => {
  const serializeMotionValue = (value: unknown): string | undefined =>
    value === undefined ? undefined : JSON.stringify(value);

  const createMotionTag = (tag: keyof React.JSX.IntrinsicElements) =>
    function MotionTag({
      children,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: React.HTMLAttributes<HTMLElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
    }): React.JSX.Element {
      return React.createElement(
        tag,
        {
          ...props,
          'data-motion-initial': serializeMotionValue(initial),
          'data-motion-animate': serializeMotionValue(animate),
          'data-motion-exit': serializeMotionValue(exit),
          'data-motion-transition': serializeMotionValue(transition),
        },
        children
      );
    };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: createMotionTag('div'),
    },
    useReducedMotion: () => false,
  };
});

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  KangurGameRuntimeBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => useKangurMobileBreakpointMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameInstances', () => ({
  useKangurGameInstances: (...args: unknown[]) => useKangurGameInstancesMock(...args),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameContentSets', () => ({
  useKangurGameContentSets: (...args: unknown[]) => useKangurGameContentSetsMock(...args),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({
    back: vi.fn(),
    prefetch: routeNavigatorPrefetchMock,
    push: routeNavigatorPushMock,
    replace: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorSessionSync: (props: unknown) => {
    tutorSessionSyncPropsMock(props);
    return null;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurGameNavigationWidget', () => ({
  KangurGameNavigationWidget: ({ visible = true }: { visible?: boolean }) =>
    visible ? <div data-testid='kangur-game-navigation-widget' /> : null,
}));

vi.mock('@/features/kangur/ui/components/KangurGameHomeHeroWidget', () => ({
  KangurGameHomeHeroWidget: (props: {
    hideWhenScreenMismatch?: boolean;
    showIntro?: boolean;
    showAssignmentSpotlight?: boolean;
  }) => {
    homeHeroPropsMock(props);
    return <div data-testid='kangur-home-hero-widget' />;
  },
}));

vi.mock('@/features/kangur/ui/components/assignments/KangurAssignmentSpotlight', () => ({
  KangurAssignmentSpotlight: (props: { basePath: string; enabled?: boolean }) => {
    assignmentSpotlightPropsMock(props);
    return <div data-testid='kangur-assignment-spotlight-widget' />;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurGameHomeActionsWidget', () => ({
  KangurGameHomeActionsWidget: (props: { hideWhenScreenMismatch?: boolean }) => {
    homeActionsPropsMock(props);
    return <div data-testid='kangur-home-actions-widget' />;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurGameHomeDuelsInvitesWidget', () => ({
  KangurGameHomeDuelsInvitesWidget: (props: { hideWhenScreenMismatch?: boolean }) => {
    homeDuelsInvitesPropsMock(props);
    return <div data-testid='kangur-home-duels-invites-widget' />;
  },
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

vi.mock('@/features/kangur/ui/components/KangurGameHomeQuestWidget', () => ({
  KangurGameHomeQuestWidget: () => <div data-testid='kangur-home-quest-widget' />,
}));

vi.mock('@/features/kangur/ui/components/assignments/KangurPriorityAssignments', () => ({
  KangurPriorityAssignments: () => <div data-testid='kangur-priority-assignments-widget' />,
}));

vi.mock('@/features/kangur/ui/components/Leaderboard', () => ({
  default: () => <div data-testid='leaderboard-widget' />,
}));

vi.mock('@/features/kangur/ui/components/PlayerProgressCard', () => ({
  default: () => <div data-testid='player-progress-widget' />,
}));

vi.mock('@/features/kangur/ui/components/XpToast', () => ({
  default: (props: unknown) => {
    xpToastPropsMock(props);
    return <div data-testid='xp-toast-widget' />;
  },
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

vi.mock('@/features/kangur/ui/components/CalendarTrainingGame', () => ({
  default: (props: unknown) => {
    calendarTrainingGamePropsMock(props);
    return <div data-testid='calendar-training-game' />;
  },
}));

vi.mock('@/features/kangur/ui/components/ClockTrainingGame', () => ({
  default: (props: unknown) => {
    clockTrainingGamePropsMock(props);
    return <div data-testid='clock-training-game' />;
  },
}));

vi.mock('@/features/kangur/ui/components/AddingBallGame', () => ({
  default: (props: unknown) => {
    addingBallGamePropsMock(props);
    return <div data-testid='adding-ball-game' />;
  },
}));

vi.mock('@/features/kangur/ui/components/AddingSynthesisGame', () => ({
  default: (props: unknown) => {
    addingSynthesisGamePropsMock(props);
    return <div data-testid='adding-synthesis-game' />;
  },
}));

vi.mock('@/features/kangur/ui/components/MultiplicationArrayGame', () => ({
  default: (props: unknown) => {
    multiplicationArrayGamePropsMock(props);
    return <div data-testid='multiplication-array-game' />;
  },
}));

vi.mock('@/features/kangur/ui/components/DivisionGame', () => ({
  default: (props: unknown) => {
    divisionGamePropsMock(props);
    return <div data-testid='division-game' />;
  },
}));

vi.mock('@/features/kangur/ui/components/SubtractingGame', () => ({
  default: (props: unknown) => {
    subtractingGamePropsMock(props);
    return <div data-testid='subtracting-game' />;
  },
}));

vi.mock('@/features/kangur/ui/components/EnglishAdverbsActionStudioGame', () => ({
  default: (props: unknown) => {
    englishAdverbsActionStudioGamePropsMock(props);
    return <div data-testid='english-adverbs-action-studio-game' />;
  },
}));

vi.mock('@/features/kangur/ui/components/EnglishComparativesSuperlativesCrownGame', () => ({
  default: (props: unknown) => {
    englishComparativesCrownGamePropsMock(props);
    return <div data-testid='english-comparatives-crown-game' />;
  },
}));

vi.mock('@/features/kangur/ui/components/LogicalPatternsWorkshopGame', () => ({
  default: (props: unknown) => {
    logicalPatternsWorkshopGamePropsMock(props);
    return <div data-testid='logical-patterns-workshop-game' />;
  },
}));

vi.mock('@/features/kangur/ui/components/game-setup/KangurGameOperationSelectorWidget', () => ({
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
  useKangurDocsTooltips: getDisabledDocsTooltipsMock,
}));

import Game from '@/features/kangur/ui/pages/Game';

describe('Game page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDisabledDocsTooltipsMock.mockReturnValue(disabledDocsTooltipsMock);
    useKangurMobileBreakpointMock.mockReturnValue(false);
    useKangurGameContentSetsMock.mockReturnValue({
      data: [],
      isPending: false,
    });
    useKangurGameInstancesMock.mockReturnValue({
      data: [],
      isPending: false,
    });
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
  });

  it('keeps the shared game navigation visible on the home screen', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('home'),
      canAccessParentAssignments: true,
      progress: { totalXp: 1 },
    });

    render(<Game />);

    expect(screen.getByTestId('kangur-home-hero-widget')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-home-actions-widget')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-home-quest-widget')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-assignment-spotlight-widget')).toBeInTheDocument();
    expect(homeHeroPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hideWhenScreenMismatch: false,
        showIntro: false,
        showAssignmentSpotlight: false,
      })
    );
    expect(assignmentSpotlightPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({ basePath: '/kangur', enabled: true })
    );
    expect(homeActionsPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({ hideWhenScreenMismatch: false })
    );
    expect(screen.getByTestId('kangur-game-navigation-widget')).toBeInTheDocument();
  });

  it('does not prefetch other Kangur pages while the game shell mounts', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('home'),
      canAccessParentAssignments: true,
      progress: { totalXp: 1 },
    });

    render(<Game />);

    expect(routeNavigatorPrefetchMock).not.toHaveBeenCalled();
  });

  it('keeps mount behavior unchanged on mobile without route prefetch work', () => {
    useKangurMobileBreakpointMock.mockReturnValue(true);
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('home'),
      canAccessParentAssignments: true,
      progress: { totalXp: 1 },
    });

    render(<Game />);

    expect(routeNavigatorPrefetchMock).not.toHaveBeenCalled();
  });

  it('keeps the home screen motion static so the skeleton handoff does not jump vertically', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('home'),
      canAccessParentAssignments: true,
      progress: { totalXp: 1 },
    });

    render(<Game />);

    const homeLayout = screen.getByTestId('kangur-game-home-layout');

    expect(homeLayout).toHaveAttribute(
      'data-motion-initial',
      JSON.stringify({ opacity: 1, y: 0 })
    );
    expect(homeLayout).toHaveAttribute(
      'data-motion-animate',
      JSON.stringify({ opacity: 1, y: 0 })
    );
    expect(homeLayout).toHaveAttribute(
      'data-motion-exit',
      JSON.stringify({ opacity: 1, y: 0 })
    );
    expect(homeLayout).toHaveAttribute(
      'data-motion-transition',
      JSON.stringify({ duration: 0 })
    );
  });

  it('shows the parent add-learner prompt under the home actions when no learner is selected', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('home'),
      user: {
        actorType: 'parent',
        activeLearner: null,
      },
    });

    render(<Game />);

    expect(screen.getByText('Brak profilu ucznia')).toBeInTheDocument();
    expect(
      screen.getByText('Dodaj lub wybierz profil ucznia w sekcji ponizej, aby zobaczyc postep i misje dnia.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dodaj ucznia' })).toHaveAttribute(
      'href',
      '/kangur/parent-dashboard'
    );
    expect(screen.queryByTestId('kangur-home-quest-widget')).toBeNull();
    expect(screen.queryByTestId('kangur-home-hero-widget')).toBeNull();
    expect(screen.queryByTestId('kangur-priority-assignments-widget')).toBeNull();
    expect(screen.queryByTestId('leaderboard-widget')).toBeNull();
    expect(screen.queryByTestId('player-progress-widget')).toBeNull();
  });

  it('keeps the home leaderboard and progress columns centered within the same 900px section', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('home'),
      canAccessParentAssignments: true,
    });

    render(<Game />);

    const progressSection = screen.getByRole('region', { name: 'Ranking i postep' });

    expect(progressSection).not.toBeNull();
    expect(progressSection).toHaveClass(
      'mx-auto',
      'max-w-[900px]',
      'items-start',
      'xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]'
    );

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-widget')).toBeInTheDocument();
    });
    expect(screen.getByTestId('leaderboard-widget').parentElement).toHaveClass(
      'flex',
      'w-full',
      'justify-center'
    );
    expect(screen.getByTestId('player-progress-widget').parentElement).toHaveClass(
      'flex',
      'w-full',
      'justify-center'
    );
  });

  it('keeps the home actions column aligned with the shared home shell contract', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('home'),
      canAccessParentAssignments: true,
      progress: { totalXp: 1 },
    });

    render(<Game />);

    expect(screen.getByTestId('kangur-game-home-layout')).toHaveClass(
      'flex',
      'w-full',
      'flex-col',
      'items-center'
    );
    expect(screen.getByTestId('kangur-home-actions-column')).toHaveClass(
      'w-full',
      'max-w-[560px]',
      'space-y-8',
      'sm:space-y-10'
    );
  });

  it('forwards the full xp toast state on the live game page path', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('home'),
      xpToast: {
        xpGained: 44,
        newBadges: ['first_game'],
        breakdown: [{ kind: 'base', label: 'Ukończenie rundy', xp: 18 }],
        nextBadge: {
          emoji: '⭐',
          name: 'Pół tysiąca XP',
          summary: '420/500 XP',
        },
        dailyQuest: {
          title: '📅 Powtórka: Kalendarz',
          summary: '68% / 75% opanowania',
          xpAwarded: 55,
        },
        recommendation: {
          label: 'Misja dnia',
          summary: 'Ten ruch najmocniej przybliża odznakę Pół tysiąca XP.',
          title: '📅 Powtórka: Kalendarz',
        },
        visible: true,
      },
    });

    render(<Game />);

    expect(xpToastPropsMock).toHaveBeenCalledWith({
      xpGained: 44,
      newBadges: ['first_game'],
      breakdown: [{ kind: 'base', label: 'Ukończenie rundy', xp: 18 }],
      nextBadge: {
        emoji: '⭐',
        name: 'Pół tysiąca XP',
        summary: '420/500 XP',
      },
      dailyQuest: {
        title: '📅 Powtórka: Kalendarz',
        summary: '68% / 75% opanowania',
        xpAwarded: 55,
      },
      recommendation: {
        label: 'Misja dnia',
        summary: 'Ten ruch najmocniej przybliża odznakę Pół tysiąca XP.',
        title: '📅 Powtórka: Kalendarz',
      },
      visible: true,
    });
  });

  it('keeps the home screen on the standard mobile layout', () => {
    useKangurMobileBreakpointMock.mockReturnValue(true);
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('home'),
      progress: { totalXp: 1 },
    });

    render(<Game />);

    const gameMain = document.getElementById('kangur-game-main');

    expectStandardMobileGameLayout(gameMain, { expectFullWidth: true });
  });

  it('keeps the operation screen on the standard mobile layout', () => {
    useKangurMobileBreakpointMock.mockReturnValue(true);
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('operation'),
      progress: { totalXp: 1 },
    });

    render(<Game />);

    const gameMain = document.getElementById('kangur-game-main');

    expectStandardMobileGameLayout(gameMain, { expectBottomClearance: false });
    expect(screen.queryByRole('button', { name: 'Wróć do lekcji' })).not.toBeInTheDocument();
  });

  it('keeps active gameplay screens on the standard mobile layout', () => {
    useKangurMobileBreakpointMock.mockReturnValue(true);
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('playing'),
      progress: { totalXp: 1 },
    });

    render(<Game />);

    const gameMain = document.getElementById('kangur-game-main');

    expectStandardMobileGameLayout(gameMain);
    expect(screen.getByTestId('kangur-game-navigation-widget')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Wróć do lekcji' })).not.toBeInTheDocument();
  });

  it('scrolls back to the top and focuses the next screen heading without re-scrolling when entering a quiz', () => {
    const scrollToMock = vi.fn();
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback): number => {
        callback(0);
        return 1;
      });
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollToMock,
      writable: true,
    });

    let runtime = buildGameRuntime('home');
    useKangurGameRuntimeMock.mockImplementation(() => runtime);

    const { rerender } = render(<Game />);

    runtime = buildGameRuntime('calendar_quiz');
    rerender(<Game />);

    expect(scrollToMock).toHaveBeenCalledWith({ behavior: 'auto', left: 0, top: 0 });
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });

    focusSpy.mockRestore();
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
  });

  it('uses the canonical Lekcje transition preset for Gra screens', async () => {
    useKangurGameRuntimeMock.mockReturnValue(buildGameRuntime('calendar_quiz'));

    render(<Game />);

    const transitionShell = (await screen.findByTestId('kangur-calendar-training-top-section')).closest(
      '[data-motion-initial]'
    );

    expect(transitionShell).not.toBeNull();
    expect(transitionShell).toHaveAttribute(
      'data-motion-initial',
      JSON.stringify({ opacity: 0, y: 12 })
    );
    expect(transitionShell).toHaveAttribute(
      'data-motion-animate',
      JSON.stringify({ opacity: 1, y: 0 })
    );
    expect(transitionShell).toHaveAttribute(
      'data-motion-exit',
      JSON.stringify({ opacity: 0, y: -6 })
    );
    expect(transitionShell).toHaveAttribute(
      'data-motion-transition',
      JSON.stringify({ duration: 0.28, ease: [0.22, 1, 0.36, 1] })
    );
  });

  it('publishes activity-specific tutor context for Grajmy instead of one generic game scope', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('calendar_quiz'),
      user: {
        activeLearner: {
          id: 'learner-1',
        },
      },
    });

    render(<Game />);

    expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerId: 'learner-1',
        sessionContext: expect.objectContaining({
          surface: 'game',
          contentId: 'game:calendar_quiz',
        }),
      })
    );
  });

  it('keeps gameplay tutor context stable per practice activity and assignment', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('playing'),
      activePracticeAssignment: {
        id: 'assignment-division-easy',
        title: 'Dzielenie łatwe',
        progress: {
          summary: '2/5',
        },
      },
      currentQuestion: {
        question: '12 : 3 = ?',
      },
      currentQuestionIndex: 0,
      difficulty: 'easy',
      operation: 'division',
      totalQuestions: 5,
      user: {
        activeLearner: {
          id: 'learner-1',
        },
      },
    });

    render(<Game />);

    expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionContext: expect.objectContaining({
          contentId: 'game:assignment:assignment-division-easy',
          assignmentId: 'assignment-division-easy',
          questionId: 'game-question-1',
        }),
      })
    );
  });
});
