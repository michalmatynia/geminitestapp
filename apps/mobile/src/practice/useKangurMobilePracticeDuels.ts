import { useKangurMobileLearnerDuelsSummary } from '../duels/useKangurMobileLearnerDuelsSummary';

const MOBILE_PRACTICE_DUELS_LEADERBOARD_LIMIT = 5;
const MOBILE_PRACTICE_DUELS_LEADERBOARD_LOOKBACK_DAYS = 14;
const MOBILE_PRACTICE_DUELS_OPPONENTS_LIMIT = 2;

export const useKangurMobilePracticeDuels = () =>
  useKangurMobileLearnerDuelsSummary({
    leaderboardLimit: MOBILE_PRACTICE_DUELS_LEADERBOARD_LIMIT,
    leaderboardLookbackDays: MOBILE_PRACTICE_DUELS_LEADERBOARD_LOOKBACK_DAYS,
    opponentsLimit: MOBILE_PRACTICE_DUELS_OPPONENTS_LIMIT,
  });
