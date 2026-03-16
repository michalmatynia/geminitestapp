'use client';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import EnglishSentenceStructureGame from '@/features/kangur/ui/components/EnglishSentenceStructureGame';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameEnglishSentenceQuizWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'english_sentence_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='violet'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Ćwicz szyk zdania, pytania i spójniki w krótkich rundach.'
      icon='🧩'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-english-sentence-quiz-top-section'
      title='Quiz składni zdania'
    >
      <EnglishSentenceStructureGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
    </LessonActivityStage>
  );
}
