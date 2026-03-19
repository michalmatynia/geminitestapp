'use client';

import { useTranslations } from 'next-intl';

import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import LogicalClassificationGame from '@/features/kangur/ui/components/LogicalClassificationGame';

export function KangurGameLogicalClassificationQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return (
    <KangurGameQuizStage
      accent='teal'
      icon='📦'
      screen='logical_classification_quiz'
      shellTestId='kangur-logical-classification-quiz-top-section'
    >
      {({ handleHome }) => (
        <LogicalClassificationGame
          finishLabel={translations('returnToGameHome')}
          onFinish={handleHome}
        />
      )}
    </KangurGameQuizStage>
  );
}
