'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, type RefObject } from 'react';

import { usePrefersReducedMotion } from '@/features/kangur/ui/components/LazyAnimatePresence';
import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurGameNavigationWidget } from '@/features/kangur/ui/components/game-runtime/KangurGameNavigationWidget';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import {
  GAME_PAGE_STANDARD_CONTAINER_CLASSNAME,
} from '@/features/kangur/ui/pages/GameHome.constants';
import { resolveKangurGameHomeVisibility } from '@/features/kangur/ui/pages/GameHome.visibility';
import { GameCurrentScreen } from '@/features/kangur/ui/pages/Game.screen-components';
import {
  useGameLaunchableRuntime,
  useGameScreenRefs,
  type GameHomeScreenRefs,
  type GameLaunchableScreenRefs,
  type GameSessionScreenRefs,
} from '@/features/kangur/ui/pages/Game.screen-refs';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  KangurGameRuntimeBoundary,
  useKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import dynamic from 'next/dynamic';
import { useKangurLearnerActivityPing } from '@/features/kangur/ui/hooks/useKangurLearnerActivity';
import { useKangurIdleReady } from '@/features/kangur/ui/hooks/useKangurIdleReady';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import {
  KANGUR_LAUNCHABLE_GAME_SCREENS,
  getKangurLaunchableGameContentId,
  isKangurLaunchableGameScreen,
} from '@/features/kangur/ui/services/game-launch';
import { useKangurTutorAnchors, type KangurTutorAnchorConfig } from '@/features/kangur/ui/hooks/useKangurTutorAnchors';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS } from '@/features/kangur/ui/pages/GameHome.constants';
import type { KangurGameScreen } from '@/features/kangur/ui/types';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

const XpToast = dynamic(() => import('@/features/kangur/ui/components/game-runtime/XpToast'), {
  ssr: false,
});

const GAME_BRAND_NAME = 'Sprycio';
const GAME_MAIN_ID = 'kangur-game-main';
const GAME_TITLE_ID = 'kangur-game-page-title';
const GAME_SCREEN_TITLE_ID = 'kangur-game-screen-title';
// GAME_TOP_RESET_SCREENS: screens that scroll the page back to the top when
// they become active. Setup and operation screens need a clean viewport;
// playing/result screens preserve the learner's scroll position.
const GAME_TOP_RESET_SCREENS = new Set<KangurGameScreen>([
  'training',
  'kangur_setup',
  'operation',
  ...KANGUR_LAUNCHABLE_GAME_SCREENS,
]);

// focusGameScreenHeading moves keyboard focus to the active screen's heading
// after a screen transition. Uses preventScroll to avoid jarring jumps, with
// a plain focus() fallback for browsers that don't support the option.
const focusGameScreenHeading = (heading: HTMLHeadingElement | null): void => {
  if (!heading) {
    return;
  }

  withKangurClientErrorSync(
    {
      source: 'kangur-game',
      action: 'focus-screen-heading',
      description: 'Focus the active game screen heading.',
    },
    () => {
      heading.focus({ preventScroll: true });
      return true;
    },
    {
      fallback: () => {
        heading.focus();
        return false;
      },
    }
  );
};

type GameTranslations = ReturnType<typeof useTranslations>;
type GameAssignmentLike =
  | {
      id?: string | null;
      progress: {
        summary?: string | null;
      };
      title?: string | null;
    }
  | null
  | undefined;
type GameQuestionLike =
  | {
      question?: string | null;
    }
  | null
  | undefined;
type GameTutorAnchorRefs = GameHomeScreenRefs & GameSessionScreenRefs;

const getGameScreenLabel = (
  translations: GameTranslations,
  screenKey: KangurGameScreen
): string => translations(`screens.${screenKey}.label`);

const getGameScreenDescription = (
  translations: GameTranslations,
  screenKey: KangurGameScreen
): string => translations(`screens.${screenKey}.description`);

const GAME_TUTOR_ACTIVITY_STATIC_CONTENT_IDS: Partial<Record<KangurGameScreen, string>> = {
  home: 'game:home',
  operation: 'game:operation-selector',
  training: 'game:training-setup',
};

const resolveGamePracticeContentId = ({
  difficulty,
  operation,
  screen,
}: {
  difficulty?: string | null;
  operation?: string | null;
  screen: KangurGameScreen;
}): string | null =>
  (screen === 'playing' || screen === 'result') && operation
    ? `game:practice:${operation}:${difficulty}`
    : null;

const resolveGameKangurContentId = ({
  kangurMode,
  screen,
}: {
  kangurMode?: string | null;
  screen: KangurGameScreen;
}): string | null =>
  screen === 'kangur' || screen === 'kangur_setup'
    ? `game:kangur:${kangurMode ?? 'setup'}`
    : null;

const resolveGameTutorActivityContentId = ({
  activeGameAssignmentId,
  difficulty,
  kangurMode,
  operation,
  screen,
}: {
  activeGameAssignmentId?: string | null;
  difficulty?: string | null;
  kangurMode?: string | null;
  operation?: string | null;
  screen: KangurGameScreen;
}): string => {
  if (activeGameAssignmentId) {
    return `game:assignment:${activeGameAssignmentId}`;
  }

  const practiceContentId = resolveGamePracticeContentId({
    difficulty,
    operation,
    screen,
  });
  if (practiceContentId) {
    return practiceContentId;
  }

  if (isKangurLaunchableGameScreen(screen)) {
    return getKangurLaunchableGameContentId(screen);
  }

  const kangurContentId = resolveGameKangurContentId({
    kangurMode,
    screen,
  });
  if (kangurContentId) {
    return kangurContentId;
  }

  return GAME_TUTOR_ACTIVITY_STATIC_CONTENT_IDS[screen] ?? `game:${screen}`;
};

const resolveGameQuestionText = (question: GameQuestionLike): string | null =>
  question?.question?.trim() || null;

const resolveGameAssignmentSummary = (assignment: GameAssignmentLike): string | null =>
  assignment
    ? [assignment.title, assignment.progress.summary].filter(Boolean).join(' - ')
    : null;

const resolveGameQuestionProgressLabel = ({
  currentQuestionIndex,
  score,
  screen,
  totalQuestions,
  translations,
}: {
  currentQuestionIndex: number;
  score: number;
  screen: KangurGameScreen;
  totalQuestions: number;
  translations: GameTranslations;
}): string | null => {
  if (screen === 'playing') {
    return translations('questionProgress', {
      current: currentQuestionIndex + 1,
      total: totalQuestions,
    });
  }

  if (screen === 'result') {
    return translations('resultProgress', {
      score,
      total: totalQuestions,
    });
  }

  return null;
};

const resolveGameTutorFocusKind = ({
  assignment,
  screen,
}: {
  assignment: GameAssignmentLike;
  screen: KangurGameScreen;
}): 'assignment' | 'question' | 'review' | undefined => {
  if (screen === 'playing') {
    return 'question';
  }

  if (screen === 'result') {
    return 'review';
  }

  return assignment ? 'assignment' : undefined;
};

const resolveGameTutorFocusLabel = ({
  assignment,
  currentScreenLabel,
  questionText,
  screen,
}: {
  assignment: GameAssignmentLike;
  currentScreenLabel: string;
  questionText: string | null;
  screen: KangurGameScreen;
}): string | undefined => {
  if (screen === 'playing') {
    return questionText ?? undefined;
  }

  return assignment?.title?.trim() || currentScreenLabel;
};

const resolveGameTutorQuestionId = ({
  currentQuestionIndex,
  screen,
}: {
  currentQuestionIndex: number;
  screen: KangurGameScreen;
}): string | undefined =>
  screen === 'playing' ? `game-question-${currentQuestionIndex + 1}` : undefined;

const resolveGameTutorAnswerRevealed = (
  screen: KangurGameScreen
): true | undefined => (screen === 'result' ? true : undefined);

const createGameTutorSessionContext = ({
  activeGameAssignment,
  currentQuestion,
  currentQuestionIndex,
  currentScreenLabel,
  screen,
  score,
  totalQuestions,
  translations,
  tutorActivityContentId,
}: {
  activeGameAssignment: GameAssignmentLike;
  currentQuestion: GameQuestionLike;
  currentQuestionIndex: number;
  currentScreenLabel: string;
  screen: KangurGameScreen;
  score: number;
  totalQuestions: number;
  translations: GameTranslations;
  tutorActivityContentId: string;
}): KangurAiTutorConversationContext => {
  const questionText = resolveGameQuestionText(currentQuestion);

  return {
    surface: 'game',
    contentId: tutorActivityContentId,
    title: currentScreenLabel,
    description: getGameScreenDescription(translations, screen),
    assignmentSummary: resolveGameAssignmentSummary(activeGameAssignment) ?? undefined,
    assignmentId: activeGameAssignment?.id ?? undefined,
    currentQuestion: questionText ?? undefined,
    questionProgressLabel: resolveGameQuestionProgressLabel({
      currentQuestionIndex,
      score,
      screen,
      totalQuestions,
      translations,
    }) ?? undefined,
    questionId: resolveGameTutorQuestionId({
      currentQuestionIndex,
      screen,
    }),
    answerRevealed: resolveGameTutorAnswerRevealed(screen),
    focusKind: resolveGameTutorFocusKind({
      assignment: activeGameAssignment,
      screen,
    }),
    focusLabel: resolveGameTutorFocusLabel({
      assignment: activeGameAssignment,
      currentScreenLabel,
      questionText,
      screen,
    }),
  };
};

const resolveGamePageReady = ({
  routeTransitionState,
  screen,
}: {
  routeTransitionState: ReturnType<typeof useOptionalKangurRouteTransitionState>;
  screen: KangurGameScreen;
}): boolean => {
  if (routeTransitionState?.activeTransitionKind === 'locale-switch') {
    return true;
  }

  if (
    routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
    routeTransitionState.activeTransitionSkeletonVariant === 'game-session'
  ) {
    return screen !== 'home';
  }

  return true;
};

function useGameScreenFocusReset(
  screen: KangurGameScreen,
  screenHeadingRef: RefObject<HTMLHeadingElement | null>
): void {
  const previousScreenRef = useRef<KangurGameScreen | null>(null);

  useEffect(() => {
    if (previousScreenRef.current === null) {
      previousScreenRef.current = screen;
      return;
    }

    if (previousScreenRef.current === screen || typeof window === 'undefined') {
      previousScreenRef.current = screen;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      if (GAME_TOP_RESET_SCREENS.has(screen)) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }

      focusGameScreenHeading(screenHeadingRef.current);
    });

    previousScreenRef.current = screen;
    return () => window.cancelAnimationFrame(frameId);
  }, [screen, screenHeadingRef]);
}

const createGameTutorAnchor = (
  anchor: Omit<KangurTutorAnchorConfig, 'surface'>
): KangurTutorAnchorConfig => ({
  ...anchor,
  surface: 'game',
});

const createGameScreenTutorAnchor = ({
  contentId,
  enabled,
  id,
  label,
  priority,
  ref,
}: {
  contentId: string;
  enabled: boolean;
  id: string;
  label: string;
  priority: number;
  ref: RefObject<HTMLDivElement | null>;
}): KangurTutorAnchorConfig =>
  createGameTutorAnchor({
    contentId: enabled ? contentId : null,
    enabled,
    id,
    kind: 'screen',
    label,
    priority,
    ref,
  });

const buildGameHomeTutorAnchors = ({
  canAccessParentAssignments,
  refs,
  screen,
  translations,
}: {
  canAccessParentAssignments: boolean;
  refs: GameTutorAnchorRefs;
  screen: KangurGameScreen;
  translations: GameTranslations;
}): KangurTutorAnchorConfig[] => [
  createGameTutorAnchor({
    contentId: 'game:home',
    enabled: screen === 'home',
    id: 'kangur-game-home-actions',
    kind: 'home_actions',
    label: translations('home.actionsLabel'),
    priority: 120,
    ref: refs.homeActionsRef,
  }),
  createGameTutorAnchor({
    contentId: 'game:home',
    enabled: screen === 'home',
    id: 'kangur-game-home-quest',
    kind: 'home_quest',
    label: translations('home.questHeading'),
    priority: 110,
    ref: refs.homeQuestRef,
  }),
  createGameTutorAnchor({
    contentId: 'game:home',
    enabled: screen === 'home' && canAccessParentAssignments,
    id: 'kangur-game-home-assignments',
    kind: 'priority_assignments',
    label: translations('home.priorityAssignmentsHeading'),
    priority: 100,
    ref: refs.homeAssignmentsRef,
  }),
  createGameTutorAnchor({
    contentId: 'game:home',
    enabled: screen === 'home',
    id: 'kangur-game-home-leaderboard',
    kind: 'leaderboard',
    label: translations('home.leaderboardLabel'),
    priority: 90,
    ref: refs.homeLeaderboardRef,
  }),
  createGameTutorAnchor({
    contentId: 'game:home',
    enabled: screen === 'home',
    id: 'kangur-game-home-progress',
    kind: 'progress',
    label: translations('home.progressLabel'),
    priority: 80,
    ref: refs.homeProgressRef,
  }),
];

const buildGameLaunchableTutorAnchors = ({
  launchableGameScreenRefs,
  screen,
  translations,
  tutorActivityContentId,
}: {
  launchableGameScreenRefs: GameLaunchableScreenRefs;
  screen: KangurGameScreen;
  translations: GameTranslations;
  tutorActivityContentId: string;
}): KangurTutorAnchorConfig[] =>
  KANGUR_LAUNCHABLE_GAME_SCREENS.map((screenKey) =>
    createGameScreenTutorAnchor({
      contentId: tutorActivityContentId,
      enabled: screen === screenKey,
      id: `kangur-game-${screenKey.replaceAll('_', '-')}`,
      label: getGameScreenLabel(translations, screenKey),
      priority: 120,
      ref: launchableGameScreenRefs[screenKey],
    })
  );

function useGameTutorAnchorsRuntime(input: {
  activeGameAssignmentId?: string | null;
  canAccessParentAssignments: boolean;
  enabled?: boolean;
  refs: GameTutorAnchorRefs;
  screen: KangurGameScreen;
  translations: GameTranslations;
  tutorActivityContentId: string;
}): void {
  const {
    activeGameAssignmentId,
    canAccessParentAssignments,
    enabled = true,
    refs,
    screen,
    translations,
    tutorActivityContentId,
  } = input;
  const tutorAnchors = useMemo(
    () =>
      !enabled
        ? []
        : [
            ...buildGameHomeTutorAnchors({
              canAccessParentAssignments,
              refs,
              screen,
              translations,
            }),
            createGameScreenTutorAnchor({
              contentId: tutorActivityContentId,
              enabled: screen === 'training',
              id: 'kangur-game-training-setup',
              label: getGameScreenLabel(translations, 'training'),
              priority: 120,
              ref: refs.trainingSetupRef,
            }),
            createGameScreenTutorAnchor({
              contentId: tutorActivityContentId,
              enabled: screen === 'kangur_setup',
              id: 'kangur-game-kangur-setup',
              label: getGameScreenLabel(translations, 'kangur_setup'),
              priority: 120,
              ref: refs.kangurSetupRef,
            }),
            createGameScreenTutorAnchor({
              contentId: tutorActivityContentId,
              enabled: screen === 'kangur',
              id: 'kangur-game-kangur-session',
              label: getGameScreenLabel(translations, 'kangur'),
              priority: 120,
              ref: refs.kangurSessionRef,
            }),
            ...buildGameLaunchableTutorAnchors({
              launchableGameScreenRefs: refs.launchableGameScreenRefs,
              screen,
              translations,
              tutorActivityContentId,
            }),
            createGameScreenTutorAnchor({
              contentId: tutorActivityContentId,
              enabled: screen === 'operation',
              id: 'kangur-game-operation-selector',
              label: getGameScreenLabel(translations, 'operation'),
              priority: 120,
              ref: refs.operationSelectorRef,
            }),
            createGameTutorAnchor({
              assignmentId: activeGameAssignmentId ?? null,
              contentId: screen === 'result' ? tutorActivityContentId : null,
              enabled: screen === 'result',
              id: 'kangur-game-result-summary',
              kind: 'review',
              label: getGameScreenLabel(translations, 'result'),
              priority: 110,
              ref: refs.resultSummaryRef,
            }),
            createGameTutorAnchor({
              contentId: screen === 'result' ? tutorActivityContentId : null,
              enabled: screen === 'result',
              id: 'kangur-game-result-leaderboard',
              kind: 'leaderboard',
              label: translations('result.leaderboardLabel'),
              priority: 100,
              ref: refs.resultLeaderboardRef,
            }),
          ],
    [
      activeGameAssignmentId,
      canAccessParentAssignments,
      enabled,
      refs,
      screen,
      translations,
      tutorActivityContentId,
    ]
  );

  useKangurTutorAnchors(tutorAnchors);
}

const resolveGameLearnerActivityTitle = ({
  activeGameAssignment,
  currentScreenLabel,
  translations,
}: {
  activeGameAssignment: GameAssignmentLike;
  currentScreenLabel: string;
  translations: GameTranslations;
}): string => {
  const assignmentTitle = activeGameAssignment?.title?.trim();
  return translations('activityTitle', { title: assignmentTitle || currentScreenLabel });
};

function useGameTutorRuntime(input: {
  currentScreenLabel: string;
  runtime: ReturnType<typeof useKangurGameRuntime>;
  screen: KangurGameScreen;
  translations: GameTranslations;
}): {
  activeGameAssignment: typeof input.runtime.activePracticeAssignment | typeof input.runtime.resultPracticeAssignment;
  learnerId: string | null;
  tutorActivityContentId: string;
  tutorSessionContext: KangurAiTutorConversationContext;
} {
  const { currentScreenLabel, runtime, screen, translations } = input;
  const activeGameAssignment = runtime.activePracticeAssignment ?? runtime.resultPracticeAssignment;
  const tutorActivityContentId = useMemo(
    () =>
      resolveGameTutorActivityContentId({
        activeGameAssignmentId: activeGameAssignment?.id,
        difficulty: runtime.difficulty,
        kangurMode: runtime.kangurMode,
        operation: runtime.operation,
        screen,
      }),
    [
      activeGameAssignment?.id,
      runtime.difficulty,
      runtime.kangurMode,
      runtime.operation,
      screen,
    ]
  );
  const tutorSessionContext = useMemo(
    () =>
      createGameTutorSessionContext({
        activeGameAssignment,
        currentQuestion: runtime.currentQuestion,
        currentQuestionIndex: runtime.currentQuestionIndex,
        currentScreenLabel,
        screen,
        score: runtime.score,
        totalQuestions: runtime.totalQuestions,
        translations,
        tutorActivityContentId,
      }),
    [
      activeGameAssignment,
      currentScreenLabel,
      runtime.currentQuestion,
      runtime.currentQuestionIndex,
      runtime.score,
      runtime.totalQuestions,
      screen,
      translations,
      tutorActivityContentId,
    ]
  );
  const learnerActivityTitle = useMemo(
    () =>
      resolveGameLearnerActivityTitle({
        activeGameAssignment,
        currentScreenLabel,
        translations,
      }),
    [activeGameAssignment, currentScreenLabel, translations]
  );

  useKangurLearnerActivityPing({
    activity: {
      kind: 'game',
      title: learnerActivityTitle,
    },
    enabled: runtime.user?.actorType === 'learner' && screen !== 'home',
  });

  return {
    activeGameAssignment,
    learnerId: runtime.user?.activeLearner?.id ?? null,
    tutorActivityContentId,
    tutorSessionContext,
  };
}

// GameContent is the inner game page component that consumes KangurGameRuntime.
// It owns:
//  - Screen rendering via GameCurrentScreen (home, operation, playing, result,
//    training, kangur_setup, launchable game instances)
//  - AI Tutor session sync (registers the current game screen as the tutor context)
//  - Tutor anchor registration for game home widgets
//  - Learner activity ping (keeps the session alive during gameplay)
//  - Route page-ready signalling (tells the shell when the page is interactive)
//  - Screen heading focus management on screen transitions (accessibility)
//  - XP toast rendering (lazy-loaded, SSR disabled)
//  - Scroll-to-top on setup/operation screens
function GameContent(): React.JSX.Element {
  const translations = useTranslations('KangurGamePage');
  const runtime = useKangurGameRuntime();
  const { basePath, progress, screen, user, xpToast, launchableGameInstanceId } = runtime;
  const routing = useOptionalKangurRouting();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const canAccessParentAssignments = runtime.canAccessParentAssignments;
  const homeVisibility = useMemo(
    () =>
      resolveKangurGameHomeVisibility({
        canAccessParentAssignments,
        progress,
        user,
      }),
    [canAccessParentAssignments, progress, user]
  );
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('home');
  const prefersReducedMotion = usePrefersReducedMotion();
  const { homeRefs, screenHeadingRef, sessionRefs } = useGameScreenRefs();
  const isMobile = useKangurMobileBreakpoint();
  const shouldUseStandardMobileScroll = isMobile;
  const currentScreenLabel = getGameScreenLabel(translations, screen);
  const shouldDelayInitialStandaloneHomeEnhancementsRef = useRef<boolean | null>(null);
  shouldDelayInitialStandaloneHomeEnhancementsRef.current ??=
    screen === 'home' && routing?.embedded !== true;
  const shouldDelayInitialStandaloneHomeEnhancements =
    shouldDelayInitialStandaloneHomeEnhancementsRef.current;
  const homeEnhancementsIdleReady = useKangurIdleReady({
    minimumDelayMs: shouldDelayInitialStandaloneHomeEnhancements
      ? GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS
      : 0,
  });
  const shouldMountDeferredHomeEnhancements =
    !shouldDelayInitialStandaloneHomeEnhancements || homeEnhancementsIdleReady;
  const { activeLaunchableGameRuntime, launchableGameRuntimeLoading } = useGameLaunchableRuntime({
    launchableGameInstanceId,
    screen,
  });
  const { activeGameAssignment, learnerId, tutorActivityContentId, tutorSessionContext } =
    useGameTutorRuntime({
      currentScreenLabel,
      runtime,
      screen,
      translations,
    });
  const homeScreenMotionProps = useMemo(
    () => createKangurPageTransitionMotionProps(true),
    []
  );
  const screenMotionProps = useMemo(
    () => createKangurPageTransitionMotionProps(prefersReducedMotion),
    [prefersReducedMotion]
  );
  const isGamePageReady = resolveGamePageReady({
    routeTransitionState,
    screen,
  });

  useKangurRoutePageReady({
    pageKey: 'Game',
    ready: isGamePageReady,
  });
  useGameTutorAnchorsRuntime({
    activeGameAssignmentId: activeGameAssignment?.id,
    canAccessParentAssignments,
    enabled: screen !== 'home' || shouldMountDeferredHomeEnhancements,
    refs: {
      ...homeRefs,
      ...sessionRefs,
    },
    screen,
    translations,
    tutorActivityContentId,
  });
  useGameScreenFocusReset(screen, screenHeadingRef);

  return (
    <>
      {shouldMountDeferredHomeEnhancements ? (
        <KangurAiTutorSessionSync learnerId={learnerId} sessionContext={tutorSessionContext} />
      ) : null}
      {/* Visual contract: <KangurPageShell tone='play' ...> is provided by KangurStandardPageLayout. */}
      <KangurStandardPageLayout
        tone='play'
        id='kangur-game-page'
        skipLinkTargetId={GAME_MAIN_ID}
        docsRootId={shouldMountDeferredHomeEnhancements ? 'kangur-game-page' : undefined}
        docsTooltipsEnabled={shouldMountDeferredHomeEnhancements ? docsTooltipsEnabled : false}
        beforeNavigation={
          xpToast.visible ? (
            <XpToast
              xpGained={xpToast.xpGained}
              newBadges={xpToast.newBadges}
              breakdown={xpToast.breakdown}
              dailyQuest={xpToast.dailyQuest}
              nextBadge={xpToast.nextBadge}
              recommendation={xpToast.recommendation}
              visible={xpToast.visible}
            />
          ) : null
        }
        navigation={<KangurGameNavigationWidget />}
        afterNavigation={(
          <div role='status' aria-live='polite' aria-atomic='true' className='sr-only'>
            {translations('statusAnnouncement', { label: currentScreenLabel })}
          </div>
        )}
        containerProps={{
          as: 'section',
          'data-kangur-route-main': true,
          id: GAME_MAIN_ID,
          'aria-labelledby': `${GAME_TITLE_ID} ${GAME_SCREEN_TITLE_ID}`,
          className: cn(
            GAME_PAGE_STANDARD_CONTAINER_CLASSNAME,
            shouldUseStandardMobileScroll
              ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y'
              : null
          ),
        }}
      >
        <div className='w-full'>
          <h1 id={GAME_TITLE_ID} className='sr-only'>
            {GAME_BRAND_NAME}
          </h1>
          <GameCurrentScreen
            activeLaunchableGameRuntime={activeLaunchableGameRuntime}
            basePath={basePath}
            canAccessParentAssignments={canAccessParentAssignments}
            homeMotionProps={homeScreenMotionProps}
            homeRefs={homeRefs}
            homeVisibility={homeVisibility}
            launchableGameInstanceId={launchableGameInstanceId}
            launchableGameRuntimeLoading={launchableGameRuntimeLoading}
            progress={progress}
            screen={screen}
            screenHeadingRef={screenHeadingRef}
            screenMotionProps={screenMotionProps}
            sessionRefs={sessionRefs}
            translations={translations}
          />
        </div>
      </KangurStandardPageLayout>
    </>
  );
}

// Game is the page entry point. It wraps GameContent in
// KangurGameRuntimeBoundary so the game runtime context is always available,
// even when the page is rendered outside the main app shell (e.g. in tests).
export default function Game(): React.JSX.Element {
  return (
    <KangurGameRuntimeBoundary enabled>
      <GameContent />
    </KangurGameRuntimeBoundary>
  );
}
