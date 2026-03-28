'use client';

import { useTranslations } from 'next-intl';

import { renderKangurGameQuizShell } from '@/features/kangur/ui/components/KangurGameQuizShell';
import EnglishSentenceStructureGame from '@/features/kangur/ui/components/EnglishSentenceStructureGame';

export function KangurGameEnglishSentenceQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return renderKangurGameQuizShell({
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
