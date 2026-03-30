'use client';

import { useTranslations } from 'next-intl';

import { renderKangurGameQuizShell } from '@/features/kangur/ui/components/KangurGameQuizShell';
import EnglishPartsOfSpeechGame from '@/features/kangur/ui/components/EnglishPartsOfSpeechGame';

export function KangurGameEnglishPartsOfSpeechQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return renderKangurGameQuizShell({
    accent: 'sky',
    children: ({ handleHome }) => (
      <EnglishPartsOfSpeechGame
        finishLabel={translations('returnToGameHome')}
        onFinish={handleHome}
      />
    ),
    icon: '🎮',
    screen: 'english_parts_of_speech_quiz',
    shellTestId: 'kangur-english-parts-of-speech-quiz-top-section',
  });
}
