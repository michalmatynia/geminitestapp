import {
  BADGE_TRACK_META,
  getProgressBadgeTrackSummaries as getCoreProgressBadgeTrackSummaries,
  getProgressBadges as getCoreProgressBadges,
  getVisibleProgressBadges as getCoreVisibleProgressBadges,
  type KangurBadgeStatus,
  type KangurBadgeTrackOptions,
  type KangurBadgeTrackSummary,
  type KangurVisibleBadgeOptions,
} from '@kangur/core';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import {
  getLocalizedKangurBadgeDescription,
  getLocalizedKangurBadgeName,
  getLocalizedKangurBadgeSummary,
  getLocalizedKangurBadgeTrackLabel,
  type KangurProgressLocalizer,
} from './progress-i18n';

export {
  BADGES,
  clampPercent,
  getAverageAccuracyPercent,
  getBadgeProgress,
  getMasteredLessonCount,
} from '@kangur/core';

const localizeBadgeStatus = (
  badge: KangurBadgeStatus,
  localizer?: KangurProgressLocalizer,
): KangurBadgeStatus => ({
  ...badge,
  name: getLocalizedKangurBadgeName({
    badgeId: badge.id,
    fallback: badge.name,
    translate: localizer?.translate,
  }),
  desc: getLocalizedKangurBadgeDescription({
    badgeId: badge.id,
    fallback: badge.desc,
    translate: localizer?.translate,
  }),
  summary: getLocalizedKangurBadgeSummary({
    badgeId: badge.id,
    current: badge.current,
    target: badge.target,
    fallback: badge.summary,
    translate: localizer?.translate,
  }),
});

export const getProgressBadges = (
  progress: KangurProgressState,
  localizer?: KangurProgressLocalizer,
): KangurBadgeStatus[] =>
  getCoreProgressBadges(progress).map((badge) => localizeBadgeStatus(badge, localizer));

export const getVisibleProgressBadges = (
  progress: KangurProgressState,
  options: KangurVisibleBadgeOptions = {},
  localizer?: KangurProgressLocalizer,
): KangurBadgeStatus[] =>
  getCoreVisibleProgressBadges(progress, options).map((badge) =>
    localizeBadgeStatus(badge, localizer),
  );

export const getProgressBadgeTrackSummaries = (
  progress: KangurProgressState,
  options: KangurBadgeTrackOptions = {},
  localizer?: KangurProgressLocalizer,
): KangurBadgeTrackSummary[] =>
  getCoreProgressBadgeTrackSummaries(progress, options).map((track) => ({
    ...track,
    label: getLocalizedKangurBadgeTrackLabel({
      key: track.key,
      fallback: BADGE_TRACK_META[track.key].label,
      translate: localizer?.translate,
    }),
    nextBadge: track.nextBadge ? localizeBadgeStatus(track.nextBadge, localizer) : null,
    badges: track.badges.map((badge) => localizeBadgeStatus(badge, localizer)),
  }));
