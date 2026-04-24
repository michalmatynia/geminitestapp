import React from 'react';
import { KangurMobileAiTutorCard } from '../shared/KangurMobileUi';
import { PracticeCompletionCard, PracticePreparationCard } from './practice-sections';
import { PracticeQuestionDisplay } from './PracticeQuestionDisplay';
import { type PracticeData } from './practice-types';
import { type PracticePreparationCardProps } from './PracticePreparationCard';
import { type PracticeCompletionCardProps } from './PracticeCompletionCard';

interface PracticeScreenContentProps {
  data: PracticeData;
  actions: { handleNext: () => void };
  aiTutorContext: { contentId: string; surface: string };
  preparationCard: PracticePreparationCardProps | null;
  completionCard: PracticeCompletionCardProps | null;
}

export function PracticeScreenContent({
  data,
  actions,
  aiTutorContext,
  preparationCard,
  completionCard,
}: PracticeScreenContentProps): React.JSX.Element {
  const { currentQuestion, selectedChoice, isChoiceCorrect, currentIndex, questions, handleChoicePress } = data;

  return (
    <>
      <KangurMobileAiTutorCard context={aiTutorContext} />
      {preparationCard !== null ? <PracticePreparationCard {...preparationCard} /> : null}
      {completionCard !== null ? <PracticeCompletionCard {...completionCard} /> : null}
      {currentQuestion !== null && completionCard === null ? (
        <PracticeQuestionDisplay
          currentQuestion={currentQuestion}
          selectedChoice={selectedChoice}
          isChoiceCorrect={isChoiceCorrect}
          currentIndex={currentIndex}
          questionsLength={questions.length}
          locale={data.locale}
          handleChoicePress={handleChoicePress}
          onNext={actions.handleNext}
        />
      ) : null}
    </>
  );
}
