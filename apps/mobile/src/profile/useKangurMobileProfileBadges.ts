import {
  KANGUR_BADGES,
  getLocalizedKangurMetadataBadgeName,
} from '@kangur/core';
import { useMemo } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  useKangurMobileHomeBadges,
  type KangurMobileHomeBadgeItem,
} from '../home/useKangurMobileHomeBadges';

export type KangurMobileProfileBadgeItem = KangurMobileHomeBadgeItem;

export type KangurMobileProfileBadgeGridItem = {
  emoji: string;
  id: string;
  name: string;
  unlocked: boolean;
};

type UseKangurMobileProfileBadgesInput = {
  unlockedBadgeIds: string[];
};

type UseKangurMobileProfileBadgesResult = {
  allBadges: KangurMobileProfileBadgeGridItem[];
  recentBadges: KangurMobileProfileBadgeItem[];
  remainingBadges: number;
  totalBadges: number;
  unlockedBadges: number;
};

export const useKangurMobileProfileBadges = ({
  unlockedBadgeIds,
}: UseKangurMobileProfileBadgesInput): UseKangurMobileProfileBadgesResult => {
  const { locale } = useKangurMobileI18n();
  const badges = useKangurMobileHomeBadges();

  return useMemo(() => {
    const unlockedBadgeIdSet = new Set(unlockedBadgeIds);

    return {
      allBadges: KANGUR_BADGES.map((badge) => ({
        emoji: badge.emoji,
        id: badge.id,
        name: getLocalizedKangurMetadataBadgeName(badge.id, badge.name, locale),
        unlocked: unlockedBadgeIdSet.has(badge.id),
      })),
      recentBadges: badges.recentBadges,
      remainingBadges: badges.remainingBadges,
      totalBadges: badges.totalBadges,
      unlockedBadges: badges.unlockedBadges,
    };
  }, [badges, locale, unlockedBadgeIds]);
};
