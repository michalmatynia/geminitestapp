/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useLocale: () => 'de',
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const messages = {
        'KangurDuels.common.relative.minutesAgo': 'vor {count} Min.',
        'KangurDuels.lobby.buttons.createChallenge': 'Eigene Herausforderung erstellen',
        'KangurDuels.lobby.buttons.refresh': 'Aktualisieren',
        'KangurDuels.lobby.buttons.refreshAria': 'Duell-Lobby aktualisieren',
        'KangurDuels.lobby.buttons.refreshing': 'Aktualisieren...',
        'KangurDuels.lobby.countLabel': '{count} aktiv',
        'KangurDuels.lobby.description':
          'Wahle einen Lernenden, der auf ein Duell wartet, oder erstelle deine eigene Herausforderung.',
        'KangurDuels.lobby.empty.noEntries': 'Keine Lernenden warten auf ein Duell.',
        'KangurDuels.lobby.filters.mode.all': 'Alle Modi',
        'KangurDuels.lobby.filters.mode.aria': 'Lobby nach Duellmodus filtern',
        'KangurDuels.lobby.filters.mode.challenge': 'Herausforderungen',
        'KangurDuels.lobby.filters.mode.label': 'Modus',
        'KangurDuels.lobby.filters.mode.quickMatch': 'Schnelle Duelle',
        'KangurDuels.lobby.filters.sort.aria': 'Offentliche Duelle sortieren',
        'KangurDuels.lobby.filters.sort.label': 'Sortierung',
        'KangurDuels.lobby.filters.sort.questionsHigh': 'Meiste Fragen',
        'KangurDuels.lobby.filters.sort.questionsLow': 'Wenigste Fragen',
        'KangurDuels.lobby.filters.sort.recent': 'Neueste',
        'KangurDuels.lobby.filters.sort.timeFast': 'Kurzeste Zeit',
        'KangurDuels.lobby.filters.sort.timeSlow': 'Langste Zeit',
        'KangurDuels.lobby.heading': 'Duell-Lobby',
        'KangurDuels.lobby.loading': 'Duell-Lobby wird geladen...',
        'KangurDuels.lobby.meta.autoEvery': 'Auto alle {seconds}s',
      } as const;
      const resolved =
        messages[`${namespace}.${key}` as keyof typeof messages] ?? key;

      if (!values) {
        return resolved;
      }

      return Object.entries(values).reduce((message, [token, value]) => {
        return message.replace(`{${token}}`, String(value));
      }, resolved);
    },
}));

import { DuelsLobbyPanel } from '@/features/kangur/ui/pages/duels/DuelsLobbyPanel';

describe('DuelsLobbyPanel', () => {
  it('renders the localized SVG heading while preserving the accessible lobby name', () => {
    render(
      <DuelsLobbyPanel
        filteredPublicLobbyEntries={[]}
        freshWindowMs={15_000}
        hasAnyPublicLobbyEntries={false}
        hasVisiblePublicLobbyEntries={false}
        isBusy={false}
        isLobbyLoading={false}
        lobbyCountLabel='0 aktiv'
        lobbyDescriptionId='duels-lobby-description'
        lobbyEntriesCount={0}
        lobbyError={null}
        lobbyFresh={new Map()}
        lobbyHeadingId='duels-lobby-heading'
        lobbyLastUpdatedAt={null}
        lobbyListId='duels-lobby-list'
        lobbyModeFilter='all'
        lobbyRefreshSeconds={5}
        lobbySort='recent'
        onCreateChallenge={vi.fn()}
        onJoin={vi.fn()}
        onModeFilterChange={vi.fn()}
        onRefresh={vi.fn()}
        onResetFilters={vi.fn()}
        onSortChange={vi.fn()}
        publicLobbyCount={0}
        relativeNow={Date.now()}
        visibleLobbyCount={0}
      />
    );

    expect(screen.getByRole('heading', { name: 'Duell-Lobby' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-duels-heading-art')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-duels-heading-art').querySelector('text')).toHaveTextContent(
      'Duell-Lobby'
    );
  });
});
