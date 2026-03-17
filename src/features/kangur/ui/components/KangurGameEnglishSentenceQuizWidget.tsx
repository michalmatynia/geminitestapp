'use client';

import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import EnglishSentenceStructureGame from '@/features/kangur/ui/components/EnglishSentenceStructureGame';

export function KangurGameEnglishSentenceQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='violet'
      description='Ćwicz szyk zdania, pytania i spójniki w krótkich rundach.'
      icon='🧩'
      screen='english_sentence_quiz'
      shellTestId='kangur-english-sentence-quiz-top-section'
      title='Quiz składni zdania'
    >
      {({ handleHome }) => (
        <EnglishSentenceStructureGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
      )}
    </KangurGameQuizStage>
  );
}
