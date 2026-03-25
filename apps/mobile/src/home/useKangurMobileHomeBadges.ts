import {
  KANGUR_BADGES,
  getLocalizedKangurMetadataBadgeName,
} from '@kangur/core';
import { useMemo } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileHomeProgressSnapshot } from './KangurMobileHomeProgressSnapshotContext';

export type KangurMobileHomeBadgeItem = {
  emoji: string;
  id: string;
  name: string;
};

type UseKangurMobileHomeBadgesResult = {
  recentBadges: KangurMobileHomeBadgeItem[];
  remainingBadges: number;
  totalBadges: number;
  unlockedBadges: number;
};

const HOME_BADGE_RECENT_LIMIT = 3;
const badgeById = new Map(KANGUR_BADGES.map((badge) => [badge.id, badge]));

export const useKangurMobileHomeBadges =
  (): UseKangurMobileHomeBadgesResult => {
    const { locale } = useKangurMobileI18n();
    const progress = useKangurMobileHomeProgressSnapshot();

    return useMemo(() => {
      const unlockedBadgeIds = Array.from(
        new Set(progress.badges.filter((badgeId) => badgeById.has(badgeId))),
      );
      const recentBadges = unlockedBadgeIds
        .slice(-HOME_BADGE_RECENT_LIMIT)
        .reverse()
        .map((badgeId) => {
          const badge = badgeById.get(badgeId);

          if (!badge) {
            return null;
          }

          return {
            emoji: badge.emoji,
            id: badge.id,
            name: getLocalizedKangurMetadataBadgeName(
              badge.id,
              badge.name,
              locale,
            ),
          };
        })
        .filter((badge): badge is KangurMobileHomeBadgeItem => badge !== null);
      const totalBadges = KANGUR_BADGES.length;
      const unlockedBadges = unlockedBadgeIds.length;

      return {
        recentBadges,
        remainingBadges: Math.max(0, totalBadges - unlockedBadges),
        totalBadges,
        unlockedBadges,
      };
    }, [locale, progress]);
  };
