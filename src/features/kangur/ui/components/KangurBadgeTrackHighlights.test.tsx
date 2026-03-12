/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/KangurBadgeTrackHighlights';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

const buildLessonMastery = (masteryPercent: number) => ({
  attempts: 2,
  completions: 2,
  masteryPercent,
  bestScorePercent: masteryPercent,
  lastScorePercent: masteryPercent,
  lastCompletedAt: '2026-03-10T11:00:00.000Z',
});

describe('KangurBadgeTrackHighlights', () => {
  it('pads the home strip with a generic placeholder when only quest and mastery are available', () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      dailyQuestsCompleted: 1,
      lessonMastery: {
        division: buildLessonMastery(82),
      },
    };

    render(
      <KangurBadgeTrackHighlights
        dataTestIdPrefix='badge-track'
        limit={3}
        minimumItems={3}
        pinnedTrackKeys={['quest', 'mastery']}
        progress={progress}
        showPlaceholderForMissingPinnedTracks
      />
    );

    expect(screen.getByTestId('badge-track-quest')).toHaveTextContent('Misje');
    expect(screen.getByTestId('badge-track-mastery')).toHaveTextContent('Mistrzostwo');
    expect(screen.getByTestId('badge-track-placeholder-1')).toHaveTextContent('Kolejna ścieżka');
    expect(screen.getByTestId('badge-track-placeholder-1')).toHaveTextContent(
      'Miejsce na następny panel'
    );
  });

  it('renders the quest slot as a placeholder until missions unlock, then backfills the row with the next real track', () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      gamesPlayed: 1,
      lessonsCompleted: 1,
      lessonMastery: {
        division: buildLessonMastery(82),
      },
    };

    render(
      <KangurBadgeTrackHighlights
        dataTestIdPrefix='badge-track'
        limit={3}
        minimumItems={3}
        pinnedTrackKeys={['quest', 'mastery']}
        progress={progress}
        showPlaceholderForMissingPinnedTracks
      />
    );

    expect(screen.getByTestId('badge-track-placeholder-quest')).toHaveTextContent('🧭 Misje');
    expect(screen.getByTestId('badge-track-placeholder-quest')).toHaveTextContent(
      'Odblokuj pierwszą misję'
    );
    expect(screen.getByTestId('badge-track-mastery')).toHaveTextContent('Mistrzostwo');
    expect(screen.getByTestId('badge-track-onboarding')).toHaveTextContent('Start');
    expect(screen.queryByTestId('badge-track-quest')).not.toBeInTheDocument();
  });
});
