import type { KangurDuelLeaderboardEntry, KangurDuelOpponentEntry } from '@kangur/contracts/kangur-duels';
import { Text, View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { type useKangurMobileI18n, type KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { OutlineLink, PrimaryButton } from './homeScreenPrimitives';
import {
  formatHomeRelativeAge,
} from './homeScreenLabels';

type HomeCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
const DUELS_ROUTE = createKangurDuelsHref();

export function RecentOpponentCard({ copy, entry, isPending, locale, onRematch }: { copy: HomeCopy; entry: KangurDuelOpponentEntry; isPending: boolean; locale: KangurMobileLocale; onRematch: () => void }): React.JSX.Element {
  return (
    <View style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 20, borderWidth: 1, gap: 8, padding: 14 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>{entry.displayName}</Text>
      <Text style={{ color: '#64748b' }}>{copy({ de: `Letztes Duell ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`, en: `Last duel ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`, pl: `Ostatni pojedynek ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}` })}</Text>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <PrimaryButton disabled={isPending} hint={copy({ de: 'Sendet einen schnellen privaten Rückkampf.', en: 'Sends a quick private rematch.', pl: 'Wysyła szybki prywatny rewanż.' })} label={isPending ? copy({ de: 'Rückkampf wird gesendet...', en: 'Sending rematch...', pl: 'Wysyłanie rewanżu...' }) : copy({ de: 'Schneller Rückkampf', en: 'Quick rematch', pl: 'Szybki rewanż' })} onPress={onRematch} />
        <OutlineLink href={DUELS_ROUTE} hint={copy({ de: 'Öffnet die Duell-Lobby.', en: 'Opens the duels lobby.', pl: 'Otwiera lobby pojedynków.' })} label={copy({ de: 'Lobby öffnen', en: 'Open lobby', pl: 'Otwórz lobby' })} />
      </View>
    </View>
  );
}

export function DuelLeaderboardEntryCard({ copy, entry, isCurrentLearner, locale, rank }: { copy: HomeCopy; entry: KangurDuelLeaderboardEntry; isCurrentLearner: boolean; locale: KangurMobileLocale; rank: number }): React.JSX.Element {
  return (
    <View style={{ backgroundColor: isCurrentLearner ? '#eff6ff' : '#f8fafc', borderColor: isCurrentLearner ? '#bfdbfe' : '#e2e8f0', borderRadius: 20, borderWidth: 1, gap: 8, padding: 14 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>#{rank} {entry.displayName}{isCurrentLearner ? copy({ de: ' · Du', en: ' · You', pl: ' · Ty' }) : ''}</Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>{copy({ de: `Siege ${entry.wins} • Niederlagen ${entry.losses} • Unentschieden ${entry.ties}`, en: `Wins ${entry.wins} • Losses ${entry.losses} • Ties ${entry.ties}`, pl: `Wygrane ${entry.wins} • Porażki ${entry.losses} • Remisy ${entry.ties}` })}</Text>
      <Text style={{ color: '#64748b' }}>{copy({ de: `Matches ${entry.matches} • Quote ${Math.round(entry.winRate * 100)}% • letztes Duell ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`, en: `Matches ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • last duel ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`, pl: `Mecze ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • ostatni pojedynek ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}` })}</Text>
    </View>
  );
}
