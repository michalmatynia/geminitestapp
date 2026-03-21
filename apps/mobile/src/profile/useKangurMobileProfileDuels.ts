import {
  type UseKangurMobileLearnerDuelsSummaryResult,
  useKangurMobileLearnerDuelsSummary,
} from '../duels/useKangurMobileLearnerDuelsSummary';

const MOBILE_PROFILE_DUELS_LEADERBOARD_LIMIT = 6;
const MOBILE_PROFILE_DUELS_LEADERBOARD_LOOKBACK_DAYS = 14;
const MOBILE_PROFILE_DUELS_OPPONENTS_LIMIT = 3;

type UseKangurMobileProfileDuelsResult = UseKangurMobileLearnerDuelsSummaryResult;

export const useKangurMobileProfileDuels =
  (): UseKangurMobileProfileDuelsResult => {
    return useKangurMobileLearnerDuelsSummary({
      leaderboardLimit: MOBILE_PROFILE_DUELS_LEADERBOARD_LIMIT,
      leaderboardLookbackDays: MOBILE_PROFILE_DUELS_LEADERBOARD_LOOKBACK_DAYS,
      opponentsLimit: MOBILE_PROFILE_DUELS_OPPONENTS_LIMIT,
    });
  };
