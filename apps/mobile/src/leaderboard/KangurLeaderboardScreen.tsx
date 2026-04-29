import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileScrollScreen,
  KangurMobileSectionTitle,
} from '../shared/KangurMobileUi';
import {
} from './leaderboard-primitives';
import { useKangurMobileLeaderboard } from './useKangurLeaderboard';
import { useKangurMobileLeaderboardDuels } from './useKangurMobileLeaderboardDuels';
import { LeaderboardStatsSection } from './components/LeaderboardStatsSection';
import { LeaderboardStatus } from './components/LeaderboardStatus';

function LeaderboardNavigation({ copy }: { copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
  return (
    <View style={{ alignSelf: 'stretch', gap: 10 }}>
      <Text onPress={() => {}} style={{ color: '#1d4ed8', fontWeight: '700' }}>
        {copy({ de: 'Tagesplan jetzt', en: 'Daily plan now', pl: 'Plan dnia teraz' })}
      </Text>
      <Text onPress={() => {}} style={{ color: '#1d4ed8', fontWeight: '700' }}>
        {copy({ de: 'Duell-Lobby öffnen', en: 'Open duel lobby', pl: 'Otwórz lobby pojedynków' })}
      </Text>
    </View>
  );
}

export function KangurLeaderboardScreen(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const {
    error,
    isLoading,
    isRestoringAuth,
    items,
    visibleCount,
  } = useKangurMobileLeaderboard();
  const duelLeaderboard = useKangurMobileLeaderboardDuels();
  
  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
    >
        <View style={{ alignItems: 'flex-start', gap: 14 }}>
          <Text
            onPress={() => {}}
            style={{ color: '#1d4ed8', fontWeight: '700' }}
          >
            {copy({ de: 'Zurück', en: 'Back', pl: 'Wróć' })}
          </Text>

          <KangurMobileSectionTitle
            title={copy({ de: 'Rangliste', en: 'Leaderboard', pl: 'Ranking' })}
            subtitle={copy({
              de: 'Prüfe die letzten Ergebnisse, vergleiche das Duelltempo und springe direkt zurück in die nächsten Lernschritte.',
              en: 'Check the latest results, compare duel momentum, and jump straight back into your next study steps.',
              pl: 'Sprawdź ostatnie wyniki, porównaj tempo w pojedynkach i od razu wróć do kolejnych kroków nauki.',
            })}
          />

          <LeaderboardStatsSection
            copy={copy}
            duelEntriesCount={duelLeaderboard.entries.length}
            duelLoading={duelLeaderboard.isLoading}
            masteryTrackedCount={0}
            visibleCount={visibleCount}
          />

          <LeaderboardNavigation copy={copy} />
        </View>

        <LeaderboardStatus 
            error={error} 
            isLoading={isLoading} 
            isRestoringAuth={isRestoringAuth} 
            items={items} 
            copy={copy} 
        />
    </KangurMobileScrollScreen>
  );
}
