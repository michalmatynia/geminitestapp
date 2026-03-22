import {
  useKangurMobileHomeBadges,
  type KangurMobileHomeBadgeItem,
} from '../home/useKangurMobileHomeBadges';

export type KangurMobileDailyPlanBadgeItem = KangurMobileHomeBadgeItem;

type UseKangurMobileDailyPlanBadgesResult = {
  recentBadges: KangurMobileDailyPlanBadgeItem[];
  remainingBadges: number;
  totalBadges: number;
  unlockedBadges: number;
};

export const useKangurMobileDailyPlanBadges =
  (): UseKangurMobileDailyPlanBadgesResult => {
    const badges = useKangurMobileHomeBadges();

    return {
      recentBadges: badges.recentBadges,
      remainingBadges: badges.remainingBadges,
      totalBadges: badges.totalBadges,
      unlockedBadges: badges.unlockedBadges,
    };
  };
