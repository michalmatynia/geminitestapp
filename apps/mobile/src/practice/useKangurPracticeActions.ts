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

export interface PracticeActionData {
  currentIndex: number;
  selectedChoice: KangurQuestionChoice | null;
  questions: KangurPracticeQuestion[];
  operation: KangurPracticeOperation;
  runId: number;
  correctAnswers: number;
  runStartedAt: React.MutableRefObject<number>;
  progressStore: { loadProgress: () => any; saveProgress: (p: any) => void };
  apiClient: { createScore: (data: any) => Promise<void> };
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

export function useKangurPracticeActions(data: PracticeActionData): { 
  handleNext: () => void; 
  syncScoreRecord: (input: SyncInput) => Promise<void> 
} {
  const { 
    setCorrectAnswers, setCurrentIndex, setSelectedChoice, setCompletion, 
    setScoreSyncState, runId, questions, operation, runStartedAt,
    progressStore, apiClient, queryClient, session, isLoadingAuth, locale, correctAnswers
  } = data;
  
  const pendingScoreSyncRef = useRef<SyncInput | null>(null);

  const syncScoreRecord = useCallback(async (input: SyncInput): Promise<void> => {
    if (session.status !== 'authenticated') {
      if (isLoadingAuth) {
        pendingScoreSyncRef.current = input;
        setScoreSyncState(buildAwaitingAuthRetryState(locale));
        return;
      }
      setScoreSyncState(buildLocalOnlySyncState('auth', locale));
      return;
    }

    pendingScoreSyncRef.current = null;
    setScoreSyncState(buildSyncingState(locale));

    const timeTakenSeconds = Math.max(0, Math.round((Date.now() - runStartedAt.current) / 1000));
    try {
      await apiClient.createScore({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403 || error instanceof TypeError) {
        setScoreSyncState(buildLocalOnlySyncState('expected-error', locale));
      } else {
        setScoreSyncState(buildUnexpectedSyncFailureState(locale));
      }
    }
  }, [apiClient, isLoadingAuth, locale, queryClient, session, setScoreSyncState, runStartedAt]);

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
