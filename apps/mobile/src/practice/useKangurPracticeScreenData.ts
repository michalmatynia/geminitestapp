import { useState, useMemo, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  generateKangurLogicPracticeQuestions,
  generateTrainingQuestions,
  getKangurPracticeOperationConfig,
  isKangurLogicPracticeOperation,
  resolveKangurPracticeOperation,
  type KangurPracticeCompletionResult,
  type KangurPracticeOperation,
  type KangurPracticeQuestion,
} from '@kangur/core';
import type { KangurQuestionChoice } from '@kangur/contracts/kangur';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { PRACTICE_QUESTION_COUNT } from './practice-utils';
import { type PracticeScoreSyncState } from './practiceScoreSyncState';
import { type PracticeData } from './practice-types';

export function useKangurPracticeScreenData(operationInput: string | null): PracticeData {
  const { copy, locale } = useKangurMobileI18n();
  const queryClient = useQueryClient();
  const { apiClient, progressStore } = useKangurMobileRuntime();
  const { session, isLoadingAuth } = useKangurMobileAuth();

  const operation = resolveKangurPracticeOperation(operationInput ?? '');
  const operationConfig = getKangurPracticeOperationConfig(operation, locale);
  
  const [runId, setRunId] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<KangurQuestionChoice | null>(null);
  const [completion, setCompletion] = useState<KangurPracticeCompletionResult | null>(null);
  const [scoreSyncState, setScoreSyncState] = useState<PracticeScoreSyncState | null>(null);
  const runStartedAt = useRef(Date.now());
  const latestRunIdRef = useRef(runId);

  const questions = useMemo<KangurPracticeQuestion[]>(() => {
    if (isKangurLogicPracticeOperation(operation)) {
      return generateKangurLogicPracticeQuestions(operation, PRACTICE_QUESTION_COUNT, locale);
    }
    return generateTrainingQuestions(operationConfig.categories as KangurPracticeOperation[], 'easy', PRACTICE_QUESTION_COUNT);
  }, [locale, operation, operationConfig.categories, runId]);

  const restart = useCallback((): void => {
    const nextRunId = latestRunIdRef.current + 1;
    latestRunIdRef.current = nextRunId;
    setRunId(nextRunId);
    setCurrentIndex(0);
    setCorrectAnswers(0);
    runStartedAt.current = Date.now();
    setSelectedChoice(null);
    setCompletion(null);
    setScoreSyncState(null);
  }, []);

  const handleChoicePress = useCallback((choice: KangurQuestionChoice): void => {
    setSelectedChoice(choice);
  }, []);

  const currentQuestion = questions[currentIndex] ?? null;
  const isChoiceCorrect = currentQuestion !== null && selectedChoice !== null && String(selectedChoice) === String(currentQuestion.answer);

  return {
    copy, locale, operation, operationConfig, questions,
    runId, currentIndex, setCurrentIndex,
    correctAnswers, setCorrectAnswers,
    runStartedAt, selectedChoice, setSelectedChoice,
    completion, 
    setCompletion, scoreSyncState, setScoreSyncState,
    restart, queryClient, apiClient, progressStore, session, isLoadingAuth,
    handleChoicePress, isChoiceCorrect, currentQuestion
  };
}
