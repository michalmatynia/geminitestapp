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
import type { KangurGameScreen } from '@/features/kangur/ui/types';
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

function GameContent(): React.JSX.Element {
  const translations = useTranslations('KangurGamePage');
  const runtime = useKangurGameRuntime();
  const {
    basePath,
    progress,
    screen,
    user,
    xpToast,
    launchableGameInstanceId,
  } = runtime;
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
  const screenHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousScreenRef = useRef<KangurGameScreen | null>(null);
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
  const launchableGameScreenRefs: Record<
    KangurLaunchableGameScreen,
    RefObject<HTMLDivElement | null>
  > = {
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
  const isMobile = useKangurMobileBreakpoint();
  const shouldUseStandardMobileScroll = isMobile;
  const getScreenLabel = (screenKey: KangurGameScreen): string =>
    translations(`screens.${screenKey}.label`);
  const getScreenDescription = (screenKey: KangurGameScreen): string =>
    translations(`screens.${screenKey}.description`);
  const currentScreenLabel = getScreenLabel(screen);
  const learnerId = user?.activeLearner?.id ?? null;
  const launchableGameInstanceQuery = useKangurGameInstances({
    enabled: isKangurLaunchableGameScreen(screen) && Boolean(launchableGameInstanceId),
    enabledOnly: true,
    instanceId: launchableGameInstanceId ?? undefined,
  });
  const activeLaunchableGameInstance = launchableGameInstanceQuery.data?.[0] ?? null;
  const launchableGameContentSetsQuery = useKangurGameContentSets({
    contentSetId: activeLaunchableGameInstance?.contentSetId ?? undefined,
    enabled:
      isKangurLaunchableGameScreen(screen) && Boolean(activeLaunchableGameInstance?.contentSetId),
    gameId: activeLaunchableGameInstance?.gameId,
  });
  const launchableGameRuntimeLoading =
    isKangurLaunchableGameScreen(screen) &&
    Boolean(launchableGameInstanceId) &&
    (launchableGameInstanceQuery.isPending ||
      (Boolean(activeLaunchableGameInstance?.contentSetId) &&
        launchableGameContentSetsQuery.isPending));
  const activeLaunchableGameRuntime = useMemo(() => {
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
      launchableGameContentSetsQuery.data
    );
  }, [
    activeLaunchableGameInstance,
    launchableGameContentSetsQuery.data,
    launchableGameInstanceId,
    screen,
  ]);
  const activeGameAssignment = runtime.activePracticeAssignment ?? runtime.resultPracticeAssignment;
  const tutorActivityContentId = useMemo(() => {
    if (activeGameAssignment?.id) {
      return `game:assignment:${activeGameAssignment.id}`;
    }

    if ((screen === 'playing' || screen === 'result') && runtime.operation) {
      return `game:practice:${runtime.operation}:${runtime.difficulty}`;
    }

    if (isKangurLaunchableGameScreen(screen)) {
      return getKangurLaunchableGameContentId(screen);
    }

    if (screen === 'kangur' || screen === 'kangur_setup') {
      return `game:kangur:${runtime.kangurMode ?? 'setup'}`;
    }

    if (screen === 'training') {
      return 'game:training-setup';
    }

    if (screen === 'operation') {
      return 'game:operation-selector';
    }

    if (screen === 'home') {
      return 'game:home';
    }

    return `game:${screen}`;
  }, [
    activeGameAssignment?.id,
    runtime.difficulty,
    runtime.kangurMode,
    runtime.operation,
    screen,
  ]);
  const tutorSessionContext = useMemo<KangurAiTutorConversationContext | null>(() => {
    const questionText = runtime.currentQuestion?.question?.trim() || null;
    const assignmentSummary = activeGameAssignment
      ? [activeGameAssignment.title, activeGameAssignment.progress.summary].filter(Boolean).join(' - ')
      : null;
    const questionProgressLabel =
      screen === 'playing'
        ? translations('questionProgress', {
            current: runtime.currentQuestionIndex + 1,
            total: runtime.totalQuestions,
          })
        : screen === 'result'
          ? translations('resultProgress', {
              score: runtime.score,
              total: runtime.totalQuestions,
            })
          : null;
    const focusKind =
      screen === 'playing'
        ? 'question'
        : screen === 'result'
          ? 'review'
          : activeGameAssignment
            ? 'assignment'
            : undefined;
    const focusLabel =
      screen === 'playing'
        ? questionText
        : activeGameAssignment?.title?.trim() || currentScreenLabel;

    return {
      surface: 'game',
      contentId: tutorActivityContentId,
      title: currentScreenLabel,
      description: getScreenDescription(screen),
      ...(assignmentSummary ? { assignmentSummary } : {}),
      ...(activeGameAssignment?.id ? { assignmentId: activeGameAssignment.id } : {}),
      ...(questionText ? { currentQuestion: questionText } : {}),
      ...(questionProgressLabel ? { questionProgressLabel } : {}),
      ...(screen === 'playing'
        ? { questionId: `game-question-${runtime.currentQuestionIndex + 1}` }
        : {}),
      ...(screen === 'result' ? { answerRevealed: true } : {}),
      ...(focusKind ? { focusKind } : {}),
      ...(focusLabel ? { focusLabel } : {}),
    };
  }, [
    activeGameAssignment,
    currentScreenLabel,
    runtime.currentQuestion,
    runtime.currentQuestionIndex,
    runtime.difficulty,
    runtime.kangurMode,
    runtime.operation,
    runtime.score,
    runtime.totalQuestions,
    screen,
    tutorActivityContentId,
    translations,
  ]);
  const learnerActivityTitle = useMemo(() => {
    const assignmentTitle = activeGameAssignment?.title?.trim();
    if (assignmentTitle) {
      return translations('activityTitle', { title: assignmentTitle });
    }
    return translations('activityTitle', { title: currentScreenLabel });
  }, [activeGameAssignment?.title, currentScreenLabel, translations]);
  useKangurLearnerActivityPing({
    activity: {
      kind: 'game',
      title: learnerActivityTitle,
    },
    enabled: user?.actorType === 'learner',
  });
  const homeScreenMotionProps = useMemo(
    () => createKangurPageTransitionMotionProps(true),
    []
  );
  const screenMotionProps = useMemo(
    () => createKangurPageTransitionMotionProps(prefersReducedMotion),
    [prefersReducedMotion]
  );
  const isGamePageReady =
    routeTransitionState?.activeTransitionKind === 'locale-switch'
      ? true
      : routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
        routeTransitionState.activeTransitionSkeletonVariant === 'game-session'
      ? screen !== 'home'
      : true;

  useKangurRoutePageReady({
    pageKey: 'Game',
    ready: isGamePageReady,
  });

  const tutorAnchors = useMemo((): KangurTutorAnchorConfig[] => [
    { id: 'kangur-game-home-actions', kind: 'home_actions', ref: homeActionsRef, surface: 'game', enabled: screen === 'home', priority: 120, contentId: 'game:home', label: translations('home.actionsLabel') },
    { id: 'kangur-game-home-quest', kind: 'home_quest', ref: homeQuestRef, surface: 'game', enabled: screen === 'home', priority: 110, contentId: 'game:home', label: translations('home.questHeading') },
    { id: 'kangur-game-home-assignments', kind: 'priority_assignments', ref: homeAssignmentsRef, surface: 'game', enabled: screen === 'home' && canAccessParentAssignments, priority: 100, contentId: 'game:home', label: translations('home.priorityAssignmentsHeading') },
    { id: 'kangur-game-home-leaderboard', kind: 'leaderboard', ref: homeLeaderboardRef, surface: 'game', enabled: screen === 'home', priority: 90, contentId: 'game:home', label: translations('home.leaderboardLabel') },
    { id: 'kangur-game-home-progress', kind: 'progress', ref: homeProgressRef, surface: 'game', enabled: screen === 'home', priority: 80, contentId: 'game:home', label: translations('home.progressLabel') },
    { id: 'kangur-game-training-setup', kind: 'screen', ref: trainingSetupRef, surface: 'game', enabled: screen === 'training', priority: 120, contentId: screen === 'training' ? tutorActivityContentId : null, label: getScreenLabel('training') },
    { id: 'kangur-game-kangur-setup', kind: 'screen', ref: kangurSetupRef, surface: 'game', enabled: screen === 'kangur_setup', priority: 120, contentId: screen === 'kangur_setup' ? tutorActivityContentId : null, label: getScreenLabel('kangur_setup') },
    { id: 'kangur-game-kangur-session', kind: 'screen', ref: kangurSessionRef, surface: 'game', enabled: screen === 'kangur', priority: 120, contentId: screen === 'kangur' ? tutorActivityContentId : null, label: getScreenLabel('kangur') },
    ...KANGUR_LAUNCHABLE_GAME_SCREENS.map((screenKey) => ({
      ref: launchableGameScreenRefs[screenKey],
      id: `kangur-game-${screenKey.replaceAll('_', '-')}`,
      kind: 'screen' as const,
      surface: 'game' as const,
      enabled: screen === screenKey,
      priority: 120,
      contentId: screen === screenKey ? tutorActivityContentId : null,
      label: getScreenLabel(screenKey),
    })),
    { id: 'kangur-game-operation-selector', kind: 'screen', ref: operationSelectorRef, surface: 'game', enabled: screen === 'operation', priority: 120, contentId: screen === 'operation' ? tutorActivityContentId : null, label: getScreenLabel('operation') },
    { id: 'kangur-game-result-summary', kind: 'review', ref: resultSummaryRef, surface: 'game', enabled: screen === 'result', priority: 110, contentId: screen === 'result' ? tutorActivityContentId : null, label: getScreenLabel('result'), assignmentId: activeGameAssignment?.id ?? null },
    { id: 'kangur-game-result-leaderboard', kind: 'leaderboard', ref: resultLeaderboardRef, surface: 'game', enabled: screen === 'result', priority: 100, contentId: screen === 'result' ? tutorActivityContentId : null, label: translations('result.leaderboardLabel') },
  ], [activeGameAssignment?.id, canAccessParentAssignments, screen, translations, tutorActivityContentId]);
  useKangurTutorAnchors(tutorAnchors);

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
  }, [screen]);

  const renderScreen = (
    screenKey: KangurGameScreen,
    className: string,
    children: React.ReactNode,
    screenRef?: RefObject<HTMLDivElement | null>,
    testId?: string
  ): React.JSX.Element => (
    <motion.div
      key={screenKey}
      {...(screenKey === 'home' ? homeScreenMotionProps : screenMotionProps)}
      className={cn('w-full min-w-0 max-w-full', className)}
      data-testid={testId}
      ref={screenRef}
    >
      <h2 id={GAME_SCREEN_TITLE_ID} ref={screenHeadingRef} tabIndex={-1} className='sr-only'>
        {getScreenLabel(screenKey)}
      </h2>
      {children}
    </motion.div>
  );

  const renderCurrentScreen = (): React.JSX.Element | null => {
    if (isKangurLaunchableGameScreen(screen)) {
      if (launchableGameRuntimeLoading) {
        return renderScreen(
          screen,
          'w-full flex flex-col items-center',
          <div data-testid='kangur-game-launchable-runtime-loading' />,
          launchableGameScreenRefs[screen]
        );
      }

      if (launchableGameInstanceId && !activeLaunchableGameRuntime) {
        return renderScreen(
          screen,
          'w-full flex flex-col items-center',
          <div data-testid='kangur-game-launchable-runtime-missing' />,
          launchableGameScreenRefs[screen]
        );
      }

      const config = activeLaunchableGameRuntime
        ? createLaunchableGameScreenComponentConfigFromRuntime(activeLaunchableGameRuntime)
        : getKangurLaunchableGameScreenComponentConfig(screen);
      const ScreenComponent = config.Component;

      return renderScreen(
        screen,
        config.className,
        <ScreenComponent />,
        launchableGameScreenRefs[screen]
      );
    }

    switch (screen) {
      case 'home':
        return renderScreen(
          'home',
          GAME_HOME_LAYOUT_CLASSNAME,
          <KangurGameHomeSections
            visibility={homeVisibility}
            parentSpotlight={(
              <KangurAssignmentSpotlight
                basePath={basePath}
                enabled={canAccessParentAssignments}
              />
            )}
            parentSpotlightSectionProps={{
              headingId: 'kangur-home-parent-assignment-heading',
              headingLabel: translations('home.parentSuggestionsHeading'),
              id: 'kangur-home-parent-spotlight',
            }}
            actionsColumn={(
              <>
                <div id='kangur-home-actions' ref={homeActionsRef}>
                  <KangurGameHomeActionsWidget hideWhenScreenMismatch={false} />
                </div>
                <KangurGameHomeDuelsInvitesWidget hideWhenScreenMismatch={false} />
                {homeVisibility.hideLearnerWidgetsForParent ? (
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
                ) : null}
              </>
            )}
            actionsColumnProps={{ testId: 'kangur-home-actions-column' }}
            quest={<KangurGameHomeQuestWidget hideWhenScreenMismatch={false} />}
            questSectionProps={{
              headingId: 'kangur-home-quest-heading',
              headingLabel: translations('home.questHeading'),
              id: 'kangur-home-quest',
              ref: homeQuestRef,
            }}
            summary={(
              <KangurGameHomeHeroWidget
                hideWhenScreenMismatch={false}
                showIntro={false}
                showAssignmentSpotlight={false}
              />
            )}
            summarySectionProps={{
              headingId: 'kangur-home-hero-heading',
              headingLabel: translations('home.summaryHeading'),
              id: 'kangur-home-summary',
            }}
            assignments={(
              <KangurPriorityAssignments
                basePath={basePath}
                enabled={canAccessParentAssignments}
                title={translations('home.priorityAssignmentsTitle')}
                emptyLabel={translations('home.priorityAssignmentsEmpty')}
              />
            )}
            assignmentsSectionProps={{
              headingId: 'kangur-home-assignments-heading',
              headingLabel: translations('home.priorityAssignmentsHeading'),
              id: 'kangur-home-priority-assignments',
              ref: homeAssignmentsRef,
            }}
            leaderboard={<Leaderboard />}
            leaderboardColumnProps={{
              id: 'kangur-home-leaderboard',
              ref: homeLeaderboardRef,
            }}
            playerProgress={<PlayerProgressCard progress={progress} />}
            playerProgressColumnProps={{
              id: 'kangur-home-player-progress',
              ref: homeProgressRef,
            }}
            progressSectionProps={{
              headingId: 'kangur-home-progress-heading',
              headingLabel: translations('home.progressHeading'),
              id: 'kangur-home-progress',
            }}
          />,
          undefined,
          'kangur-game-home-layout'
        );
      case 'kangur_setup':
        return renderScreen(
          'kangur_setup',
          'w-full flex flex-col items-center',
          <KangurGameKangurSetupWidget />,
          kangurSetupRef
        );
      case 'kangur':
        return renderScreen(
          'kangur',
          'w-full max-w-lg flex flex-col items-center',
          <KangurGameKangurSessionWidget />,
          kangurSessionRef
        );
      case 'operation':
      case 'training':
        return renderScreen(
          screen,
          'w-full flex flex-col items-center',
          <KangurGameOperationSelectorWidget />,
          screen === 'training' ? trainingSetupRef : operationSelectorRef
        );
      case 'playing':
        return renderScreen(
          'playing',
          'flex w-full flex-col items-center',
          <KangurGameQuestionWidget />
        );
      case 'result':
        return renderScreen(
          'result',
          `flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`,
          <>
            <div ref={resultSummaryRef} className='w-full flex flex-col items-center'>
              <KangurGameResultWidget />
            </div>
            <div ref={resultLeaderboardRef} className='w-full'>
              <Leaderboard />
            </div>
          </>
        );
      default:
        return null;
    }
  };

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
          {renderCurrentScreen()}
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
