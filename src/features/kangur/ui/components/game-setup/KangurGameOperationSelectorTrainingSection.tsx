import React from 'react';
import { translateRecommendationWithFallback } from '@/features/kangur/ui/services/recommendation-i18n';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/lesson-library/KangurPageIntroCard';
import { KangurTreningWordmark } from '@/features/kangur/ui/components/wordmarks/KangurTreningWordmark';
import type { KangurGameOperationSelectorTrainingSectionProps } from './KangurGameOperationSelectorWidget.types';
import KangurGameSetupMomentumCard from './KangurGameSetupMomentumCard';
import { KangurTrainingSetupPanel } from './KangurTrainingSetupPanel';
import { KangurGameOperationPracticeAssignmentBanner } from './KangurGameOperationPracticeAssignmentBanner';

export function KangurGameOperationSelectorTrainingSection({
  basePath,
  fallbackCopy,
  gamePageTranslations,
  handleHome,
  handleStartTraining,
  locale,
  mixedPracticeAssignment,
  normalizedProgress,
  showMathSections,
  suggestedTraining,
  trainingSectionRef,
  trainingSetupTitle,
  trainingWordmarkLabel,
}: KangurGameOperationSelectorTrainingSectionProps): React.JSX.Element | null {
  if (!showMathSections) {
    return null;
  }

  return (
    <section
      aria-labelledby='kangur-game-training-heading'
      className='w-full max-w-3xl space-y-4'
      ref={trainingSectionRef}
    >
      <KangurPageIntroCard
        className='w-full'
        description={translateRecommendationWithFallback(
          gamePageTranslations,
          'screens.training.description',
          fallbackCopy.trainingSetupDescription
        )}
        headingAs='h3'
        headingSize='md'
        onBack={handleHome}
        showBackButton={false}
        testId='kangur-game-training-top-section'
        title={trainingSetupTitle}
        titleId='kangur-game-training-heading'
        visualTitle={
          <KangurTreningWordmark
            className='mx-auto'
            data-testid='kangur-training-heading-art'
            idPrefix='kangur-game-training-heading'
            label={trainingWordmarkLabel}
            locale={locale}
          />
        }
      />
      <KangurGameOperationPracticeAssignmentBanner
        assignment={mixedPracticeAssignment}
        basePath={basePath}
        mode='active'
      />
      <KangurGameSetupMomentumCard mode='training' progress={normalizedProgress} />
      <KangurTrainingSetupPanel
        onStart={(selection, options) => handleStartTraining(selection, options)}
        suggestedTraining={suggestedTraining}
      />
    </section>
  );
}
