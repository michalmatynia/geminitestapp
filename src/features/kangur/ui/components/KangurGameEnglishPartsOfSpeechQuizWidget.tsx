'use client';

import { useTranslations } from 'next-intl';

import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import EnglishPartsOfSpeechGame from '@/features/kangur/ui/components/EnglishPartsOfSpeechGame';

export function KangurGameEnglishPartsOfSpeechQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return (
    <KangurGameQuizStage
      accent='sky'
      icon='🎮'
      screen='english_parts_of_speech_quiz'
      shellTestId='kangur-english-parts-of-speech-quiz-top-section'
    >
      {({ handleHome }) => (
        <EnglishPartsOfSpeechGame
          finishLabel={translations('returnToGameHome')}
          onFinish={handleHome}
        />
      )}
    </KangurGameQuizStage>
  );
}
