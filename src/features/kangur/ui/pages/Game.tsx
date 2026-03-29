'use client';

import { motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, type RefObject } from 'react';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import {
  getKangurGameDefinition,
  resolveKangurLaunchableGameRuntimeForPersistedInstance,
} from '@/features/kangur/games';
import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurGameHomeActionsWidget } from '@/features/kangur/ui/components/KangurGameHomeActionsWidget';
import { KangurGameHomeDuelsInvitesWidget } from '@/features/kangur/ui/components/KangurGameHomeDuelsInvitesWidget';
import { KangurGameHomeHeroWidget } from '@/features/kangur/ui/components/KangurGameHomeHeroWidget';
import { KangurGameHomeQuestWidget } from '@/features/kangur/ui/components/KangurGameHomeQuestWidget';
import { KangurGameNavigationWidget } from '@/features/kangur/ui/components/KangurGameNavigationWidget';
import { KangurAssignmentSpotlight } from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import { KangurPriorityAssignments } from '@/features/kangur/ui/components/KangurPriorityAssignments';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import {
  GAME_HOME_LAYOUT_CLASSNAME,
  GAME_PAGE_STANDARD_CONTAINER_CLASSNAME,
} from '@/features/kangur/ui/pages/GameHome.constants';
import {
  createLaunchableGameScreenComponentConfigFromRuntime,
  getKangurLaunchableGameScreenComponentConfig,
} from '@/features/kangur/ui/pages/Game.launchable-screens';
import { useKangurMusicPianoRollLaunchableScreenRefs } from '@/features/kangur/ui/pages/music-piano-roll-launchable-screen-refs';
import {
  KangurGameHomeSections,
  resolveKangurGameHomeVisibility,
} from '@/features/kangur/ui/pages/GameHome.layout';
const DynamicLoadingFallback = (): React.JSX.Element => (
  <div className='h-24 w-full animate-pulse rounded-2xl bg-slate-100/60' />
);
const Leaderboard = dynamic(() => import('@/features/kangur/ui/components/Leaderboard'), {
  loading: DynamicLoadingFallback,
  ssr: false,
});
const PlayerProgressCard = dynamic(() => import('@/features/kangur/ui/components/PlayerProgressCard'), {
  loading: DynamicLoadingFallback,
  ssr: false,
});
const XpToast = dynamic(() => import('@/features/kangur/ui/components/XpToast'), {
  ssr: false,
});

// Lazy-load quiz/session widgets — only the active screen is downloaded.
// Keep the dynamic options inline because Next requires an object literal here.
const KangurGameKangurSessionWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameKangurSessionWidget').then((m) => ({
      default: m.KangurGameKangurSessionWidget,
    })),
  { ssr: false }
);
const KangurGameKangurSetupWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameKangurSetupWidget').then((m) => ({
      default: m.KangurGameKangurSetupWidget,
    })),
  { ssr: false }
);
const KangurGameOperationSelectorWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameOperationSelectorWidget').then((m) => ({
      default: m.KangurGameOperationSelectorWidget,
    })),
  { ssr: false }
);
const KangurGameQuestionWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameQuestionWidget').then((m) => ({
      default: m.KangurGameQuestionWidget,
    })),
  { ssr: false }
);
const KangurGameResultWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurGameResultWidget').then((m) => ({
      default: m.KangurGameResultWidget,
    })),
  { ssr: false }
);
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  KangurGameRuntimeBoundary,
  useKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import {
  KangurButton,
  KangurEmptyState,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurLearnerActivityPing } from '@/features/kangur/ui/hooks/useKangurLearnerActivity';
import { useKangurGameContentSets } from '@/features/kangur/ui/hooks/useKangurGameContentSets';
import { useKangurGameInstances } from '@/features/kangur/ui/hooks/useKangurGameInstances';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import {
  KANGUR_LAUNCHABLE_GAME_SCREENS,
  getKangurLaunchableGameContentId,
  isKangurLaunchableGameScreen,
  type KangurLaunchableGameScreen,
} from '@/features/kangur/ui/services/game-launch';
import { useKangurTutorAnchors, type KangurTutorAnchorConfig } from '@/features/kangur/ui/hooks/useKangurTutorAnchors';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import type { KangurGameScreen, KangurProgressState } from '@/features/kangur/ui/types';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

const GAME_BRAND_NAME = 'Sprycio';
const GAME_MAIN_ID = 'kangur-game-main';
const GAME_TITLE_ID = 'kangur-game-page-title';
const GAME_SCREEN_TITLE_ID = 'kangur-game-screen-title';
const GAME_TOP_RESET_SCREENS = new Set<KangurGameScreen>([
  'training',
  'kangur_setup',
  'operation',
  ...KANGUR_LAUNCHABLE_GAME_SCREENS,
]);

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
type GameMotionProps = ReturnType<typeof createKangurPageTransitionMotionProps>;
type GameLaunchableRuntime = ReturnType<typeof getKangurLaunchableGameScreenComponentConfig>['runtime'];
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
type GameLaunchableScreenRefs = Record<KangurLaunchableGameScreen, RefObject<HTMLDivElement | null>>;
type GameHomeScreenRefs = {
  homeActionsRef: RefObject<HTMLDivElement | null>;
  homeAssignmentsRef: RefObject<HTMLElement | null>;
  homeLeaderboardRef: RefObject<HTMLDivElement | null>;
  homeProgressRef: RefObject<HTMLDivElement | null>;
  homeQuestRef: RefObject<HTMLElement | null>;
};
type GameSessionScreenRefs = {
  kangurSessionRef: RefObject<HTMLDivElement | null>;
  kangurSetupRef: RefObject<HTMLDivElement | null>;
  launchableGameScreenRefs: GameLaunchableScreenRefs;
  operationSelectorRef: RefObject<HTMLDivElement | null>;
  resultLeaderboardRef: RefObject<HTMLDivElement | null>;
  resultSummaryRef: RefObject<HTMLDivElement | null>;
  trainingSetupRef: RefObject<HTMLDivElement | null>;
};
type GameTutorAnchorRefs = GameHomeScreenRefs & GameSessionScreenRefs;

const getGameScreenLabel = (
  translations: GameTranslations,
  screenKey: KangurGameScreen
): string => translations(`screens.${screenKey}.label`);

const getGameScreenDescription = (
  translations: GameTranslations,
  screenKey: KangurGameScreen
): string => translations(`screens.${screenKey}.description`);

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

  if ((screen === 'playing' || screen === 'result') && operation) {
    return `game:practice:${operation}:${difficulty}`;
  }

  if (isKangurLaunchableGameScreen(screen)) {
    return getKangurLaunchableGameContentId(screen);
  }

  switch (screen) {
    case 'kangur':
    case 'kangur_setup':
      return `game:kangur:${kangurMode ?? 'setup'}`;
    case 'training':
      return 'game:training-setup';
    case 'operation':
      return 'game:operation-selector';
    case 'home':
      return 'game:home';
    default:
      return `game:${screen}`;
  }
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
  refs: GameTutorAnchorRefs;
  screen: KangurGameScreen;
  translations: GameTranslations;
  tutorActivityContentId: string;
}): void {
  const { activeGameAssignmentId, canAccessParentAssignments, refs, screen, translations, tutorActivityContentId } =
    input;
  const tutorAnchors = useMemo(
    () => [
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
      refs,
      screen,
      translations,
      tutorActivityContentId,
    ]
  );

  useKangurTutorAnchors(tutorAnchors);
}

function GameScreenFrame(props: {
  children: React.ReactNode;
  className: string;
  motionProps: GameMotionProps;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenKey: KangurGameScreen;
  screenLabel: string;
  screenRef?: RefObject<HTMLDivElement | null>;
  testId?: string;
}): React.JSX.Element {
  const { children, className, motionProps, screenHeadingRef, screenKey, screenLabel, screenRef, testId } =
    props;

  return (
    <motion.div
      key={screenKey}
      {...motionProps}
      className={cn('w-full min-w-0 max-w-full', className)}
      data-testid={testId}
      ref={screenRef}
    >
      <h2 id={GAME_SCREEN_TITLE_ID} ref={screenHeadingRef} tabIndex={-1} className='sr-only'>
        {screenLabel}
      </h2>
      {children}
    </motion.div>
  );
}

function GameHomeMissingLearnerState(props: {
  basePath: string;
  translations: GameTranslations;
}): React.JSX.Element {
  const { basePath, translations } = props;

  return (
    <KangurEmptyState
      align='left'
      className='text-left'
      padding='md'
      title={translations('home.missingLearnerTitle')}
      description={translations('home.missingLearnerDescription')}
    >
      <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} w-full sm:items-center`}>
        <KangurButton
          asChild
          className='w-full sm:w-auto'
          size='sm'
          variant='primary'
          data-doc-id='home_parent_add_learner'
        >
          <Link
            href={createPageUrl('ParentDashboard', basePath)}
            targetPageKey='ParentDashboard'
            transitionSourceId='game-home-parent-add-learner'
          >
            {translations('home.addLearner')}
          </Link>
        </KangurButton>
      </div>
    </KangurEmptyState>
  );
}

function GameHomeActionsColumn(props: {
  basePath: string;
  homeActionsRef: RefObject<HTMLDivElement | null>;
  homeVisibility: ReturnType<typeof resolveKangurGameHomeVisibility>;
  translations: GameTranslations;
}): React.JSX.Element {
  const { basePath, homeActionsRef, homeVisibility, translations } = props;

  return (
    <>
      <div id='kangur-home-actions' ref={homeActionsRef}>
        <KangurGameHomeActionsWidget hideWhenScreenMismatch={false} />
      </div>
      <KangurGameHomeDuelsInvitesWidget hideWhenScreenMismatch={false} />
      {homeVisibility.hideLearnerWidgetsForParent ? (
        <GameHomeMissingLearnerState basePath={basePath} translations={translations} />
      ) : null}
    </>
  );
}

function GameHomeScreen(props: {
  basePath: string;
  canAccessParentAssignments: boolean;
  homeMotionProps: GameMotionProps;
  homeRefs: GameHomeScreenRefs;
  homeVisibility: ReturnType<typeof resolveKangurGameHomeVisibility>;
  progress: KangurProgressState | null | undefined;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  translations: GameTranslations;
}): React.JSX.Element {
  const {
    basePath,
    canAccessParentAssignments,
    homeMotionProps,
    homeRefs,
    homeVisibility,
    progress,
    screenHeadingRef,
    translations,
  } = props;

  return (
    <GameScreenFrame
      className={GAME_HOME_LAYOUT_CLASSNAME}
      motionProps={homeMotionProps}
      screenHeadingRef={screenHeadingRef}
      screenKey='home'
      screenLabel={getGameScreenLabel(translations, 'home')}
      testId='kangur-game-home-layout'
    >
      <KangurGameHomeSections
        visibility={homeVisibility}
        parentSpotlight={<KangurAssignmentSpotlight basePath={basePath} enabled={canAccessParentAssignments} />}
        parentSpotlightSectionProps={{
          headingId: 'kangur-home-parent-assignment-heading',
          headingLabel: translations('home.parentSuggestionsHeading'),
          id: 'kangur-home-parent-spotlight',
        }}
        actionsColumn={
          <GameHomeActionsColumn
            basePath={basePath}
            homeActionsRef={homeRefs.homeActionsRef}
            homeVisibility={homeVisibility}
            translations={translations}
          />
        }
        actionsColumnProps={{ testId: 'kangur-home-actions-column' }}
        quest={<KangurGameHomeQuestWidget hideWhenScreenMismatch={false} />}
        questSectionProps={{
          headingId: 'kangur-home-quest-heading',
          headingLabel: translations('home.questHeading'),
          id: 'kangur-home-quest',
          ref: homeRefs.homeQuestRef,
        }}
        summary={
          <KangurGameHomeHeroWidget
            hideWhenScreenMismatch={false}
            showIntro={false}
            showAssignmentSpotlight={false}
          />
        }
        summarySectionProps={{
          headingId: 'kangur-home-hero-heading',
          headingLabel: translations('home.summaryHeading'),
          id: 'kangur-home-summary',
        }}
        assignments={
          <KangurPriorityAssignments
            basePath={basePath}
            enabled={canAccessParentAssignments}
            title={translations('home.priorityAssignmentsTitle')}
            emptyLabel={translations('home.priorityAssignmentsEmpty')}
          />
        }
        assignmentsSectionProps={{
          headingId: 'kangur-home-assignments-heading',
          headingLabel: translations('home.priorityAssignmentsHeading'),
          id: 'kangur-home-priority-assignments',
          ref: homeRefs.homeAssignmentsRef,
        }}
        leaderboard={<Leaderboard />}
        leaderboardColumnProps={{
          id: 'kangur-home-leaderboard',
          ref: homeRefs.homeLeaderboardRef,
        }}
        playerProgress={<PlayerProgressCard progress={progress} />}
        playerProgressColumnProps={{
          id: 'kangur-home-player-progress',
          ref: homeRefs.homeProgressRef,
        }}
        progressSectionProps={{
          headingId: 'kangur-home-progress-heading',
          headingLabel: translations('home.progressHeading'),
          id: 'kangur-home-progress',
        }}
      />
    </GameScreenFrame>
  );
}

function GameLaunchableScreen(props: {
  activeLaunchableGameRuntime: GameLaunchableRuntime | null;
  launchableGameInstanceId?: string | null;
  launchableGameRuntimeLoading: boolean;
  launchableGameScreenRefs: GameLaunchableScreenRefs;
  screen: KangurLaunchableGameScreen;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  translations: GameTranslations;
}): React.JSX.Element {
  const {
    activeLaunchableGameRuntime,
    launchableGameInstanceId,
    launchableGameRuntimeLoading,
    launchableGameScreenRefs,
    screen,
    screenHeadingRef,
    screenMotionProps,
    translations,
  } = props;
  const screenLabel = getGameScreenLabel(translations, screen);

  if (launchableGameRuntimeLoading) {
    return (
      <GameScreenFrame
        className='w-full flex flex-col items-center'
        motionProps={screenMotionProps}
        screenHeadingRef={screenHeadingRef}
        screenKey={screen}
        screenLabel={screenLabel}
        screenRef={launchableGameScreenRefs[screen]}
      >
        <div data-testid='kangur-game-launchable-runtime-loading' />
      </GameScreenFrame>
    );
  }

  if (launchableGameInstanceId && !activeLaunchableGameRuntime) {
    return (
      <GameScreenFrame
        className='w-full flex flex-col items-center'
        motionProps={screenMotionProps}
        screenHeadingRef={screenHeadingRef}
        screenKey={screen}
        screenLabel={screenLabel}
        screenRef={launchableGameScreenRefs[screen]}
      >
        <div data-testid='kangur-game-launchable-runtime-missing' />
      </GameScreenFrame>
    );
  }

  const config = activeLaunchableGameRuntime
    ? createLaunchableGameScreenComponentConfigFromRuntime(activeLaunchableGameRuntime)
    : getKangurLaunchableGameScreenComponentConfig(screen);
  const ScreenComponent = config.Component;

  return (
    <GameScreenFrame
      className={config.className}
      motionProps={screenMotionProps}
      screenHeadingRef={screenHeadingRef}
      screenKey={screen}
      screenLabel={screenLabel}
      screenRef={launchableGameScreenRefs[screen]}
    >
      <ScreenComponent />
    </GameScreenFrame>
  );
}

function GameNonLaunchableScreen(props: {
  basePath: string;
  canAccessParentAssignments: boolean;
  homeMotionProps: GameMotionProps;
  homeRefs: GameHomeScreenRefs;
  homeVisibility: ReturnType<typeof resolveKangurGameHomeVisibility>;
  progress: KangurProgressState | null | undefined;
  screen: Exclude<KangurGameScreen, KangurLaunchableGameScreen>;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  sessionRefs: Omit<GameSessionScreenRefs, 'launchableGameScreenRefs'>;
  translations: GameTranslations;
}): React.JSX.Element | null {
  const {
    basePath,
    canAccessParentAssignments,
    homeMotionProps,
    homeRefs,
    homeVisibility,
    progress,
    screen,
    screenHeadingRef,
    screenMotionProps,
    sessionRefs,
    translations,
  } = props;

  switch (screen) {
    case 'home':
      return (
        <GameHomeScreen
          basePath={basePath}
          canAccessParentAssignments={canAccessParentAssignments}
          homeMotionProps={homeMotionProps}
          homeRefs={homeRefs}
          homeVisibility={homeVisibility}
          progress={progress}
          screenHeadingRef={screenHeadingRef}
          translations={translations}
        />
      );
    case 'kangur_setup':
      return (
        <GameScreenFrame
          className='w-full flex flex-col items-center'
          motionProps={screenMotionProps}
          screenHeadingRef={screenHeadingRef}
          screenKey='kangur_setup'
          screenLabel={getGameScreenLabel(translations, 'kangur_setup')}
          screenRef={sessionRefs.kangurSetupRef}
        >
          <KangurGameKangurSetupWidget />
        </GameScreenFrame>
      );
    case 'kangur':
      return (
        <GameScreenFrame
          className='w-full max-w-lg flex flex-col items-center'
          motionProps={screenMotionProps}
          screenHeadingRef={screenHeadingRef}
          screenKey='kangur'
          screenLabel={getGameScreenLabel(translations, 'kangur')}
          screenRef={sessionRefs.kangurSessionRef}
        >
          <KangurGameKangurSessionWidget />
        </GameScreenFrame>
      );
    case 'operation':
    case 'training':
      return (
        <GameScreenFrame
          className='w-full flex flex-col items-center'
          motionProps={screenMotionProps}
          screenHeadingRef={screenHeadingRef}
          screenKey={screen}
          screenLabel={getGameScreenLabel(translations, screen)}
          screenRef={screen === 'training' ? sessionRefs.trainingSetupRef : sessionRefs.operationSelectorRef}
        >
          <KangurGameOperationSelectorWidget />
        </GameScreenFrame>
      );
    case 'playing':
      return (
        <GameScreenFrame
          className='flex w-full flex-col items-center'
          motionProps={screenMotionProps}
          screenHeadingRef={screenHeadingRef}
          screenKey='playing'
          screenLabel={getGameScreenLabel(translations, 'playing')}
        >
          <KangurGameQuestionWidget />
        </GameScreenFrame>
      );
    case 'result':
      return (
        <GameScreenFrame
          className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
          motionProps={screenMotionProps}
          screenHeadingRef={screenHeadingRef}
          screenKey='result'
          screenLabel={getGameScreenLabel(translations, 'result')}
        >
          <>
            <div ref={sessionRefs.resultSummaryRef} className='w-full flex flex-col items-center'>
              <KangurGameResultWidget />
            </div>
            <div ref={sessionRefs.resultLeaderboardRef} className='w-full'>
              <Leaderboard />
            </div>
          </>
        </GameScreenFrame>
      );
    default:
      return null;
  }
}

function GameCurrentScreen(props: {
  activeLaunchableGameRuntime: GameLaunchableRuntime | null;
  basePath: string;
  canAccessParentAssignments: boolean;
  homeMotionProps: GameMotionProps;
  homeRefs: GameHomeScreenRefs;
  homeVisibility: ReturnType<typeof resolveKangurGameHomeVisibility>;
  launchableGameInstanceId?: string | null;
  launchableGameRuntimeLoading: boolean;
  progress: KangurProgressState | null | undefined;
  screen: KangurGameScreen;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  sessionRefs: GameSessionScreenRefs;
  translations: GameTranslations;
}): React.JSX.Element | null {
  const {
    activeLaunchableGameRuntime,
    basePath,
    canAccessParentAssignments,
    homeMotionProps,
    homeRefs,
    homeVisibility,
    launchableGameInstanceId,
    launchableGameRuntimeLoading,
    progress,
    screen,
    screenHeadingRef,
    screenMotionProps,
    sessionRefs,
    translations,
  } = props;

  if (isKangurLaunchableGameScreen(screen)) {
    return (
      <GameLaunchableScreen
        activeLaunchableGameRuntime={activeLaunchableGameRuntime}
        launchableGameInstanceId={launchableGameInstanceId}
        launchableGameRuntimeLoading={launchableGameRuntimeLoading}
        launchableGameScreenRefs={sessionRefs.launchableGameScreenRefs}
        screen={screen}
        screenHeadingRef={screenHeadingRef}
        screenMotionProps={screenMotionProps}
        translations={translations}
      />
    );
  }

  return (
    <GameNonLaunchableScreen
      basePath={basePath}
      canAccessParentAssignments={canAccessParentAssignments}
      homeMotionProps={homeMotionProps}
      homeRefs={homeRefs}
      homeVisibility={homeVisibility}
      progress={progress}
      screen={screen}
      screenHeadingRef={screenHeadingRef}
      screenMotionProps={screenMotionProps}
      sessionRefs={{
        kangurSessionRef: sessionRefs.kangurSessionRef,
        kangurSetupRef: sessionRefs.kangurSetupRef,
        operationSelectorRef: sessionRefs.operationSelectorRef,
        resultLeaderboardRef: sessionRefs.resultLeaderboardRef,
        resultSummaryRef: sessionRefs.resultSummaryRef,
        trainingSetupRef: sessionRefs.trainingSetupRef,
      }}
      translations={translations}
    />
  );
}

type GameScreenRefsState = {
  homeRefs: GameHomeScreenRefs;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  sessionRefs: GameSessionScreenRefs;
};

function useGameScreenRefs(): GameScreenRefsState {
  const screenHeadingRef = useRef<HTMLHeadingElement>(null);
  const homeActionsRef = useRef<HTMLDivElement | null>(null);
  const homeQuestRef = useRef<HTMLElement | null>(null);
  const homeAssignmentsRef = useRef<HTMLElement | null>(null);
  const homeLeaderboardRef = useRef<HTMLDivElement | null>(null);
  const homeProgressRef = useRef<HTMLDivElement | null>(null);
  const trainingSetupRef = useRef<HTMLDivElement | null>(null);
  const kangurSetupRef = useRef<HTMLDivElement | null>(null);
  const kangurSessionRef = useRef<HTMLDivElement | null>(null);
  const agenticApprovalGateQuizRef = useRef<HTMLDivElement | null>(null);
  const agenticPromptTrimQuizRef = useRef<HTMLDivElement | null>(null);
  const agenticReasoningRouterQuizRef = useRef<HTMLDivElement | null>(null);
  const agenticSurfaceMatchQuizRef = useRef<HTMLDivElement | null>(null);
  const alphabetFirstWordsQuizRef = useRef<HTMLDivElement | null>(null);
  const alphabetLetterMatchingQuizRef = useRef<HTMLDivElement | null>(null);
  const alphabetLetterOrderQuizRef = useRef<HTMLDivElement | null>(null);
  const artColorHarmonyQuizRef = useRef<HTMLDivElement | null>(null);
  const artShapeRotationQuizRef = useRef<HTMLDivElement | null>(null);
  const calendarQuizRef = useRef<HTMLDivElement | null>(null);
  const geometryQuizRef = useRef<HTMLDivElement | null>(null);
  const geometryShapeSpotterQuizRef = useRef<HTMLDivElement | null>(null);
  const clockQuizRef = useRef<HTMLDivElement | null>(null);
  const musicLaunchableGameScreenRefs = useKangurMusicPianoRollLaunchableScreenRefs();
  const additionQuizRef = useRef<HTMLDivElement | null>(null);
  const addingSynthesisQuizRef = useRef<HTMLDivElement | null>(null);
  const subtractionQuizRef = useRef<HTMLDivElement | null>(null);
  const divisionQuizRef = useRef<HTMLDivElement | null>(null);
  const multiplicationQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalPatternsQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalClassificationQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalAnalogiesQuizRef = useRef<HTMLDivElement | null>(null);
  const englishSubjectVerbAgreementQuizRef = useRef<HTMLDivElement | null>(null);
  const englishAdjectivesQuizRef = useRef<HTMLDivElement | null>(null);
  const englishCompareAndCrownQuizRef = useRef<HTMLDivElement | null>(null);
  const englishAdverbsQuizRef = useRef<HTMLDivElement | null>(null);
  const englishAdverbsFrequencyQuizRef = useRef<HTMLDivElement | null>(null);
  const englishArticlesQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPrepositionsQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPrepositionsSortQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPrepositionsOrderQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPronounsWarmupQuizRef = useRef<HTMLDivElement | null>(null);
  const englishSentenceQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPartsOfSpeechQuizRef = useRef<HTMLDivElement | null>(null);
  const operationSelectorRef = useRef<HTMLDivElement | null>(null);
  const resultSummaryRef = useRef<HTMLDivElement | null>(null);
  const resultLeaderboardRef = useRef<HTMLDivElement | null>(null);
  const launchableGameScreenRefs: GameLaunchableScreenRefs = {
    agentic_approval_gate_quiz: agenticApprovalGateQuizRef,
    agentic_prompt_trim_quiz: agenticPromptTrimQuizRef,
    agentic_reasoning_router_quiz: agenticReasoningRouterQuizRef,
    agentic_surface_match_quiz: agenticSurfaceMatchQuizRef,
    alphabet_first_words_quiz: alphabetFirstWordsQuizRef,
    alphabet_letter_matching_quiz: alphabetLetterMatchingQuizRef,
    alphabet_letter_order_quiz: alphabetLetterOrderQuizRef,
    art_color_harmony_quiz: artColorHarmonyQuizRef,
    art_shape_rotation_quiz: artShapeRotationQuizRef,
    calendar_quiz: calendarQuizRef,
    geometry_quiz: geometryQuizRef,
    geometry_shape_spotter_quiz: geometryShapeSpotterQuizRef,
    clock_quiz: clockQuizRef,
    ...musicLaunchableGameScreenRefs,
    addition_quiz: additionQuizRef,
    adding_synthesis_quiz: addingSynthesisQuizRef,
    subtraction_quiz: subtractionQuizRef,
    multiplication_quiz: multiplicationQuizRef,
    division_quiz: divisionQuizRef,
    logical_patterns_quiz: logicalPatternsQuizRef,
    logical_classification_quiz: logicalClassificationQuizRef,
    logical_analogies_quiz: logicalAnalogiesQuizRef,
    english_subject_verb_agreement_quiz: englishSubjectVerbAgreementQuizRef,
    english_going_to_quiz: englishSentenceQuizRef,
    english_adjectives_quiz: englishAdjectivesQuizRef,
    english_compare_and_crown_quiz: englishCompareAndCrownQuizRef,
    english_adverbs_quiz: englishAdverbsQuizRef,
    english_adverbs_frequency_quiz: englishAdverbsFrequencyQuizRef,
    english_articles_quiz: englishArticlesQuizRef,
    english_prepositions_quiz: englishPrepositionsQuizRef,
    english_prepositions_sort_quiz: englishPrepositionsSortQuizRef,
    english_prepositions_order_quiz: englishPrepositionsOrderQuizRef,
    english_pronouns_warmup_quiz: englishPronounsWarmupQuizRef,
    english_sentence_quiz: englishSentenceQuizRef,
    english_parts_of_speech_quiz: englishPartsOfSpeechQuizRef,
  };

  return {
    homeRefs: {
      homeActionsRef,
      homeAssignmentsRef,
      homeLeaderboardRef,
      homeProgressRef,
      homeQuestRef,
    },
    screenHeadingRef,
    sessionRefs: {
      kangurSessionRef,
      kangurSetupRef,
      launchableGameScreenRefs,
      operationSelectorRef,
      resultLeaderboardRef,
      resultSummaryRef,
      trainingSetupRef,
    },
  };
}

const resolveLaunchableGameInstanceQueryEnabled = ({
  launchableGameInstanceId,
  screen,
}: {
  launchableGameInstanceId?: string | null;
  screen: KangurGameScreen;
}): boolean => isKangurLaunchableGameScreen(screen) && Boolean(launchableGameInstanceId);

const resolveLaunchableGameContentSetsQueryEnabled = ({
  contentSetId,
  screen,
}: {
  contentSetId?: string | null;
  screen: KangurGameScreen;
}): boolean => isKangurLaunchableGameScreen(screen) && Boolean(contentSetId);

const resolveLaunchableGameRuntimeLoading = ({
  activeLaunchableGameInstance,
  launchableGameContentSetsPending,
  launchableGameInstanceId,
  launchableGameInstancePending,
  screen,
}: {
  activeLaunchableGameInstance: { contentSetId?: string | null } | null;
  launchableGameContentSetsPending: boolean;
  launchableGameInstanceId?: string | null;
  launchableGameInstancePending: boolean;
  screen: KangurGameScreen;
}): boolean =>
  isKangurLaunchableGameScreen(screen) &&
  Boolean(launchableGameInstanceId) &&
  (launchableGameInstancePending ||
    (Boolean(activeLaunchableGameInstance?.contentSetId) && launchableGameContentSetsPending));

const resolveActiveLaunchableGameRuntime = ({
  activeLaunchableGameInstance,
  contentSets,
  launchableGameInstanceId,
  screen,
}: {
  activeLaunchableGameInstance: {
    contentSetId?: string | null;
    gameId: string;
    launchableRuntimeId?: string | null;
  } | null;
  contentSets: unknown;
  launchableGameInstanceId?: string | null;
  screen: KangurGameScreen;
}): GameLaunchableRuntime | null => {
  if (!isKangurLaunchableGameScreen(screen)) {
    return null;
  }

  const defaultRuntime = getKangurLaunchableGameScreenComponentConfig(screen).runtime;
  if (!launchableGameInstanceId) {
    return defaultRuntime;
  }

  if (!activeLaunchableGameInstance) {
    return null;
  }

  if (activeLaunchableGameInstance.launchableRuntimeId !== screen) {
    return null;
  }

  const game = getKangurGameDefinition(activeLaunchableGameInstance.gameId);
  return resolveKangurLaunchableGameRuntimeForPersistedInstance(
    game,
    activeLaunchableGameInstance,
    contentSets
  );
};

function useGameLaunchableRuntime(input: {
  launchableGameInstanceId?: string | null;
  screen: KangurGameScreen;
}): {
  activeLaunchableGameRuntime: GameLaunchableRuntime | null;
  launchableGameRuntimeLoading: boolean;
} {
  const { launchableGameInstanceId, screen } = input;
  const launchableGameInstanceQuery = useKangurGameInstances({
    enabled: resolveLaunchableGameInstanceQueryEnabled({
      launchableGameInstanceId,
      screen,
    }),
    enabledOnly: true,
    instanceId: launchableGameInstanceId ?? undefined,
  });
  const activeLaunchableGameInstance = launchableGameInstanceQuery.data?.[0] ?? null;
  const launchableGameContentSetsQuery = useKangurGameContentSets({
    contentSetId: activeLaunchableGameInstance?.contentSetId ?? undefined,
    enabled: resolveLaunchableGameContentSetsQueryEnabled({
      contentSetId: activeLaunchableGameInstance?.contentSetId,
      screen,
    }),
    gameId: activeLaunchableGameInstance?.gameId,
  });
  const activeLaunchableGameRuntime = useMemo(
    () =>
      resolveActiveLaunchableGameRuntime({
        activeLaunchableGameInstance,
        contentSets: launchableGameContentSetsQuery.data,
        launchableGameInstanceId,
        screen,
      }),
    [
      activeLaunchableGameInstance,
      launchableGameContentSetsQuery.data,
      launchableGameInstanceId,
      screen,
    ]
  );

  return {
    activeLaunchableGameRuntime,
    launchableGameRuntimeLoading: resolveLaunchableGameRuntimeLoading({
      activeLaunchableGameInstance,
      launchableGameContentSetsPending: launchableGameContentSetsQuery.isPending,
      launchableGameInstanceId,
      launchableGameInstancePending: launchableGameInstanceQuery.isPending,
      screen,
    }),
  };
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
    enabled: runtime.user?.actorType === 'learner',
  });

  return {
    activeGameAssignment,
    learnerId: runtime.user?.activeLearner?.id ?? null,
    tutorActivityContentId,
    tutorSessionContext,
  };
}

function GameContent(): React.JSX.Element {
  const translations = useTranslations('KangurGamePage');
  const runtime = useKangurGameRuntime();
  const { basePath, progress, screen, user, xpToast, launchableGameInstanceId } = runtime;
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const canAccessParentAssignments =
    runtime.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);
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
  const prefersReducedMotion = useReducedMotion();
  const { homeRefs, screenHeadingRef, sessionRefs } = useGameScreenRefs();
  const isMobile = useKangurMobileBreakpoint();
  const shouldUseStandardMobileScroll = isMobile;
  const currentScreenLabel = getGameScreenLabel(translations, screen);
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
      <KangurAiTutorSessionSync learnerId={learnerId} sessionContext={tutorSessionContext} />
      {/* Visual contract: <KangurPageShell tone='play' ...> is provided by KangurStandardPageLayout. */}
      <KangurStandardPageLayout
        tone='play'
        id='kangur-game-page'
        skipLinkTargetId={GAME_MAIN_ID}
        docsRootId='kangur-game-page'
        docsTooltipsEnabled={docsTooltipsEnabled}
        beforeNavigation={(
          <XpToast
            xpGained={xpToast.xpGained}
            newBadges={xpToast.newBadges}
            breakdown={xpToast.breakdown}
            dailyQuest={xpToast.dailyQuest}
            nextBadge={xpToast.nextBadge}
            recommendation={xpToast.recommendation}
            visible={xpToast.visible}
          />
        )}
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

export default function Game(): React.JSX.Element {
  return (
    <KangurGameRuntimeBoundary enabled>
      <GameContent />
    </KangurGameRuntimeBoundary>
  );
}
