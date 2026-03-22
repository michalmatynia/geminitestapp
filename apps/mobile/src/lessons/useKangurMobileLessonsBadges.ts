import {
  useKangurMobileHomeBadges,
  type KangurMobileHomeBadgeItem,
} from '../home/useKangurMobileHomeBadges';

export type KangurMobileLessonsBadgeItem = KangurMobileHomeBadgeItem;

type UseKangurMobileLessonsBadgesResult = {
  recentBadges: KangurMobileLessonsBadgeItem[];
  remainingBadges: number;
  totalBadges: number;
  unlockedBadges: number;
};

export const useKangurMobileLessonsBadges =
  (): UseKangurMobileLessonsBadgesResult => {
    const badges = useKangurMobileHomeBadges();

    return {
      recentBadges: badges.recentBadges,
      remainingBadges: badges.remainingBadges,
      totalBadges: badges.totalBadges,
      unlockedBadges: badges.unlockedBadges,
    };
  };
