import type { KangurDuelLobbyEntry, KangurDuelLobbyPresenceEntry } from '@kangur/contracts/kangur-duels';
import { Text, View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { type useKangurMobileI18n, type KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { formatKangurMobileScoreOperation } from '../scores/mobileScoreSummary';
import { OutlineLink, PrimaryButton } from './homeScreenPrimitives';
import {
  formatHomeRelativeAge,
  getHomeDuelDifficultyLabel,
  getHomeDuelModeLabel,
  getHomeDuelSeriesLabel,
} from './homeScreenLabels';

type HomeCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
const DUELS_ROUTE = createKangurDuelsHref();

function DuelInviteCardActions({ invite, copy }: { invite: KangurDuelLobbyEntry; copy: HomeCopy }) {
  return (
    <View style={{ flexDirection: 'column', gap: 8 }}>
      <OutlineLink
        href={createKangurDuelsHref({ joinSessionId: invite.sessionId })}
        hint={copy({ de: 'Nimmt die Einladung an.', en: 'Accepts the invite.', pl: 'Przyjmuje zaproszenie.' })}
        label={`${copy({ de: 'Beitreten', en: 'Join', pl: 'Dołącz' })}: ${invite.host.displayName}`}
      />
      <OutlineLink href={DUELS_ROUTE} hint={copy({ de: 'Öffnet die Duell-Lobby.', en: 'Opens the duels lobby.', pl: 'Otwiera lobby pojedynków.' })} label={copy({ de: 'Lobby öffnen', en: 'Open lobby', pl: 'Otwórz lobby' })} />
    </View>
  );
}

export function DuelInviteCard({ copy, invite, locale }: { copy: HomeCopy; invite: KangurDuelLobbyEntry; locale: KangurMobileLocale }) {
  return (
    <View style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 20, borderWidth: 1, gap: 8, padding: 14 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>{invite.host.displayName}</Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {getHomeDuelModeLabel(invite.mode, locale)} • {formatKangurMobileScoreOperation(invite.operation, locale)} • {copy({ de: 'Stufe', en: 'level', pl: 'poziom' })} {getHomeDuelDifficultyLabel(invite.difficulty, locale)}
      </Text>
      <Text style={{ color: '#64748b' }}>
        {copy({
          de: `${invite.questionCount} Fragen • ${invite.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
          en: `${invite.questionCount} questions • ${invite.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
          pl: `${invite.questionCount} pytań • ${invite.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
        })}
      </Text>
      {invite.series ? <Text style={{ color: '#4338ca', lineHeight: 20 }}>{getHomeDuelSeriesLabel(invite.series, locale)}</Text> : null}
      <DuelInviteCardActions invite={invite} copy={copy} />
    </View>
  );
}
