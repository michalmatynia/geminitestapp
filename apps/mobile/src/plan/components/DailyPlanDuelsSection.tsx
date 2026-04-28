import { Text, View } from 'react-native';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePendingActionButton,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import { DUELS_ROUTE } from '../daily-plan-primitives';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';
import { formatKangurMobileScoreDateTime } from '../../scores/mobileScoreSummary';
import {
  type KangurDuelOpponentEntry,
  type KangurDuelLeaderboardEntry,
} from '@/packages/kangur-contracts/src/kangur-duels';
import { type KangurMobileLocale } from '../../i18n/kangurMobileI18n';

// Helper to safely access opponent properties
const getDisplayName = (o: KangurDuelOpponentEntry | undefined | null) => o?.displayName ?? '';
const getLastPlayedAt = (o: KangurDuelOpponentEntry | undefined | null) => o?.lastPlayedAt ?? new Date().toISOString();
const getLearnerId = (o: KangurDuelOpponentEntry | undefined | null) => o?.learnerId ?? '';

export interface DailyPlanDuelsState {
  opponents: KangurDuelOpponentEntry[];
  currentRank: number | null;
  currentEntry: KangurDuelLeaderboardEntry | null;
  isRestoringAuth: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  actionError: string | null;
  pendingOpponentLearnerId: string | null;
  refresh: () => void;
  createRematch: (learnerId: string) => Promise<string | null>;
}

export interface DailyPlanDuelsSectionProps {
  copy: KangurMobileCopy;
  locale: string;
  duelPlan: DailyPlanDuelsState;
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
  copy: DailyPlanDuelsSectionProps['copy'];
  locale: string;
  duelPlan: DailyPlanDuelsState;
  openDuelSession: (sessionId: string) => void;
}): JSX.Element {
  const displayName = getDisplayName(opponent);
  const lastPlayedAt = getLastPlayedAt(opponent);
  const learnerId = getLearnerId(opponent);

  return (
    <InsetPanel gap={8}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>{displayName}</Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Letztes Duell ${formatKangurMobileScoreDateTime(lastPlayedAt, locale as KangurMobileLocale)}`,
          en: `Last duel ${formatKangurMobileScoreDateTime(lastPlayedAt, locale as KangurMobileLocale)}`,
          pl: `Ostatni pojedynek ${formatKangurMobileScoreDateTime(lastPlayedAt, locale as KangurMobileLocale)}`,
        })}
      </Text>
      <KangurMobilePendingActionButton
        horizontalPadding={14}
        label={copy({ de: 'Schneller Rückkampf', en: 'Quick rematch', pl: 'Szybki rewanż' })}
        onPress={() => {
          void duelPlan.createRematch(learnerId).then((sessionId) => {
            if (sessionId) openDuelSession(sessionId);
          });
        }}
        pending={duelPlan.pendingOpponentLearnerId === learnerId}
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
  copy: DailyPlanDuelsSectionProps['copy'];
  rank: number | null;
  entry: KangurDuelLeaderboardEntry;
}): JSX.Element {
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

function DuelStatusHeader({ copy }: { copy: DailyPlanDuelsSectionProps['copy'] }): JSX.Element {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: 'Duelle für heute', en: 'Duels for today', pl: 'Pojedynki na dziś' })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {copy({ de: 'Schneller Rückweg zu Rivalen', en: 'Quick return to rivals', pl: 'Szybki powrót do rywali' })}
      </Text>
    </View>
  );
}

function DuelStatusPills({
  copy,
  opponentCount,
  currentRank,
}: {
  copy: DailyPlanDuelsSectionProps['copy'];
  opponentCount: number;
  currentRank: number | null;
}): JSX.Element {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill
        label={copy({
          de: `Rivalen ${opponentCount}`,
          en: `Rivals ${opponentCount}`,
          pl: `Rywale ${opponentCount}`,
        })}
        tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }}
      />
      <Pill
        label={
          currentRank !== null && currentRank !== 0
            ? copy({
                de: `Deine Position #${currentRank}`,
                en: `Your rank #${currentRank}`,
                pl: `Twoja pozycja #${currentRank}`,
              })
            : copy({ de: 'Wartet auf Sichtbarkeit', en: 'Waiting for visibility', pl: 'Czeka na widoczność' })
        }
        tone={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' }}
      />
    </View>
  );
}

function DuelContentArea({
  copy,
  locale,
  duelPlan,
  openDuelSession,
  opponents,
  currentRank,
  currentEntry,
  actionError,
}: {
  copy: DailyPlanDuelsSectionProps['copy'];
  locale: string;
  duelPlan: DailyPlanDuelsState;
  openDuelSession: (sessionId: string) => void;
  opponents: KangurDuelOpponentEntry[];
  currentRank: number | null;
  currentEntry: KangurDuelLeaderboardEntry | null;
  actionError: string | null;
}): JSX.Element {
  return (
    <View style={{ gap: 12 }}>
      {currentEntry ? (
        <CurrentEntryPanel copy={copy} rank={currentRank} entry={currentEntry} />
      ) : (
        <Text style={{ color: '#475569', lineHeight: 22 }}>
          {copy({
            de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar.',
            en: 'Your account is not visible in this duel standing yet.',
            pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków.',
          })}
        </Text>
      )}

      {actionError !== null && <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{actionError}</Text>}

      {opponents.length === 0 ? (
        <Text style={{ color: '#475569', lineHeight: 22 }}>
          {copy({
            de: 'Es gibt noch keine letzten Rivalen.',
            en: 'There are no recent rivals yet.',
            pl: 'Nie ma jeszcze ostatnich rywali.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {opponents.map((opponent) => (
            <OpponentItem
              key={opponent.learnerId}
              opponent={opponent}
              copy={copy}
              locale={locale}
              duelPlan={duelPlan}
              openDuelSession={openDuelSession}
            />
          ))}
        </View>
      )}

      <View style={{ alignSelf: 'stretch', gap: 10 }}>
        <ActionButton
          label={copy({ de: 'Duelle aktualisieren', en: 'Refresh duels', pl: 'Odśwież pojedynki' })}
          onPress={duelPlan.refresh}
          stretch
          tone='secondary'
        />
        <LinkButton
          href={DUELS_ROUTE}
          label={copy({ de: 'Duelle öffnen', en: 'Open duels', pl: 'Otwórz pojedynki' })}
          stretch
        />
      </View>
    </View>
  );
}

function DailyPlanDuelsBody({
  copy,
  locale,
  duelPlan,
  openDuelSession,
  opponents,
  currentRank,
  currentEntry,
  actionError,
}: {
  copy: DailyPlanDuelsSectionProps['copy'];
  locale: string;
  duelPlan: DailyPlanDuelsState;
  openDuelSession: (sessionId: string) => void;
  opponents: KangurDuelOpponentEntry[];
  currentRank: number | null;
  currentEntry: KangurDuelLeaderboardEntry | null;
  actionError: string | null;
}): JSX.Element {
  return (
    <Card>
      <DuelStatusHeader copy={copy} />
      <DuelStatusPills copy={copy} opponentCount={opponents.length} currentRank={currentRank} />
      <DuelContentArea
        copy={copy}
        locale={locale}
        duelPlan={duelPlan}
        openDuelSession={openDuelSession}
        opponents={opponents}
        currentRank={currentRank}
        currentEntry={currentEntry}
        actionError={actionError}
      />
    </Card>
  );
}

function DailyPlanDuelsLoading({ copy }: { copy: DailyPlanDuelsSectionProps['copy'] }): JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#475569', lineHeight: 22 }}>
        {copy({
          de: 'Der heutige Duellstand wird geladen...',
          en: 'Loading today’s duel standing...',
          pl: 'Ładujemy dzisiejszy stan pojedynków...',
        })}
      </Text>
    </Card>
  );
}

function DailyPlanDuelsUnauthenticated({ copy }: { copy: DailyPlanDuelsSectionProps['copy'] }): JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#475569', lineHeight: 22 }}>
        {copy({
          de: 'Melde dich an, um hier deinen Duellstand, letzte Rivalen und schnelle Rückkämpfe zu sehen.',
          en: 'Sign in to see duel standing, recent rivals, and quick rematches here.',
          pl: 'Zaloguj się, aby zobaczyć tutaj stan w pojedynkach, ostatnich rywali i szybkie rewanże.',
        })}
      </Text>
    </Card>
  );
}

function DailyPlanDuelsError({
  error,
  copy,
  onRefresh,
}: {
  error: string;
  copy: DailyPlanDuelsSectionProps['copy'];
  onRefresh: () => void;
}): JSX.Element {
  return (
    <Card>
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{error}</Text>
        <ActionButton label={copy({ de: 'Duelle aktualisieren', en: 'Refresh duels', pl: 'Odśwież pojedynki' })} onPress={onRefresh} />
      </View>
    </Card>
  );
}

export function DailyPlanDuelsSection({
  copy,
  locale,
  duelPlan,
  openDuelSession,
}: DailyPlanDuelsSectionProps): JSX.Element {
  const { opponents, currentRank, currentEntry, isRestoringAuth, isLoading, isAuthenticated, error, actionError } =
    duelPlan;

  if (isRestoringAuth || isLoading) {
    return <DailyPlanDuelsLoading copy={copy} />;
  }

  if (!isAuthenticated) {
    return <DailyPlanDuelsUnauthenticated copy={copy} />;
  }

  if (error !== null) {
    return <DailyPlanDuelsError error={error} copy={copy} onRefresh={duelPlan.refresh} />;
  }

  return (
    <DailyPlanDuelsBody
      copy={copy}
      locale={locale}
      duelPlan={duelPlan}
      openDuelSession={openDuelSession}
      opponents={opponents}
      currentRank={currentRank}
      currentEntry={currentEntry}
      actionError={actionError}
    />
  );
}
