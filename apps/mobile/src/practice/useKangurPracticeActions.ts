import { useCallback, useRef } from 'react';
import { completeKangurPracticeSession, type KangurPracticeOperation } from '@kangur/core';
import { resolvePracticePlayerName } from './practice-utils';
import { 
    buildAwaitingAuthRetryState, 
    buildLocalOnlySyncState, 
    buildSyncedState, 
    buildSyncingState, 
    buildUnexpectedSyncFailureState
} from './practiceScoreSyncState';
import { type PracticeData, type KangurPracticeActionsResult } from './practice-types';

export interface SyncInput {
  correctAnswers: number;
  completedRunId: number;
  operation: KangurPracticeOperation;
  totalQuestions: number;
}

async function executeScoreSync(
  input: SyncInput,
  data: PracticeData,
): Promise<void> {
  const { apiClient, locale, runStartedAt, session, queryClient } = data;
  const timeTakenSeconds = Math.max(0, Math.round((Date.now() - runStartedAt.current) / 1000));
  
  if (!session?.user) return;

  await apiClient.createScore({
    player_name: resolvePracticePlayerName({ user: session.user }, locale),
    score: input.correctAnswers,
    operation: input.operation,
    subject: 'maths',
    total_questions: input.totalQuestions,
    correct_answers: input.correctAnswers,
    time_taken: timeTakenSeconds,
  });
  
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['kangur-mobile', 'leaderboard'] }),
    queryClient.invalidateQueries({ queryKey: ['kangur-mobile', 'scores'] }),
  ]);
}

async function performSync(
  input: SyncInput,
  data: PracticeData,
  setPendingScoreSync: (val: SyncInput | null) => void,
): Promise<void> {
  const { locale, session, setScoreSyncState, isLoadingAuth } = data;

  if (session?.status !== 'authenticated') {
    if (isLoadingAuth) {
      setPendingScoreSync(input);
      setScoreSyncState(buildAwaitingAuthRetryState(locale));
    } else {
      setScoreSyncState(buildLocalOnlySyncState('auth', locale));
    }
    return;
  }

  setPendingScoreSync(null);
  setScoreSyncState(buildSyncingState(locale));

  try {
    await executeScoreSync(input, data);
    setScoreSyncState(buildSyncedState(locale));
  } catch (error) {
    const status = (error as { status?: number })?.status;
    const isExpectedError = status === 401 || status === 403 || error instanceof TypeError;
    setScoreSyncState(isExpectedError ? buildLocalOnlySyncState('expected-error', locale) : buildUnexpectedSyncFailureState(locale));
  }
}

export function useKangurPracticeActions(data: PracticeData): KangurPracticeActionsResult {
  const { 
    setCorrectAnswers, setCurrentIndex, setSelectedChoice, setCompletion, 
    runId, questions, operation, progressStore, correctAnswers, currentIndex, selectedChoice
  } = data;
  
  const pendingScoreSyncRef = useRef<SyncInput | null>(null);
  const setPendingScoreSync = (val: SyncInput | null): void => { pendingScoreSyncRef.current = val; };
  const syncScoreRecord = useCallback(async (input: SyncInput) => performSync(input, data, setPendingScoreSync), [data]);

  const handleNext = useCallback((): void => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion || selectedChoice === null) return;

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
    } else {
      setCorrectAnswers(nextCorrectAnswers);
      setCurrentIndex((c: number) => c + 1);
      setSelectedChoice(null);
    }
  }, [questions, currentIndex, selectedChoice, correctAnswers, runId, syncScoreRecord, setCorrectAnswers, setCurrentIndex, setSelectedChoice, setCompletion, operation, progressStore]);

  return { handleNext, syncScoreRecord };
}
