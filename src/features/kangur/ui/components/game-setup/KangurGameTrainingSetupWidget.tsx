'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/assignments/KangurPracticeAssignmentBanner';
import { KangurTreningWordmark } from '@/features/kangur/ui/components/wordmarks/KangurTreningWordmark';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { getRecommendedTrainingSetup } from '@/features/kangur/ui/services/game-setup-recommendations';
import { translateRecommendationWithFallback } from '@/features/kangur/ui/services/recommendation-i18n';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import { renderKangurGameSetupShell } from './KangurGameSetupShell';
import { KangurTrainingSetupPanel } from './KangurTrainingSetupPanel';

const resolveTrainingSetupFallbackCopy = (
  normalizedLocale: ReturnType<typeof normalizeSiteLocale>
): {
  description: string;
  title: string;
  wordmarkLabel: string;
} => {
  switch (normalizedLocale) {
    case 'uk':
      return {
        title: 'Налаштування тренування',
        wordmarkLabel: 'Тренування',
        description: 'Налаштуйте змішане тренування й виберіть діапазон запитань.',
      };
    case 'de':
      return {
        title: 'Gemischtes Training',
        wordmarkLabel: 'Training',
        description: 'Wähle Niveau, Kategorien und die Anzahl der Fragen für eine Sitzung.',
      };
    case 'pl':
      return {
        title: 'Trening mieszany',
        wordmarkLabel: 'Trening',
        description: 'Dobierz poziom, kategorie i liczbe pytan do jednej sesji.',
      };
    default:
      return {
        title: 'Mixed training',
        wordmarkLabel: 'Training',
        description: 'Choose the level, categories, and number of questions for one session.',
      };
  }
};

const renderTrainingSetupAssignmentBanner = ({
  activePracticeAssignment,
  basePath,
}: {
  activePracticeAssignment: ReturnType<typeof useKangurGameRuntime>['activePracticeAssignment'];
  basePath: ReturnType<typeof useKangurGameRuntime>['basePath'];
}): React.JSX.Element | null => {
  if (!activePracticeAssignment) {
    return null;
  }

  return (
    <div className='flex w-full justify-center px-4'>
      <KangurPracticeAssignmentBanner
        assignment={activePracticeAssignment}
        basePath={basePath}
        mode='active'
      />
    </div>
  );
};

export function KangurGameTrainingSetupWidget(): React.JSX.Element | null {
  const locale = useLocale();
  const normalizedLocale = normalizeSiteLocale(locale);
  const gamePageTranslations = useTranslations('KangurGamePage');
  const recommendationTranslations = useTranslations('KangurGameRecommendations.trainingSetup');
  const { activePracticeAssignment, basePath, handleHome, handleStartTraining, progress, screen } =
    useKangurGameRuntime();
  const suggestedTraining = useMemo(
    () =>
      getRecommendedTrainingSetup(progress, {
        locale,
        translate: recommendationTranslations,
      }),
    [locale, progress, recommendationTranslations]
  );
  const fallbackCopy = resolveTrainingSetupFallbackCopy(normalizedLocale);
  const trainingSetupTitle = translateRecommendationWithFallback(
    gamePageTranslations,
    'screens.training.label',
    fallbackCopy.title
  );
  const trainingWordmarkLabel = translateRecommendationWithFallback(
    gamePageTranslations,
    'screens.training.wordmarkLabel',
    fallbackCopy.wordmarkLabel
  );

  if (screen !== 'training') {
    return null;
  }

  return renderKangurGameSetupShell({
    afterIntro: renderTrainingSetupAssignmentBanner({ activePracticeAssignment, basePath }),
    children: (
      <KangurTrainingSetupPanel
        onStart={(selection, options) => handleStartTraining(selection, options)}
        suggestedTraining={suggestedTraining}
      />
    ),
    description: translateRecommendationWithFallback(
      gamePageTranslations,
      'screens.training.description',
      fallbackCopy.description
    ),
    momentumMode: 'training',
    onBack: handleHome,
    progress,
    testId: 'kangur-game-training-top-section',
    title: trainingSetupTitle,
    visualTitle: (
      <KangurTreningWordmark
        className='mx-auto'
        data-testid='kangur-training-heading-art'
        idPrefix='kangur-game-training-heading'
        label={trainingWordmarkLabel}
        locale={locale}
      />
    ),
  });
}
