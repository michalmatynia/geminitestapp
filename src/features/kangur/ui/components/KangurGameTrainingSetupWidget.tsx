'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { KangurGameSetupStage } from '@/features/kangur/ui/components/KangurGameSetupStage';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import { KangurTrainingSetupPanel } from '@/features/kangur/ui/components/KangurTrainingSetupPanel';
import { KangurTreningWordmark } from '@/features/kangur/ui/components/KangurTreningWordmark';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { getRecommendedTrainingSetup } from '@/features/kangur/ui/services/game-setup-recommendations';
import { translateRecommendationWithFallback } from '@/features/kangur/ui/services/recommendation-i18n';

export function KangurGameTrainingSetupWidget(): React.JSX.Element | null {
  const locale = useLocale();
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

  if (screen !== 'training') {
    return null;
  }

  return (
    <KangurGameSetupStage
      afterIntro={
        activePracticeAssignment ? (
          <div className='flex w-full justify-center px-4'>
            <KangurPracticeAssignmentBanner
              assignment={activePracticeAssignment}
              basePath={basePath}
              mode='active'
            />
          </div>
        ) : null
      }
      description={translateRecommendationWithFallback(
        gamePageTranslations,
        'screens.training.description',
        'Dobierz poziom, kategorie i liczbe pytan do jednej sesji.'
      )}
      momentumMode='training'
      onBack={handleHome}
      progress={progress}
      testId='kangur-game-training-top-section'
      title={translateRecommendationWithFallback(
        gamePageTranslations,
        'screens.training.label',
        'Trening mieszany'
      )}
      visualTitle={
        <KangurTreningWordmark
          className='mx-auto'
          data-testid='kangur-training-heading-art'
          idPrefix='kangur-game-training-heading'
        />
      }
    >
      <KangurTrainingSetupPanel
        onStart={(selection, options) => handleStartTraining(selection, options)}
        suggestedTraining={suggestedTraining}
      />
    </KangurGameSetupStage>
  );
}
