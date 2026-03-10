'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';

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
import { KangurPriorityAssignments } from '@/features/kangur/ui/components/KangurPriorityAssignments';
import Leaderboard from '@/features/kangur/ui/components/Leaderboard';
import { PlayerProgressCard, XpToast } from '@/features/kangur/ui/components/progress';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  KangurGameRuntimeBoundary,
  useKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { KangurPageContainer, KangurPageShell } from '@/features/kangur/ui/design/primitives';
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
  calendar_quiz: 'Cwiczenia z kalendarzem',
  geometry_quiz: 'Cwiczenia z figurami',
  operation: 'Wybor rodzaju gry',
  playing: 'Pytanie do rozwiazania',
  result: 'Wynik gry',
};

const GAME_SCREEN_DESCRIPTIONS: Record<KangurGameScreen, string> = {
  home: 'Wybierz sposob cwiczenia i rozpocznij kolejna sesje.',
  training: 'Skonfiguruj trening mieszany i dobierz zakres pytan.',
  kangur_setup: 'Przygotuj sesje Kangura Matematycznego.',
  kangur: 'Rozwiazuj zadania Kangura Matematycznego krok po kroku.',
  calendar_quiz: 'Cwicz odczytywanie dat i zaleznosci w kalendarzu.',
  geometry_quiz: 'Cwicz figury, ksztalty i zaleznosci przestrzenne.',
  operation: 'Wybierz rodzaj matematycznej gry i poziom trudnosci.',
  playing: 'Rozwiaz aktualne pytanie bez podpowiedzi z gotowa odpowiedzia.',
  result: 'Sprawdz wynik gry i zdecyduj, co cwiczyc dalej.',
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

  useKangurTutorAnchor({
    id: 'kangur-game-home-actions',
    kind: 'home_actions',
    ref: homeActionsRef,
    surface: 'game',
    enabled: screen === 'home',
    priority: 120,
    metadata: {
      contentId: 'game:home',
      label: 'Start i wybor aktywnosci',
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
      label: 'Postep gracza',
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
    children: React.ReactNode
  ): React.JSX.Element => (
    <motion.div key={screenKey} {...screenMotionProps} className={className}>
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
          className='flex flex-col items-center gap-10 pt-6 sm:pt-8'
        >
          <h1 id={GAME_TITLE_ID} className='sr-only'>
            {GAME_BRAND_NAME}
          </h1>
          <AnimatePresence initial={false} mode='wait'>
            {screen === 'home' ? (
              renderScreen(
                'home',
                'flex w-full flex-col items-center gap-10',
                <>
                  <section className='w-full max-w-[520px] space-y-5' aria-labelledby='kangur-home-start-heading'>
                    <div ref={homeActionsRef}>
                      <h3 id='kangur-home-start-heading' className='sr-only'>
                    Rozpocznij gre
                      </h3>
                      <KangurGameHomeHeroWidget hideWhenScreenMismatch={false} />
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
                        emptyLabel='Brak aktywnych zadan od rodzica.'
                      />
                    </section>
                  ) : null}

                  <section
                    className='grid w-full max-w-5xl gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'
                    aria-labelledby='kangur-home-progress-heading'
                  >
                    <h3 id='kangur-home-progress-heading' className='sr-only'>
                    Ranking i postep
                    </h3>
                    <div ref={homeLeaderboardRef} className='order-2 xl:order-1'>
                      <Leaderboard />
                    </div>
                    <div
                      ref={homeProgressRef}
                      className='order-1 flex justify-center xl:order-2 xl:justify-stretch'
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
                <KangurGameTrainingSetupWidget />
              )
            ) : null}

            {screen === 'kangur_setup' ? (
              renderScreen(
                'kangur_setup',
                'w-full flex flex-col items-center',
                <KangurGameKangurSetupWidget />
              )
            ) : null}

            {screen === 'kangur' ? (
              renderScreen(
                'kangur',
                'w-full max-w-lg flex flex-col items-center',
                <KangurGameKangurSessionWidget />
              )
            ) : null}

            {screen === 'calendar_quiz' ? (
              renderScreen(
                'calendar_quiz',
                'w-full flex flex-col items-center',
                <KangurGameCalendarTrainingWidget />
              )
            ) : null}

            {screen === 'geometry_quiz' ? (
              renderScreen(
                'geometry_quiz',
                'w-full flex flex-col items-center',
                <KangurGameGeometryTrainingWidget />
              )
            ) : null}

            {screen === 'operation' ? (
              renderScreen(
                'operation',
                'w-full flex flex-col items-center',
                <KangurGameOperationSelectorWidget />
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
                  <KangurGameResultWidget />
                  <Leaderboard />
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
