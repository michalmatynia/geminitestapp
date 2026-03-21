import { useKangurMobileLearnerDuelsSummary } from '../duels/useKangurMobileLearnerDuelsSummary';

const MOBILE_LESSONS_DUELS_LEADERBOARD_LIMIT = 5;
const MOBILE_LESSONS_DUELS_LEADERBOARD_LOOKBACK_DAYS = 14;
const MOBILE_LESSONS_DUELS_OPPONENTS_LIMIT = 2;

export const useKangurMobileLessonsDuels = () =>
  useKangurMobileLearnerDuelsSummary({
    leaderboardLimit: MOBILE_LESSONS_DUELS_LEADERBOARD_LIMIT,
    leaderboardLookbackDays: MOBILE_LESSONS_DUELS_LEADERBOARD_LOOKBACK_DAYS,
    opponentsLimit: MOBILE_LESSONS_DUELS_OPPONENTS_LIMIT,
  });
