import type { Href } from 'expo-router';
import type { KangurDuelLeaderboardEntry, KangurDuelOpponentEntry } from '@kangur/contracts/kangur-duels';

export type UseKangurMobileLearnerDuelsSummaryResult = {
  actionError: string | null;
  createRematch: (opponentLearnerId: string) => Promise<string | null>;
  currentEntry: KangurDuelLeaderboardEntry | null;
  currentRank: number | null;
  error: string | null;
  isActionPending: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  opponents: KangurDuelOpponentEntry[];
  pendingOpponentLearnerId: string | null;
  refresh: () => Promise<void>;
};

export type SummaryIdentity = {
  learnerIdentity: string;
  activeLearnerId: string | null;
};
