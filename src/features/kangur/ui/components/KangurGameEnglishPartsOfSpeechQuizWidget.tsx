'use client';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import EnglishPartsOfSpeechGame from '@/features/kangur/ui/components/EnglishPartsOfSpeechGame';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameEnglishPartsOfSpeechQuizWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'english_parts_of_speech_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='sky'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Przeciągnij słowa do odpowiednich części mowy.'
      icon='🎮'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-english-parts-of-speech-quiz-top-section'
      title='Quiz: Parts of Speech'
    >
      <EnglishPartsOfSpeechGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
    </LessonActivityStage>
  );
}
