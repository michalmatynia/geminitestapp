import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GAMES_LIBRARY_FILTERS,
  areGamesLibraryFiltersEqual,
  buildGamesLibraryCatalogFilter,
  getGamesLibrarySearchParams,
  readGamesLibraryFiltersFromSearchParams,
} from '@/features/kangur/ui/pages/GamesLibrary.filters';

describe('GamesLibrary filters', () => {
  it('reads valid filter values from route search params', () => {
    const filters = readGamesLibraryFiltersFromSearchParams(
      new URLSearchParams({
        subject: 'english',
        ageGroup: 'ten_year_old',
        mechanic: 'logic_relation',
        surface: 'game',
        gameStatus: 'active',
        variantSurface: 'game_screen',
        variantStatus: 'active',
        engineId: 'relation-match-engine',
        engineCategory: 'foundational',
        launchableOnly: 'true',
      })
    );

    expect(filters).toEqual({
      subject: 'english',
      ageGroup: 'ten_year_old',
      mechanic: 'logic_relation',
      surface: 'game',
      gameStatus: 'active',
      variantSurface: 'game_screen',
      variantStatus: 'active',
      engineId: 'relation-match-engine',
      engineCategory: 'foundational',
      launchability: 'launchable',
    });
  });

  it('ignores invalid query values and falls back per filter', () => {
    const filters = readGamesLibraryFiltersFromSearchParams(
      new URLSearchParams({
        subject: 'english',
        mechanic: 'unknown',
        surface: 'invalid',
        variantSurface: 'bad',
        engineCategory: 'unknown',
        launchableOnly: 'false',
      })
    );

    expect(filters).toEqual({
      ...DEFAULT_GAMES_LIBRARY_FILTERS,
      subject: 'english',
    });
  });

  it('serializes filters back to route params and catalog query input', () => {
    const filters = {
      ...DEFAULT_GAMES_LIBRARY_FILTERS,
      subject: 'maths' as const,
      variantSurface: 'game_screen' as const,
      engineId: 'clock-dial-engine' as const,
      engineCategory: 'foundational' as const,
      launchability: 'launchable' as const,
    };

    expect(getGamesLibrarySearchParams(filters)).toEqual({
      subject: 'maths',
      ageGroup: undefined,
      mechanic: undefined,
      surface: undefined,
      gameStatus: undefined,
      variantSurface: 'game_screen',
      variantStatus: undefined,
      engineId: 'clock-dial-engine',
      engineCategory: 'foundational',
      launchableOnly: 'true',
    });
    expect(buildGamesLibraryCatalogFilter(filters)).toEqual({
      subject: 'maths',
      ageGroup: undefined,
      mechanic: undefined,
      surface: undefined,
      gameStatus: undefined,
      variantSurface: 'game_screen',
      variantStatus: undefined,
      engineId: 'clock-dial-engine',
      engineCategory: 'foundational',
      launchableOnly: true,
    });
    expect(
      areGamesLibraryFiltersEqual(filters, {
        ...filters,
      })
    ).toBe(true);
  });
});
