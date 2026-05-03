import { useCallback, useRef } from 'react';
import type { QueryClient } from '@tanstack/react-query';
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
import { resolvePracticePlayerName, type PracticePlayerSession } from './practice-utils';
import type { KangurPracticeOperation } from '@kangur/core';

export interface SyncInput {
  correctAnswers: number;
  completedRunId: number;
  operation: KangurPracticeOperation;
  totalQuestions: number;
}

export interface ApiClient {
  createScore: (data: {
    player_name: string;
    score: number;
    operation: string;
    subject: string;
    total_questions: number;
    correct_answers: number;
    time_taken: number;
  }) => Promise<void>;
}

export interface SyncScoreParams {
  apiClient: ApiClient;
  queryClient: QueryClient;
  session: KangurAuthSession;
  locale: KangurMobileLocale;
  runStartedAt: React.MutableRefObject<number>;
  setScoreSyncState: (val: PracticeScoreSyncState | null) => void;
  isLoadingAuth: boolean;
}

export function useSyncScoreRecord(params: SyncScoreParams): (input: SyncInput) => Promise<void> {
  const { apiClient, queryClient, session, locale, runStartedAt, setScoreSyncState, isLoadingAuth } = params;
  const pendingScoreSyncRef = useRef<SyncInput | null>(null);

  return useCallback(async (input: SyncInput): Promise<void> => {
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
}
