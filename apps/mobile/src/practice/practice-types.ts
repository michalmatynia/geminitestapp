import type { KangurPracticeQuestion, KangurPracticeOperation, KangurPracticeCompletionResult } from '@kangur/core';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import type { PracticeScoreSyncState } from './practiceScoreSyncState';
import type { KangurQuestionChoice } from '@kangur/contracts/kangur';

export interface PracticeData {
  copy: (value: Record<string, string>) => string;
  locale: KangurMobileLocale;
  operation: KangurPracticeOperation;
  operationConfig: { label: string; kind: string; categories: string[] };
  questions: KangurPracticeQuestion[];
  runId: number;
  currentIndex: number;
  setCurrentIndex: (val: number | ((prev: number) => number)) => void;
  correctAnswers: number;
  setCorrectAnswers: (val: number | ((prev: number) => number)) => void;
  selectedChoice: KangurQuestionChoice | null;
  setSelectedChoice: (val: KangurQuestionChoice | null) => void;
  completion: KangurPracticeCompletionResult | null;
  setCompletion: (val: KangurPracticeCompletionResult | null) => void;
  scoreSyncState: PracticeScoreSyncState | null;
  setScoreSyncState: (val: PracticeScoreSyncState | null) => void;
  handleChoicePress: (choice: KangurQuestionChoice) => void;
  isChoiceCorrect: boolean;
  currentQuestion: KangurPracticeQuestion | null;
}
