import {
  useKangurMobileHomeBadges,
  type KangurMobileHomeBadgeItem,
} from '../home/useKangurMobileHomeBadges';

export type KangurMobileDuelsBadgeItem = KangurMobileHomeBadgeItem;

type UseKangurMobileDuelsBadgesResult = {
  recentBadges: KangurMobileDuelsBadgeItem[];
  remainingBadges: number;
  totalBadges: number;
  unlockedBadges: number;
};

export const useKangurMobileDuelsBadges =
  (): UseKangurMobileDuelsBadgesResult => {
    const badges = useKangurMobileHomeBadges();

    return {
      recentBadges: badges.recentBadges,
      remainingBadges: badges.remainingBadges,
      totalBadges: badges.totalBadges,
      unlockedBadges: badges.unlockedBadges,
    };
  };
