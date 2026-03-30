'use client';

import { useTranslations } from 'next-intl';
import type {
  KangurBadgeTrackKey,
  KangurBadgeTrackSummary,
} from '@kangur/core';
import KangurBadgeTrackPlaceholderCard from '@/features/kangur/ui/components/badge-track/KangurBadgeTrackPlaceholderCard';
import {
  KangurBadgeTrackSummaryCard,
  KangurBadgeTrackCardHeader,
  KangurBadgeTrackCardBody,
  KangurBadgeTrackCardBar,
  KANGUR_BADGE_TRACK_ACCENTS,
} from '@/features/kangur/ui/components/badge-track/KangurBadgeTrackSummaryCard';
import {
  getBadgeTrackMeta,
  getProgressBadgeTrackSummaries,
  translateKangurProgressWithFallback,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type KangurBadgeTrackHighlightsProps = {
  className?: string;
  dataTestIdPrefix?: string;
  limit?: number;
  minimumItems?: number;
  pinnedTrackKeys?: KangurBadgeTrackKey[];
  progress: KangurProgressState;
  showPlaceholderForMissingPinnedTracks?: boolean;
};

type KangurBadgeTrackHighlightItem =
  | {
      kind: 'track';
      track: KangurBadgeTrackSummary;
    }
  | {
      description: string;
      id: string;
      kind: 'placeholder';
      label: string;
      title: string;
      trackEmoji?: string;
    };

const TRACK_PRIORITY: Record<KangurBadgeTrackKey, number> = {
  quest: 1,
  mastery: 2,
  onboarding: 3,
  challenge: 4,
  xp: 5,
  consistency: 6,
  variety: 7,
  english: 8,
};

const getPinnedTrackPlaceholder = (
  trackKey: KangurBadgeTrackKey,
  translate?: (key: string, values?: Record<string, string | number>) => string
): KangurBadgeTrackHighlightItem => {
  const meta = getBadgeTrackMeta(trackKey, { translate });

  if (trackKey === 'quest') {
    return {
      kind: 'placeholder',
      id: trackKey,
      label: meta.label,
      title: translateKangurProgressWithFallback(
        translate,
        'badgeTrackHighlights.placeholders.quest.title',
        'Odblokuj pierwszą misję'
      ),
      description: translateKangurProgressWithFallback(
        translate,
        'badgeTrackHighlights.placeholders.quest.description',
        'Ten panel pokaże się tutaj, gdy ruszysz z pierwszą misją dnia.'
      ),
      trackEmoji: meta.emoji,
    };
  }

  if (trackKey === 'mastery') {
    return {
      kind: 'placeholder',
      id: trackKey,
      label: meta.label,
      title: translateKangurProgressWithFallback(
        translate,
        'badgeTrackHighlights.placeholders.mastery.title',
        'Zacznij budować opanowanie'
      ),
      description: translateKangurProgressWithFallback(
        translate,
        'badgeTrackHighlights.placeholders.mastery.description',
        'Panel wypełni się, gdy pierwsza lekcja zacznie zbliżać się do mistrzostwa.'
      ),
      trackEmoji: meta.emoji,
    };
  }

  return {
    kind: 'placeholder',
    id: trackKey,
    label: meta.label,
    title: translateKangurProgressWithFallback(
      translate,
      'badgeTrackHighlights.placeholders.genericPinned.title',
      'Ta ścieżka czeka na start'
    ),
    description: translateKangurProgressWithFallback(
      translate,
      'badgeTrackHighlights.placeholders.genericPinned.description',
      'Pierwszy postęp w tym kierunku odsłoni pełny panel z odznakami.'
    ),
    trackEmoji: meta.emoji,
  };
};

const getGenericPlaceholder = (
  index: number,
  translate?: (key: string, values?: Record<string, string | number>) => string
): KangurBadgeTrackHighlightItem => ({
  kind: 'placeholder',
  id: String(index),
  label: translateKangurProgressWithFallback(
    translate,
    'badgeTrackHighlights.placeholders.generic.label',
    'Kolejna ścieżka'
  ),
  title: translateKangurProgressWithFallback(
    translate,
    'badgeTrackHighlights.placeholders.generic.title',
    'Miejsce na następny panel'
  ),
  description: translateKangurProgressWithFallback(
    translate,
    'badgeTrackHighlights.placeholders.generic.description',
    'Odblokuj więcej odznak, a pojawi się tu kolejny kierunek postępu.'
  ),
  trackEmoji: '✨',
});

export default function KangurBadgeTrackHighlights({
  className,
  dataTestIdPrefix = 'kangur-badge-track',
  limit = 3,
  minimumItems,
  pinnedTrackKeys = [],
  progress,
  showPlaceholderForMissingPinnedTracks = false,
}: KangurBadgeTrackHighlightsProps): React.JSX.Element | null {
  const translations = useTranslations('KangurProgressRuntime');
  const trackTestIdPrefix = dataTestIdPrefix;
  const maxItems = Math.max(0, Math.floor(limit));
  const targetItemCount = Math.min(
    maxItems,
    Math.max(0, Math.floor(minimumItems ?? 0))
  );
  const tracks = getProgressBadgeTrackSummaries(progress, { maxTracks: 7 }, { translate: translations })
    .sort((left, right) => {
      const leftPriority = TRACK_PRIORITY[left.key] ?? 99;
      const rightPriority = TRACK_PRIORITY[right.key] ?? 99;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return right.progressPercent - left.progressPercent;
    });
  const trackByKey = new Map(tracks.map((track) => [track.key, track] as const));
  const usedTrackKeys = new Set<KangurBadgeTrackKey>();
  const items: KangurBadgeTrackHighlightItem[] = [];

  pinnedTrackKeys.forEach((trackKey) => {
    if (items.length >= maxItems) {
      return;
    }

    const pinnedTrack = trackByKey.get(trackKey);
    if (pinnedTrack) {
      items.push({ kind: 'track', track: pinnedTrack });
      usedTrackKeys.add(trackKey);
      return;
    }

    if (showPlaceholderForMissingPinnedTracks) {
      items.push(getPinnedTrackPlaceholder(trackKey, translations));
    }
  });

  tracks.forEach((track) => {
    if (items.length >= maxItems || usedTrackKeys.has(track.key)) {
      return;
    }

    items.push({ kind: 'track', track });
    usedTrackKeys.add(track.key);
  });

  let genericPlaceholderIndex = 1;
  while (items.length < targetItemCount) {
    items.push(getGenericPlaceholder(genericPlaceholderIndex, translations));
    genericPlaceholderIndex += 1;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('grid kangur-panel-gap min-[420px]:grid-cols-2 lg:grid-cols-3', className)}
      data-testid={`${trackTestIdPrefix}-grid`}
    >
      {items.map((item, index) => {
        if (item.kind === 'track') {
          const { track } = item;
          const accent = KANGUR_BADGE_TRACK_ACCENTS[track.key] ?? 'indigo';
          
          return (
            <KangurBadgeTrackSummaryCard
              cardClassName='h-full rounded-[24px] text-left'
              dataTestId={`${trackTestIdPrefix}-${track.key}`}
              key={track.key}
            >
              <div className={cn('flex flex-col kangur-panel-gap')}>
                <KangurBadgeTrackCardHeader
                  accent={accent}
                  labelClassName='tracking-[0.16em]'
                  statusChipClassName='text-[11px]'
                  track={track}
                />
                <KangurBadgeTrackCardBody track={track} />
              </div>
              <KangurBadgeTrackCardBar
                accent={accent}
                testId={`${trackTestIdPrefix}-${track.key}-bar`}
                value={track.progressPercent}
              />
            </KangurBadgeTrackSummaryCard>
          );
        }

        return (
          <KangurBadgeTrackPlaceholderCard
            cardClassName='h-full'
            dataTestId={`${trackTestIdPrefix}-placeholder-${item.id}`}
            description={item.description}
            headerClassName='gap-2'
            key={`placeholder-${item.id}-${index}`}
            label={item.label}
            statusChipClassName='text-[11px]'
            title={item.title}
            trackEmoji={item.trackEmoji}
            trackLabelClassName='tracking-[0.16em]'
          />
        );
      })}
    </div>
  );
}
