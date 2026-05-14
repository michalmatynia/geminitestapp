import { type KangurPracticeQuestion, type KangurPracticeOperation, type KangurPracticeCompletionResult } from '@kangur/core';
import type { QueryClient } from '@tanstack/react-query';
import type { KangurAuthSession } from '@kangur/platform';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import type { PracticeScoreSyncState } from './practiceScoreSyncState';
import type { KangurQuestionChoice } from '@kangur/contracts/kangur';
import type { KangurMobileRuntime } from '../providers/KangurRuntimeContext.shared';

export interface KangurPracticeActionsResult {
  handleNext: () => void;
  syncScoreRecord: (input: { correctAnswers: number; completedRunId: number; operation: KangurPracticeOperation; totalQuestions: number }) => Promise<void>;
}

export interface PracticeData extends KangurMobileRuntime {
  queryClient: QueryClient;
  runStartedAt: React.MutableRefObject<number>;
  session: KangurAuthSession;
  isLoadingAuth: boolean;
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
