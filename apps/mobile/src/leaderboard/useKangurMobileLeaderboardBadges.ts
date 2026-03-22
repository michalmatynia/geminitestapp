import {
  useKangurMobileHomeBadges,
  type KangurMobileHomeBadgeItem,
} from '../home/useKangurMobileHomeBadges';

export type KangurMobileLeaderboardBadgeItem = KangurMobileHomeBadgeItem;

type UseKangurMobileLeaderboardBadgesResult = {
  recentBadges: KangurMobileLeaderboardBadgeItem[];
  remainingBadges: number;
  totalBadges: number;
  unlockedBadges: number;
};

export const useKangurMobileLeaderboardBadges =
  (): UseKangurMobileLeaderboardBadgesResult => {
    const badges = useKangurMobileHomeBadges();

    return {
      recentBadges: badges.recentBadges,
      remainingBadges: badges.remainingBadges,
      totalBadges: badges.totalBadges,
      unlockedBadges: badges.unlockedBadges,
    };
  };
