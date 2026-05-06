import { useCallback, useRef } from 'react';
import { completeKangurPracticeSession } from '@kangur/core';
import { resolvePracticePlayerName } from './practice-utils';
import { 
    buildAwaitingAuthRetryState, 
    buildLocalOnlySyncState, 
    buildSyncedState, 
    buildSyncingState, 
    buildUnexpectedSyncFailureState
} from './practiceScoreSyncState';
import { type PracticeActionData, type KangurPracticeActionsResult, type SyncInput } from './types';

async function performSync(
  input: SyncInput,
  data: PracticeActionData,
  pendingScoreSync: React.MutableRefObject<SyncInput | null>,
): Promise<void> {
  const { apiClient, locale, queryClient, runStartedAt, session, setScoreSyncState, isLoadingAuth } = data;

  if (session.status !== 'authenticated') {
    if (isLoadingAuth) {
      pendingScoreSync.current = input;
      setScoreSyncState(buildAwaitingAuthRetryState(locale));
      return;
    }
    setScoreSyncState(buildLocalOnlySyncState('auth', locale));
    return;
  }

  pendingScoreSync.current = null;
  setScoreSyncState(buildSyncingState(locale));

  const timeTakenSeconds = Math.max(0, Math.round((Date.now() - runStartedAt.current) / 1000));
  try {
    await apiClient.createScore({
      player_name: resolvePracticePlayerName({ user: session.user }, locale),
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
  } catch (error: unknown) {
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
  }, [questions, data, correctAnswers, runId, syncScoreRecord, setCorrectAnswers, setCurrentIndex, setSelectedChoice, setCompletion, operation, progressStore]);

  return { handleNext, syncScoreRecord };
}
