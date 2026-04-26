import { Text, View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { KangurMobileCard as Card } from '../shared/KangurMobileUi';
import { MessageCard } from './duels-primitives';
import { formatRelativeAge } from '../utils/duels-ui';
import { type UseKangurMobileDuelsLobbyResult as DuelLobbyState } from './useKangurMobileDuelsLobby';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

type DuelLobbySecondarySectionProps = {
  copy: DuelCopy;
  locale: DuelLocale;
  lobby: DuelLobbyState;
};

function LeaderboardEntryRow({
  entry,
  index,
  copy,
  locale,
}: {
  entry: DuelLobbyState['leaderboardEntries'][number];
  index: number;
  copy: DuelCopy;
  locale: DuelLocale;
}): React.JSX.Element {
  return (
    <View
      key={`${entry.learnerId}-${index}`}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 8,
      }}
    >
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        #{index + 1} {entry.displayName}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: `Siege ${entry.wins} · Niederlagen ${entry.losses} · Unentschieden ${entry.ties}`,
          en: `Wins ${entry.wins} · Losses ${entry.losses} · Draws ${entry.ties}`,
          pl: `Wygrane ${entry.wins} · Porażki ${entry.losses} · Remisy ${entry.ties}`,
        })}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Spiele ${entry.matches} · Siegesquote ${Math.round(entry.winRate * 100)}% · letztes Spiel ${formatRelativeAge(entry.lastPlayedAt, locale)}`,
          en: `Matches ${entry.matches} · Win rate ${Math.round(entry.winRate * 100)}% · last game ${formatRelativeAge(entry.lastPlayedAt, locale)}`,
          pl: `Mecze ${entry.matches} · Win rate ${Math.round(entry.winRate * 100)}% · ostatnia gra ${formatRelativeAge(entry.lastPlayedAt, locale)}`,
        })}
      </Text>
    </View>
  );
}

function LeaderboardList({
  entries,
  copy,
  locale,
}: {
  entries: DuelLobbyState['leaderboardEntries'];
  copy: DuelCopy;
  locale: DuelLocale;
}): React.JSX.Element {
  if (entries.length === 0) {
    return (
      <MessageCard
        title={copy({
          de: 'Keine gespielten Duelle',
          en: 'No completed duels',
          pl: 'Brak rozegranych dueli',
        })}
        description={copy({
          de: 'Die Rangliste füllt sich nach den ersten abgeschlossenen Duellen.',
          en: 'The leaderboard will fill up after the first completed duels.',
          pl: 'Ranking zapełni się po pierwszych zakończonych pojedynkach.',
        })}
      />
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {entries.map((entry, index) => (
        <LeaderboardEntryRow
          key={`${entry.learnerId}-${index}`}
          copy={copy}
          entry={entry}
          index={index}
          locale={locale}
        />
      ))}
    </View>
  );
}

export function DuelLobbyLeaderboardSection({
  copy,
  locale,
  lobby,
}: DuelLobbySecondarySectionProps): React.JSX.Element {
  const renderContent = (): React.JSX.Element => {
    if (lobby.leaderboardError !== null) {
      return (
        <MessageCard
          title={copy({
            de: 'Duellrangliste ist nicht verfügbar',
            en: 'Duels leaderboard is unavailable',
            pl: 'Ranking dueli jest niedostępny',
          })}
          description={lobby.leaderboardError}
          tone='error'
        />
      );
    }

    return <LeaderboardList copy={copy} entries={lobby.leaderboardEntries} locale={locale} />;
  };

  return (
    <Card>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Duellrangliste',
          en: 'Duels leaderboard',
          pl: 'Wyniki dueli',
        })}
      </Text>
      {renderContent()}
    </Card>
  );
}
