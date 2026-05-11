import { Text, View } from 'react-native';
import type { KangurDuelLeaderboardEntry } from '@kangur/contracts/kangur-duels';
import { useKangurMobileI18n } from '../../../i18n/kangurMobileI18n';
import { useKangurMobileHomeDuelsLeaderboard } from '../../useKangurMobileHomeDuelsLeaderboard';
import { PrimaryButton, OutlineLink, SectionCard } from '../../homeScreenPrimitives';
import { DuelLeaderboardEntryCard, DuelLeaderboardSnapshotCard } from '../../home-duel-section-cards';
import { createKangurDuelsHref } from '../../../duels/duelsHref';

const DUELS_ROUTE = createKangurDuelsHref();

type LeaderboardSectionProps = {
  activeDuelLearnerId: string | null;
  isAuthenticated: boolean;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: string;
};

function LeaderboardLoading({ copy }: { copy: LeaderboardSectionProps['copy'] }): React.JSX.Element {
  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Die Duell-Rangliste wird geladen.',
        en: 'Loading the duel leaderboard.',
        pl: 'Pobieramy ranking pojedynków.',
      })}
    </Text>
  );
}

function LeaderboardError({ copy, error, refresh }: { copy: LeaderboardSectionProps['copy']; error: string; refresh: () => void }): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{error}</Text>
      <PrimaryButton
        hint={copy({
          de: 'Aktualisiert die Duell-Rangliste.',
          en: 'Refreshes the duel leaderboard.',
          pl: 'Odświeża ranking pojedynków.',
        })}
        label={copy({
          de: 'Ranking aktualisieren',
          en: 'Refresh leaderboard',
          pl: 'Odśwież ranking',
        })}
        onPress={refresh}
      />
    </View>
  );
}

function LeaderboardEmpty({ copy }: { copy: LeaderboardSectionProps['copy'] }): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Noch keine abgeschlossenen Duelle in diesem Fenster.',
          en: 'There are no completed duels in this window yet.',
          pl: 'W tym oknie nie ma jeszcze zakończonych pojedynków.',
        })}
      </Text>
      <OutlineLink
        href={DUELS_ROUTE}
        hint={copy({ de: 'Öffnet die Duell-Lobby.', en: 'Opens the duels lobby.', pl: 'Otwiera lobby pojedynków.' })}
        label={copy({ de: 'Duell-Lobby öffnen', en: 'Open duels lobby', pl: 'Otwórz lobby pojedynków' })}
      />
    </View>
  );
}

function LeaderboardSnapshot({
  isAuthenticated,
  currentLearnerDuelEntry,
  currentLearnerDuelRank,
  copy,
  locale,
}: {
  isAuthenticated: boolean;
  currentLearnerDuelEntry: KangurDuelLeaderboardEntry | null;
  currentLearnerDuelRank: number;
  copy: LeaderboardSectionProps['copy'];
  locale: string;
}): React.JSX.Element | null {
  if (!isAuthenticated) return null;

  if (currentLearnerDuelEntry !== null) {
    return (
      <DuelLeaderboardSnapshotCard
        copy={copy}
        entry={currentLearnerDuelEntry}
        locale={locale}
        rank={currentLearnerDuelRank + 1}
      />
    );
  }

  return (
    <Text style={{ color: '#64748b', lineHeight: 20 }}>
      {copy({
        de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar.',
        en: 'Your account is not visible in this duel standing yet.',
        pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
      })}
    </Text>
  );
}

function LeaderboardEntries({
  entries,
  activeDuelLearnerId,
  isAuthenticated,
  currentLearnerDuelEntry,
  currentLearnerDuelRank,
  copy,
  locale,
}: {
  entries: KangurDuelLeaderboardEntry[];
  activeDuelLearnerId: string | null;
  isAuthenticated: boolean;
  currentLearnerDuelEntry: KangurDuelLeaderboardEntry | null;
  currentLearnerDuelRank: number;
  copy: LeaderboardSectionProps['copy'];
  locale: string;
}): React.JSX.Element {
  return (
    <View style={{ gap: 12 }}>
      <LeaderboardSnapshot
        copy={copy}
        currentLearnerDuelEntry={currentLearnerDuelEntry}
        currentLearnerDuelRank={currentLearnerDuelRank}
        isAuthenticated={isAuthenticated}
        locale={locale}
      />
      {entries.map((entry, index) => (
        <DuelLeaderboardEntryCard
          key={entry.learnerId}
          copy={copy}
          entry={entry}
          isCurrentLearner={entry.learnerId === activeDuelLearnerId}
          locale={locale}
          rank={index + 1}
        />
      ))}
      <OutlineLink
        href={DUELS_ROUTE}
        hint={copy({ de: 'Öffnet die vollständige Duell-Lobby.', en: 'Opens the full duels lobby.', pl: 'Otwiera pełne lobby pojedynków.' })}
        label={copy({ de: 'Volle Duell-Rangliste', en: 'Full duel leaderboard', pl: 'Pełny ranking pojedynków' })}
      />
    </View>
  );
}

function calculateCurrentLearnerRank(
  activeDuelLearnerId: string | null,
  entries: KangurDuelLeaderboardEntry[]
): number {
  if (activeDuelLearnerId === null || activeDuelLearnerId === '') return -1;
  return entries.findIndex((e) => e.learnerId === activeDuelLearnerId);
}

function LeaderboardContent({
  activeDuelLearnerId,
  isAuthenticated,
  copy,
  locale,
  duelLeaderboard,
}: LeaderboardSectionProps & { duelLeaderboard: ReturnType<typeof useKangurMobileHomeDuelsLeaderboard> }): React.JSX.Element {
  if (duelLeaderboard.isLoading) return <LeaderboardLoading copy={copy} />;
  
  if (duelLeaderboard.error !== null && duelLeaderboard.error !== '') {
    const handleRefresh = (): void => {
      void duelLeaderboard.refresh();
    };
    return <LeaderboardError copy={copy} error={duelLeaderboard.error} refresh={handleRefresh} />;
  }
  
  if (duelLeaderboard.entries.length === 0) return <LeaderboardEmpty copy={copy} />;

  const currentLearnerDuelRank = calculateCurrentLearnerRank(activeDuelLearnerId, duelLeaderboard.entries);
  const currentLearnerDuelEntry = currentLearnerDuelRank >= 0 ? (duelLeaderboard.entries[currentLearnerDuelRank] ?? null) : null;

  return (
    <LeaderboardEntries
      entries={duelLeaderboard.entries}
      activeDuelLearnerId={activeDuelLearnerId}
      isAuthenticated={isAuthenticated}
      currentLearnerDuelEntry={currentLearnerDuelEntry}
      currentLearnerDuelRank={currentLearnerDuelRank}
      copy={copy}
      locale={locale}
    />
  );
}

export function HomeDuelLeaderboardSection({
  activeDuelLearnerId,
  isAuthenticated,
}: Omit<LeaderboardSectionProps, 'copy' | 'locale'>): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const duelLeaderboard = useKangurMobileHomeDuelsLeaderboard({ enabled: true });

  return (
    <SectionCard title={copy({ de: 'Duell-Rangliste', en: 'Duel leaderboard', pl: 'Ranking pojedynków' })}>
      <LeaderboardContent
        activeDuelLearnerId={activeDuelLearnerId}
        copy={copy}
        duelLeaderboard={duelLeaderboard}
        isAuthenticated={isAuthenticated}
        locale={locale}
      />
    </SectionCard>
  );
}
