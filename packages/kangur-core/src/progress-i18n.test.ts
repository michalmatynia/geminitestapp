import { createDefaultKangurProgressState } from '@kangur/contracts';
import { describe, expect, it } from 'vitest';

import {
  getBadgeTrackMeta,
  getProgressBadgeTrackSummaries,
  getProgressBadges,
  getVisibleProgressBadges,
} from './progress/badges';
import { buildRewardBreakdown, REWARD_PROFILE_CONFIG } from './progress/rewards';
import {
  getNextLockedBadge,
  getRecommendedSessionMomentum,
} from './progress/summary';
import {
  getLocalizedKangurClockSectionLabel,
  getLocalizedKangurMetadataBadgeDescription,
  getLocalizedKangurMetadataBadgeName,
  getLocalizedKangurProgressActivityLabel,
} from './progress-i18n';

describe('kangur-core progress i18n', () => {
  it('localizes metadata badge copy in German', () => {
    expect(getLocalizedKangurMetadataBadgeName('first_game', 'Pierwsza gra', 'de')).toBe(
      'Erstes Spiel',
    );
    expect(
      getLocalizedKangurMetadataBadgeDescription(
        'geometry_artist',
        'Ukończ trening figur geometrycznych na pełny wynik',
        'de',
      ),
    ).toBe('Schliesse das Geometrietraining mit voller Punktzahl ab');
  });

  it('localizes activity and clock labels in English and German', () => {
    expect(
      getLocalizedKangurProgressActivityLabel('geometry_perimeter', 'Obwod', 'en'),
    ).toBe('Perimeter');
    expect(getLocalizedKangurClockSectionLabel('combined', 'Pełny czas', 'de')).toBe(
      'Vollstaendige Zeit',
    );
  });

  it('returns localized badge track meta for shared progress tracks', () => {
    expect(getBadgeTrackMeta('quest', 'en')).toEqual({
      emoji: '🧭',
      label: 'Quests',
      order: 7,
    });
    expect(getBadgeTrackMeta('mastery', 'de')).toEqual({
      emoji: '🏗️',
      label: 'Beherrschung',
      order: 3,
    });
  });

  it('builds a localized reward breakdown when a locale is provided', () => {
    expect(
      buildRewardBreakdown(
        REWARD_PROFILE_CONFIG.game,
        {
          accuracyBonus: 14,
          antiRepeatPenalty: 0,
          difficultyBonus: 8,
          firstActivityBonus: 4,
          guidedFocusBonus: 3,
          improvementBonus: 0,
          masteryBonus: 0,
          perfectBonus: 0,
          speedBonus: 5,
          streakBonus: 0,
          totalXp: 44,
          varietyBonus: 0,
        },
        'de',
      ),
    ).toEqual([
      { kind: 'base', label: 'Rundenabschluss', xp: 10 },
      { kind: 'accuracy', label: 'Genauigkeit', xp: 14 },
      { kind: 'difficulty', label: 'Schwierigkeitsgrad', xp: 8 },
      { kind: 'speed', label: 'Tempo', xp: 5 },
      { kind: 'first_activity', label: 'Erster starker Versuch', xp: 4 },
      { kind: 'guided_focus', label: 'Empfohlener Fokus', xp: 3 },
    ]);
  });

  it('uses the localized completed-goals summary when all guided badges are done', () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      recommendedSessionsCompleted: 3,
    };

    expect(
      getRecommendedSessionMomentum(progress, {
        badges: [],
        locale: 'en',
      }),
    ).toEqual({
      completedSessions: 3,
      nextBadgeName: null,
      progressPercent: 100,
      summary: 'All goals completed!',
    });
  });

  it('localizes badge runtime names, descriptions, and summaries in German', () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      recommendedSessionsCompleted: 2,
      totalXp: 480,
    };

    const badges = getProgressBadges(progress, 'de');

    expect(badges.find((badge) => badge.id === 'guided_keeper')).toMatchObject({
      name: 'Auf Kurs',
      desc: 'Schließe 3 empfohlene Runden ab',
      summary: '2/3 Runden',
    });
    expect(badges.find((badge) => badge.id === 'xp_500')).toMatchObject({
      name: 'Halbes Tausend XP',
      desc: 'Sammle insgesamt 500 XP',
      summary: '480/500 XP',
    });
  });

  it('localizes visible badges, track summaries, and next locked badge in English', () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      badges: ['first_game'],
      gamesPlayed: 1,
      recommendedSessionsCompleted: 2,
      totalXp: 480,
    };

    expect(getVisibleProgressBadges(progress, { maxLocked: 2 }, 'en')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'guided_keeper',
          summary: '2/3 rounds',
        }),
        expect.objectContaining({
          id: 'xp_500',
          summary: '480/500 XP',
        }),
      ]),
    );

    expect(getProgressBadgeTrackSummaries(progress, { maxTracks: 3 }, 'en')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'quest',
          label: 'Quests',
          nextBadge: expect.objectContaining({
            id: 'guided_keeper',
            name: 'Staying on course',
          }),
        }),
      ]),
    );

    expect(getNextLockedBadge(progress, { locale: 'en' })).toMatchObject({
      id: 'xp_500',
      name: 'Half a thousand XP',
      summary: '480/500 XP',
    });
  });

  it('localizes guided-session momentum badge names and summaries when locale is provided', () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      recommendedSessionsCompleted: 2,
    };

    expect(
      getRecommendedSessionMomentum(progress, {
        locale: 'en',
      }),
    ).toEqual({
      completedSessions: 2,
      nextBadgeName: 'Staying on course',
      progressPercent: 67,
      summary: '2/3 rounds',
    });
  });
});
