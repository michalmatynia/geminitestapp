'use client';

import React, { useEffect, type ReactNode } from 'react';
import { translateRecommendationWithFallback } from '@/features/kangur/ui/services/recommendation-i18n';
import { getKangurSixYearOldSubjectVisual } from '@/features/kangur/ui/constants/six-year-old-visuals';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import type { getOperationSelectorFallbackCopy } from './KangurGameOperationSelectorWidget.copy';
import type {
  KangurGameOperationSelectorAssignment,
  KangurGameOperationSelectorRuntime,
  KangurGameOperationSelectorScreen,
  KangurGameOperationSelectorSubject,
  KangurGameOperationSelectorTranslations,
  KangurOperationSelectorRecommendation,
  KangurGameOperationSelectorQuizGroup,
} from './KangurGameOperationSelectorWidget.types';

export const resolveKangurGameOperationMixedPracticeAssignment = ({
  activePracticeAssignment,
  practiceAssignmentsByOperation,
}: {
  activePracticeAssignment: KangurGameOperationSelectorAssignment;
  practiceAssignmentsByOperation: KangurGameOperationSelectorRuntime['practiceAssignmentsByOperation'];
}): KangurGameOperationSelectorAssignment =>
  practiceAssignmentsByOperation.mixed ??
  (activePracticeAssignment?.target.operation === 'mixed' ? activePracticeAssignment : null);

export const resolveKangurGameOperationPrimaryAssignment = (
  activePracticeAssignment: KangurGameOperationSelectorAssignment
): KangurGameOperationSelectorAssignment =>
  activePracticeAssignment && activePracticeAssignment.target.operation !== 'mixed'
    ? activePracticeAssignment
    : null;

export function useKangurGameOperationSelectorSubjectScreenSync({
  screen,
  setScreen,
  subject,
}: {
  screen: KangurGameOperationSelectorScreen;
  setScreen: KangurGameOperationSelectorRuntime['setScreen'];
  subject: KangurGameOperationSelectorSubject;
}): void {
  useEffect(() => {
    if (subject === 'maths') {
      return;
    }

    if (screen === 'training') {
      setScreen('operation');
    }
  }, [screen, setScreen, subject]);
}

export function useKangurGameOperationSelectorTrainingScroll({
  screen,
  trainingSectionRef,
}: {
  screen: KangurGameOperationSelectorScreen;
  trainingSectionRef: React.RefObject<HTMLElement | null>;
}): void {
  useEffect(() => {
    if (screen !== 'training') {
      return;
    }

    trainingSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [screen, trainingSectionRef]);
}

export const resolveKangurGameOperationSelectorCompactActionClassName = (
  isCoarsePointer: boolean
): string =>
  isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full shrink-0 sm:w-auto';

export const resolveKangurGameOperationSelectorIntroLabel = (
  subject: KangurGameOperationSelectorSubject,
  gamePageTranslations: KangurGameOperationSelectorTranslations,
  fallbackCopy: ReturnType<typeof getOperationSelectorFallbackCopy>
): string => {
  if (subject === 'maths') {
    return translateRecommendationWithFallback(
      gamePageTranslations,
      'operationSelector.intro.maths',
      fallbackCopy.intro.maths
    );
  }

  if (subject === 'alphabet') {
    return translateRecommendationWithFallback(
      gamePageTranslations,
      'operationSelector.intro.alphabet',
      fallbackCopy.intro.alphabet
    );
  }

  if (subject === 'art') {
    return translateRecommendationWithFallback(
      gamePageTranslations,
      'operationSelector.intro.art',
      fallbackCopy.intro.art
    );
  }

  if (subject === 'music') {
    return translateRecommendationWithFallback(
      gamePageTranslations,
      'operationSelector.intro.music',
      fallbackCopy.intro.music
    );
  }

  if (subject === 'geometry') {
    return translateRecommendationWithFallback(
      gamePageTranslations,
      'operationSelector.intro.geometry',
      fallbackCopy.intro.geometry
    );
  }

  return translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.intro.language',
    fallbackCopy.intro.language
  );
};

export const renderKangurGameOperationSelectorIntroDescription = ({
  gameIntroDescriptionLabel,
  isSixYearOld,
  subject,
}: {
  gameIntroDescriptionLabel: string;
  isSixYearOld: boolean;
  subject: KangurGameOperationSelectorSubject;
}): React.JSX.Element | string => {
  if (!isSixYearOld) {
    return gameIntroDescriptionLabel;
  }

  const subjectVisual = getKangurSixYearOldSubjectVisual(subject);

  return (
    <KangurVisualCueContent
      className='text-lg'
      detail={
        <span className='inline-flex items-center gap-1.5 text-lg'>
          {subjectVisual.introSteps.map((stepIcon, index) => (
            <span key={`six-year-old-intro-step-${subject}-${index}`}>{stepIcon}</span>
          ))}
        </span>
      }
      detailTestId='kangur-game-operation-intro-detail'
      icon={subjectVisual.icon}
      iconClassName='text-xl'
      iconTestId='kangur-game-operation-intro-icon'
      label={gameIntroDescriptionLabel}
    />
  );
};

export const renderKangurGameOperationSelectorQuickPracticeDescription = ({
  isSixYearOld,
  quickPracticeDescription,
}: {
  isSixYearOld: boolean;
  quickPracticeDescription: string;
}): React.JSX.Element | string =>
  isSixYearOld ? (
    <KangurVisualCueContent
      detail={
        <span className='inline-flex items-center gap-1.5 text-lg'>
          <span>🎮</span>
          <span>⚡</span>
          <span>🎯</span>
        </span>
      }
      detailTestId='kangur-quick-practice-description-detail'
      icon='👆'
      iconClassName='text-xl'
      iconTestId='kangur-quick-practice-description-icon'
      label={quickPracticeDescription}
    />
  ) : (
    quickPracticeDescription
  );

export const renderKangurGameOperationSelectorQuickPracticeTitle = ({
  isSixYearOld,
  quickPracticeTitle,
}: {
  isSixYearOld: boolean;
  quickPracticeTitle: string;
}): React.JSX.Element | string =>
  isSixYearOld ? (
    <KangurVisualCueContent
      detail='🎮'
      detailClassName='text-lg'
      detailTestId='kangur-quick-practice-heading-detail'
      icon='⚡'
      iconClassName='text-xl'
      iconTestId='kangur-quick-practice-heading-icon'
      label={quickPracticeTitle}
    />
  ) : (
    quickPracticeTitle
  );

export const renderKangurGameOperationSelectorQuickPracticeGroupLabel = ({
  group,
  isSixYearOld,
}: {
  group: KangurGameOperationSelectorQuizGroup;
  isSixYearOld: boolean;
}): React.JSX.Element | string =>
  isSixYearOld ? (
    <KangurVisualCueContent
      detail={getKangurSixYearOldSubjectVisual(group.value).detail}
      detailClassName='text-base'
      detailTestId={`kangur-quick-practice-group-detail-${group.value}`}
      icon={getKangurSixYearOldSubjectVisual(group.value).icon}
      iconClassName='text-lg'
      iconTestId={`kangur-quick-practice-group-icon-${group.value}`}
      label={group.label}
    />
  ) : (
    group.label
  );

export const renderKangurGameOperationSelectorGameChipLabel = ({
  isSixYearOld,
  optionScreen,
  quickPracticeGameChipLabel,
}: {
  isSixYearOld: boolean;
  optionScreen: string;
  quickPracticeGameChipLabel: string;
}): ReactNode =>
  isSixYearOld ? (
    <KangurVisualCueContent
      icon='🎮'
      iconClassName='text-base'
      iconTestId={`kangur-quick-practice-game-chip-icon-${optionScreen}`}
      label={quickPracticeGameChipLabel}
    />
  ) : (
    quickPracticeGameChipLabel
  );

export const renderKangurGameOperationSelectorRecommendationChipLabel = ({
  isSixYearOld,
  optionScreen,
  recommendationLabel,
}: {
  isSixYearOld: boolean;
  optionScreen: string;
  recommendationLabel: string;
}): ReactNode =>
  isSixYearOld ? (
    <KangurVisualCueContent
      icon='🎯'
      iconClassName='text-base'
      iconTestId={`kangur-quick-practice-recommendation-icon-${optionScreen}`}
      label={recommendationLabel}
    />
  ) : (
    recommendationLabel
  );

export const handleKangurGameOperationRecommendationSelect = ({
  handleSelectOperation,
  recommendation,
  screen,
  setScreen,
  trainingSectionRef,
}: {
  handleSelectOperation: KangurGameOperationSelectorRuntime['handleSelectOperation'];
  recommendation: KangurOperationSelectorRecommendation | null;
  screen: KangurGameOperationSelectorScreen;
  setScreen: KangurGameOperationSelectorRuntime['setScreen'];
  trainingSectionRef: React.RefObject<HTMLElement | null>;
}): void => {
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
