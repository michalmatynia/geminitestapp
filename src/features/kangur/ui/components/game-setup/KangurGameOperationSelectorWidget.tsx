'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useRef } from 'react';

import {
  KANGUR_LESSON_COMPONENT_ORDER,
  KANGUR_LESSON_LIBRARY,
} from '@/features/kangur/settings';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';
import { KangurGrajmyWordmark } from '@/features/kangur/ui/components/wordmarks/KangurGrajmyWordmark';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/lesson-library/KangurPageIntroCard';
import { getKangurSubjectGroups } from '@/features/kangur/ui/constants/subject-groups';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getRecommendedTrainingSetup,
} from '@/features/kangur/ui/services/game-setup-recommendations';
import {
  translateRecommendationWithFallback,
} from '@/features/kangur/ui/services/recommendation-i18n';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type {
  KangurLessonComponentId,
  KangurLesson,
} from '@/features/kangur/shared/contracts/kangur';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import {
  getOperationSelectorRecommendation,
  OPERATION_LESSON_QUIZ_SCREENS,
} from './KangurGameOperationSelectorWidget.logic';
import { getOperationSelectorFallbackCopy } from './KangurGameOperationSelectorWidget.copy';
import type { LessonQuizOption } from './KangurGameOperationSelectorWidget.types';
import {
  resolveKangurGameOperationMixedPracticeAssignment,
  resolveKangurGameOperationPrimaryAssignment,
  useKangurGameOperationSelectorSubjectScreenSync,
  useKangurGameOperationSelectorTrainingScroll,
  resolveKangurGameOperationSelectorCompactActionClassName,
  resolveKangurGameOperationSelectorIntroLabel,
  renderKangurGameOperationSelectorIntroDescription,
  handleKangurGameOperationRecommendationSelect,
} from './KangurGameOperationSelectorWidget.utils';
import { KangurGameOperationPracticeAssignmentBanner } from './KangurGameOperationPracticeAssignmentBanner';
import { KangurGameOperationRecommendationCard } from './KangurGameOperationRecommendationCard';
import { KangurGameOperationSelectorOperationSection } from './KangurGameOperationSelectorOperationSection';
import { KangurGameOperationSelectorQuickPracticeSection } from './KangurGameOperationSelectorQuickPracticeSection';
import { KangurGameOperationSelectorTrainingSection } from './KangurGameOperationSelectorTrainingSection';
import { KangurGameOperationSelectorProvider } from './KangurGameOperationSelectorContext';

export function KangurGameOperationSelectorWidget(): React.JSX.Element | null {
  const locale = useLocale();
  const isCoarsePointer = useKangurCoarsePointer();
  const normalizedLocale = normalizeSiteLocale(locale);
  const fallbackCopy = useMemo(
    () => getOperationSelectorFallbackCopy(normalizedLocale),
    [normalizedLocale]
  );
  const gamePageTranslations = useTranslations('KangurGamePage');
  const recommendationTranslations = useTranslations('KangurGameRecommendations');
  const trainingSetupTranslations = useTranslations('KangurGameRecommendations.trainingSetup');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
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
  const { subject, subjectKey } = useKangurSubjectFocus();
  const { ageGroup } = useKangurAgeGroupFocus();
  const subjectGroups = useMemo(() => getKangurSubjectGroups(locale), [locale]);
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
    () =>
      getCurrentKangurDailyQuest(normalizedProgress, {
        locale: normalizedLocale,
        ownerKey: subjectKey,
        subject,
        translate: runtimeTranslations,
      }),
    [normalizedLocale, normalizedProgress, runtimeTranslations, subject, subjectKey]
  );
  const recommendation = useMemo(
    () =>
      getOperationSelectorRecommendation(normalizedProgress, dailyQuest, fallbackCopy, {
        locale: normalizedLocale,
        translate: recommendationTranslations,
        progressTranslate: runtimeTranslations,
      }),
    [
      dailyQuest,
      fallbackCopy,
      normalizedLocale,
      normalizedProgress,
      recommendationTranslations,
      runtimeTranslations,
    ]
  );
  const suggestedTraining = useMemo(
    () =>
      getRecommendedTrainingSetup(normalizedProgress, {
        locale,
        translate: trainingSetupTranslations,
        progressTranslate: runtimeTranslations,
      }),
    [locale, normalizedProgress, runtimeTranslations, trainingSetupTranslations]
  );
  const operationSelectorTitle = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.title',
    fallbackCopy.operationSelectorTitle
  );
  const trainingSetupTitle = translateRecommendationWithFallback(
    gamePageTranslations,
    'screens.training.label',
    fallbackCopy.trainingSetupTitle
  );
  const trainingWordmarkLabel = translateRecommendationWithFallback(
    gamePageTranslations,
    'screens.training.wordmarkLabel',
    fallbackCopy.trainingSetupWordmarkLabel
  );
  const lessonsQuery = useKangurLessons({ subject, ageGroup, enabledOnly: true });
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

    const options = fallbackCopy.lessonQuizDefinitions.flatMap((definition) => {
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
  }, [fallbackCopy.lessonQuizDefinitions, lessonsQuery.data, subject]);
  const lessonQuizGroups = useMemo(
    () =>
      subjectGroups.map((group) => ({
        ...group,
        options: lessonQuizOptions.filter((option) => option.subject === group.value),
      })).filter((group) => group.options.length > 0),
    [lessonQuizOptions, subjectGroups]
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
    resolveKangurGameOperationMixedPracticeAssignment({
      activePracticeAssignment,
      practiceAssignmentsByOperation,
    });
  const operationPracticeAssignment =
    resolveKangurGameOperationPrimaryAssignment(activePracticeAssignment);
  const shouldRender = screen === 'operation' || screen === 'training';
  const showMathSections = subject === 'maths';
  const isSixYearOld = ageGroup === 'six_year_old';
  const compactActionClassName =
    resolveKangurGameOperationSelectorCompactActionClassName(isCoarsePointer);
  const gameIntroDescriptionLabel = resolveKangurGameOperationSelectorIntroLabel(
    subject,
    gamePageTranslations,
    fallbackCopy
  );
  const quickPracticeTitle = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.quickPractice.title',
    fallbackCopy.quickPractice.title
  );
  const quickPracticeDescription = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.quickPractice.description',
    fallbackCopy.quickPractice.description
  );
  const quickPracticeGameChipLabel = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.quickPractice.gameChip',
    fallbackCopy.quickPractice.gameChip
  );
  const gameIntroDescription = renderKangurGameOperationSelectorIntroDescription({
    gameIntroDescriptionLabel,
    isSixYearOld,
    subject,
  });

  useKangurGameOperationSelectorSubjectScreenSync({ screen, setScreen, subject });
  useKangurGameOperationSelectorTrainingScroll({ screen, trainingSectionRef });

  if (!shouldRender) {
    return null;
  }

  const handleRecommendationSelect = (): void =>
    handleKangurGameOperationRecommendationSelect({
      handleSelectOperation,
      recommendation,
      screen,
      setScreen,
      trainingSectionRef,
    });

  const contextValue = useMemo(
    () => ({
      basePath,
      fallbackCopy,
      gamePageTranslations,
      isSixYearOld,
      locale,
      mixedPracticeAssignment,
      normalizedProgress,
      quickPracticeDescription,
      quickPracticeGameChipLabel,
      quickPracticeTitle,
      recommendation,
      recommendedLessonQuizScreen,
      setScreen,
      showMathSections,
      suggestedTraining,
      trainingSetupTitle,
      trainingWordmarkLabel,
      compactActionClassName,
      handleHome,
      handleStartTraining,
      handleSelectOperation,
      handleRecommendationSelect,
      practiceAssignmentsByOperation,
    }),
    [
      basePath,
      fallbackCopy,
      gamePageTranslations,
      isSixYearOld,
      locale,
      mixedPracticeAssignment,
      normalizedProgress,
      quickPracticeDescription,
      quickPracticeGameChipLabel,
      quickPracticeTitle,
      recommendation,
      recommendedLessonQuizScreen,
      setScreen,
      showMathSections,
      suggestedTraining,
      trainingSetupTitle,
      trainingWordmarkLabel,
      compactActionClassName,
      handleHome,
      handleStartTraining,
      handleSelectOperation,
      handleRecommendationSelect,
      practiceAssignmentsByOperation,
    ]
  );

  return (
    <KangurGameOperationSelectorProvider value={contextValue}>
      <div className={`w-full flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <KangurPageIntroCard
          className='max-w-md'
          description={
            gameIntroDescription
          }
          headingSize='lg'
          onBack={handleHome}
          testId='kangur-game-operation-top-section'
          title={operationSelectorTitle}
          visualTitle={
            <KangurGrajmyWordmark
              className='mx-auto'
              data-testid='kangur-grajmy-heading-art'
              idPrefix='kangur-game-operation-heading'
              label={operationSelectorTitle}
              locale={locale}
            />
          }
        />
        <KangurGameOperationPracticeAssignmentBanner
          assignment={showMathSections ? operationPracticeAssignment : null}
          basePath={basePath}
          mode='queue'
        />
        <KangurGameOperationRecommendationCard />
        <KangurGameOperationSelectorOperationSection />
        <KangurGameOperationSelectorQuickPracticeSection
          filteredLessonQuizGroups={filteredLessonQuizGroups}
        />
        <KangurGameOperationSelectorTrainingSection
          trainingSectionRef={trainingSectionRef}
        />
      </div>
    </KangurGameOperationSelectorProvider>
  );
}
