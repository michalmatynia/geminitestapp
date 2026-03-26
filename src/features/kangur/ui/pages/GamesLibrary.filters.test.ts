import { describe, expect, it } from 'vitest';

import {
  areGamesLibrarySearchParamsCanonical,
  DEFAULT_GAMES_LIBRARY_FILTERS,
  areGamesLibraryFiltersEqual,
  buildGamesLibraryCatalogFilter,
  getGamesLibrarySearchParams,
  readGamesLibraryTabFromSearchParams,
  readGamesLibraryFiltersFromSearchParams,
} from '@/features/kangur/ui/pages/GamesLibrary.filters';

describe('GamesLibrary filters', () => {
  it('reads valid filter values from route search params', () => {
    const filters = readGamesLibraryFiltersFromSearchParams(
      new URLSearchParams({
        gameId: 'clock_training',
        subject: 'english',
        ageGroup: 'ten_year_old',
        mechanic: 'logic_relation',
        surface: 'game',
        gameStatus: 'active',
        variantSurface: 'game_screen',
        variantStatus: 'active',
        engineId: 'relation-match-engine',
        engineCategory: 'foundational',
        implementationOwnership: 'shared_runtime',
        launchableOnly: 'true',
      })
    );

    expect(filters).toEqual({
      gameId: 'clock_training',
      subject: 'english',
      ageGroup: 'ten_year_old',
      mechanic: 'logic_relation',
      surface: 'game',
      gameStatus: 'active',
      variantSurface: 'game_screen',
      variantStatus: 'active',
      engineId: 'relation-match-engine',
      engineCategory: 'foundational',
      implementationOwnership: 'shared_runtime',
      launchability: 'launchable',
    });
  });

  it('reads a valid tab from route search params and rejects invalid tabs', () => {
    expect(
      readGamesLibraryTabFromSearchParams(new URLSearchParams({ tab: 'runtime' }))
    ).toBe('runtime');
    expect(
      readGamesLibraryTabFromSearchParams(new URLSearchParams({ tab: 'invalid' }))
    ).toBeNull();
    expect(readGamesLibraryTabFromSearchParams(new URLSearchParams())).toBeNull();
  });

  it('ignores invalid query values and falls back per filter', () => {
    const filters = readGamesLibraryFiltersFromSearchParams(
      new URLSearchParams({
        subject: 'english',
        mechanic: 'unknown',
        surface: 'invalid',
        variantSurface: 'bad',
        engineCategory: 'unknown',
        implementationOwnership: 'unknown',
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
      gameId: 'clock_training' as const,
      subject: 'maths' as const,
      variantSurface: 'game_screen' as const,
      engineId: 'clock-dial-engine' as const,
      engineCategory: 'foundational' as const,
      implementationOwnership: 'shared_runtime' as const,
      launchability: 'launchable' as const,
    };

    expect(getGamesLibrarySearchParams(filters, 'runtime')).toEqual({
      gameId: 'clock_training',
      subject: 'maths',
      ageGroup: undefined,
      mechanic: undefined,
      surface: undefined,
      gameStatus: undefined,
      variantSurface: 'game_screen',
      variantStatus: undefined,
      engineId: 'clock-dial-engine',
      engineCategory: 'foundational',
      implementationOwnership: 'shared_runtime',
      launchableOnly: 'true',
      tab: 'runtime',
    });
    expect(getGamesLibrarySearchParams(filters, 'catalog').tab).toBeUndefined();
    expect(buildGamesLibraryCatalogFilter(filters)).toEqual({
      gameId: 'clock_training',
      subject: 'maths',
      ageGroup: undefined,
      mechanic: undefined,
      surface: undefined,
      gameStatus: undefined,
      variantSurface: 'game_screen',
      variantStatus: undefined,
      engineId: 'clock-dial-engine',
      engineCategory: 'foundational',
      implementationOwnership: 'shared_runtime',
      launchableOnly: true,
    });
    expect(
      areGamesLibraryFiltersEqual(filters, {
        ...filters,
      })
    ).toBe(true);
  });

  it('detects when route search params are already canonicalized', () => {
    const filters = {
      ...DEFAULT_GAMES_LIBRARY_FILTERS,
      gameId: 'division_groups' as const,
      subject: 'maths' as const,
    };

    expect(
      areGamesLibrarySearchParamsCanonical(
        new URLSearchParams({
          gameId: 'division_groups',
          subject: 'maths',
          tab: 'runtime',
        }),
        filters,
        'runtime'
      )
    ).toBe(true);

    expect(
      areGamesLibrarySearchParamsCanonical(
        new URLSearchParams({
          gameId: 'division_groups',
          subject: 'invalid',
          tab: 'runtime',
        }),
        filters,
        'runtime'
      )
    ).toBe(false);

    expect(
      areGamesLibrarySearchParamsCanonical(
        new URLSearchParams({
          gameId: 'division_groups',
          subject: 'maths',
          lessonComponentId: 'legacy-inline-link',
          tab: 'runtime',
        }),
        filters,
        'runtime'
      )
    ).toBe(false);
  });
});
