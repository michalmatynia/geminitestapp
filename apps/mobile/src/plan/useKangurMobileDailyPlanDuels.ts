import { useKangurMobileLearnerDuelsSummary } from '../duels/useKangurMobileLearnerDuelsSummary';

const MOBILE_DAILY_PLAN_DUELS_LEADERBOARD_LIMIT = 5;
const MOBILE_DAILY_PLAN_DUELS_LEADERBOARD_LOOKBACK_DAYS = 14;
const MOBILE_DAILY_PLAN_DUELS_OPPONENTS_LIMIT = 2;

export const useKangurMobileDailyPlanDuels = () =>
  useKangurMobileLearnerDuelsSummary({
    leaderboardLimit: MOBILE_DAILY_PLAN_DUELS_LEADERBOARD_LIMIT,
    leaderboardLookbackDays: MOBILE_DAILY_PLAN_DUELS_LEADERBOARD_LOOKBACK_DAYS,
    opponentsLimit: MOBILE_DAILY_PLAN_DUELS_OPPONENTS_LIMIT,
  });
