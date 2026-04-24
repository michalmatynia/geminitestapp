import type { KangurQuestionChoice, KangurPracticeQuestion } from '@kangur/core';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';

export interface QuestionDisplayProps {
  currentQuestion: KangurPracticeQuestion;
  selectedChoice: KangurQuestionChoice | null;
  isChoiceCorrect: boolean;
  currentIndex: number;
  questionsLength: number;
  locale: KangurMobileLocale;
  handleChoicePress: (choice: KangurQuestionChoice) => void;
  onNext: () => void;
}
