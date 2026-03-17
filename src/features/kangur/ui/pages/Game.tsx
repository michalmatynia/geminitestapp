'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, type RefObject } from 'react';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurGameCalendarTrainingWidget } from '@/features/kangur/ui/components/KangurGameCalendarTrainingWidget';
import { KangurGameClockQuizWidget } from '@/features/kangur/ui/components/KangurGameClockQuizWidget';
import { KangurGameAdditionQuizWidget } from '@/features/kangur/ui/components/KangurGameAdditionQuizWidget';
import { KangurGameDivisionQuizWidget } from '@/features/kangur/ui/components/KangurGameDivisionQuizWidget';
import { KangurGameGeometryTrainingWidget } from '@/features/kangur/ui/components/KangurGameGeometryTrainingWidget';
import { KangurGameHomeActionsWidget } from '@/features/kangur/ui/components/KangurGameHomeActionsWidget';
import { KangurGameHomeDuelsInvitesWidget } from '@/features/kangur/ui/components/KangurGameHomeDuelsInvitesWidget';
import { KangurGameHomeHeroWidget } from '@/features/kangur/ui/components/KangurGameHomeHeroWidget';
import { KangurGameHomeQuestWidget } from '@/features/kangur/ui/components/KangurGameHomeQuestWidget';
import { KangurGameKangurSessionWidget } from '@/features/kangur/ui/components/KangurGameKangurSessionWidget';
import { KangurGameKangurSetupWidget } from '@/features/kangur/ui/components/KangurGameKangurSetupWidget';
import { KangurGameMultiplicationQuizWidget } from '@/features/kangur/ui/components/KangurGameMultiplicationQuizWidget';
import { KangurGameNavigationWidget } from '@/features/kangur/ui/components/KangurGameNavigationWidget';
import { KangurGameOperationSelectorWidget } from '@/features/kangur/ui/components/KangurGameOperationSelectorWidget';
import { KangurGameQuestionWidget } from '@/features/kangur/ui/components/KangurGameQuestionWidget';
import { KangurGameResultWidget } from '@/features/kangur/ui/components/KangurGameResultWidget';
import { KangurGameSubtractionQuizWidget } from '@/features/kangur/ui/components/KangurGameSubtractionQuizWidget';
import { KangurGameLogicalPatternsQuizWidget } from '@/features/kangur/ui/components/KangurGameLogicalPatternsQuizWidget';
import { KangurGameLogicalClassificationQuizWidget } from '@/features/kangur/ui/components/KangurGameLogicalClassificationQuizWidget';
import { KangurGameLogicalAnalogiesQuizWidget } from '@/features/kangur/ui/components/KangurGameLogicalAnalogiesQuizWidget';
import { KangurGameEnglishSentenceQuizWidget } from '@/features/kangur/ui/components/KangurGameEnglishSentenceQuizWidget';
import { KangurGameEnglishPartsOfSpeechQuizWidget } from '@/features/kangur/ui/components/KangurGameEnglishPartsOfSpeechQuizWidget';
import { KangurAssignmentSpotlight } from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import { KangurPriorityAssignments } from '@/features/kangur/ui/components/KangurPriorityAssignments';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import Leaderboard from '@/features/kangur/ui/components/Leaderboard';
import { PlayerProgressCard, XpToast } from '@/features/kangur/ui/components/progress';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  KangurGameRuntimeBoundary,
  useKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import {
  KangurButton,
  KangurEmptyState,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME, KANGUR_TIGHT_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurLearnerActivityPing } from '@/features/kangur/ui/hooks/useKangurLearnerActivity';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import type { KangurGameScreen } from '@/features/kangur/ui/types';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog';

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

const GAME_SCREEN_LABELS: Record<KangurGameScreen, string> = {
  home: 'Ekran startowy',
  training: 'Konfiguracja treningu',
  kangur_setup: 'Konfiguracja sesji Kangura Matematycznego',
  kangur: 'Sesja Kangura Matematycznego',
  calendar_quiz: 'Ćwiczenia z kalendarzem',
  geometry_quiz: 'Ćwiczenia z figurami',
  clock_quiz: 'Ćwiczenia z zegarem',
  addition_quiz: 'Quiz dodawania',
  subtraction_quiz: 'Quiz odejmowania',
  division_quiz: 'Quiz dzielenia',
  multiplication_quiz: 'Quiz mnożenia',
  logical_patterns_quiz: 'Quiz wzorców',
  logical_classification_quiz: 'Quiz klasyfikacji',
  logical_analogies_quiz: 'Quiz analogii',
  english_sentence_quiz: 'Quiz składni zdania',
  english_parts_of_speech_quiz: 'Quiz części mowy',
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
  clock_quiz: 'Ćwicz odczytywanie godzin i minut.',
  addition_quiz: 'Szybki quiz z dodawania.',
  subtraction_quiz: 'Szybki quiz z odejmowania.',
  division_quiz: 'Szybki quiz z dzielenia.',
  multiplication_quiz: 'Szybki quiz z tabliczki mnożenia.',
  logical_patterns_quiz: 'Uzupełniaj wzorce i ciągi w szybkim quizie.',
  logical_classification_quiz: 'Porządkuj elementy i znajdź wspólne cechy.',
  logical_analogies_quiz: 'Ćwicz analogie i relacje w szybkich rundach.',
  english_sentence_quiz: 'Ćwicz szyk zdania, pytania i spójniki po angielsku.',
  english_parts_of_speech_quiz: 'Sortuj słowa według części mowy w krótkich rundach.',
  operation: 'Wybierz rodzaj matematycznej gry i poziom trudności.',
  playing: 'Rozwiąż aktualne pytanie bez podpowiedzi z gotową odpowiedzią.',
  result: 'Sprawdź wynik gry i zdecyduj, co ćwiczyć dalej.',
};

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
  const runtime = useKangurGameRuntime();
  const { basePath, progress, screen, user, xpToast } = runtime;
  const { ageGroup } = useKangurAgeGroupFocus();
  const isAdultFocus = ageGroup !== DEFAULT_KANGUR_AGE_GROUP;
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const canAccessParentAssignments =
    runtime.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);
  const hideLearnerWidgetsForParent = user?.actorType === 'parent' && !user?.activeLearner?.id;
  const hasMeaningfulProgress =
    progress.totalXp > 0 ||
    progress.gamesPlayed > 0 ||
    progress.lessonsCompleted > 0 ||
    (progress.dailyQuestsCompleted ?? 0) > 0;
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
  const learnerActivityTitle = useMemo(() => {
    const assignmentTitle = activeGameAssignment?.title?.trim();
    if (assignmentTitle) {
      return `Gra: ${assignmentTitle}`;
    }
    return `Gra: ${currentScreenLabel}`;
  }, [activeGameAssignment?.title, currentScreenLabel]);
  useKangurLearnerActivityPing({
    activity: {
      kind: 'game',
      title: learnerActivityTitle,
    },
    enabled: user?.actorType === 'learner',
  });
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
    id: 'kangur-game-clock-quiz',
    kind: 'screen',
    ref: clockQuizRef,
    surface: 'game',
    enabled: screen === 'clock_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'clock_quiz' ? tutorActivityContentId : null,
      label: 'Ćwiczenia z zegarem',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-addition-quiz',
    kind: 'screen',
    ref: additionQuizRef,
    surface: 'game',
    enabled: screen === 'addition_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'addition_quiz' ? tutorActivityContentId : null,
      label: 'Quiz dodawania',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-subtraction-quiz',
    kind: 'screen',
    ref: subtractionQuizRef,
    surface: 'game',
    enabled: screen === 'subtraction_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'subtraction_quiz' ? tutorActivityContentId : null,
      label: 'Quiz odejmowania',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-division-quiz',
    kind: 'screen',
    ref: divisionQuizRef,
    surface: 'game',
    enabled: screen === 'division_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'division_quiz' ? tutorActivityContentId : null,
      label: 'Quiz dzielenia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-multiplication-quiz',
    kind: 'screen',
    ref: multiplicationQuizRef,
    surface: 'game',
    enabled: screen === 'multiplication_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'multiplication_quiz' ? tutorActivityContentId : null,
      label: 'Quiz mnożenia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-logical-patterns-quiz',
    kind: 'screen',
    ref: logicalPatternsQuizRef,
    surface: 'game',
    enabled: screen === 'logical_patterns_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'logical_patterns_quiz' ? tutorActivityContentId : null,
      label: 'Quiz wzorców',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-logical-classification-quiz',
    kind: 'screen',
    ref: logicalClassificationQuizRef,
    surface: 'game',
    enabled: screen === 'logical_classification_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'logical_classification_quiz' ? tutorActivityContentId : null,
      label: 'Quiz klasyfikacji',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-logical-analogies-quiz',
    kind: 'screen',
    ref: logicalAnalogiesQuizRef,
    surface: 'game',
    enabled: screen === 'logical_analogies_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'logical_analogies_quiz' ? tutorActivityContentId : null,
      label: 'Quiz analogii',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-english-sentence-quiz',
    kind: 'screen',
    ref: englishSentenceQuizRef,
    surface: 'game',
    enabled: screen === 'english_sentence_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'english_sentence_quiz' ? tutorActivityContentId : null,
      label: 'Quiz składni zdania',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-english-parts-of-speech-quiz',
    kind: 'screen',
    ref: englishPartsOfSpeechQuizRef,
    surface: 'game',
    enabled: screen === 'english_parts_of_speech_quiz',
    priority: 120,
    metadata: {
      contentId: screen === 'english_parts_of_speech_quiz' ? tutorActivityContentId : null,
      label: 'Quiz części mowy',
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

  if (isAdultFocus) {
    return (
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
            Widok: {currentScreenLabel}
          </div>
        )}
        containerProps={{
          as: 'section',
          'data-kangur-route-main': true,
          id: GAME_MAIN_ID,
          'aria-labelledby': GAME_TITLE_ID,
          className: `flex flex-col items-center pb-[calc(env(safe-area-inset-bottom)+32px)] pt-8 sm:pt-10 ${KANGUR_PANEL_GAP_CLASSNAME}`,
        }}
      >
        <h1 id={GAME_TITLE_ID} className='sr-only'>
          {GAME_BRAND_NAME}
        </h1>
        <div className={`flex w-full max-w-lg flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
          <KangurEmptyState
            accent='amber'
            className='w-full'
            description='Sekcja Grajmy jest teraz dostępna dla 10-latków.'
            padding='xl'
            title='Gry dla dorosłych w przygotowaniu'
          />
        </div>
      </KangurStandardPageLayout>
    );
  }

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
            Widok: {currentScreenLabel}
          </div>
        )}
        containerProps={{
          as: 'section',
          'data-kangur-route-main': true,
          id: GAME_MAIN_ID,
          'aria-labelledby': `${GAME_TITLE_ID} ${GAME_SCREEN_TITLE_ID}`,
          className: `flex flex-col items-center pb-[calc(env(safe-area-inset-bottom)+32px)] pt-8 sm:pt-10 ${KANGUR_PANEL_GAP_CLASSNAME}`,
        }}
      >
          <h1 id={GAME_TITLE_ID} className='sr-only'>
            {GAME_BRAND_NAME}
          </h1>
          <AnimatePresence initial={false} mode='wait'>
            {screen === 'home' ? (
              renderScreen(
                'home',
                `flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`,
                <>
                  {canAccessParentAssignments ? (
                    <section
                      className='w-full max-w-[900px]'
                      id='kangur-home-parent-spotlight'
                      aria-labelledby='kangur-home-parent-assignment-heading'
                    >
                      <h3 id='kangur-home-parent-assignment-heading' className='sr-only'>
                        Sugestie od Rodzica
                      </h3>
                      <KangurAssignmentSpotlight
                        basePath={basePath}
                        enabled={canAccessParentAssignments}
                      />
                    </section>
                  ) : null}
                  <div className='w-full max-w-[560px] space-y-8 sm:space-y-10'>
                    <div id='kangur-home-actions' ref={homeActionsRef}>
                      <KangurGameHomeActionsWidget hideWhenScreenMismatch={false} />
                    </div>
                    <KangurGameHomeDuelsInvitesWidget hideWhenScreenMismatch={false} />
                    {hideLearnerWidgetsForParent ? (
                      <KangurEmptyState
                        align='left'
                        className='text-left'
                        padding='md'
                        title='Brak profilu ucznia'
                        description='Dodaj lub wybierz profil ucznia w sekcji poniżej, aby zobaczyć postęp i misje dnia.'
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
                              Dodaj ucznia
                            </Link>
                          </KangurButton>
                        </div>
                      </KangurEmptyState>
                    ) : null}
                  </div>

                  {!hideLearnerWidgetsForParent ? (
                    <section
                      ref={homeQuestRef}
                      className='mx-auto w-full max-w-[900px]'
                      id='kangur-home-quest'
                      aria-labelledby='kangur-home-quest-heading'
                    >
                      <h3 id='kangur-home-quest-heading' className='sr-only'>
                        Misja dla ucznia
                      </h3>
                      <KangurGameHomeQuestWidget hideWhenScreenMismatch={false} />
                    </section>
                  ) : null}

                  {!hideLearnerWidgetsForParent && hasMeaningfulProgress ? (
                    <section
                      className='w-full max-w-[900px]'
                      id='kangur-home-summary'
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
                  ) : null}

                  {canAccessParentAssignments ? (
                    <section
                      ref={homeAssignmentsRef}
                      className='mx-auto w-full max-w-[900px]'
                      id='kangur-home-priority-assignments'
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

                  {!hideLearnerWidgetsForParent ? (
                    <section
                      className={`mx-auto grid w-full max-w-[900px] items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] ${KANGUR_PANEL_GAP_CLASSNAME}`}
                      id='kangur-home-progress'
                      aria-labelledby='kangur-home-progress-heading'
                    >
                      <h3 id='kangur-home-progress-heading' className='sr-only'>
                        Ranking i postęp
                      </h3>
                      <div
                        ref={homeLeaderboardRef}
                        id='kangur-home-leaderboard'
                        className='order-2 flex w-full justify-center xl:order-1'
                      >
                        <Leaderboard />
                      </div>
                      <div
                        ref={homeProgressRef}
                        id='kangur-home-player-progress'
                        className='order-1 flex w-full justify-center xl:order-2'
                      >
                        <PlayerProgressCard progress={progress} />
                      </div>
                    </section>
                  ) : null}
                </>
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
