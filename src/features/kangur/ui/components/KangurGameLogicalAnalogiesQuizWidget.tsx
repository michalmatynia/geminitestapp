'use client';

import { useTranslations } from 'next-intl';

import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import LogicalAnalogiesRelationGame from '@/features/kangur/ui/components/LogicalAnalogiesRelationGame';

export function KangurGameLogicalAnalogiesQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return (
    <KangurGameQuizStage
      accent='rose'
      icon='🔗'
      screen='logical_analogies_quiz'
      shellTestId='kangur-logical-analogies-quiz-top-section'
    >
      {({ handleHome }) => (
        <LogicalAnalogiesRelationGame
          finishLabel={translations('returnToGameHome')}
          onFinish={handleHome}
        />
      )}
    </KangurGameQuizStage>
  );
}
