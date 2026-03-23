'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
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
  KangurGameHomeSections,
  resolveKangurGameHomeVisibility,
} from '@/features/kangur/ui/pages/GameHome.layout';
const Leaderboard = dynamic(() => import('@/features/kangur/ui/components/Leaderboard'));
const PlayerProgressCard = dynamic(() => import('@/features/kangur/ui/components/PlayerProgressCard'));
const XpToast = dynamic(() => import('@/features/kangur/ui/components/XpToast'));

// Lazy-load quiz/session widgets — only the active screen is downloaded
const KangurGameCalendarTrainingWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameCalendarTrainingWidget').then(m => ({ default: m.KangurGameCalendarTrainingWidget })));
const KangurGameClockQuizWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameClockQuizWidget').then(m => ({ default: m.KangurGameClockQuizWidget })));
const KangurGameAdditionQuizWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameAdditionQuizWidget').then(m => ({ default: m.KangurGameAdditionQuizWidget })));
const KangurGameDivisionQuizWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameDivisionQuizWidget').then(m => ({ default: m.KangurGameDivisionQuizWidget })));
const KangurGameGeometryTrainingWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameGeometryTrainingWidget').then(m => ({ default: m.KangurGameGeometryTrainingWidget })));
const KangurGameKangurSessionWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameKangurSessionWidget').then(m => ({ default: m.KangurGameKangurSessionWidget })));
const KangurGameKangurSetupWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameKangurSetupWidget').then(m => ({ default: m.KangurGameKangurSetupWidget })));
const KangurGameMultiplicationQuizWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameMultiplicationQuizWidget').then(m => ({ default: m.KangurGameMultiplicationQuizWidget })));
const KangurGameOperationSelectorWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameOperationSelectorWidget').then(m => ({ default: m.KangurGameOperationSelectorWidget })));
const KangurGameQuestionWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameQuestionWidget').then(m => ({ default: m.KangurGameQuestionWidget })));
const KangurGameResultWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameResultWidget').then(m => ({ default: m.KangurGameResultWidget })));
const KangurGameSubtractionQuizWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameSubtractionQuizWidget').then(m => ({ default: m.KangurGameSubtractionQuizWidget })));
const KangurGameLogicalPatternsQuizWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameLogicalPatternsQuizWidget').then(m => ({ default: m.KangurGameLogicalPatternsQuizWidget })));
const KangurGameLogicalClassificationQuizWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameLogicalClassificationQuizWidget').then(m => ({ default: m.KangurGameLogicalClassificationQuizWidget })));
const KangurGameLogicalAnalogiesQuizWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameLogicalAnalogiesQuizWidget').then(m => ({ default: m.KangurGameLogicalAnalogiesQuizWidget })));
const KangurGameEnglishSentenceQuizWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameEnglishSentenceQuizWidget').then(m => ({ default: m.KangurGameEnglishSentenceQuizWidget })));
const KangurGameEnglishPartsOfSpeechQuizWidget = dynamic(() => import('@/features/kangur/ui/components/KangurGameEnglishPartsOfSpeechQuizWidget').then(m => ({ default: m.KangurGameEnglishPartsOfSpeechQuizWidget })));
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
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
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
  'calendar_quiz',
  'geometry_quiz',
  'clock_quiz',
  'addition_quiz',
  'subtraction_quiz',
  'division_quiz',
  'multiplication_quiz',
  'logical_patterns_quiz',
  'logical_classification_quiz',
  'logical_analogies_quiz',
  'english_sentence_quiz',
  'english_parts_of_speech_quiz',
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
  const { basePath, progress, screen, user, xpToast } = runtime;
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
  const routeNavigator = useKangurRouteNavigator();
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
  const calendarQuizRef = useRef<HTMLDivElement | null>(null);
  const geometryQuizRef = useRef<HTMLDivElement | null>(null);
  const clockQuizRef = useRef<HTMLDivElement | null>(null);
  const additionQuizRef = useRef<HTMLDivElement | null>(null);
  const subtractionQuizRef = useRef<HTMLDivElement | null>(null);
  const divisionQuizRef = useRef<HTMLDivElement | null>(null);
  const multiplicationQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalPatternsQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalClassificationQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalAnalogiesQuizRef = useRef<HTMLDivElement | null>(null);
  const englishSentenceQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPartsOfSpeechQuizRef = useRef<HTMLDivElement | null>(null);
  const operationSelectorRef = useRef<HTMLDivElement | null>(null);
  const resultSummaryRef = useRef<HTMLDivElement | null>(null);
  const resultLeaderboardRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useKangurMobileBreakpoint();
  const shouldUseStandardMobileScroll = isMobile;
  const getScreenLabel = (screenKey: KangurGameScreen): string =>
    translations(`screens.${screenKey}.label`);
  const getScreenDescription = (screenKey: KangurGameScreen): string =>
    translations(`screens.${screenKey}.description`);
  const currentScreenLabel = getScreenLabel(screen);
  const learnerId = user?.activeLearner?.id ?? null;
  const activeGameAssignment = runtime.activePracticeAssignment ?? runtime.resultPracticeAssignment;
  const tutorActivityContentId = useMemo(() => {
    if (activeGameAssignment?.id) {
      return `game:assignment:${activeGameAssignment.id}`;
    }

    if ((screen === 'playing' || screen === 'result') && runtime.operation) {
      return `game:practice:${runtime.operation}:${runtime.difficulty}`;
    }

    if (
      screen === 'calendar_quiz' ||
      screen === 'geometry_quiz' ||
      screen === 'clock_quiz' ||
      screen === 'addition_quiz' ||
      screen === 'subtraction_quiz' ||
      screen === 'division_quiz' ||
      screen === 'multiplication_quiz' ||
      screen === 'logical_patterns_quiz' ||
      screen === 'logical_classification_quiz' ||
      screen === 'logical_analogies_quiz' ||
      screen === 'english_sentence_quiz' ||
      screen === 'english_parts_of_speech_quiz'
    ) {
      return `game:${screen}`;
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
    { id: 'kangur-game-calendar-quiz', kind: 'screen', ref: calendarQuizRef, surface: 'game', enabled: screen === 'calendar_quiz', priority: 120, contentId: screen === 'calendar_quiz' ? tutorActivityContentId : null, label: getScreenLabel('calendar_quiz') },
    { id: 'kangur-game-geometry-quiz', kind: 'screen', ref: geometryQuizRef, surface: 'game', enabled: screen === 'geometry_quiz', priority: 120, contentId: screen === 'geometry_quiz' ? tutorActivityContentId : null, label: getScreenLabel('geometry_quiz') },
    { id: 'kangur-game-clock-quiz', kind: 'screen', ref: clockQuizRef, surface: 'game', enabled: screen === 'clock_quiz', priority: 120, contentId: screen === 'clock_quiz' ? tutorActivityContentId : null, label: getScreenLabel('clock_quiz') },
    { id: 'kangur-game-addition-quiz', kind: 'screen', ref: additionQuizRef, surface: 'game', enabled: screen === 'addition_quiz', priority: 120, contentId: screen === 'addition_quiz' ? tutorActivityContentId : null, label: getScreenLabel('addition_quiz') },
    { id: 'kangur-game-subtraction-quiz', kind: 'screen', ref: subtractionQuizRef, surface: 'game', enabled: screen === 'subtraction_quiz', priority: 120, contentId: screen === 'subtraction_quiz' ? tutorActivityContentId : null, label: getScreenLabel('subtraction_quiz') },
    { id: 'kangur-game-division-quiz', kind: 'screen', ref: divisionQuizRef, surface: 'game', enabled: screen === 'division_quiz', priority: 120, contentId: screen === 'division_quiz' ? tutorActivityContentId : null, label: getScreenLabel('division_quiz') },
    { id: 'kangur-game-multiplication-quiz', kind: 'screen', ref: multiplicationQuizRef, surface: 'game', enabled: screen === 'multiplication_quiz', priority: 120, contentId: screen === 'multiplication_quiz' ? tutorActivityContentId : null, label: getScreenLabel('multiplication_quiz') },
    { id: 'kangur-game-logical-patterns-quiz', kind: 'screen', ref: logicalPatternsQuizRef, surface: 'game', enabled: screen === 'logical_patterns_quiz', priority: 120, contentId: screen === 'logical_patterns_quiz' ? tutorActivityContentId : null, label: getScreenLabel('logical_patterns_quiz') },
    { id: 'kangur-game-logical-classification-quiz', kind: 'screen', ref: logicalClassificationQuizRef, surface: 'game', enabled: screen === 'logical_classification_quiz', priority: 120, contentId: screen === 'logical_classification_quiz' ? tutorActivityContentId : null, label: getScreenLabel('logical_classification_quiz') },
    { id: 'kangur-game-logical-analogies-quiz', kind: 'screen', ref: logicalAnalogiesQuizRef, surface: 'game', enabled: screen === 'logical_analogies_quiz', priority: 120, contentId: screen === 'logical_analogies_quiz' ? tutorActivityContentId : null, label: getScreenLabel('logical_analogies_quiz') },
    { id: 'kangur-game-english-sentence-quiz', kind: 'screen', ref: englishSentenceQuizRef, surface: 'game', enabled: screen === 'english_sentence_quiz', priority: 120, contentId: screen === 'english_sentence_quiz' ? tutorActivityContentId : null, label: getScreenLabel('english_sentence_quiz') },
    { id: 'kangur-game-english-parts-of-speech-quiz', kind: 'screen', ref: englishPartsOfSpeechQuizRef, surface: 'game', enabled: screen === 'english_parts_of_speech_quiz', priority: 120, contentId: screen === 'english_parts_of_speech_quiz' ? tutorActivityContentId : null, label: getScreenLabel('english_parts_of_speech_quiz') },
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

  useEffect(() => {
    const schedule =
      typeof globalThis.requestIdleCallback === 'function'
        ? globalThis.requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 1);
    const handle = schedule(() => {
      routeNavigator.prefetch(createPageUrl('Lessons', basePath));
      routeNavigator.prefetch(createPageUrl('Duels', basePath));
    });
    return () => {
      if (typeof globalThis.cancelIdleCallback === 'function') {
        globalThis.cancelIdleCallback(handle as number);
      } else {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
      }
    };
  }, [basePath, routeNavigator]);

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
          <AnimatePresence initial={false} mode='wait'>
            {screen === 'home' ? (
              renderScreen(
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
                                transitionAcknowledgeMs={110}
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
              )
            ) : null}

            {screen === 'kangur_setup' ? (
              renderScreen(
                'kangur_setup',
                'w-full flex flex-col items-center',
                <KangurGameKangurSetupWidget />,
                kangurSetupRef
              )
            ) : null}

            {screen === 'kangur' ? (
              renderScreen(
                'kangur',
                'w-full max-w-lg flex flex-col items-center',
                <KangurGameKangurSessionWidget />,
                kangurSessionRef
              )
            ) : null}

            {screen === 'calendar_quiz' ? (
              renderScreen(
                'calendar_quiz',
                'w-full flex flex-col items-center',
                <KangurGameCalendarTrainingWidget />,
                calendarQuizRef
              )
            ) : null}

            {screen === 'geometry_quiz' ? (
              renderScreen(
                'geometry_quiz',
                'w-full flex flex-col items-center',
                <KangurGameGeometryTrainingWidget />,
                geometryQuizRef
              )
            ) : null}

            {screen === 'clock_quiz' ? (
              renderScreen(
                'clock_quiz',
                'w-full flex flex-col items-center',
                <KangurGameClockQuizWidget />,
                clockQuizRef
              )
            ) : null}

            {screen === 'addition_quiz' ? (
              renderScreen(
                'addition_quiz',
                'w-full flex flex-col items-center',
                <KangurGameAdditionQuizWidget />,
                additionQuizRef
              )
            ) : null}

            {screen === 'subtraction_quiz' ? (
              renderScreen(
                'subtraction_quiz',
                'w-full flex flex-col items-center',
                <KangurGameSubtractionQuizWidget />,
                subtractionQuizRef
              )
            ) : null}

            {screen === 'division_quiz' ? (
              renderScreen(
                'division_quiz',
                'w-full flex flex-col items-center',
                <KangurGameDivisionQuizWidget />,
                divisionQuizRef
              )
            ) : null}

            {screen === 'multiplication_quiz' ? (
              renderScreen(
                'multiplication_quiz',
                'w-full flex flex-col items-center',
                <KangurGameMultiplicationQuizWidget />,
                multiplicationQuizRef
              )
            ) : null}

            {screen === 'logical_patterns_quiz' ? (
              renderScreen(
                'logical_patterns_quiz',
                'w-full flex flex-col items-center',
                <KangurGameLogicalPatternsQuizWidget />,
                logicalPatternsQuizRef
              )
            ) : null}

            {screen === 'logical_classification_quiz' ? (
              renderScreen(
                'logical_classification_quiz',
                'w-full flex flex-col items-center',
                <KangurGameLogicalClassificationQuizWidget />,
                logicalClassificationQuizRef
              )
            ) : null}

            {screen === 'logical_analogies_quiz' ? (
              renderScreen(
                'logical_analogies_quiz',
                'w-full flex flex-col items-center',
                <KangurGameLogicalAnalogiesQuizWidget />,
                logicalAnalogiesQuizRef
              )
            ) : null}

            {screen === 'english_sentence_quiz' ? (
              renderScreen(
                'english_sentence_quiz',
                'w-full flex flex-col items-center',
                <KangurGameEnglishSentenceQuizWidget />,
                englishSentenceQuizRef
              )
            ) : null}

            {screen === 'english_parts_of_speech_quiz' ? (
              renderScreen(
                'english_parts_of_speech_quiz',
                'w-full flex flex-col items-center',
                <KangurGameEnglishPartsOfSpeechQuizWidget />,
                englishPartsOfSpeechQuizRef
              )
            ) : null}

            {screen === 'operation' || screen === 'training' ? (
              renderScreen(
                screen,
                'w-full flex flex-col items-center',
                <KangurGameOperationSelectorWidget />,
                screen === 'training' ? trainingSetupRef : operationSelectorRef
              )
            ) : null}

            {screen === 'playing' ? (
              renderScreen(
                'playing',
                'flex w-full flex-col items-center',
                <KangurGameQuestionWidget />
              )
            ) : null}

            {screen === 'result' ? (
              renderScreen(
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
              )
            ) : null}
          </AnimatePresence>
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
