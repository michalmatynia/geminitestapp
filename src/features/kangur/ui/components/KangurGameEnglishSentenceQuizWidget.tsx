'use client';

import { useTranslations } from 'next-intl';

import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import EnglishSentenceStructureGame from '@/features/kangur/ui/components/EnglishSentenceStructureGame';

export function KangurGameEnglishSentenceQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return (
    <KangurGameQuizStage
      accent='violet'
      icon='🧩'
      screen='english_sentence_quiz'
      shellTestId='kangur-english-sentence-quiz-top-section'
    >
      {({ handleHome }) => (
        <EnglishSentenceStructureGame
          finishLabel={translations('returnToGameHome')}
          onFinish={handleHome}
        />
      )}
    </KangurGameQuizStage>
  );
}
