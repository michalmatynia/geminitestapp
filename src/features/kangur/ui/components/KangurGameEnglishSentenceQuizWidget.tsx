'use client';

import { useTranslations } from 'next-intl';

import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import EnglishSentenceStructureGame from '@/features/kangur/ui/components/EnglishSentenceStructureGame';

export function KangurGameEnglishSentenceQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return renderKangurGameQuizStage({
    accent: 'violet',
    children: ({ handleHome }) => (
      <EnglishSentenceStructureGame
        finishLabel={translations('returnToGameHome')}
        onFinish={handleHome}
      />
    ),
    icon: '🧩',
    screen: 'english_sentence_quiz',
    shellTestId: 'kangur-english-sentence-quiz-top-section',
  });
}
