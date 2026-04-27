import { useCallback, useRef } from 'react';
import { completeKangurPracticeSession, type KangurPracticeCompletionResult, type KangurPracticeOperation, type KangurPracticeQuestion } from '@kangur/core';
import type { KangurQuestionChoice } from '@kangur/contracts/kangur';
import type { QueryClient } from '@tanstack/react-query';
import { resolvePracticePlayerName, type PracticePlayerSession } from './practice-utils';
import { 
    buildAwaitingAuthRetryState, 
    buildLocalOnlySyncState, 
    buildSyncedState, 
    buildSyncingState, 
    buildUnexpectedSyncFailureState, 
    type PracticeScoreSyncState 
} from './practiceScoreSyncState';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import type { KangurAuthSession } from '@kangur/platform';

export interface SyncInput {
  correctAnswers: number;
  completedRunId: number;
  operation: KangurPracticeOperation;
  totalQuestions: number;
}

export interface ProgressStore {
  loadProgress: () => unknown;
  saveProgress: (p: unknown) => void;
}

export interface ApiClient {
  createScore: (data: {
    player_name: string;
    score: number;
    operation: KangurPracticeOperation;
    subject: 'maths';
    total_questions: number;
    correct_answers: number;
    time_taken: number;
  }) => Promise<void>;
}

export interface PracticeActionData {
  currentIndex: number;
  selectedChoice: KangurQuestionChoice | null;
  questions: KangurPracticeQuestion[];
  operation: KangurPracticeOperation;
  runId: number;
  correctAnswers: number;
  runStartedAt: React.MutableRefObject<number>;
  progressStore: ProgressStore;
  apiClient: ApiClient;
  queryClient: QueryClient;
  session: KangurAuthSession;
  isLoadingAuth: boolean;
  locale: KangurMobileLocale;
  setCorrectAnswers: (val: number | ((prev: number) => number)) => void;
  setCurrentIndex: (val: number | ((prev: number) => number)) => void;
  setSelectedChoice: (val: KangurQuestionChoice | null) => void;
  setCompletion: (val: KangurPracticeCompletionResult | null) => void;
  setScoreSyncState: (val: PracticeScoreSyncState | null) => void;
}

interface KangurPracticeActionsResult {
  handleNext: () => void;
  syncScoreRecord: (input: SyncInput) => Promise<void>;
}

async function performSync(
  input: SyncInput,
  data: PracticeActionData,
  pendingScoreSync: { current: SyncInput | null }
): Promise<void> {
  const { 
    apiClient, session, isLoadingAuth, locale, runStartedAt,
    setScoreSyncState, queryClient 
  } = data;

  if (session.status !== 'authenticated') {
    if (isLoadingAuth) {
      const ref = pendingScoreSync;
      ref.current = input;
      setScoreSyncState(buildAwaitingAuthRetryState(locale));
      return;
    }
    setScoreSyncState(buildLocalOnlySyncState('auth', locale));
    return;
  }

  const ref = pendingScoreSync;
  ref.current = null;
  setScoreSyncState(buildSyncingState(locale));

  const timeTakenSeconds = Math.max(0, Math.round((Date.now() - runStartedAt.current) / 1000));
  try {
    await apiClient.createScore({
      player_name: resolvePracticePlayerName(session as unknown as PracticePlayerSession, locale),
      score: input.correctAnswers,
      operation: input.operation,
      subject: 'maths',
      total_questions: input.totalQuestions,
      correct_answers: input.correctAnswers,
      time_taken: timeTakenSeconds,
    });
    setScoreSyncState(buildSyncedState(locale));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['kangur-mobile', 'leaderboard'] }),
      queryClient.invalidateQueries({ queryKey: ['kangur-mobile', 'scores'] }),
    ]);
  } catch (error) {
    const err = error as { status?: number };
    const status = err.status;
    if (status === 401 || status === 403 || error instanceof TypeError) {
      setScoreSyncState(buildLocalOnlySyncState('expected-error', locale));
    } else {
      setScoreSyncState(buildUnexpectedSyncFailureState(locale));
    }
  }
}

export function useKangurPracticeActions(data: PracticeActionData): KangurPracticeActionsResult {
  const { 
    setCorrectAnswers, setCurrentIndex, setSelectedChoice, setCompletion, 
    runId, questions, operation, progressStore, correctAnswers
  } = data;
  
  const pendingScoreSync = useRef<SyncInput | null>(null);
  const syncScoreRecord = useCallback(async (input: SyncInput) => performSync(input, data, pendingScoreSync), [data]);

  const handleNext = useCallback((): void => {
    const currentQuestion = questions[data.currentIndex];
    if (currentQuestion === undefined || data.selectedChoice === null) return;

    const isChoiceCorrect = String(data.selectedChoice) === String(currentQuestion.answer);
    const nextCorrectAnswers = isChoiceCorrect ? correctAnswers + 1 : correctAnswers;

    if (data.currentIndex >= questions.length - 1) {
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
  }, [questions, data.currentIndex, data.selectedChoice, correctAnswers, runId, syncScoreRecord, setCorrectAnswers, setCurrentIndex, setSelectedChoice, setCompletion, operation, progressStore]);

  return { handleNext, syncScoreRecord };
}
