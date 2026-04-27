import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../../i18n/kangurMobileI18n';
import { useKangurMobileHomeDuelsLeaderboard } from '../../useKangurMobileHomeDuelsLeaderboard';
import { PrimaryButton, OutlineLink, SectionCard } from '../../homeScreenPrimitives';
import { DuelLeaderboardEntryCard, DuelLeaderboardSnapshotCard } from '../../home-duel-section-cards';
import { createKangurDuelsHref } from '../../../duels/duelsHref';

const DUELS_ROUTE = createKangurDuelsHref();

type Props = {
  activeDuelLearnerId: string | null;
  isAuthenticated: boolean;
};

export function HomeDuelLeaderboardSection({
  activeDuelLearnerId,
  isAuthenticated,
}: Props): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const duelLeaderboard = useKangurMobileHomeDuelsLeaderboard({
    enabled: true,
  });
  const currentLearnerDuelRank =
    activeDuelLearnerId !== null && activeDuelLearnerId !== ''
      ? duelLeaderboard.entries.findIndex(
          (entry) => entry.learnerId === activeDuelLearnerId,
        )
      : -1;
  const currentLearnerDuelEntry =
    currentLearnerDuelRank >= 0
      ? duelLeaderboard.entries[currentLearnerDuelRank]
      : null;

  let content: React.ReactNode = null;

  if (duelLeaderboard.isLoading) {
    content = (
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Die Duell-Rangliste wird geladen.',
          en: 'Loading the duel leaderboard.',
          pl: 'Pobieramy ranking pojedynków.',
        })}
      </Text>
    );
  } else if (duelLeaderboard.error !== null && duelLeaderboard.error !== '') {
    content = (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {duelLeaderboard.error}
        </Text>
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
          onPress={duelLeaderboard.refresh}
        />
      </View>
    );
  } else if (duelLeaderboard.entries.length === 0) {
    content = (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Noch keine abgeschlossenen Duelle in diesem Fenster. Die ersten beendeten Serien füllen hier sofort diesen Duellstand.',
            en: 'There are no completed duels in this window yet. The first finished series will fill this duel standing right away.',
            pl: 'W tym oknie nie ma jeszcze zakończonych pojedynków. Pierwsze skończone serie od razu wypełnią tutaj ten stan pojedynków.',
          })}
        </Text>
        <OutlineLink
          href={DUELS_ROUTE}
          hint={copy({
            de: 'Öffnet die Duell-Lobby.',
            en: 'Opens the duels lobby.',
            pl: 'Otwiera lobby pojedynków.',
          })}
          label={copy({
            de: 'Duell-Lobby öffnen',
            en: 'Open duels lobby',
            pl: 'Otwórz lobby pojedynków',
          })}
        />
      </View>
    );
  } else {
    content = (
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
              de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
              en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
              pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
            })}
          </Text>
        ) : null}
        {duelLeaderboard.entries.map((entry, index) => (
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
          hint={copy({
            de: 'Öffnet die vollständige Duell-Lobby mit der erweiterten Rangliste.',
            en: 'Opens the full duels lobby with the extended leaderboard.',
            pl: 'Otwiera pełne lobby pojedynków z rozszerzonym rankingiem.',
          })}
          label={copy({
            de: 'Volle Duell-Rangliste',
            en: 'Full duel leaderboard',
            pl: 'Pełny ranking pojedynków',
          })}
        />
      </View>
    );
  }

  return (
    <SectionCard
      title={copy({
        de: 'Duell-Rangliste',
        en: 'Duel leaderboard',
        pl: 'Ranking pojedynków',
      })}
    >
      {content}
    </SectionCard>
  );
}
