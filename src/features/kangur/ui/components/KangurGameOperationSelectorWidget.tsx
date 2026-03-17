'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
  KANGUR_LESSON_COMPONENT_ORDER,
  KANGUR_LESSON_LIBRARY,
} from '@/features/kangur/settings';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';
import KangurGameSetupMomentumCard from '@/features/kangur/ui/components/KangurGameSetupMomentumCard';
import { KangurGrajmyWordmark } from '@/features/kangur/ui/components/KangurGrajmyWordmark';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import { KangurTrainingSetupPanel } from '@/features/kangur/ui/components/KangurTrainingSetupPanel';
import OperationSelector from '@/features/kangur/ui/components/OperationSelector';
import { KangurSubjectGroupSection } from '@/features/kangur/ui/components/KangurSubjectGroupSection';
import { KangurTreningWordmark } from '@/features/kangur/ui/components/KangurTreningWordmark';
import { KANGUR_SUBJECT_GROUPS } from '@/features/kangur/ui/constants/subject-groups';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import {
  KangurButton,
  KangurInfoCard,
  KangurIconBadge,
  KangurPanelRow,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_RELAXED_ROW_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_START_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type { KangurDailyQuestState } from '@/features/kangur/shared/contracts/kangur-quests';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getRecommendedTrainingSetup,
} from '@/features/kangur/ui/services/game-setup-recommendations';
import {
  getProgressAverageAccuracy,
  getProgressBadgeTrackSummaries,
  getProgressTopActivities,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurOperation,
  KangurProgressState,
} from '@/features/kangur/ui/types';
import type {
  KangurLessonComponentId,
  KangurLesson,
  KangurLessonSubject,
  KangurRouteAction,
} from '@/features/kangur/shared/contracts/kangur';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

type LessonQuizDefinition = {
  accent: KangurAccent;
  description: string;
  emoji: string;
  label: string;
  lessonComponentIds: readonly KangurLessonComponentId[];
  onSelectScreen: KangurGameScreen;
};

type LessonQuizOption = LessonQuizDefinition & {
  subject: KangurLessonSubject;
  sortOrder: number;
};

const LESSON_QUIZ_DEFINITIONS: LessonQuizDefinition[] = [
  {
    accent: 'indigo',
    description: 'Ćwicz odczytywanie godzin i minut w trybie quizu.',
    emoji: '🕐',
    label: 'Ćwiczenia z Zegarem',
    lessonComponentIds: ['clock'],
    onSelectScreen: 'clock_quiz',
  },
  {
    accent: 'emerald',
    description: 'Sprawdź daty, dni tygodnia i miesiące w krótkich zadaniach.',
    emoji: '📅',
    label: 'Ćwiczenia z Kalendarzem',
    lessonComponentIds: ['calendar'],
    onSelectScreen: 'calendar_quiz',
  },
  {
    accent: 'amber',
    description: 'Szybki quiz z dodawania w rytmie gry z lekcji.',
    emoji: '➕',
    label: 'Quiz dodawania',
    lessonComponentIds: ['adding'],
    onSelectScreen: 'addition_quiz',
  },
  {
    accent: 'rose',
    description: 'Szybka seria odejmowania z natychmiastową odpowiedzią.',
    emoji: '➖',
    label: 'Quiz odejmowania',
    lessonComponentIds: ['subtracting'],
    onSelectScreen: 'subtraction_quiz',
  },
  {
    accent: 'violet',
    description: 'Sprawdź tabliczkę w krótkim quizie z mnożenia.',
    emoji: '✖️',
    label: 'Quiz mnożenia',
    lessonComponentIds: ['multiplication'],
    onSelectScreen: 'multiplication_quiz',
  },
  {
    accent: 'emerald',
    description: 'Szybki quiz z dzielenia na równe grupy.',
    emoji: '➗',
    label: 'Quiz dzielenia',
    lessonComponentIds: ['division'],
    onSelectScreen: 'division_quiz',
  },
  {
    accent: 'violet',
    description: 'Rozpoznawaj figury, symetrię i obwody w krótkich wyzwaniach.',
    emoji: '🔷',
    label: 'Ćwiczenia z Figurami',
    lessonComponentIds: KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
    onSelectScreen: 'geometry_quiz',
  },
  {
    accent: 'violet',
    description: 'Uzupełniaj ciągi i sprawdzaj reguły wzorców.',
    emoji: '🔢',
    label: 'Quiz wzorców',
    lessonComponentIds: ['logical_patterns'],
    onSelectScreen: 'logical_patterns_quiz',
  },
  {
    accent: 'teal',
    description: 'Grupuj elementy i znajdź wspólne cechy.',
    emoji: '📦',
    label: 'Quiz klasyfikacji',
    lessonComponentIds: ['logical_classification'],
    onSelectScreen: 'logical_classification_quiz',
  },
  {
    accent: 'rose',
    description: 'Dopasuj relacje i znajdź właściwe analogie.',
    emoji: '🔗',
    label: 'Quiz analogii',
    lessonComponentIds: ['logical_analogies'],
    onSelectScreen: 'logical_analogies_quiz',
  },
  {
    accent: 'violet',
    description: 'Ćwicz szyk zdania, pytania i spójniki w krótkich rundach.',
    emoji: '🧩',
    label: 'Quiz składni zdania',
    lessonComponentIds: ['english_sentence_structure'],
    onSelectScreen: 'english_sentence_quiz',
  },
  {
    accent: 'sky',
    description: 'Sortuj słowa według części mowy w krótkich rundach.',
    emoji: '🎮',
    label: 'Quiz części mowy',
    lessonComponentIds: ['english_parts_of_speech'],
    onSelectScreen: 'english_parts_of_speech_quiz',
  },
];

const OPERATION_LESSON_QUIZ_SCREENS: Partial<Record<KangurOperation, KangurGameScreen>> = {
  addition: 'addition_quiz',
  subtraction: 'subtraction_quiz',
  multiplication: 'multiplication_quiz',
  division: 'division_quiz',
  clock: 'clock_quiz',
};

type KangurRecommendedSelectorScreen = Extract<
  KangurGameScreen,
  | 'calendar_quiz'
  | 'geometry_quiz'
  | 'subtraction_quiz'
  | 'division_quiz'
  | 'multiplication_quiz'
>;

type KangurOperationSelectorRecommendationTarget =
  | {
      kind: 'operation';
      difficulty: KangurDifficulty;
      operation: KangurOperation;
    }
  | {
      kind: 'training';
    }
  | {
      kind: 'screen';
      screen: KangurRecommendedSelectorScreen;
    };

type KangurOperationSelectorRecommendation = {
  accent: KangurAccent;
  actionLabel: string;
  description: string;
  label: string;
  recommendedOperation: KangurOperation | null;
  recommendedScreen: KangurRecommendedSelectorScreen | null;
  target: KangurOperationSelectorRecommendationTarget;
  title: string;
};

const resolveRecommendationDifficulty = (accuracy: number): KangurDifficulty => {
  if (accuracy >= 85) {
    return 'hard';
  }
  if (accuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

const resolveLessonRecommendationTarget = (
  componentId: string | null | undefined,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null => {
  if (!componentId) {
    return null;
  }

  const difficulty = resolveRecommendationDifficulty(averageAccuracy);

  switch (componentId) {
    case 'clock':
      return { kind: 'operation', difficulty, operation: 'clock' };
    case 'calendar':
      return { kind: 'screen', screen: 'calendar_quiz' };
    case 'adding':
      return { kind: 'operation', difficulty, operation: 'addition' };
    case 'subtracting':
      return { kind: 'operation', difficulty, operation: 'subtraction' };
    case 'multiplication':
      return { kind: 'operation', difficulty, operation: 'multiplication' };
    case 'division':
      return { kind: 'operation', difficulty, operation: 'division' };
    case 'geometry_basics':
    case 'geometry_shapes':
    case 'geometry_symmetry':
    case 'geometry_perimeter':
      return { kind: 'screen', screen: 'geometry_quiz' };
    default:
      return { kind: 'training' };
  }
};

const resolveActivityRecommendationTarget = (
  activityKey: string | null | undefined,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null => {
  if (!activityKey) {
    return null;
  }

  const [, primary = ''] = activityKey.split(':');
  if (!primary) {
    return null;
  }

  if (primary === 'calendar') {
    return { kind: 'screen', screen: 'calendar_quiz' };
  }
  if (primary === 'geometry' || primary.startsWith('geometry_')) {
    return { kind: 'screen', screen: 'geometry_quiz' };
  }

  return resolveLessonRecommendationTarget(primary, averageAccuracy);
};

const resolveActionRecommendationTarget = (
  action: KangurRouteAction | undefined,
  progress: KangurProgressState
): KangurOperationSelectorRecommendationTarget | null => {
  if (!action) {
    return null;
  }

  const averageAccuracy = getProgressAverageAccuracy(progress);
  if (action.page === 'Game') {
    const quickStart = action.query?.['quickStart'];
    if (quickStart === 'training') {
      return { kind: 'training' };
    }
    if (quickStart === 'operation') {
      const requestedOperation = action.query?.['operation'] ?? null;
      const difficulty = action.query?.['difficulty'];
      if (requestedOperation === 'mixed') {
        return { kind: 'training' };
      }
      if (
        requestedOperation &&
        [
          'addition',
          'subtraction',
          'multiplication',
          'division',
          'decimals',
          'powers',
          'roots',
          'clock',
        ].includes(requestedOperation)
      ) {
        return {
          kind: 'operation',
          difficulty:
            difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
              ? difficulty
              : resolveRecommendationDifficulty(averageAccuracy),
          operation: requestedOperation as KangurOperation,
        };
      }
    }
  }

  if (action.page === 'Lessons') {
    return resolveLessonRecommendationTarget(action.query?.['focus'], averageAccuracy);
  }

  return null;
};

const getRecommendationActionLabel = (
  target: KangurOperationSelectorRecommendationTarget
): string => {
  const operationLabels: Partial<Record<KangurOperation, string>> = {
    addition: 'Zagraj w dodawanie',
    subtraction: 'Zagraj w odejmowanie',
    multiplication: 'Zagraj w mnożenie',
    division: 'Zagraj w dzielenie',
    clock: 'Zagraj na zegarze',
    mixed: 'Uruchom trening mieszany',
    decimals: 'Zagraj we ułamki',
    powers: 'Zagraj w potęgi',
    roots: 'Zagraj w pierwiastki',
  };

  if (target.kind === 'training') {
    return 'Uruchom trening mieszany';
  }

  if (target.kind === 'screen') {
    if (target.screen === 'calendar_quiz') {
      return 'Ćwicz kalendarz';
    }
    if (target.screen === 'geometry_quiz') {
      return 'Ćwicz figury';
    }
    if (target.screen === 'subtraction_quiz') {
      return 'Ćwicz odejmowanie';
    }
    if (target.screen === 'division_quiz') {
      return 'Ćwicz dzielenie';
    }
    if (target.screen === 'multiplication_quiz') {
      return 'Ćwicz mnożenie';
    }
    return 'Uruchom trening';
  }

  return operationLabels[target.operation] ?? 'Zagraj teraz';
};

const finalizeRecommendation = (
  draft: Omit<KangurOperationSelectorRecommendation, 'actionLabel' | 'recommendedOperation' | 'recommendedScreen'>
): KangurOperationSelectorRecommendation => ({
  ...draft,
  actionLabel: getRecommendationActionLabel(draft.target),
  recommendedOperation: draft.target.kind === 'operation' ? draft.target.operation : null,
  recommendedScreen: draft.target.kind === 'screen' ? draft.target.screen : null,
});

const getQuestRecommendation = (
  quest: KangurDailyQuestState | null,
  progress: KangurProgressState
): KangurOperationSelectorRecommendation | null => {
  if (!quest?.assignment) {
    return null;
  }

  const target = resolveActionRecommendationTarget(quest.assignment.action, progress);
  if (!target) {
    return null;
  }

  return finalizeRecommendation({
    accent: quest.progress.status === 'completed' ? 'emerald' : 'indigo',
    description:
      quest.assignment.progressLabel ??
      quest.progress.summary ??
      quest.assignment.description,
    label: quest.assignment.questLabel ?? 'Misja dnia',
    target,
    title: quest.assignment.title,
  });
};

const getWeakestLessonRecommendation = (
  progress: KangurProgressState
): KangurOperationSelectorRecommendation | null => {
  const weakestLesson = Object.entries(progress.lessonMastery ?? {})
    .filter(([, entry]) => entry.attempts > 0 && entry.masteryPercent < 80)
    .sort((left, right) => left[1].masteryPercent - right[1].masteryPercent)[0];

  if (!weakestLesson) {
    return null;
  }

  const [componentId, entry] = weakestLesson;
  const lesson = KANGUR_LESSON_LIBRARY[componentId as KangurLessonComponentId];
  const target = resolveLessonRecommendationTarget(
    componentId,
    getProgressAverageAccuracy(progress)
  );
  if (!lesson || !target) {
    return null;
  }

  return finalizeRecommendation({
    accent: entry.masteryPercent < 60 ? 'rose' : 'amber',
    description: `Opanowanie ${entry.masteryPercent}%. Jedna dobra runda pomoże szybciej domknąć ten temat przed kolejną lekcją.`,
    label: 'Nadrabiamy lekcje',
    target,
    title: `Najpierw popraw: ${lesson.title}`,
  });
};

const getTrackRecommendation = (
  progress: KangurProgressState
): KangurOperationSelectorRecommendation | null => {
  const track =
    getProgressBadgeTrackSummaries(progress, { maxTracks: 6 }).find(
      (entry) =>
        Boolean(entry.nextBadge) && (entry.unlockedCount > 0 || entry.progressPercent >= 40)
    ) ?? null;
  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;

  if (!track?.nextBadge) {
    return null;
  }

  const target =
    resolveActivityRecommendationTarget(
      topActivity?.key,
      topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress)
    ) ?? ({ kind: 'training' } as const);

  return finalizeRecommendation({
    accent: 'violet',
    description: topActivity
      ? `Tor ${track.label} jest najbliżej nagrody. Najmocniej pcha go teraz ${topActivity.label.toLowerCase()}.`
      : `Tor ${track.label} jest najbliżej kolejnej odznaki.`,
    label: 'Tor odznak',
    target,
    title: `Rozpędź tor: ${track.label}`,
  });
};

const getGuidedRecommendation = (
  progress: KangurProgressState
): KangurOperationSelectorRecommendation | null => {
  const guidedMomentum = getRecommendedSessionMomentum(progress);
  if (guidedMomentum.completedSessions <= 0 || !guidedMomentum.nextBadgeName) {
    return null;
  }

  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;
  const target =
    resolveActivityRecommendationTarget(
      topActivity?.key,
      topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress)
    ) ?? ({ kind: 'training' } as const);

  return finalizeRecommendation({
    accent: 'sky',
    description: topActivity
      ? `Masz już ${guidedMomentum.summary} w polecanym rytmie. Jeszcze jedna mocna runda ${topActivity.label.toLowerCase()} pomoże domknąć odznakę ${guidedMomentum.nextBadgeName}.`
      : `Masz już ${guidedMomentum.summary} w polecanym rytmie. Jeszcze jedna mocna runda pomoże domknąć odznakę ${guidedMomentum.nextBadgeName}.`,
    label: 'Polecony kierunek',
    target,
    title: `Dopnij: ${guidedMomentum.nextBadgeName}`,
  });
};

const getFallbackRecommendation = (
  progress: KangurProgressState
): KangurOperationSelectorRecommendation | null => {
  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;
  if (!topActivity) {
    return null;
  }

  const target =
    resolveActivityRecommendationTarget(topActivity.key, topActivity.averageAccuracy) ??
    ({ kind: 'training' } as const);

  return finalizeRecommendation({
    accent: 'indigo',
    description: `${topActivity.label} daje teraz średnio ${topActivity.averageXpPerSession} XP na grę. To najlepszy ruch na kolejną rundę.`,
    label: 'Mocna passa',
    target,
    title: `Zagraj dalej w: ${topActivity.label}`,
  });
};

const getOperationSelectorRecommendation = (
  progress: KangurProgressState,
  quest: KangurDailyQuestState | null
): KangurOperationSelectorRecommendation | null =>
  getQuestRecommendation(quest, progress) ??
  getWeakestLessonRecommendation(progress) ??
  getGuidedRecommendation(progress) ??
  getTrackRecommendation(progress) ??
  getFallbackRecommendation(progress);

export function KangurGameOperationSelectorWidget(): React.JSX.Element | null {
  const {
    activePracticeAssignment,
    basePath,
    handleHome,
    handleSelectOperation,
    handleStartTraining,
    practiceAssignmentsByOperation,
    progress,
    screen,
    setScreen,
  } = useKangurGameRuntime();
  const { subject } = useKangurSubjectFocus();
  const { ageGroup } = useKangurAgeGroupFocus();
  const trainingSectionRef = useRef<HTMLElement | null>(null);
  const normalizedProgress = useMemo(() => {
    const defaults = createDefaultKangurProgressState();
    return {
      ...defaults,
      ...progress,
      badges: progress.badges ?? defaults.badges,
      operationsPlayed: progress.operationsPlayed ?? defaults.operationsPlayed,
      lessonMastery: progress.lessonMastery ?? defaults.lessonMastery,
      openedTasks: progress.openedTasks ?? defaults.openedTasks,
      lessonPanelProgress: progress.lessonPanelProgress ?? defaults.lessonPanelProgress,
      activityStats: progress.activityStats ?? defaults.activityStats,
    };
  }, [progress]);
  const dailyQuest = useMemo(
    () => getCurrentKangurDailyQuest(normalizedProgress, { subject }),
    [normalizedProgress, subject]
  );
  const recommendation = useMemo(
    () => getOperationSelectorRecommendation(normalizedProgress, dailyQuest),
    [dailyQuest, normalizedProgress]
  );
  const suggestedTraining = useMemo(
    () => getRecommendedTrainingSetup(normalizedProgress),
    [normalizedProgress]
  );
  const lessonsQuery = useKangurLessons({ subject, ageGroup, enabledOnly: true });
  const emptyLessonsRefetchedForSubject = useRef<KangurLessonSubject | null>(null);
  const lessonQuizOptions = useMemo<LessonQuizOption[]>(() => {
    const enabledLessons = lessonsQuery.data ?? [];
    const lessonsByComponentId = new Map(
      enabledLessons.map((lesson) => [lesson.componentId, lesson] as const)
    );
    const componentSortOrder = new Map(
      KANGUR_LESSON_COMPONENT_ORDER.map((componentId, index) => [componentId, index] as const)
    );
    const resolveFallbackSortOrder = (componentIds: readonly KangurLessonComponentId[]): number => {
      const orders = componentIds
        .map((componentId) => componentSortOrder.get(componentId))
        .filter((order): order is number => typeof order === 'number');

      return orders.length > 0 ? Math.min(...orders) : Number.MAX_SAFE_INTEGER;
    };

    const options = LESSON_QUIZ_DEFINITIONS.flatMap((definition) => {
      const activeLessons = definition.lessonComponentIds
        .map((componentId) => lessonsByComponentId.get(componentId))
        .filter((lesson): lesson is KangurLesson => Boolean(lesson));

      if (activeLessons.length === 0) {
        const fallbackLessons = definition.lessonComponentIds
          .map((componentId) => KANGUR_LESSON_LIBRARY[componentId])
          .filter((lesson): lesson is KangurLessonTemplate => Boolean(lesson));

        if (fallbackLessons.length === 0) {
          return [];
        }

        const primaryLesson = fallbackLessons[0]!;
        return [
          {
            ...definition,
            subject: primaryLesson.subject,
            sortOrder: resolveFallbackSortOrder(definition.lessonComponentIds),
          },
        ];
      }

      const primaryLesson = activeLessons[0]!;
      const sortOrder = Math.min(...activeLessons.map((lesson) => lesson.sortOrder));

      return [
        {
          ...definition,
          subject: primaryLesson.subject,
          sortOrder,
        },
      ];
    });
    return options.sort((left, right) => left.sortOrder - right.sortOrder);
  }, [lessonsQuery.data, subject]);
  const lessonQuizGroups = useMemo(
    () =>
      KANGUR_SUBJECT_GROUPS.map((group) => ({
        ...group,
        options: lessonQuizOptions.filter((option) => option.subject === group.value),
      })).filter((group) => group.options.length > 0),
    [lessonQuizOptions]
  );
  const filteredLessonQuizGroups = useMemo(
    () => lessonQuizGroups.filter((group) => group.value === subject),
    [lessonQuizGroups, subject]
  );
  const recommendedLessonQuizScreen = useMemo(() => {
    if (!recommendation) {
      return null;
    }

    if (recommendation.target.kind === 'screen') {
      return recommendation.target.screen;
    }

    if (recommendation.target.kind === 'operation') {
      return OPERATION_LESSON_QUIZ_SCREENS[recommendation.target.operation] ?? null;
    }

    return null;
  }, [recommendation]);
  const mixedPracticeAssignment =
    practiceAssignmentsByOperation.mixed ??
    (activePracticeAssignment?.target.operation === 'mixed' ? activePracticeAssignment : null);
  const operationPracticeAssignment =
    activePracticeAssignment && activePracticeAssignment.target.operation !== 'mixed'
      ? activePracticeAssignment
      : null;
  const shouldRender = screen === 'operation' || screen === 'training';
  const showMathSections = subject === 'maths';
  const gameIntroDescription =
    subject === 'maths'
      ? 'Wybierz rodzaj gry i przejdź od razu do matematycznej zabawy.'
      : subject === 'alphabet'
        ? 'Wybierz literową zabawę i ćwicz alfabet.'
        : 'Wybierz typ gry językowej i przejdź od razu do ćwiczeń.';

  useEffect(() => {
    if (!lessonsQuery.data) {
      return;
    }
    if (lessonsQuery.data.length > 0) {
      emptyLessonsRefetchedForSubject.current = null;
      return;
    }
    if (lessonsQuery.isFetching) {
      return;
    }
    if (emptyLessonsRefetchedForSubject.current === subject) {
      return;
    }

    emptyLessonsRefetchedForSubject.current = subject;
    void lessonsQuery.refetch();
  }, [lessonsQuery.data, lessonsQuery.isFetching, lessonsQuery.refetch, subject]);

  useEffect(() => {
    if (subject === 'maths') {
      return;
    }

    if (screen === 'training') {
      setScreen('operation');
    }
  }, [screen, setScreen, subject]);

  useEffect(() => {
    if (screen !== 'training') {
      return;
    }

    trainingSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [screen]);

  if (!shouldRender) {
    return null;
  }

  const handleRecommendationSelect = (): void => {
    if (!recommendation) {
      return;
    }

    if (recommendation.target.kind === 'training') {
      if (screen === 'training') {
        trainingSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      } else {
        setScreen('training');
      }
      return;
    }

    if (recommendation.target.kind === 'screen') {
      setScreen(recommendation.target.screen);
      return;
    }

    handleSelectOperation(recommendation.target.operation, recommendation.target.difficulty, {
      recommendation: {
        description: recommendation.description,
        label: recommendation.label,
        source: 'operation_selector',
        title: recommendation.title,
      },
    });
  };

  return (
    <div className={`w-full flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPageIntroCard
        className='max-w-md'
        description={
          gameIntroDescription
        }
        headingSize='lg'
        onBack={handleHome}
        testId='kangur-game-operation-top-section'
        title='Grajmy!'
        visualTitle={
          <KangurGrajmyWordmark
            className='mx-auto'
            data-testid='kangur-grajmy-heading-art'
            idPrefix='kangur-game-operation-heading'
          />
        }
      />
      {showMathSections && operationPracticeAssignment ? (
        <div className='flex w-full justify-center px-4'>
          <KangurPracticeAssignmentBanner
            assignment={operationPracticeAssignment}
            basePath={basePath}
            mode='queue'
          />
        </div>
      ) : null}
      {recommendation && showMathSections ? (
        <KangurInfoCard
          accent={recommendation.accent}
          className='w-full max-w-3xl rounded-[28px]'
          data-testid='kangur-operation-recommendation-card'
          padding='md'
          tone='accent'
        >
          <KangurPanelRow className='sm:items-start sm:justify-between'>
            <div className='min-w-0'>
              <KangurStatusChip
                accent={recommendation.accent}
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-operation-recommendation-label'
                size='sm'
              >
                {recommendation.label}
              </KangurStatusChip>
              <p
                className='mt-3 break-words text-lg font-extrabold [color:var(--kangur-page-text)]'
                data-testid='kangur-operation-recommendation-title'
              >
                {recommendation.title}
              </p>
              <p
                className='mt-1 break-words text-sm [color:var(--kangur-page-muted-text)]'
                data-testid='kangur-operation-recommendation-description'
              >
                {recommendation.description}
              </p>
            </div>
            <KangurButton
              className='w-full shrink-0 sm:w-auto'
              data-testid='kangur-operation-recommendation-action'
              size='sm'
              type='button'
              variant='surface'
              onClick={handleRecommendationSelect}
              >
                {recommendation.actionLabel}
              </KangurButton>
          </KangurPanelRow>
        </KangurInfoCard>
      ) : null}
      {showMathSections ? (
        <OperationSelector
          onSelect={handleSelectOperation}
          priorityAssignmentsByOperation={practiceAssignmentsByOperation}
          recommendedLabel={recommendation?.label}
          recommendedOperation={recommendation?.recommendedOperation}
        />
      ) : null}
      <section
        aria-labelledby='kangur-game-quick-practice-heading'
        className='w-full max-w-3xl space-y-4'
      >
        <KangurSectionHeading
          accent='violet'
          align='left'
          description='Szybkie quizy oparte na tematach z Lekcji.'
          headingAs='h3'
          headingSize='sm'
          title='Szybkie ćwiczenia'
          titleId='kangur-game-quick-practice-heading'
        />
        <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
          {filteredLessonQuizGroups.map((group) => (
            <KangurSubjectGroupSection
              key={group.value}
              ariaLabel={`${group.label} quick practice`}
              label={group.label}
              className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
            >
              <div className='flex w-full flex-col kangur-panel-gap'>
                {group.options.map((option) => {
                  const isRecommended = recommendedLessonQuizScreen === option.onSelectScreen;

                  return (
                    <KangurIconSummaryOptionCard
                      key={option.onSelectScreen}
                      accent={option.accent}
                      buttonClassName='w-full rounded-[24px] p-4 text-left sm:rounded-[28px] sm:p-5'
                      data-doc-id='home_quick_practice_action'
                      data-testid={`kangur-quick-practice-card-${option.onSelectScreen}`}
                      emphasis='accent'
                      aria-label={`Szybkie ćwiczenie: ${option.label}`}
                      onClick={() => setScreen(option.onSelectScreen)}
                    >
                      <KangurIconSummaryCardContent
                        aside={
                          <>
                            <KangurStatusChip
                              accent={option.accent}
                              className='uppercase tracking-[0.14em]'
                              size='sm'
                            >
                              Gra
                            </KangurStatusChip>
                            {isRecommended && recommendation ? (
                              <KangurStatusChip
                                accent={option.accent}
                                className='text-[11px] font-semibold'
                                data-testid={`kangur-quick-practice-recommendation-${option.onSelectScreen}`}
                                size='sm'
                              >
                                {recommendation.label}
                              </KangurStatusChip>
                            ) : null}
                          </>
                        }
                        asideClassName={`${KANGUR_WRAP_START_ROW_CLASSNAME} w-full sm:w-auto sm:flex-col sm:items-end sm:gap-2`}
                        className={`w-full ${KANGUR_RELAXED_ROW_CLASSNAME} items-start sm:items-center`}
                        contentClassName='w-full sm:flex-1'
                        description={option.description}
                        descriptionClassName='text-slate-500'
                        headerClassName={`${KANGUR_TIGHT_ROW_CLASSNAME} items-start sm:items-start sm:justify-between`}
                        icon={
                          <KangurIconBadge
                            accent={option.accent}
                            className='shrink-0 scale-90 sm:scale-100'
                            size='xl'
                          >
                            {option.emoji}
                          </KangurIconBadge>
                        }
                        title={option.label}
                        titleClassName='text-slate-800'
                        titleWrapperClassName='w-full'
                      />
                    </KangurIconSummaryOptionCard>
                  );
                })}
              </div>
            </KangurSubjectGroupSection>
          ))}
        </div>
      </section>
      {showMathSections ? (
        <section
          aria-labelledby='kangur-game-training-heading'
          className='w-full max-w-3xl space-y-4'
          ref={trainingSectionRef}
        >
          <KangurPageIntroCard
            className='w-full'
            description='Dobierz poziom, kategorie i liczbę pytań do jednej sesji.'
            headingAs='h3'
            headingSize='md'
            onBack={handleHome}
            showBackButton={false}
            testId='kangur-game-training-top-section'
            title='Trening mieszany'
            titleId='kangur-game-training-heading'
            visualTitle={
              <KangurTreningWordmark
                className='mx-auto'
                data-testid='kangur-training-heading-art'
                idPrefix='kangur-game-training-heading'
              />
            }
          />
          {mixedPracticeAssignment ? (
            <div className='flex w-full justify-center px-4'>
              <KangurPracticeAssignmentBanner
                assignment={mixedPracticeAssignment}
                basePath={basePath}
                mode='active'
              />
            </div>
          ) : null}
          <KangurGameSetupMomentumCard mode='training' progress={normalizedProgress} />
          <KangurTrainingSetupPanel
            onStart={(selection, options) => handleStartTraining(selection, options)}
            suggestedTraining={suggestedTraining}
          />
        </section>
      ) : null}
    </div>
  );
}
