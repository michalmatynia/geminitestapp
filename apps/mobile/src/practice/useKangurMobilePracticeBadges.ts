import {
  useKangurMobileHomeBadges,
  type KangurMobileHomeBadgeItem,
} from '../home/useKangurMobileHomeBadges';

export type KangurMobilePracticeBadgeItem = KangurMobileHomeBadgeItem;

type UseKangurMobilePracticeBadgesResult = {
  recentBadges: KangurMobilePracticeBadgeItem[];
  remainingBadges: number;
  totalBadges: number;
  unlockedBadges: number;
};

export const useKangurMobilePracticeBadges =
  (): UseKangurMobilePracticeBadgesResult => {
    const badges = useKangurMobileHomeBadges();

    return {
      recentBadges: badges.recentBadges,
      remainingBadges: badges.remainingBadges,
      totalBadges: badges.totalBadges,
      unlockedBadges: badges.unlockedBadges,
    };
  };
