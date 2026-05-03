/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  createDefaultKangurGames,
  createKangurGameLibraryPageDataFromGames,
} from '@/features/kangur/games';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    [key: string]: unknown;
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { CatalogTab } from './GamesLibrary.tabs';
import { GamesLibraryContext } from './GamesLibrary.context';
import {
  DEFAULT_GAMES_LIBRARY_FILTERS,
  getKangurGameCardAnchorId,
} from './GamesLibrary.utils';

const translations = ((key: string, values?: Record<string, string | number>) => {
  const messageMap: Record<string, string> = {
    'tabs.catalog': 'Catalog',
    'focus.gameTitle': 'Focused game',
    'filters.summaryFiltered': 'Showing {visible} of {total} games.',
    'filters.summaryAll': 'Showing {count} games.',
    'filters.clear': 'Clear filters',
    'emptyFilteredTitle': 'No filtered games',
    'emptyTitle': 'No games',
    'emptyFilteredDescription': 'No games match the current filters.',
    'emptyDescription': 'No games are available.',
    'groupEyebrow': 'Subject',
    'groupDescription': '{count} games in this group.',
    'metrics.games': 'Games',
    'filters.engine.label': 'Engine',
    'metrics.lessonLinked': 'Lesson linked',
    'cohortGroups.launchableLabel': 'Launchable',
    'labels.allAgeGroups': 'All',
    'labels.variants': 'Variants',
    'labels.variantCount': '{count} variants',
    'labels.lessonLinks': 'Linked lessons',
    'labels.lessonCount': '{count} lessons',
    'labels.none': 'None',
    'filters.surface.label': 'Surface',
    'actions.previewGame': 'Preview & map',
    'actions.openGame': 'Open game',
    'statuses.active': 'Active',
    'statuses.draft': 'Draft',
    'statuses.legacy': 'Legacy',
    'surfaces.lesson': 'Lesson',
    'surfaces.library': 'Library',
    'surfaces.game': 'Game',
    'surfaces.duel': 'Duel',
    'mechanics.clock_training': 'Clock training',
  };

  const template = messageMap[key] ?? key;
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce(
    (message, [token, value]) => message.replace(`{${token}}`, String(value)),
    template
  );
}) as (key: string, values?: Record<string, string | number>) => string;

describe('CatalogTab', () => {
  it('keeps the card mouse-clickable without exposing the card container as a nested button', () => {
    const pageData = createKangurGameLibraryPageDataFromGames({
      games: structuredClone(createDefaultKangurGames()),
    });
    const firstEntry = pageData.overview.subjectGroups[0]?.entries[0];
    const launchableEntry = pageData.overview.subjectGroups
      .flatMap((group) => group.entries)
      .find((entry) => entry.launchableScreen !== null);
    expect(firstEntry).toBeDefined();
    expect(launchableEntry).toBeDefined();

    const setSelectedGame = vi.fn();

    const contextValue = {
      applyFilters: vi.fn(),
      basePath: '/kangur',
      filters: DEFAULT_GAMES_LIBRARY_FILTERS,
      groupedGames: pageData.overview.subjectGroups,
      hasActiveFilters: false,
      locale: 'en',
      selectedGame: null as any,
      totalGameCount: pageData.catalogFacets.gameCount,
      translations: translations as any,
      visibleGameCount: pageData.overview.metrics.visibleGameCount,
    } as any;

    const { rerender } = render(
      <GamesLibraryContext.Provider value={contextValue}>
        <CatalogTab setSelectedGame={setSelectedGame} />
      </GamesLibraryContext.Provider>
    );

    const card = document.getElementById(getKangurGameCardAnchorId(firstEntry!.game.id));
    expect(card).toBeInTheDocument();
    expect(card).not.toHaveAttribute('role');
    expect(card).not.toHaveAttribute('tabindex');

    fireEvent.click(card!);
    expect(setSelectedGame).toHaveBeenCalledWith(firstEntry!.game, card);

    setSelectedGame.mockClear();

    const previewButton = within(card!).getByRole('button', {
      name: `Preview & map: ${firstEntry!.game.title}`,
    });
    expect(previewButton).toHaveAttribute('aria-haspopup', 'dialog');
    expect(previewButton).toHaveAttribute('aria-expanded', 'false');
    expect(previewButton).not.toHaveAttribute('aria-controls');
    fireEvent.click(previewButton);

    expect(setSelectedGame).toHaveBeenCalledTimes(1);
    expect(setSelectedGame).toHaveBeenCalledWith(firstEntry!.game, previewButton);

    rerender(
      <GamesLibraryContext.Provider value={{ ...contextValue, selectedGame: firstEntry!.game }}>
        <CatalogTab setSelectedGame={setSelectedGame} />
      </GamesLibraryContext.Provider>
    );

    expect(
      within(card!).getByRole('button', {
        name: `Preview & map: ${firstEntry!.game.title}`,
      })
    ).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(
      within(card!).getByRole('button', {
        name: `Preview & map: ${firstEntry!.game.title}`,
      })
    ).toHaveAttribute(
      'aria-controls',
      'games-library-game-modal'
    );

    const launchableCard = document.getElementById(
      getKangurGameCardAnchorId(launchableEntry!.game.id)
    );
    expect(launchableCard).toBeInTheDocument();
    expect(
      within(launchableCard!).getByRole('link', {
        name: `Open game: ${launchableEntry!.game.title}`,
      })
    ).toBeInTheDocument();
  });
});
