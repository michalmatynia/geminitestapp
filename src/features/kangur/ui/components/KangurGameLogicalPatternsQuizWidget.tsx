'use client';

import { useTranslations } from 'next-intl';

import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import LogicalPatternsWorkshopGame from '@/features/kangur/ui/components/LogicalPatternsWorkshopGame';

export function KangurGameLogicalPatternsQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return (
    <KangurGameQuizStage
      accent='violet'
      icon='🔢'
      screen='logical_patterns_quiz'
      shellTestId='kangur-logical-patterns-quiz-top-section'
    >
      {({ handleHome }) => (
        <LogicalPatternsWorkshopGame
          finishLabel={translations('returnToGameHome')}
          onFinish={handleHome}
        />
      )}
    </KangurGameQuizStage>
  );
}
