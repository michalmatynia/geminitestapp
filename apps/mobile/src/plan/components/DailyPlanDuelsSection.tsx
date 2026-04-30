import { Text, View } from 'react-native';
import {
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePendingActionButton,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import { DUELS_ROUTE } from '../daily-plan-primitives';
import { type KangurMobileCopy, type KangurMobileLocale } from '../../i18n/kangurMobileI18n';
import { formatKangurMobileScoreDateTime } from '../../scores/mobileScoreSummary';
import {
  type KangurDuelOpponentEntry,
  type KangurDuelLeaderboardEntry,
} from '@kangur/contracts/kangur-duels';
import { type UseKangurMobileLearnerDuelsSummaryResult } from '../../duels/useKangurMobileLearnerDuelsSummary';

export interface DailyPlanDuelsSectionProps {
  copy: KangurMobileCopy;
  locale: string;
  duelPlan: UseKangurMobileLearnerDuelsSummaryResult;
  openDuelSession: (sessionId: string) => void;
}

function OpponentItem({
  opponent,
  copy,
  locale,
  duelPlan,
  openDuelSession,
}: {
  opponent: KangurDuelOpponentEntry;
  copy: KangurMobileCopy;
  locale: string;
  duelPlan: UseKangurMobileLearnerDuelsSummaryResult;
  openDuelSession: (sessionId: string) => void;
}): React.JSX.Element {
  return (
    <InsetPanel gap={8}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>{opponent.displayName}</Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Letztes Duell ${formatKangurMobileScoreDateTime(opponent.lastPlayedAt, locale as KangurMobileLocale)}`,
          en: `Last duel ${formatKangurMobileScoreDateTime(opponent.lastPlayedAt, locale as KangurMobileLocale)}`,
          pl: `Ostatni pojedynek ${formatKangurMobileScoreDateTime(opponent.lastPlayedAt, locale as KangurMobileLocale)}`,
        })}
      </Text>
      <KangurMobilePendingActionButton
        horizontalPadding={14}
        label={copy({ de: 'Schneller Rückkampf', en: 'Quick rematch', pl: 'Szybki rewanż' })}
        onPress={async () => {
          const sessionId = await duelPlan.createRematch(opponent.learnerId);
          if (sessionId) openDuelSession(sessionId);
        }}
        pending={duelPlan.pendingOpponentLearnerId === opponent.learnerId}
        pendingLabel={copy({ de: 'Rückkampf wird gesendet...', en: 'Sending rematch...', pl: 'Wysyłanie rewanżu...' })}
      />
    </InsetPanel>
  );
}

function CurrentEntryPanel({
  copy,
  rank,
  entry,
}: {
  copy: KangurMobileCopy;
  rank: number | null;
  entry: KangurDuelLeaderboardEntry;
}): React.JSX.Element {
  return (
    <InsetPanel gap={8} style={{ borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>
      <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
        {copy({ de: 'DEIN DUELLSTAND', en: 'YOUR DUEL SNAPSHOT', pl: 'TWÓJ WYNIK W POJEDYNKACH' })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        #{rank ?? 0} {entry.displayName}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: `Siege ${entry.wins} • Niederlagen ${entry.losses} • Unentschieden ${entry.ties}`,
          en: `Wins ${entry.wins} • Losses ${entry.losses} • Ties ${entry.ties}`,
          pl: `Wygrane ${entry.wins} • Porażki ${entry.losses} • Remisy ${entry.ties}`,
        })}
      </Text>
    </InsetPanel>
  );
}

export function DailyPlanDuelsSection({
  copy,
  locale,
  duelPlan,
  openDuelSession,
}: DailyPlanDuelsSectionProps): React.JSX.Element {
  const { opponents, currentRank, currentEntry, isRestoringAuth, isLoading, isAuthenticated, error, actionError } = duelPlan;

  if (isRestoringAuth || isLoading) {
    return (
      <Card>
        <Text style={{ color: '#475569', lineHeight: 22 }}>
          {copy({ de: 'Der heutige Duellstand wird geladen...', en: 'Loading today’s duel standing...', pl: 'Ładujemy dzisiejszy stan pojedynków...' })}
        </Text>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <Text style={{ color: '#475569', lineHeight: 22 }}>
          {copy({ de: 'Melde dich an, um hier deinen Duellstand zu sehen.', en: 'Sign in to see duel standing.', pl: 'Zaloguj się, aby zobaczyć tutaj stan w pojedynkach.' })}
        </Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{error}</Text>
          <LinkButton label={copy({ de: 'Duelle aktualisieren', en: 'Refresh duels', pl: 'Odśwież pojedynki' })} onPress={() => { void duelPlan.refresh(); }} />
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Duelle für heute', en: 'Duels for today', pl: 'Pojedynki na dziś' })}</Text>
        <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>{copy({ de: 'Schneller Rückweg zu Rivalen', en: 'Quick return to rivals', pl: 'Szybki powrót do rywali' })}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill label={copy({ de: `Rivalen ${opponents.length}`, en: `Rivals ${opponents.length}`, pl: `Rywale ${opponents.length}` })} tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }} />
        <Pill label={(currentRank !== null && currentRank !== 0) ? copy({ de: `Deine Position #${currentRank}`, en: `Your rank #${currentRank}`, pl: `Twoja pozycja #${currentRank}` }) : copy({ de: 'Wartet auf Sichtbarkeit', en: 'Waiting for visibility', pl: 'Czeka na widoczność' })} tone={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' }} />
      </View>
      <View style={{ gap: 12 }}>
        {currentEntry !== null ? <CurrentEntryPanel copy={copy} rank={currentRank} entry={currentEntry} /> : <Text style={{ color: '#475569', lineHeight: 22 }}>{copy({ de: 'Dein Konto ist nicht sichtbar.', en: 'Your account is not visible.', pl: 'Twoje konto jest niewidoczne.' })}</Text>}
        {actionError && <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{actionError}</Text>}
        {opponents.length === 0 ? <Text style={{ color: '#475569', lineHeight: 22 }}>{copy({ de: 'Keine Rivalen.', en: 'No rivals.', pl: 'Brak rywali.' })}</Text> : opponents.map((opponent) => <OpponentItem key={opponent.learnerId} opponent={opponent} copy={copy} locale={locale} duelPlan={duelPlan} openDuelSession={openDuelSession} />)}
        <LinkButton href={DUELS_ROUTE} label={copy({ de: 'Duelle öffnen', en: 'Open duels', pl: 'Otwórz pojedynki' })} stretch />
      </View>
    </Card>
  );
}
