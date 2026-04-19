/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildGameRuntime, buildLaunchableGameContentSet, buildLaunchableGameInstance } from './Game.test-support';

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

vi.mock('@/features/kangur/ui/pages/GameDeferredAiTutorSessionSync', () => ({
  default: (props: unknown) => {
    tutorSessionSyncPropsMock(props);
    return null;
  },
}));

vi.mock('@/features/kangur/ui/pages/GameDeferredDocsTooltipEnhancer', () => ({
  default: () => null,
}));

vi.mock('@/features/kangur/ui/pages/GameDeferredLearnerActivityPing', () => ({
  default: () => null,
}));

vi.mock('@/features/kangur/ui/components/game-runtime/KangurGameNavigationWidget', () => ({
  KangurGameNavigationWidget: ({ visible = true }: { visible?: boolean }) =>
    visible ? <div data-testid='kangur-game-navigation-widget' /> : null,
}));

vi.mock('@/features/kangur/ui/components/game-home/KangurGameHomeHeroWidget', () => ({
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

vi.mock('@/features/kangur/ui/components/game-home/KangurGameHomeActionsWidget', () => ({
  KangurGameHomeActionsWidget: (props: { hideWhenScreenMismatch?: boolean }) => {
    homeActionsPropsMock(props);
    return <div data-testid='kangur-home-actions-widget' />;
  },
}));

vi.mock('@/features/kangur/ui/components/game-home/KangurGameHomeDuelsInvitesWidget', () => ({
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

vi.mock('@/features/kangur/ui/components/game-home/KangurGameHomeQuestWidget', () => ({
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

vi.mock('@/features/kangur/ui/components/game-runtime/XpToast', () => ({
  default: (props: unknown) => {
    xpToastPropsMock(props);
    return <div data-testid='xp-toast-widget' />;
  },
}));

vi.mock('@/features/kangur/ui/components/game-setup/KangurGameTrainingSetupWidget', () => ({
  KangurGameTrainingSetupWidget: () => <div data-testid='kangur-training-setup-widget' />,
}));

vi.mock('@/features/kangur/ui/components/game-setup/KangurGameKangurSetupWidget', () => ({
  KangurGameKangurSetupWidget: () => <div data-testid='kangur-kangur-setup-widget' />,
}));

vi.mock('@/features/kangur/ui/components/game-runtime/KangurGameKangurSessionWidget', () => ({
  KangurGameKangurSessionWidget: () => <div data-testid='kangur-kangur-session-widget' />,
}));

vi.mock('@/features/kangur/ui/components/CalendarTrainingGame', () => ({
  default: (props: unknown) => {
    calendarTrainingGamePropsMock(props);
    return <div data-testid='calendar-training-game' />;
  },
}));

vi.mock('@/features/kangur/ui/components/clock-training/ClockTrainingGame', () => ({
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

vi.mock('@/features/kangur/ui/components/game-runtime/KangurGameQuestionWidget', () => ({
  KangurGameQuestionWidget: () => <div data-testid='kangur-question-widget' />,
}));

vi.mock('@/features/kangur/ui/components/game-runtime/KangurGameResultWidget', () => ({
  KangurGameResultWidget: () => <div data-testid='kangur-result-widget' />,
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: getDisabledDocsTooltipsMock,
}));

import Game from '@/features/kangur/ui/pages/Game';

describe('Game page - Launchables', () => {
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

  it('renders the general adverbs launchable runtime on the dedicated game screen', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('english_adverbs_quiz'),
      user: {
        activeLearner: {
          id: 'learner-1',
        },
      },
    });

    render(<Game />);

    await waitFor(() => {
      expect(screen.getByTestId('english-adverbs-action-studio-game')).toBeInTheDocument();
    });

    expect(englishAdverbsActionStudioGamePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        finishLabel: 'Wroc do Grajmy',
      })
    );
    await waitFor(() => {
      expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: 'learner-1',
          sessionContext: expect.objectContaining({
            surface: 'game',
            contentId: 'game:english_adverbs_quiz',
          }),
        })
      );
    });
  });

  it('renders the addition launchable runtime on the dedicated game screen', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('addition_quiz'),
      user: {
        activeLearner: {
          id: 'learner-1',
        },
      },
    });

    render(<Game />);

    await waitFor(() => {
      expect(screen.getByTestId('adding-ball-game')).toBeInTheDocument();
    });

    expect(addingBallGamePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        finishLabelVariant: 'play',
      })
    );
    await waitFor(() => {
      expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: 'learner-1',
          sessionContext: expect.objectContaining({
            surface: 'game',
            contentId: 'game:addition_quiz',
          }),
        })
      );
    });
  });

  it('renders the adding synthesis launchable runtime on the dedicated game screen', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('adding_synthesis_quiz'),
      user: {
        activeLearner: {
          id: 'learner-1',
        },
      },
    });

    render(<Game />);

    await waitFor(() => {
      expect(screen.getByTestId('adding-synthesis-game')).toBeInTheDocument();
    });

    expect(addingSynthesisGamePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        finishLabel: 'Wroc do Grajmy',
      })
    );
    await waitFor(() => {
      expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: 'learner-1',
          sessionContext: expect.objectContaining({
            surface: 'game',
            contentId: 'game:adding_synthesis_quiz',
          }),
        })
      );
    });
  });

  it('renders the multiplication array launchable runtime on the dedicated game screen', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('multiplication_array_quiz'),
      user: {
        activeLearner: {
          id: 'learner-1',
        },
      },
    });

    render(<Game />);

    await waitFor(() => {
      expect(screen.getByTestId('multiplication-array-game')).toBeInTheDocument();
    });

    expect(multiplicationArrayGamePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        finishLabel: 'Wroc do Grajmy',
      })
    );
    await waitFor(() => {
      expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: 'learner-1',
          sessionContext: expect.objectContaining({
            surface: 'game',
            contentId: 'game:multiplication_array_quiz',
          }),
        })
      );
    });
  });

  it('renders the division launchable runtime on the dedicated game screen', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('division_quiz'),
      user: {
        activeLearner: {
          id: 'learner-1',
        },
      },
    });

    render(<Game />);

    await waitFor(() => {
      expect(screen.getByTestId('division-game')).toBeInTheDocument();
    });

    expect(divisionGamePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        finishLabelVariant: 'play',
      })
    );
    await waitFor(() => {
      expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: 'learner-1',
          sessionContext: expect.objectContaining({
            surface: 'game',
            contentId: 'game:division_quiz',
          }),
        })
      );
    });
  });

  it('renders the subtraction launchable runtime on the dedicated game screen', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('subtraction_quiz'),
      user: {
        activeLearner: {
          id: 'learner-1',
        },
      },
    });

    render(<Game />);

    await waitFor(() => {
      expect(screen.getByTestId('subtracting-game')).toBeInTheDocument();
    });

    expect(subtractingGamePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        finishLabelVariant: 'play',
      })
    );
    await waitFor(() => {
      expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: 'learner-1',
          sessionContext: expect.objectContaining({
            surface: 'game',
            contentId: 'game:subtraction_quiz',
          }),
        })
      );
    });
  });

  it('renders the comparatives launchable runtime on the dedicated game screen', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('english_compare_and_crown_quiz'),
      user: {
        activeLearner: {
          id: 'learner-1',
        },
      },
    });

    render(<Game />);

    await waitFor(() => {
      expect(screen.getByTestId('english-comparatives-crown-game')).toBeInTheDocument();
    });

    expect(englishComparativesCrownGamePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        finishLabel: 'Wroc do Grajmy',
      })
    );
    await waitFor(() => {
      expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: 'learner-1',
          sessionContext: expect.objectContaining({
            surface: 'game',
            contentId: 'game:english_compare_and_crown_quiz',
          }),
        })
      );
    });
  });

  it('merges the selected content set with saved engine overrides for launchable game instances', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('clock_quiz'),
      launchableGameInstanceId: 'clock-instance-minutes',
    });
    useKangurGameInstancesMock.mockReturnValue({
      data: [
        buildLaunchableGameInstance({
          id: 'clock-instance-minutes',
          title: 'Minutes only',
          description: 'Custom minute-reading run.',
          engineOverrides: {
            clockInitialMode: 'challenge',
            showClockMinuteHand: false,
            showClockTaskTitle: false,
          },
        }),
      ],
      isPending: false,
    });
    useKangurGameContentSetsMock.mockReturnValue({
      data: [
        buildLaunchableGameContentSet({
          label: 'Minutes only',
          description: 'Persisted minute-reading content set.',
          sortOrder: 3,
        }),
      ],
      isPending: false,
    });

    render(<Game />);

    await waitFor(() => {
      expect(clockTrainingGamePropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          hideModeSwitch: false,
          initialMode: 'challenge',
          section: 'minutes',
          showMinuteHand: false,
          showTaskTitle: false,
        })
      );
    });
  });

  it('shows the missing launchable runtime state when the persisted content set is absent', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('clock_quiz'),
      launchableGameInstanceId: 'clock-instance-minutes',
    });
    useKangurGameInstancesMock.mockReturnValue({
      data: [
        buildLaunchableGameInstance({
          id: 'clock-instance-minutes',
          title: 'Minutes only',
          description: 'Custom minute-reading run.',
          engineOverrides: {
            clockInitialMode: 'challenge',
          },
        }),
      ],
      isPending: false,
    });

    render(<Game />);

    await waitFor(() => {
      expect(
        screen.getByTestId('kangur-game-launchable-runtime-missing')
      ).toBeInTheDocument();
    });
    expect(clockTrainingGamePropsMock).not.toHaveBeenCalled();
  });

  it('shows the missing launchable runtime state when the persisted instance points to a different launchable screen', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('clock_quiz'),
      launchableGameInstanceId: 'clock-instance-mismatch',
    });
    useKangurGameInstancesMock.mockReturnValue({
      data: [
        buildLaunchableGameInstance({
          id: 'clock-instance-mismatch',
          launchableRuntimeId: 'calendar_quiz',
          title: 'Broken instance',
          description: 'Mismatched runtime id.',
        }),
      ],
      isPending: false,
    });
    useKangurGameContentSetsMock.mockReturnValue({
      data: [
        buildLaunchableGameContentSet({
          label: 'Minutes only',
          description: 'Persisted minute-reading content set.',
          sortOrder: 3,
        }),
      ],
      isPending: false,
    });

    render(<Game />);

    await waitFor(() => {
      expect(
        screen.getByTestId('kangur-game-launchable-runtime-missing')
      ).toBeInTheDocument();
    });
    expect(clockTrainingGamePropsMock).not.toHaveBeenCalled();
  });

  it('merges persisted custom content sets with saved engine overrides for launchable game instances', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('clock_quiz'),
      launchableGameInstanceId: 'clock-instance-custom-hours',
    });
    useKangurGameInstancesMock.mockReturnValue({
      data: [
        buildLaunchableGameInstance({
          id: 'clock-instance-custom-hours',
          contentSetId: 'clock_training:custom:hours-review',
          title: 'Hours review',
          description: 'Custom hour-reading run.',
          emoji: '🕐',
          engineOverrides: {
            clockInitialMode: 'challenge',
            showClockTaskTitle: false,
          },
        }),
      ],
      isPending: false,
    });
    useKangurGameContentSetsMock.mockReturnValue({
      data: [
        buildLaunchableGameContentSet({
          id: 'clock_training:custom:hours-review',
          label: 'Hours review',
          description: 'Custom persisted hour-reading content set.',
          rendererProps: {
            clockSection: 'hours',
          },
          sortOrder: 10,
        }),
      ],
      isPending: false,
    });

    render(<Game />);

    await waitFor(() => {
      expect(clockTrainingGamePropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMode: 'challenge',
          section: 'hours',
          showTaskTitle: false,
        })
      );
    });
  });

  it('resolves persisted logical-pattern content sets for launchable game instances', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('logical_patterns_quiz'),
      launchableGameInstanceId: 'logical-pattern-instance-custom',
    });
    useKangurGameInstancesMock.mockReturnValue({
      data: [
        buildLaunchableGameInstance({
          id: 'logical-pattern-instance-custom',
          gameId: 'logical_patterns_workshop',
          launchableRuntimeId: 'logical_patterns_quiz',
          contentSetId: 'logical_patterns_workshop:custom:alphabet-warmup',
          title: 'Alphabet warmup',
          description: 'Custom alphabet-order session.',
          emoji: '🔢',
        }),
      ],
      isPending: false,
    });
    useKangurGameContentSetsMock.mockReturnValue({
      data: [
        buildLaunchableGameContentSet({
          id: 'logical_patterns_workshop:custom:alphabet-warmup',
          gameId: 'logical_patterns_workshop',
          engineId: 'pattern-sequence-engine',
          launchableRuntimeId: 'logical_patterns_quiz',
          label: 'Alphabet warmup',
          description: 'Custom persisted alphabet-order content set.',
          contentKind: 'logical_pattern_set',
          rendererProps: {
            patternSetId: 'alphabet_letter_order',
          },
          sortOrder: 10,
        }),
      ],
      isPending: false,
    });

    render(<Game />);

    await waitFor(() => {
      expect(logicalPatternsWorkshopGamePropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          patternSetId: 'alphabet_letter_order',
        })
      );
    });
  });

  it('resolves persisted calendar content sets for launchable game instances', async () => {
    useKangurGameRuntimeMock.mockReturnValue({
      ...buildGameRuntime('calendar_quiz'),
      launchableGameInstanceId: 'calendar-instance-months',
    });
    useKangurGameInstancesMock.mockReturnValue({
      data: [
        buildLaunchableGameInstance({
          id: 'calendar-instance-months',
          gameId: 'calendar_interactive',
          launchableRuntimeId: 'calendar_quiz',
          contentSetId: 'calendar_interactive:custom:months-focus',
          title: 'Months focus',
          description: 'Custom calendar months session.',
          emoji: '📅',
        }),
      ],
      isPending: false,
    });
    useKangurGameContentSetsMock.mockReturnValue({
      data: [
        buildLaunchableGameContentSet({
          id: 'calendar_interactive:custom:months-focus',
          gameId: 'calendar_interactive',
          engineId: 'calendar-grid-engine',
          launchableRuntimeId: 'calendar_quiz',
          label: 'Months focus',
          description: 'Custom persisted months-focused content set.',
          contentKind: 'calendar_section',
          rendererProps: {
            calendarSection: 'miesiace',
          },
          sortOrder: 10,
        }),
      ],
      isPending: false,
    });

    render(<Game />);

    await waitFor(() => {
      expect(calendarTrainingGamePropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          section: 'miesiace',
        })
      );
    });
  });
});
