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

function LoadingContent({ copy }: { copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
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

function ErrorContent({
  error,
  copy,
  onRefresh,
}: {
  error: string;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  onRefresh: () => void;
}): React.JSX.Element {
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
        onPress={() => {
          onRefresh();
        }}
      />
    </View>
  );
}

function EmptyContent({ copy }: { copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
  return (
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
}

export function HomeDuelLeaderboardSection({
  _activeDuelLearnerId,
  _isAuthenticated,
}: HomeDuelLeaderboardSectionProps): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const duelLeaderboard = useKangurMobileHomeDuelsLeaderboard({
    enabled: true,
  });

  const renderContent = (): React.ReactNode => {
    if (duelLeaderboard.isLoading) return <LoadingContent copy={copy} />;
    if (duelLeaderboard.error !== null && duelLeaderboard.error !== '') {
      return <ErrorContent error={duelLeaderboard.error} copy={copy} onRefresh={() => { void duelLeaderboard.refresh(); }} />;
    }
    if (duelLeaderboard.entries.length === 0) return <EmptyContent copy={copy} />;
    return <Text>{copy({ de: 'Rangliste verfügbar', en: 'Leaderboard available', pl: 'Ranking dostępny' })}</Text>;
  };

  return (
    <SectionCard
      title={copy({
        de: 'Duell-Rangliste',
        en: 'Duel leaderboard',
        pl: 'Ranking pojedynków',
      })}
    >
      {renderContent()}
    </SectionCard>
  );
}
