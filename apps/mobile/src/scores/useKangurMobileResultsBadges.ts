import {
  useKangurMobileHomeBadges,
  type KangurMobileHomeBadgeItem,
} from '../home/useKangurMobileHomeBadges';

export type KangurMobileResultsBadgeItem = KangurMobileHomeBadgeItem;

type UseKangurMobileResultsBadgesResult = {
  recentBadges: KangurMobileResultsBadgeItem[];
  remainingBadges: number;
  totalBadges: number;
  unlockedBadges: number;
};

export const useKangurMobileResultsBadges =
  (): UseKangurMobileResultsBadgesResult => {
    const badges = useKangurMobileHomeBadges();

    return {
      recentBadges: badges.recentBadges,
      remainingBadges: badges.remainingBadges,
      totalBadges: badges.totalBadges,
      unlockedBadges: badges.unlockedBadges,
    };
  };
