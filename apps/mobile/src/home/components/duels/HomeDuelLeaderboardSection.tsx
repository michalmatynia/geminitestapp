import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../../i18n/kangurMobileI18n';
import { useKangurMobileHomeDuelsLeaderboard } from '../../useKangurMobileHomeDuelsLeaderboard';
import { PrimaryButton, OutlineLink, SectionCard } from '../../homeScreenPrimitives';
import { DuelLeaderboardEntryCard, DuelLeaderboardSnapshotCard } from '../../home-duel-section-cards';
import { createKangurDuelsHref } from '../../../duels/duelsHref';

const DUELS_ROUTE = createKangurDuelsHref();

function LeaderboardLoading({ copy }: { copy: Props['copy'] }) {
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

function LeaderboardError({ copy, error, refresh }: { copy: Props['copy']; error: string; refresh: () => void }) {
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

function LeaderboardEmpty({ copy }: { copy: Props['copy'] }) {
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

function LeaderboardEntries({
  entries,
  activeDuelLearnerId,
  isAuthenticated,
  currentLearnerDuelEntry,
  currentLearnerDuelRank,
  copy,
  locale,
}: {
  entries: ReturnType<typeof useKangurMobileHomeDuelsLeaderboard>['entries'];
  activeDuelLearnerId: string | null;
  isAuthenticated: boolean;
  currentLearnerDuelEntry: any;
  currentLearnerDuelRank: number;
  copy: Props['copy'];
  locale: string;
}) {
  return (
    <View style={{ gap: 12 }}>
      {isAuthenticated && currentLearnerDuelEntry !== null ? (
        <DuelLeaderboardSnapshotCard
          copy={copy}
          entry={currentLearnerDuelEntry}
          locale={locale}
          rank={currentLearnerDuelRank + 1}
        />
      ) : isAuthenticated ? (
        <Text style={{ color: '#64748b', lineHeight: 20 }}>
          {copy({
            de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar.',
            en: 'Your account is not visible in this duel standing yet.',
            pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków.',
          })}
        </Text>
      ) : null}
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

type Props = {
  activeDuelLearnerId: string | null;
  isAuthenticated: boolean;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
};

export function HomeDuelLeaderboardSection({
  activeDuelLearnerId,
  isAuthenticated,
}: Omit<Props, 'copy'>): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const duelLeaderboard = useKangurMobileHomeDuelsLeaderboard({ enabled: true });
  const currentLearnerDuelRank = activeDuelLearnerId !== null && activeDuelLearnerId !== '' ? duelLeaderboard.entries.findIndex((e) => e.learnerId === activeDuelLearnerId) : -1;
  const currentLearnerDuelEntry = currentLearnerDuelRank >= 0 ? duelLeaderboard.entries[currentLearnerDuelRank] : null;

  let content: React.ReactNode = null;
  if (duelLeaderboard.isLoading) content = <LeaderboardLoading copy={copy} />;
  else if (duelLeaderboard.error !== null && duelLeaderboard.error !== '') content = <LeaderboardError copy={copy} error={duelLeaderboard.error} refresh={duelLeaderboard.refresh} />;
  else if (duelLeaderboard.entries.length === 0) content = <LeaderboardEmpty copy={copy} />;
  else {
    content = (
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

  return (
    <SectionCard title={copy({ de: 'Duell-Rangliste', en: 'Duel leaderboard', pl: 'Ranking pojedynków' })}>
      {content}
    </SectionCard>
  );
}
