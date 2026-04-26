import React from 'react';
import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { SectionCard, PrimaryButton, OutlineLink } from '../homeScreenPrimitives';
import { useKangurMobileHomeDuelsLeaderboard } from '../useKangurMobileHomeDuelsLeaderboard';
import { DUELS_ROUTE } from '../home-screen-constants';

interface HomeDuelLeaderboardSectionProps {
  activeDuelLearnerId: string | null;
  isAuthenticated: boolean;
}

export function HomeDuelLeaderboardSection({
  activeDuelLearnerId,
  isAuthenticated,
}: HomeDuelLeaderboardSectionProps): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const duelLeaderboard = useKangurMobileHomeDuelsLeaderboard({
    enabled: true,
  });

  return (
    <SectionCard
      title={copy({
        de: 'Duell-Rangliste',
        en: 'Duel leaderboard',
        pl: 'Ranking pojedynków',
      })}
    >
      {duelLeaderboard.isLoading ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Die Duell-Rangliste wird geladen.',
            en: 'Loading the duel leaderboard.',
            pl: 'Pobieramy ranking pojedynków.',
          })}
        </Text>
      ) : duelLeaderboard.error ? (
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
      ) : duelLeaderboard.entries.length === 0 ? (
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
      ) : (
        <Text>{copy({ de: 'Rangliste verfügbar', en: 'Leaderboard available', pl: 'Ranking dostępny' })}</Text>
      )}
    </SectionCard>
  );
}
