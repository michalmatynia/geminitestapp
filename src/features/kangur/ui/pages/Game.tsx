'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, type RefObject } from 'react';

import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurGameCalendarTrainingWidget } from '@/features/kangur/ui/components/KangurGameCalendarTrainingWidget';
import { KangurGameGeometryTrainingWidget } from '@/features/kangur/ui/components/KangurGameGeometryTrainingWidget';
import { KangurGameHomeActionsWidget } from '@/features/kangur/ui/components/KangurGameHomeActionsWidget';
import { KangurGameHomeHeroWidget } from '@/features/kangur/ui/components/KangurGameHomeHeroWidget';
import { KangurGameHomeQuestWidget } from '@/features/kangur/ui/components/KangurGameHomeQuestWidget';
import { KangurGameKangurSessionWidget } from '@/features/kangur/ui/components/KangurGameKangurSessionWidget';
import { KangurGameKangurSetupWidget } from '@/features/kangur/ui/components/KangurGameKangurSetupWidget';
import { KangurGameNavigationWidget } from '@/features/kangur/ui/components/KangurGameNavigationWidget';
import { KangurGameOperationSelectorWidget } from '@/features/kangur/ui/components/KangurGameOperationSelectorWidget';
import { KangurGameQuestionWidget } from '@/features/kangur/ui/components/KangurGameQuestionWidget';
import { KangurGameResultWidget } from '@/features/kangur/ui/components/KangurGameResultWidget';
import { KangurGameTrainingSetupWidget } from '@/features/kangur/ui/components/KangurGameTrainingSetupWidget';
import { KangurAssignmentSpotlight } from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import { KangurPriorityAssignments } from '@/features/kangur/ui/components/KangurPriorityAssignments';
import Leaderboard from '@/features/kangur/ui/components/Leaderboard';
import { PlayerProgressCard, XpToast } from '@/features/kangur/ui/components/progress';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  KangurGameRuntimeBoundary,
  useKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { KangurPageContainer, KangurPageShell } from '@/features/kangur/ui/design/primitives';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import type { KangurGameScreen } from '@/features/kangur/ui/types';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';

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
]);

const GAME_SCREEN_LABELS: Record<KangurGameScreen, string> = {
  home: 'Ekran startowy',
  training: 'Konfiguracja treningu',
  kangur_setup: 'Konfiguracja sesji Kangura Matematycznego',
  kangur: 'Sesja Kangura Matematycznego',
  calendar_quiz: 'Ćwiczenia z kalendarzem',
  geometry_quiz: 'Ćwiczenia z figurami',
  operation: 'Wybór rodzaju gry',
  playing: 'Pytanie do rozwiązania',
  result: 'Wynik gry',
};

const GAME_SCREEN_DESCRIPTIONS: Record<KangurGameScreen, string> = {
  home: 'Wybierz sposób ćwiczenia i rozpocznij kolejną sesję.',
  training: 'Skonfiguruj trening mieszany i dobierz zakres pytań.',
  kangur_setup: 'Przygotuj sesję Kangura Matematycznego.',
  kangur: 'Rozwiązuj zadania Kangura Matematycznego krok po kroku.',
  calendar_quiz: 'Ćwicz odczytywanie dat i zależności w kalendarzu.',
  geometry_quiz: 'Ćwicz figury, kształty i zależności przestrzenne.',
  operation: 'Wybierz rodzaj matematycznej gry i poziom trudności.',
  playing: 'Rozwiąż aktualne pytanie bez podpowiedzi z gotową odpowiedzią.',
  result: 'Sprawdź wynik gry i zdecyduj, co ćwiczyć dalej.',
};

const focusGameScreenHeading = (heading: HTMLHeadingElement | null): void => {
  if (!heading) {
    return;
  }

  try {
    heading.focus({ preventScroll: true });
  } catch {
    heading.focus();
  }
};

function GameContent(): React.JSX.Element {
  const runtime = useKangurGameRuntime();
  const { basePath, progress, screen, user, xpToast } = runtime;
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const canAccessParentAssignments =
    runtime.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);
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
  const calendarQuizRef = useRef<HTMLDivElement | null>(null);
  const geometryQuizRef = useRef<HTMLDivElement | null>(null);
  const operationSelectorRef = useRef<HTMLDivElement | null>(null);
  const resultSummaryRef = useRef<HTMLDivElement | null>(null);
  const resultLeaderboardRef = useRef<HTMLDivElement | null>(null);
  const currentScreenLabel = GAME_SCREEN_LABELS[screen];
  const learnerId = user?.activeLearner?.id ?? null;
  const activeGameAssignment = runtime.activePracticeAssignment ?? runtime.resultPracticeAssignment;
  const tutorActivityContentId = useMemo(() => {
    if (activeGameAssignment?.id) {
      return `game:assignment:${activeGameAssignment.id}`;
    }

    if ((screen === 'playing' || screen === 'result') && runtime.operation) {
      return `game:practice:${runtime.operation}:${runtime.difficulty}`;
    }

    if (screen === 'calendar_quiz' || screen === 'geometry_quiz') {
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
        ? `Pytanie ${runtime.currentQuestionIndex + 1}/${runtime.totalQuestions}`
        : screen === 'result'
          ? `Wynik ${runtime.score}/${runtime.totalQuestions}`
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
      description: GAME_SCREEN_DESCRIPTIONS[screen],
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
  ]);
  const screenMotionProps = useMemo(
    () => createKangurPageTransitionMotionProps(prefersReducedMotion),
    [prefersReducedMotion]
  );
  const isGamePageReady =
    routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
    routeTransitionState.activeTransitionSkeletonVariant === 'game-session'
      ? screen !== 'home'
      : true;

  useKangurRoutePageReady({
    pageKey: 'Game',
    ready: isGamePageReady,
  });

  useKangurTutorAnchor({
    id: 'kangur-game-home-actions',
    kind: 'home_actions',
    ref: homeActionsRef,
    surface: 'game',
    enabled: screen === 'home',
    priority: 120,
    metadata: {
      contentId: 'game:home',
      label: 'Start i wybór aktywności',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-home-quest',
    kind: 'home_quest',
    ref: homeQuestRef,
    surface: 'game',
    enabled: screen === 'home',
    priority: 110,
    metadata: {
      contentId: 'game:home',
      label: 'Misja dla ucznia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-home-assignments',
    kind: 'priority_assignments',
    ref: homeAssignmentsRef,
    surface: 'game',
    enabled: screen === 'home' && canAccessParentAssignments,
    priority: 100,
    metadata: {
      contentId: 'game:home',
      label: 'Priorytetowe zadania',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-home-leaderboard',
    kind: 'leaderboard',
    ref: homeLeaderboardRef,
    surface: 'game',
    enabled: screen === 'home',
    priority: 90,
    metadata: {
      contentId: 'game:home',
      label: 'Ranking',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-home-progress',
    kind: 'progress',
    ref: homeProgressRef,
    surface: 'game',
    enabled: screen === 'home',
    priority: 80,
    metadata: {
      contentId: 'game:home',
      label: 'Postęp gracza',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-training-setup',
    kind: 'screen',
    ref: trainingSetupRef,
    surface: 'game',
    enabled: screen === 'training',
    priority: 120,
    metadata: {
      contentId: screen === 'training' ? tutorActivityContentId : null,
      label: 'Konfiguracja treningu',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-kangur-setup',
    kind: 'screen',
    ref: kangurSetupRef,
    surface: 'game',
    enabled: screen === 'kangur_setup',
    priority: 120,
    metadata: {
      contentId: screen === 'kangur_setup' ? tutorActivityContentId : null,
      label: 'Konfiguracja sesji Kangura Matematycznego',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-kangur-session',
    kind: 'screen',
    ref: kangurSessionRef,
    surface: 'game',
    enabled: screen === 'kangur',
    priority: 120,
    metadata: {
      contentId: screen === 'kangur' ? tutorActivityContentId : null,
      label: 'Sesja Kangura Matematycznego',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-calendar-quiz',
    kind: 'screen',
    ref: calendarQuizRef,
    surface: 'game',
    enabled: screen === 'calendar_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'calendar_quiz' ? tutorActivityContentId : null,
      label: 'Ćwiczenia z kalendarzem',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-geometry-quiz',
    kind: 'screen',
    ref: geometryQuizRef,
    surface: 'game',
    enabled: screen === 'geometry_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'geometry_quiz' ? tutorActivityContentId : null,
      label: 'Ćwiczenia z figurami',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-operation-selector',
    kind: 'screen',
    ref: operationSelectorRef,
    surface: 'game',
    enabled: screen === 'operation',
    priority: 120,
    metadata: {
      contentId: screen === 'operation' ? tutorActivityContentId : null,
      label: 'Wybór rodzaju gry',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-result-summary',
    kind: 'review',
    ref: resultSummaryRef,
    surface: 'game',
    enabled: screen === 'result',
    priority: 110,
    metadata: {
      contentId: screen === 'result' ? tutorActivityContentId : null,
      label: 'Wynik gry',
      assignmentId: activeGameAssignment?.id ?? null,
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-result-leaderboard',
    kind: 'leaderboard',
    ref: resultLeaderboardRef,
    surface: 'game',
    enabled: screen === 'result',
    priority: 100,
    metadata: {
      contentId: screen === 'result' ? tutorActivityContentId : null,
      label: 'Ranking po rundzie',
    },
  });

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
    screenRef?: RefObject<HTMLDivElement | null>
  ): React.JSX.Element => (
    <motion.div key={screenKey} {...screenMotionProps} className={className} ref={screenRef}>
      <h2 id={GAME_SCREEN_TITLE_ID} ref={screenHeadingRef} tabIndex={-1} className='sr-only'>
        {GAME_SCREEN_LABELS[screenKey]}
      </h2>
      {children}
    </motion.div>
  );

  return (
    <>
      <KangurAiTutorSessionSync learnerId={learnerId} sessionContext={tutorSessionContext} />
      <KangurPageShell tone='play' id='kangur-game-page' skipLinkTargetId={GAME_MAIN_ID}>
        <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId='kangur-game-page' />
        <XpToast
          xpGained={xpToast.xpGained}
          newBadges={xpToast.newBadges}
          breakdown={xpToast.breakdown}
          dailyQuest={xpToast.dailyQuest}
          nextBadge={xpToast.nextBadge}
          recommendation={xpToast.recommendation}
          visible={xpToast.visible}
        />
        <KangurGameNavigationWidget />

        <div role='status' aria-live='polite' aria-atomic='true' className='sr-only'>
          Widok: {currentScreenLabel}
        </div>

        <KangurPageContainer
          id={GAME_MAIN_ID}
          aria-labelledby={`${GAME_TITLE_ID} ${GAME_SCREEN_TITLE_ID}`}
          className='flex flex-col items-center gap-8 pt-4 sm:gap-10 sm:pt-8'
        >
          <h1 id={GAME_TITLE_ID} className='sr-only'>
            {GAME_BRAND_NAME}
          </h1>
          <AnimatePresence initial={false} mode='wait'>
            {screen === 'home' ? (
              renderScreen(
                'home',
                'flex w-full flex-col items-center gap-8 sm:gap-10',
                <>
                  {canAccessParentAssignments ? (
                    <section
                      className='w-full max-w-[900px]'
                      aria-labelledby='kangur-home-parent-assignment-heading'
                    >
                      <h3 id='kangur-home-parent-assignment-heading' className='sr-only'>
                        Zadanie od rodzica
                      </h3>
                      <KangurAssignmentSpotlight
                        basePath={basePath}
                        enabled={canAccessParentAssignments}
                      />
                    </section>
                  ) : null}
                  <section
                    className='w-full max-w-[560px] space-y-4 sm:space-y-5'
                    aria-labelledby='kangur-home-actions-heading'
                  >
                    <div ref={homeActionsRef} aria-labelledby='kangur-home-actions-heading'>
                      <h3 id='kangur-home-actions-heading' className='sr-only'>
                        Rozpocznij grę
                      </h3>
                      <KangurGameHomeActionsWidget hideWhenScreenMismatch={false} />
                    </div>
                  </section>

                  <section
                    ref={homeQuestRef}
                    className='mx-auto w-full max-w-[900px]'
                    aria-labelledby='kangur-home-quest-heading'
                  >
                    <h3 id='kangur-home-quest-heading' className='sr-only'>
                      Misja dla ucznia
                    </h3>
                    <KangurGameHomeQuestWidget hideWhenScreenMismatch={false} />
                  </section>

                  <section
                    className='w-full max-w-[900px]'
                    aria-labelledby='kangur-home-hero-heading'
                  >
                    <h3 id='kangur-home-hero-heading' className='sr-only'>
                      Podsumowanie postępu
                    </h3>
                    <KangurGameHomeHeroWidget
                      hideWhenScreenMismatch={false}
                      showIntro={false}
                      showAssignmentSpotlight={false}
                    />
                  </section>

                  {canAccessParentAssignments ? (
                    <section
                      ref={homeAssignmentsRef}
                      className='mx-auto w-full max-w-[900px]'
                      aria-labelledby='kangur-home-assignments-heading'
                    >
                      <h3 id='kangur-home-assignments-heading' className='sr-only'>
                        Priorytetowe zadania
                      </h3>
                      <KangurPriorityAssignments
                        basePath={basePath}
                        enabled={canAccessParentAssignments}
                        title='Priorytetowe zadania'
                        emptyLabel='Brak aktywnych zadań od rodzica.'
                      />
                    </section>
                  ) : null}

                  <section
                    className='mx-auto grid w-full max-w-[900px] items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]'
                    aria-labelledby='kangur-home-progress-heading'
                  >
                    <h3 id='kangur-home-progress-heading' className='sr-only'>
                      Ranking i postęp
                    </h3>
                    <div ref={homeLeaderboardRef} className='order-2 flex w-full justify-center xl:order-1'>
                      <Leaderboard />
                    </div>
                    <div
                      ref={homeProgressRef}
                      className='order-1 flex w-full justify-center xl:order-2'
                    >
                      <PlayerProgressCard progress={progress} />
                    </div>
                  </section>
                </>
              )
            ) : null}

            {screen === 'training' ? (
              renderScreen(
                'training',
                'w-full flex flex-col items-center',
                <KangurGameTrainingSetupWidget />,
                trainingSetupRef
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

            {screen === 'operation' ? (
              renderScreen(
                'operation',
                'w-full flex flex-col items-center',
                <KangurGameOperationSelectorWidget />,
                operationSelectorRef
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
                'flex w-full flex-col items-center gap-6',
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
        </KangurPageContainer>
      </KangurPageShell>
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
