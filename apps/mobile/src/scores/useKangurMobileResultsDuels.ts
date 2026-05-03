import { useKangurMobileLearnerDuelsSummary, type UseKangurMobileLearnerDuelsSummaryResult } from '../duels/useKangurMobileLearnerDuelsSummary';

const MOBILE_RESULTS_DUELS_LEADERBOARD_LIMIT = 6;
const MOBILE_RESULTS_DUELS_LEADERBOARD_LOOKBACK_DAYS = 14;
const MOBILE_RESULTS_DUELS_OPPONENTS_LIMIT = 3;

export const useKangurMobileResultsDuels = (): UseKangurMobileLearnerDuelsSummaryResult =>
  useKangurMobileLearnerDuelsSummary({
    leaderboardLimit: MOBILE_RESULTS_DUELS_LEADERBOARD_LIMIT,
    leaderboardLookbackDays: MOBILE_RESULTS_DUELS_LEADERBOARD_LOOKBACK_DAYS,
    opponentsLimit: MOBILE_RESULTS_DUELS_OPPONENTS_LIMIT,
  });
