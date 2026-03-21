import { createDefaultKangurProgressState } from '@kangur/contracts';
import { describe, expect, it } from 'vitest';

import { getBadgeTrackMeta } from './progress/badges';
import { buildRewardBreakdown, REWARD_PROFILE_CONFIG } from './progress/rewards';
import { getRecommendedSessionMomentum } from './progress/summary';
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
});
