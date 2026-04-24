import { useCallback } from 'react';
import { completeKangurPracticeSession, type KangurPracticeCompletionResult, type KangurPracticeOperation, type KangurPracticeQuestion } from '@kangur/core';
import type { KangurQuestionChoice } from '@kangur/contracts/kangur';

export interface UseKangurPracticeNavigationActions {
  handleNext: () => void;
}

export interface PracticeNavigationParams {
  questions: KangurPracticeQuestion[];
  currentIndex: number;
  selectedChoice: KangurQuestionChoice | null;
  correctAnswers: number;
  operation: KangurPracticeOperation;
  runId: number;
  progressStore: { loadProgress: () => unknown; saveProgress: (p: unknown) => void };
  setCorrectAnswers: (val: number | ((prev: number) => number)) => void;
  setCurrentIndex: (val: number | ((prev: number) => number)) => void;
  setSelectedChoice: (val: KangurQuestionChoice | null) => void;
  setCompletion: (val: KangurPracticeCompletionResult | null) => void;
  syncScoreRecord: (input: { correctAnswers: number, completedRunId: number, operation: KangurPracticeOperation, totalQuestions: number }) => Promise<void>;
}

export function useKangurPracticeNavigationActions(params: PracticeNavigationParams): UseKangurPracticeNavigationActions {
  const { 
    questions, currentIndex, selectedChoice, correctAnswers, operation, runId, progressStore,
    setCorrectAnswers, setCurrentIndex, setSelectedChoice, setCompletion, syncScoreRecord
  } = params;
  
  const handleNext = useCallback((): void => {
    const currentQuestion = questions[currentIndex];
    if (currentQuestion === undefined || selectedChoice === null) return;

    const isChoiceCorrect = String(selectedChoice) === String(currentQuestion.answer);
    const nextCorrectAnswers = isChoiceCorrect ? correctAnswers + 1 : correctAnswers;

    if (currentIndex >= questions.length - 1) {
      const result = completeKangurPracticeSession({
        progress: progressStore.loadProgress(),
        operation,
        correctAnswers: nextCorrectAnswers,
        totalQuestions: questions.length,
      });
      progressStore.saveProgress(result.updated);
      setCorrectAnswers(nextCorrectAnswers);
      setCompletion(result);
      setSelectedChoice(null);
      void syncScoreRecord({ correctAnswers: nextCorrectAnswers, completedRunId: runId, operation, totalQuestions: questions.length });
      return;
    }

    setCorrectAnswers(nextCorrectAnswers);
    setCurrentIndex((c: number) => c + 1);
    setSelectedChoice(null);
  }, [questions, currentIndex, selectedChoice, correctAnswers, runId, syncScoreRecord, setCorrectAnswers, setCurrentIndex, setSelectedChoice, setCompletion, operation, progressStore]);

  return { handleNext };
}
