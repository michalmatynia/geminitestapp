import type { KangurDuelLeaderboardEntry, KangurDuelLobbyEntry, KangurDuelLobbyPresenceEntry, KangurDuelOpponentEntry } from "@kangur/contracts/kangur-duels";
import { Text, View } from "react-native";
import { type Href } from "expo-router";
import { createKangurDuelsHref } from "../duels/duelsHref";
import { type useKangurMobileI18n, type KangurMobileLocale } from "../i18n/kangurMobileI18n";
import { formatKangurMobileScoreOperation } from "../scores/mobileScoreSummary";
import { OutlineLink, PrimaryButton } from "./homeScreenPrimitives";
import {
  formatHomeRelativeAge,
  getHomeDuelDifficultyLabel,
  getHomeDuelModeLabel,
  getHomeDuelSeriesLabel,
  getHomeDuelStatusLabel,
} from "./homeScreenLabels";

type HomeCopy = ReturnType<typeof useKangurMobileI18n>["copy"];
const DUELS_ROUTE = createKangurDuelsHref();
  return (
    <View style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 20, borderWidth: 1, gap: 8, padding: 14 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>{entry.displayName}</Text>
      <Text style={{ color: '#64748b' }}>
        {copy({
          de: `Letztes Duell ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
          en: `Last duel ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
          pl: `Ostatni pojedynek ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
        })}
      </Text>
      <RecentOpponentCardActions entry={entry} copy={copy} isPending={isPending} onRematch={onRematch} />
    </View>
  );
}

function LiveDuelCardActions({
  entry,
  copy,
  isAuthenticated,
}: {
  entry: KangurDuelLobbyEntry;
  copy: HomeCopy;
  isAuthenticated: boolean;
}): React.JSX.Element {
  const isLiveEntry = entry.status === 'in_progress';
  
  let primaryHref: Href;
  let primaryHint: string;
  let primaryLabel: string;

  if (isLiveEntry) {
    primaryHref = createKangurDuelsHref({ sessionId: entry.sessionId, spectate: true });
    primaryHint = copy({
      de: `Öffnet das Live-Duell von ${entry.host.displayName}.`,
      en: `Opens the live duel hosted by ${entry.host.displayName}.`,
      pl: `Otwiera pojedynek na żywo gospodarza ${entry.host.displayName}.`,
    });
    primaryLabel = copy({ de: 'Live ansehen', en: 'Watch live', pl: 'Obserwuj na żywo' });
  } else if (isAuthenticated) {
    primaryHref = createKangurDuelsHref({ joinSessionId: entry.sessionId });
    primaryHint = copy({
      de: `Tritt dem öffentlichen Duell von ${entry.host.displayName} bei.`,
      en: `Joins the public duel hosted by ${entry.host.displayName}.`,
      pl: `Dołącza do publicznego pojedynku gospodarza ${entry.host.displayName}.`,
    });
    primaryLabel = copy({ de: 'Match beitreten', en: 'Join match', pl: 'Dołącz do meczu' });
  } else {
    primaryHref = DUELS_ROUTE;
    primaryHint = copy({ de: 'Öffnet die Duell-Lobby.', en: 'Opens the duels lobby.', pl: 'Otwiera lobby pojedynków.' });
    primaryLabel = copy({ de: 'Lobby öffnen', en: 'Open lobby', pl: 'Otwórz lobby' });
  }

  return (
    <View style={{ flexDirection: 'column', gap: 8 }}>
      <OutlineLink href={primaryHref} hint={primaryHint} label={primaryLabel} />
      <OutlineLink
        href={DUELS_ROUTE}
        hint={copy({ de: 'Öffnet die Duell-Lobby.', en: 'Opens the duels lobby.', pl: 'Otwiera lobby pojedynków.' })}
        label={copy({ de: 'Alle Duelle', en: 'All duels', pl: 'Wszystkie pojedynki' })}
      />
    </View>
  );
}

export function LiveDuelCard({
  copy,
  entry,
  isAuthenticated,
  locale,
}: {
  copy: HomeCopy;
  entry: KangurDuelLobbyEntry;
  isAuthenticated: boolean;
  locale: KangurMobileLocale;
}): React.JSX.Element {
  return (
    <View style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 20, borderWidth: 1, gap: 8, padding: 14 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>{entry.host.displayName}</Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {getHomeDuelModeLabel(entry.mode, locale)} • {formatKangurMobileScoreOperation(entry.operation, locale)} •{' '}
        {copy({ de: 'Stufe', en: 'level', pl: 'poziom' })} {getHomeDuelDifficultyLabel(entry.difficulty, locale)}
      </Text>
      <Text style={{ color: '#64748b' }}>
        {copy({
          de: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} Fragen • ${entry.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
          en: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} questions • ${entry.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
          pl: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} pytań • ${entry.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
        })}
      </Text>
      {entry.series ? <Text style={{ color: '#4338ca', lineHeight: 20 }}>{getHomeDuelSeriesLabel(entry.series, locale)}</Text> : null}
      <LiveDuelCardActions entry={entry} copy={copy} isAuthenticated={isAuthenticated} />
    </View>
  );
}

export function DuelLeaderboardSnapshotCard({
  copy,
  entry,
  locale,
  rank,
}: {
  copy: HomeCopy;
  entry: KangurDuelLeaderboardEntry;
  locale: KangurMobileLocale;
  rank: number;
}): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
        padding: 14,
      }}
    >
      <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
        {copy({
          de: 'DEIN DUELLSTAND',
          en: 'YOUR DUEL SNAPSHOT',
          pl: 'TWÓJ WYNIK W POJEDYNKACH',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        #{rank} {entry.displayName}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Siege ${entry.wins} • Niederlagen ${entry.losses} • Unentschieden ${entry.ties}`,
          en: `Wins ${entry.wins} • Losses ${entry.losses} • Ties ${entry.ties}`,
          pl: `Wygrane ${entry.wins} • Porażki ${entry.losses} • Remisy ${entry.ties}`,
        })}
      </Text>
      <Text style={{ color: '#64748b' }}>
        {copy({
          de: `Matches ${entry.matches} • Quote ${Math.round(entry.winRate * 100)}% • letztes Duell ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
          en: `Matches ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • last duel ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
          pl: `Mecze ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • ostatni pojedynek ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
        })}
      </Text>
    </View>
  );
}

export function DuelLeaderboardEntryCard({
  copy,
  entry,
  isCurrentLearner,
  locale,
  rank,
}: {
  copy: HomeCopy;
  entry: KangurDuelLeaderboardEntry;
  isCurrentLearner: boolean;
  locale: KangurMobileLocale;
  rank: number;
}): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: isCurrentLearner ? '#eff6ff' : '#f8fafc',
        borderColor: isCurrentLearner ? '#bfdbfe' : '#e2e8f0',
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
        padding: 14,
      }}
    >
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
        #{rank} {entry.displayName}
        {isCurrentLearner
          ? copy({
              de: ' · Du',
              en: ' · You',
              pl: ' · Ty',
            })
          : ''}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Siege ${entry.wins} • Niederlagen ${entry.losses} • Unentschieden ${entry.ties}`,
          en: `Wins ${entry.wins} • Losses ${entry.losses} • Ties ${entry.ties}`,
          pl: `Wygrane ${entry.wins} • Porażki ${entry.losses} • Remisy ${entry.ties}`,
        })}
      </Text>
      <Text style={{ color: '#64748b' }}>
        {copy({
          de: `Matches ${entry.matches} • Quote ${Math.round(entry.winRate * 100)}% • letztes Duell ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
          en: `Matches ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • last duel ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
          pl: `Mecze ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • ostatni pojedynek ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
        })}
      </Text>
    </View>
  );
}
