/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const {
  useKangurGameRuntimeMock,
  homeHeroPropsMock,
  assignmentSpotlightPropsMock,
  homeActionsPropsMock,
  tutorSessionSyncPropsMock,
  xpToastPropsMock,
} = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
  homeHeroPropsMock: vi.fn(),
  assignmentSpotlightPropsMock: vi.fn(),
  homeActionsPropsMock: vi.fn(),
  tutorSessionSyncPropsMock: vi.fn(),
  xpToastPropsMock: vi.fn(),
}));

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

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorSessionSync: (props: unknown) => {
    tutorSessionSyncPropsMock(props);
    return null;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurGameNavigationWidget', () => ({
  KangurGameNavigationWidget: () => <div data-testid='kangur-game-navigation-widget' />,
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

vi.mock('@/features/kangur/ui/components/KangurAssignmentSpotlight', () => ({
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

vi.mock('@/features/kangur/ui/components/KangurTransitionLink', () => ({
  KangurTransitionLink: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
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
  XpToast: (props: unknown) => {
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
  const buildRuntime = (screenKey: string) => ({
    activePracticeAssignment: null,
    basePath: '/kangur',
    canAccessParentAssignments: false,
    currentQuestion: null,
    currentQuestionIndex: 0,
    difficulty: 'medium',
    kangurMode: null,
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

  it('pins home hero, action, and assignment widgets during the home-screen exit transition', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildRuntime('home'),
      canAccessParentAssignments: true,
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
  });

  it('shows the parent add-learner prompt under the home actions when no learner is selected', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildRuntime('home'),
      user: {
        actorType: 'parent',
        activeLearner: null,
      },
    });

    render(<Game />);

    expect(screen.getByText('Brak profilu ucznia')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Dodaj lub wybierz profil ucznia w sekcji poniżej, aby zobaczyć postęp i misje dnia.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dodaj ucznia' })).toHaveAttribute(
      'href',
      '/kangur/parent-dashboard'
    );
  });

  it('keeps the home leaderboard and progress columns centered within the same 900px section', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildRuntime('home'),
      canAccessParentAssignments: true,
    });

    render(<Game />);

    const progressHeading = screen.getByRole('heading', { level: 3, name: 'Ranking i postęp' });
    const progressSection = progressHeading.closest('section');

    expect(progressSection).not.toBeNull();
    expect(progressSection).toHaveClass(
      'mx-auto',
      'max-w-[900px]',
      'items-start',
      'xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]'
    );
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

  it('forwards the full xp toast state on the live game page path', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildRuntime('home'),
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

    let runtime = buildRuntime('home');
    useKangurGameRuntimeMock.mockImplementation(() => runtime);

    const { rerender } = render(<Game />);

    runtime = buildRuntime('calendar_quiz');
    rerender(<Game />);

    expect(scrollToMock).toHaveBeenCalledWith({ behavior: 'auto', left: 0, top: 0 });
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });

    focusSpy.mockRestore();
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
  });

  it('uses the canonical Lekcje transition preset for Gra screens', () => {
    useKangurGameRuntimeMock.mockReturnValue(buildRuntime('calendar_quiz'));

    render(<Game />);

    const transitionShell = screen.getByTestId('kangur-calendar-training-widget').parentElement;

    expect(transitionShell).not.toBeNull();
    expect(transitionShell).toHaveAttribute(
      'data-motion-initial',
      JSON.stringify({ opacity: 0.92, y: 12 })
    );
    expect(transitionShell).toHaveAttribute(
      'data-motion-animate',
      JSON.stringify({ opacity: 1, y: 0 })
    );
    expect(transitionShell).toHaveAttribute(
      'data-motion-exit',
      JSON.stringify({ opacity: 0.98, y: -4 })
    );
    expect(transitionShell).toHaveAttribute(
      'data-motion-transition',
      JSON.stringify({ duration: 0.32, ease: [0.22, 1, 0.36, 1] })
    );
  });

  it('publishes activity-specific tutor context for Grajmy instead of one generic game scope', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildRuntime('calendar_quiz'),
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
      ...buildRuntime('playing'),
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
