'use client';

import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import EnglishPartsOfSpeechGame from '@/features/kangur/ui/components/EnglishPartsOfSpeechGame';

export function KangurGameEnglishPartsOfSpeechQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='sky'
      description='Przeciągnij słowa do odpowiednich części mowy.'
      icon='🎮'
      screen='english_parts_of_speech_quiz'
      shellTestId='kangur-english-parts-of-speech-quiz-top-section'
      title='Quiz: Parts of Speech'
    >
      {({ handleHome }) => (
        <EnglishPartsOfSpeechGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
      )}
    </KangurGameQuizStage>
  );
}
